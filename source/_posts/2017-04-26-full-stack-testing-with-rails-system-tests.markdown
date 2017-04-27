---
layout: post
title: "Full-Stack Testing with Rails System Tests"
date: 2017-04-26 08:29:46 +0200
comments: true
categories: [development, Rails, Ruby, "Ruby on Rails", testing, "system tests", Capybara, Minitest]
description: Rails 5.1 introduces system tests for simulating browser interactions with their applications. In this post, we explore the new addition and see how you can apply it in your own projects.
---
{% img no-border right /images/unit-tests-passing-no-integration-tests.jpg 400 Two unit tests passing, no integration tests %}
Ruby on Rails' bundled support for automated testing has contributed to building a culture of testing within the community, but it's also been a source of some debate. Differences in testing styles and preferences have spawned long-running discussions and flame wars over the years. Most of this amounts to bikeshedding, but if there's one area where The Rails Way has lagged behind RSpec, it's been in the area of end-to-end application testing. RSpec has long had expressive feature specs based on [Capybara](https://github.com/teamcapybara/capybara), while Rails default integration tests, though functional, have never been as expressive.

With the release of version 5.1, Rails introduces **system tests** built on Capybara. These look like just the thing to fill this longstanding gap, and the fact that they'll be configured to work right out of the box with no additional setup required will make it easier for more developers to start using them. In this post, we're going to look at the approach Rails takes toward system tests and what kind of advantages they offer over both old-school integration tests and current solutions for testing apps with Capybara.<!--more-->

## Baseline: A Rails Integration Test

Up until now, the standard solution for testing complex interactions spanning multiple page views has been the **integration test**. It provides basic support for sending requests to the application and making assertions about the responses - the status code, headers, and response HTML - and it does all of this withing the context of a virtual session which gives the test access to persistent state such as session data and Rails flash. (Since Rails 5.0, controller tests have also inherited from the same `ActionDispatch::IntegrationTest` class making these functionally, if not logically, equivalent.)

This example shows how an integration test can be used to simulate the creation of a new User over several requests.

{% codeblock lang:ruby test/integration/create_new_user_test.rb %}
require 'test_helper'

class CreateNewUserTest < ActionDispatch::IntegrationTest
  test 'creating a new User' do
    # Visit the index page
    get users_url
    assert_select 'a', 'New User'

    # Click the New User link
    get new_user_url
    assert_response :ok
    assert_select 'h1', 'New User'
    assert_select 'form' do
      assert_select 'input#user_email'
      assert_select 'input#user_password'
      assert_select 'input#user_password_confirmation'
    end

    # Submit the form
    user_attributes = {
      email: 'user1@example.com',
      password: 'secret',
      password_confirmation: 'secret'
    }
    post users_url, params: { user: user_attributes }
    assert_response :redirect
    follow_redirect!

    # Verify that the User was created
    assert_select '#notice', 'User was successfully created.'
    assert_select '#email', "Email:\n  user1@example.com"
    assert_select 'a', 'Back'

    # Verify that User appears in listing
    get users_url
    assert_select 'table' do
      assert_select 'tr td', 'user1@example.com'
    end
  end
end
{% endcodeblock %}

At first glance, we see that the test is written using technical language. Requests are defined as interactions between the test and the server, not between the user and the interface. It also assumes a certain amount of knowledge about the application's implementation. For example, in some places the test asserts the presence of an element on the page and then takes an action we know to be associated with that element. The connection between the element and the action is only implied, never direct.

Integration tests also only ever look at the HTML that's rendered by the server, ignoring any changes made by JavaScript running in the browser. In modern web applications, the DOM is a living, breathing thing, so while naive tests like this were adequate back in the days of Basecamp version 1 it's not enough for most current apps.

## Moving to System Tests

<figure class="right" style="margin:0 0 15px 15px">
  <img class="no-border" src="/images/capybara-god-of-thunder.jpg" style="margin:0">
  <figcaption style="text-align:center;margin-top:0px">
    Capybara, God of Thunder<br/>(Actually, looks more like a woodchuck to me)
  </figcaption>
</figure>
System tests occupy a role similar to integration tests, but they add several important features that make them even more well suited to the kinds of applications we're building today. By leveraging Capybara, which is already mature and well-known to much of the Rails community, they've been able to avoid reinventing the wheel and have instead focused on integration with the framework and the existing testing tools to ensure ease of use.

<p class="clearfix">This example system test is roughly equivalent to the integration test we looked at before.</p>

{% codeblock lang:ruby test/system/users_test.rb %}
require "application_system_test_case"

class UsersTest < ApplicationSystemTestCase
  test 'creating a new User' do
    # Visit the index page
    visit users_url

    # Click the New User link
    click_link 'New User'
    assert_selector 'h1', text: 'New User'

    # Submit the form
    fill_in 'Email', with: 'user1@example.com'
    fill_in 'Password', with: 'secret'
    fill_in 'Password confirmation', with: 'secret'
    click_button 'Create User'

    # Verify that the User was created
    assert_selector '#notice', text: 'User was successfully created.'
    assert_selector '#email', text: 'Email: user1@example.com'

    # Verify that User appears in listing
    click_link 'Back'
    within 'table' do
      assert_selector 'tr td', text: 'user1@example.com'
    end
  end
end
{% endcodeblock %}

Capybara's DSL ([see this cheat sheet](https://gist.github.com/zhengjia/428105)) lets you define test cases using the same terminology you'd use to describe navigating an application in a web browser. Instead of scripting `get` and `post` requests sent and responses received, we're now speaking in terms of forms filled in and links clicked. The tests are more expressive in fewer lines of code than an equivalent integration test.

Under the default configuration, Rails system tests will run the application and tests in separate threads with the help of Capybara's [Selenium](https://github.com/SeleniumHQ/selenium/wiki/Ruby-Bindings) driver. During test execution, Selenium will open a separate browser window (by default, Chrome using [ChromeDriver](https://sites.google.com/a/chromium.org/chromedriver/) installed separately) in which the tests will run. This is all preconfigured for you in the `test/application_system_test_case.rb` file that you see required at the top of the example system test above.

{% codeblock lang:ruby test/application_system_test_case.rb %}
require "test_helper"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :chrome, screen_size: [1400, 1400]
end
{% endcodeblock %}

Rails supports other Capybara drivers as well, so we can swap out Selenium for another option using the same `driven_by` method. In some cases, configuring the driver may require an additional driver-specific setup block. See the READMEs for individual drivers for complete documentation. (In this case, for example, you see JS errors switched off because of problems with the `application.js` generated by Sprockets in this Rails release candidate.)

{% codeblock lang:ruby test/application_system_test_case.rb %}
require "test_helper"
require "capybara/poltergeist"
require "capybara/webkit"

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  driven_by :selenium, using: :chrome, screen_size: [1400, 1400]

  # Rack::Test
  # driven_by :rack_test

  # capybara-webkit
  # Capybara::Webkit.configure do |config|
  #   config.raise_javascript_errors = false
  # end
  # driven_by :webkit

  # Poltergeist
  # Capybara.register_driver :poltergeist do |app|
  #   Capybara::Poltergeist::Driver.new(app, js_errors: false)
  # end
  # driven_by :poltergeist
end
{% endcodeblock %}

Each of the drivers has different characteristics and capabilities according to its implementation. [Rack:Test](https://github.com/rack-test/rack-test) works a lot like Rails integration tests, and offers similar performance. Headless drivers like [capybara-webkit](https://github.com/thoughtbot/capybara-webkit) and [Poltergeist](https://github.com/teampoltergeist/poltergeist)offer a balance of JavaScript evaluation and acceptable performance. The table below summarizes the current driver options.

<table class="results" style="width:100%">
  <colgroup>
    <col style="width:15%">
    <col style="width:20%">
    <col style="width:20%">
    <col style="width:20%">
  </colgroup>
  <tbody>
    <tr>
      <th></th>
      <th class="center">Rack::Test</th>
      <th class="center">Capybara::Webkit</th>
      <th class="center">Poltergeist</th>
      <th class="center">Selenium</th>
    </tr>
    <tr>
      <td class="right">Type</td>
      <td class="center">headless</td>
      <td class="center">headless</td>
      <td class="center">headless</td>
      <td class="center">browser-based</td>
    </tr>
    <tr>
      <td class="right">Concurrency</td>
      <td class="center">single-threaded</td>
      <td class="center">multithreaded</td>
      <td class="center">multithreaded</td>
      <td class="center">multithreaded</td>
    </tr>
    <tr>
      <td class="right">Speed</td>
      <td class="center">fast</td>
      <td class="center">not bad</td>
      <td class="center">not bad</td>
      <td class="center">pretty slow</td>
    </tr>
    <tr>
      <td class="right">Dependencies</td>
      <td class="center">none</td>
      <td class="center"><a href="https://trac.webkit.org/wiki/QtWebKit">QtWebKit</a></td>
      <td class="center"><a href="http://phantomjs.org/">PhantomJS</a></td>
      <td class="center"><a href="https://sites.google.com/a/chromium.org/chromedriver/">ChromeDriver</a></td>
    </tr>
    <tr>
      <td class="right">Script Eval</td>
      <td class="center">no</td>
      <td class="center">yes</td>
      <td class="center">yes</td>
      <td class="center">yes</td>
    </tr>
  </tbody>
</table>

<h2><img class="no-border left" src="/images/but-wait-theres-more.png" title="But wait, there's more!" /></h2>

Rails has followed a pretty consistent pattern of wrapping existing tools and layering on additional features and functionality that improve integration and ease of use, and that pattern continues. To that end, this initial implementation of system tests includes a couple of nice extended features that you should be aware of.

First, managing database access and consistency between Capybara and Rails has always been a chore. Because the test and the application often run in separate threads, they've generally been unable to share state and transactions in the same way that other single-threaded Rails tests do. This removed the possibility of running tests within transactions that could be rolled back during the teardown and instead forced the use of [Database Cleaner](https://github.com/DatabaseCleaner/database_cleaner) and other similar workarounds to return to a consistent state.

In this implementation, though, the application and test threads will share a single database connection between them, so they will operate within a single transaction and subsequently share a common view of the database - all out of the box.

Rails also generates screenshots for all failed and errored out system tests by default and tucks them into `tmp/screenshots`. This is a feature that's going to come in handy - especially for long-running tests and extra-especially as applications continue to move more logic to the client.

So far I'm loving this combination of (no) setup and (more) features that system tests provide. If you've read about my previous setup based on [minitest-rails-capybara](https://github.com/blowmage/minitest-rails-capybara) in [The Minitest Cookbook](https://chriskottom.com/minitestcookbook/), let me be clear: this is my new jam, and I'll be shipping an update to the book sometime after Rails 5.1 officially ships that covers system tests.

Big ol' thanks to [@eileencodes](https://twitter.com/eileencodes) for shepherding this feature into Rails. If you're interested in all the inside baseball about the development of this feature, you should really check out [the slides from her RailsConf talk](https://speakerdeck.com/eileencodes/building-the-new-rails-system-test-framework).

## Using System Tests: Need vs. Speed

{% img no-border right /images/test-pyramid.png 400 The Test Pyramid %}
There was a time when acceptance tests like these were nice-to-have, but most applications are past that at this point. If you have any significant JS running on the client, anything that materially affects the DOM, then they're really must-have tests in your suite. All other things being equal, the more of your application that you can cover with system tests, the better.

Unfortunately, all things are not equal. System tests exercise more of the application and tend contain many more assertions than lower level tests, so they also tend to run slower. How much slower depends on your tests and the driver you're using, but they're usually slow enough that you'll probably want to think twice about running them all the time. But from what I've seen so far, Rails provides some good defaults related to the new feature including:

* Runs system tests only when explicitly invoked with `rails test:system`, not as part of the default test task
* Generates system tests by default, but allows opt-out with the `--skip-system-test` option on `rails new`

As a rule, I think it's a good policy to run unit-level tests (models, controllers, background jobs and helpers) often while you're working. Then, when you think you've  got something ready to check in, run the entire test suite. Rails makes it easy to do that by passing a path to the test runner.

{% codeblock %}
chris@erdos:~/Projects/tiny_projects/blogg > rails test test/
{% endcodeblock %}

{% include mailchimp/minitest_after_post3.html %}
