---
layout: post
title: "Three Options for Top-Down Rails Testing"
date: 2015-07-23 11:22:16 +0200
comments: true
categories: [development, Rails, Ruby, testing, controller, functional, integration, acceptance, Capybara, Minitest]
description: 
---
The most popular methods for learning Ruby on Rails today all place testing front and center.  [The Ruby on Rails Tutorial](https://www.railstutorial.org/) incorporates sections on testing in almost every chapter as does [Agile Web Development with Rails 4](https://pragprog.com/book/rails4/agile-web-development-with-rails-4).  [Other popular Rails books](http://www.amazon.com/Rails-Edition-Addison-Wesley-Professional-Series/dp/0321944275) concentrate most of their testing material in one or two chapters, but I don't know of any important teaching resource that ignores it entirely.

But even though a culture of testing runs deep within the community and is the modus operandi in most large Rails shops, certain essential concepts that remain elusive to many.  Take the differences between the types of tests usually found in Rails applications as an example.  Most programmers can clearly explain the differences between model and controller tests, but ask about controller tests versus integration tests, and you'll probably get a mixture of confusion and shrugs.<!--more-->

Given [recent changes](http://chriskottom.com/blog/2015/07/ruby-and-rails-testing-changes-roundup/) to controller tests and the ways that Rails apps themselves are changing, testing higher in the application stack is becoming more important than before.  In this post, I'll outline three different types of automated tests that Rails developers can use to exercise their applications' upper layers.  I'll explain the differences between these types of tests, outline the situations when each can and should be used, and finally share with you the scheme that I use when testing my own applications.

### Controller Tests ###

Controller tests are well understood because they are standard Rails tests and are pretty much what they sound like - tests to exercise your controller classes - though you might hear some Rails old-timers referring to them by their former name: functional tests.  The new terminology is less ambiguous though, and so it's a better fit for what these tests are and do.

Every controller test case file maps to a single Rails controller, and every test method exercises a single scenario for a specific action.  Suppose we have an application with a `UserSessionsController` class that includes a login action for authentication.  By default, Rails places a `UserSessionsControllerTest` file in `test/controllers` when the boilerplate controller is generated, and to that, we can add test methods for:

* Logging in with a good username and password
* Logging in with a bad username
* Logging in when already logged in

In each case, we want to maintain control over the pre-test state of the application and the inputs passed to the controller action when the test is executed.  That might include request parameters, cookies, session variables, and request headers as well as the usual model objects.  Like other tests though, we'll need to make assertions on only the *outputs* sent back to the client in the form of the HTTP response and the *observable side effects* produced by the action.

<table class="results">
  <col style="width: 30%">
  <col style="width: 30%">
  <thead>
    <tr class="header">
      <th>HTTP Response</th>
      <th>Side Effects</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="center" valign="top">
        HTTP status code
        <br/>
        Redirect location
        <br/>
        Cookies set
      </td>
      <td class="center" valign="top">
        Rails flash values
        <br/>
        Session variable values
        <br/>
        Model changes
        <br/>
        Mail messages sent
        <br/>
        Jobs enqueued / performed
      </td>
    </tr>
  </tbody>
</table>

To the extent that there's been any confusion over the role of these tests in recent years, it might be attributed to changes made by Rails core.  These include:

* Controller tests used to include assertions for validating the markup generated when the tested action ran - e.g. `assert_select` and other related methods.  These were extracted to a [separate gem](https://github.com/rails/rails-dom-testing) (not deprecated completely, as pointed out by @aar0nr) some time ago.
* Rails 5 will also see the [deprecation of two other common testing methods](https://github.com/rails/rails/issues/18950) - `assert_template`, for determining whether or not a given template or partial is rendered, and `assigns`, which supplies the value of a controller instance variable.

Speaking as someone who had plenty of legacy code bases, these changes were unpleasant surprises at the time, but the resulting controller test scope of responsibility is tighter and leaner now that it focuses on HTTP responses and side effects.  But then that forces us to ask: how should we test the application as a whole?  The right answer will depend on how your app is built.

### Integration Tests ###

Rails integration tests closely resemble controller tests at the API level, but because they feed simulated HTTP requests to the [Rails Dispatcher](http://guides.rubyonrails.org/rails_on_rack.html#action-dispatcher-middleware-stack) rather than through the controller, they're able to simulate complex interactions utilizing more of the application stack.  Each request takes place within the context of a user session, and a single integration test can open any number of sessions as you can see in the example below.

{% codeblock lang:ruby test/integration/shopper_interactions_test.rb %}
require "test_helper"

class ShopperInteractionsTest < ActionDispatch::IntegrationTest
  test "place order and check orders admin" do
    shopper = login_as users(:user)
    admin = login_as users(:administrator)

    product = products(:rails_book)
    shopper.post line_items_path, line_item: { product_id: product.id }
    shopper.follow_redirect!
    assert_equal root_path, shopper.path

    order_params = {
      name: "Chris Kottom",
      address: "My house",
      email: "chris@example.com",
      pay_type: "Credit Card"
    }
    assert_difference "Order.count" do
      shopper.post orders_path, order: order_params
    end
    shopper.follow_redirect!
    assert_equal root_path, shopper.path

    order = Order.last
    admin.get orders_path
    admin.assert_select "#orders #order_#{ order.id }" do
      admin.assert_select "a[href=?]", order_path(order.id)
    end
  end

  private

  def login_as(user)
    open_session do |sess|
      sess.post login_path, name: user.name, password: "secret"
      sess.follow_redirect!
      assert_equal root_path, sess.path
    end
  end
end
{% endcodeblock %}

The test above covers several of the features I just mentioned: multiple requests spread over different controllers, multiple sessions, and so on.  Also, since integration tests don't map directly to any specific source file but rather wander all around your application, they're named and organized according to functional scenarios rather than code.

Integration tests run a lot more code, both within your application and the Rails stack as well as in the tests themselves, and usually require a more involved setup.  You should therefore expect that they will run slower than more dense controller tests - anywhere from 5x to 10x slower in terms of assertions run per second is what I've observed, depending on test complexity.

The syntax used by integration tests has a lot in common with the API used for controller tests with a few additions specific to their use case:

* Helpers for simulating different types of HTTP requests and managing sessions
* Specialized assertions for verifying information specific to the HTTP response, rendered page
* Access to routing helper methods, fixture data, and other Rails goodies

The resulting tool set gives developers an API for making requests and verifying the results, albeit one that requires a lot of low-level knowledge of the application and its architecture.  Think of it as a not-terribly-bright client talking to the application.

### Acceptance Tests ###

OK, so integration tests can push simulated requests through the complete Rails software stack - the router, controllers, models, and so on.  But is that really your whole application?  Ten years ago the answer would probably have been "yes", but today you might want to think about what else your application has going on.  The typical Rails application has changed a lot since those days, and most modern web apps now include complex scripting and styling that also needs to be tested.  If your application only uses "sprinkles" of Javascript, then integration tests might be just what you need.  But now, when I find myself spending 50% or more of my development time working on front-end codefor some applications, I don't feel confident using only simulated HTTP requests.  I want something more like simulated interactions.

I use the term *acceptance test* to refer to a type of automated test that checks the <u>complete</u> application from the user's perspective and verifies that it meets certain requirements.  (The term has its origins in engineering, so there are many variations of this definition, but this is the one I use.)  As I see it, my acceptance testing stack needs two important features:

1. Tests are defined with a **user-oriented API** that mirrors the actions a user would perform to navigate the application, trigger actions, fill in and select values in form fields, and so on.
2. The test harness has to exercise the **whole application** including script and stylesheet evaluation.  You need this in order to ensure that the test sees what a real user would see when viewing the application.  Otherwise, it might be possible, for example, to click a button that's not visible or not active.

Rails integration tests won't do either of these things on their own, so they don't qualify as acceptance tests.  This is why I add [Capybara](https://github.com/jnicklas/capybara) to my suite for these kinds of high level tests which gives me all of the following added features:

* Pluggable back-end drivers that give you several options ranging from simple (markup only) to the full-featured (full evaluation of Javascript and CSS styles)
* A slick, natural API that allows tests to be defined in language that mimics user interaction with the browser
* Management of multiple sessions
* Automatic following of redirect responses
* Ability to follow external URLs

The acceptance test below is similar to the Rails integration test presented previously, and it showcases many of the Capybara features from the list above.  It's installed and integrated with Minitest and Rails using the [minitest-rails-capybara](https://github.com/blowmage/minitest-rails-capybara) gem.

{% codeblock lang:ruby test/features/shopper_interactions_test.rb %}
require "test_helper"

feature "Shopper Interactions" do
  scenario "place order and check orders admin", js: true do
    shopper = login_as users(:user)
    admin = login_as users(:administrator)

    product = products(:rails_book)
    shopper.visit root_path
    shopper.within "div#cart" do
        shopper.must_have_content "Your cart is empty."
    end

    shopper.within "#entry_#{ product.id }" do
      shopper.click_button "Add to Cart"
    end

    shopper.within "#cart" do
      shopper.within ".current_item" do
        shopper.must_have_css ".quantity", text: "1×"
        shopper.must_have_css ".title", text: product.title
        shopper.must_have_css ".price", text: sprintf("$%.2f", product.price)
      end

      shopper.must_have_css ".total_line .total_cell", text: sprintf("$%.2f", product.price)
    end

    shopper.click_button "Checkout"
 
    shopper.fill_in "Name", with: "Chris Kottom"
    shopper.fill_in "Address", with: "My house"
    shopper.fill_in "Email", with: "chris@example.com"
    shopper.select "Credit Card", from: "Pay type"
    -> { shopper.click_button "Create Order" }.must_change "Order.count", 1

    shopper.must_have_content "Thank you for your order."
    shopper.must_have_content "Your cart is empty."

    order = Order.last
    admin.visit orders_path
    admin.within "#orders #order_#{ order.id }" do
      admin.must_have_css "a[href='#{ order_path(order.id) }']"
    end
  end

  private

  def login_as(user)
    session = Capybara::Session.new :poltergeist, Rails.application
    session.visit root_path
    session.click_link "Login"
    session.fill_in "Name", with: user.name
    session.fill_in "Password", with: "secret"
    session.click_button "Save changes"
    session.must_have_content "Signed in as #{ user.name }"
    session
  end
end
{% endcodeblock %}

The test uses the standard Capybara DSL which includes methods like `visit` and `click_button` combined with specialized Minitest-based assertions for verifying the presence of content and DOM elements that should be presented to the user.  The test is simple and direct enough to follow for both developers and business users alike.

Here, I'm using the [Poltergeist](https://github.com/teampoltergeist/poltergeist) driver for Capybara which piggybacks on the [PhantomJS](http://phantomjs.org/) headless testing tool (separate install).  In this example, I'm enabling Javascript evaluation by defining the test scenario with the `:js` option set to true, but in cases where I don't need that feature, Capybara will default to the [rack-test](https://github.com/brynary/rack-test) back end for faster test execution.

You'll notice that the acceptance test above is longer LOC-wise than the equivalent integration test.  In part, that's because Capybara lets you fill in a virtual HTML form rather than just slinging requests and parameters at the router.  Also, given the added overhead of JS and CSS evaluaation and the fact that Capybara spins up a complete server for your application in a separate thread, the acceptance test is also substantially slower than the integration test - perhaps 2-4x slower for this example depending on the driver in use.

Some of you might be asking: why not use [Cucumber](https://cucumber.io/) to define your acceptance tests?  Like a lot of hotnesses that have shown up on my radar over the years, I gave Cucumber a try, and I found it to be a poor fit for the way I work.  The additional layer of abstraction made it hard to keep sight of what my tests were supposed to be doing and, frankly, I've never once been able to sell a customer on the benefits of transparency and shared test ownership of Cucumber-based suites that's the main selling point of a tool like Cucumber.  I can imagine that method of operation working in a larger organization that has dedicated test developers and business analysts working together on projects over a longer period of time, but for a freelancer, it's too much overhead.

### Conclusions? ###

Each of these types of tests has its own strengths and weaknesses and is used for a different purpose in your Rails test suite.

* Controller tests are the fastest of the three and are great at isolating and fully exercising controller classes.  Use them to exhaustively test your controller classes in isolation from the view.
* Integration tests strike a balance between faster, leaner controller tests and slower but more feature-rich acceptance tests.  I could see them being particularly effective at testing an API with a stateful component.
* Acceptance testing as I describe here provides a framework for automated end-to-end testing of all layers of the modern web application with a super-friendly API.  If you're writing a standard server-rendered Rails application, especially with a substantial amount of client-side scripting, this would be part of my suite.

So how do I use these different types of tests, you might be asking?  (If you've gotten this far into the article, I'm going to assume you're interested.)

* I write extensive controller tests in parallel with my controller code as I'm filling in the logic.  The final test cases usually include success and (sometimes multiple) failure scenarios for each controller action which ensures that I finish with good coverage.  The individual tests are usually relatively short and sweet - control the preconditions and inputs, make assertions about the response and side effects as outlined above.
* As my apps have come to include more Javascript in the past year or two, I've gotten into the very good and responsible habit of writing more acceptance tests.  During that time, I've grown more comfortable with the Capybara API and have standardized on the [Poltergeist](https://github.com/teampoltergeist/poltergeist) driver when I need Javascript eval.  In the future, I'm thinking about experimenting with writing some basic acceptance tests first before coding features where I have well-established requirements in advance, but right now at least, most of my acceptance tests are used for regression.
* I don't use Rails integration tests at all.  For me, these provide less functionality and comfort than the equivalent acceptance tests based on Capybara, even if they do run somewhat slower.  As I mentioned above though, I could see myself using these for certain API-based applications in the future.

{% include mailchimp/minitest_after_post3.html %}

