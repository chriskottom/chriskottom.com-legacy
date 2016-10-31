---
layout: post
title: "Stubbing External APIs with WebMock"
date: 2016-10-29 17:32:55 +0200
comments: true
categories: ["Ruby", "WebMock", "JSON", "external APIs", "web services", "testing", "Minitest", "test doubles", "stubs"]
description: Learn to stub external web services and APIs with WebMock during testing, and keep your Ruby and Rails tests manageable, clean, fast, and reliable.
---
I've recently been working on a number of projects that are built on multiple Rails applications, microservices, and data from third-party providers.  I can tell you one thing for sure: when your application is flinging JSON blobs all over the place, you can't use the same direct testing style that you would with a monolith.  Do so, and you create all sorts of problems for yourself including:

* Lousy test performance due to network overhead
* Unexpected failures caused by connectivity issues, API rate limiting, and other problems
* Undesired side effects from using a real web service (possibly even in the production environment)

But the thornier problem is the lack of control you have when using live APIs for testing.  Working against a real system, it becomes a real trick to exercise your code against a full range of reasonable (and unreasonable) responses, so you find yourself stuck testing a few "happy path" scenarios and perhaps any cases that might happen to throw an exception from somewhere in the stack.<!--more-->

## A Practical (and Mercifully Short-Term) Application

So as an example (and with no small amount of fear and loathing) I wrote [a little program](https://github.com/chriskottom/fivethirtyeight-tracker) that grabs the data feed from [fivethirtyeight.com](http://projects.fivethirtyeight.com/2016-election-forecast/) and uses it to display a simple red and blue ASCII progress bar showing the current state of the race.

<a target="_blank" href="/images/fivethirtyeight_tracker.png"><img class="no-border center" src="/images/fivethirtyeight_tracker.png" title="FiveThirtyEight Tracker"></a>

The program includes [a simple feed class](https://github.com/chriskottom/fivethirtyeight-tracker/tree/master/lib/fivethirtyeight/feed.rb) that fetches the latest forecast from the external service and pulls out the information we need.  The test for this class looks something like this:

{% codeblock lang:ruby test/fivethirtyeight/feed_test.rb %}
describe FiveThirtyEight::Feed do
  let(:feed) { FiveThirtyEight::Feed.new }

  it "delivers a simplified result set from the complete feed" do
    forecast = feed.current_forecast

    expect(forecast.dig(:D, :party)).must_equal "D"
    expect(forecast.dig(:D, :candidate)).must_equal "Clinton"
    expect(forecast.dig(:D, :probability)).must_equal 80.0
  end
end
{% endcodeblock %}

There's no way of knowing in advance what results the API will return on any given test run, so the odds that this test would ever pass are extremely low.

{% codeblock lang:bash %}
$ > rake
Run options: --seed 5244

# Running:

F

Finished in 0.886768s, 1.1277 runs/s, 3.3831 assertions/s.

  1) Failure:
FiveThirtyEight::Feed#test_0001_delivers a simplified result set from the complete feed [/home/ck1/Projects/fivethirtyeight_tracker/test/fivethirtyeight/feed_test.rb:11]:
Expected: 80.0
  Actual: 82.16

1 runs, 3 assertions, 1 failures, 0 errors, 0 skips
rake aborted!
{% endcodeblock %}

Ignoring the fact that this test fails, it took nearly *one whole second* to run with most of that time spent talking to the API.  As we add more tests will multiply the number of requests which will increase testing time linearly.  (Assuming, of course, that the provider doesn't get tired of the constant requests and simply block our IP.)

In short: we need to be able to test the application code isolated from the real API.

## WebMock to the Rescue

[WebMock](https://github.com/bblimke/webmock) is a gem that integrates with all the major testing frameworks (including [Minitest](https://github.com/seattlerb/minitest), natch) and allows us to stub and set expectations on HTTP requests made during testing.  By stubbing network requests and responses several layers removed from our application code, we can inject canned responses with a degree of control we'd never get using the API directly.

In the rest of this post, I'll describe how I've used WebMock in my own tests to solve the problems described above, and I'll show how to organize your code to keep your tests clean and manageable.

### Step 1: Unplug from the Internet.

Begin to isolate your tests by globally shutting down all HTTP requests.  Just include the `webmock` gem in your Gemfile, and add the following lines to your test helper:

{% codeblock lang:ruby test/test_helper.rb %}
require 'webmock/minitest'
WebMock.disable_net_connect!
{% endcodeblock %}

WebMock includes stub adapters for Net::HTTP and most other popular HTTP libraries, so any test attempting to make an HTTP request will terminate with an error.

### Step 2: Stub individual requests.

If we run tests now, we'll see that WebMock provides a helpful message with stub code we can use directly in our test.

{% codeblock lang:bash %}
$ > rake
Run options: --seed 1257

# Running:

E

Finished in 0.001997s, 500.7256 runs/s, 0.0000 assertions/s.

  1) Error:
FiveThirtyEight::Feed#test_0001_delivers a simplified result set from the complete feed:
WebMock::NetConnectNotAllowedError: Real HTTP connections are disabled. Unregistered request: GET http://projects.fivethirtyeight.com/2016-election-forecast/summary.json with headers {'Accept'=>'*/*', 'Accept-Encoding'=>'gzip;q=1.0,deflate;q=0.6,identity;q=0.3', 'Host'=>'projects.fivethirtyeight.com', 'User-Agent'=>'Ruby'}

You can stub this request with the following snippet:

stub_request(:get, "http://projects.fivethirtyeight.com/2016-election-forecast/summary.json").
  with(:headers => {'Accept'=>'*/*', 'Accept-Encoding'=>'gzip;q=1.0,deflate;q=0.6,identity;q=0.3', 'Host'=>'projects.fivethirtyeight.com', 'User-Agent'=>'Ruby'}).
  to_return(:status => 200, :body => "", :headers => {})

1 runs, 0 assertions, 0 failures, 1 errors, 0 skips
{% endcodeblock %}

Using this as a basis, we can now update the test and get it to pass.

{% codeblock lang:ruby test/fivethirtyeight/feed_test.rb %}
describe FiveThirtyEight::Feed do
  let(:feed) { FiveThirtyEight::Feed.new }

  it "delivers a simplified result set from the complete feed" do
    url = "http://projects.fivethirtyeight.com/2016-election-forecast/summary.json"
    status = 200
    body = [
      {
        state: "US",
        latest: {
          D: {
            party: "D",
            candidate: "Clinton",
            models: { polls: { winprob: 80.0 } }
          }
        }
      }
    ].to_json
    stub_request(:get, url).to_return(:status => status, :body => body)

    forecast = feed.current_forecast

    expect(forecast.dig(:D, :party)).must_equal "D"
    expect(forecast.dig(:D, :candidate)).must_equal "Clinton"
    expect(forecast.dig(:D, :probability)).must_equal 80.0
  end
end
{% endcodeblock %}

### Step 3: Refactor.

For a small application, we might just stop here, but for larger projects, it's a good idea to refactor and improve test readability before calling it a day.  To begin with, I'll extract the stub code to a helper method in a separate mixin.  This helps to declutter the test body and keeps the focus on the intent of the test, not the details of the request.  I usually write helper methods that take a Hash of options which provides some flexibility over essential variables like HTTP status code, query string, and response body.

{% codeblock lang:ruby test/support/fivethirtyeight_helpers.rb %}
module FiveThirtyEightHelpers
  def stub_summary_request(options = {})
    url = "http://projects.fivethirtyeight.com/2016-election-forecast/summary.json"
    status = options.fetch(:status, 200)
    response_body = options.fetch(:response_body, [
      {
        state: "US",
        latest: {
          D: {
            party: "D",
            candidate: "Clinton",
            models: { polls: { winprob: 80.0 } }
		  }
        }
      }
    ].to_json)
    stub_request(:get, url).to_return(status: status, body: response_body)
  end
end
{% endcodeblock %}

Next, I like to extract the test data to a [fixture file](https://github.com/chriskottom/fivethirtyeight-tracker/tree/master/test/fixtures/json/fivethirtyeight_summary.json) which I usually place under the `test/fixtures/json` directory.  It leaves the Ruby code cleaner still, and it ensures that we can load the data from within the test body if the need arises.  I've written a number of helper methods that simplify access to the data as [a module](https://github.com/chriskottom/fivethirtyeight-tracker/tree/master/test/support/json_fixtures.rb) which I can then include in any classes and modules that need it.

{% codeblock lang:ruby test/support/json_fixtures.rb %}
module JSONFixtures
  # Return the path to the JSON fixtures directory
  def json_dir
    File.join File.dirname(__FILE__), "../fixtures/json"
  end

  # Return a filename for a JSON fixture
  def json_file(filename)
    File.join json_dir, filename
  end

  # Return the contents of a JSON fixture as a String
  def json_string(filename)
    File.read json_file(filename)
  end

  # Return the contents of a JSON fixture as a data structure
  def json_struct(filename)
    JSON.parse json_string(filename)
  end
end
{% endcodeblock %}

You can see for yourself how the API helper mixin and the test itself have benefited from the refactoring:

{% codeblock lang:ruby test/support/fivethirtyeight_helpers.rb %}
module FiveThirtyEightHelpers
  include JSONFixtures

  def stub_summary_request(options = {})
    url = "http://projects.fivethirtyeight.com/2016-election-forecast/summary.json"
    status = options.fetch(:status, 200)
    response_body = options.fetch(:response_body,
                                  json_string("fivethirtyeight_summary.json"))
    stub_request(:get, url).to_return(status: status, body: response_body)
  end
end
{% endcodeblock %}

{% codeblock lang:ruby test/fivethirtyeight/feed_test.rb %}
describe FiveThirtyEight::Feed do
  include FiveThirtyEightHelpers

  let(:feed) { FiveThirtyEight::Feed.new }

  it "delivers a simplified result set from the complete feed" do
    stub_summary_request
    forecast = feed.current_forecast

    expect(forecast.dig(:D, :party)).must_equal "D"
    expect(forecast.dig(:D, :candidate)).must_equal "Clinton"
    expect(forecast.dig(:D, :probability)).must_equal 80.0
  end
end
{% endcodeblock %}

Running the tests one last time, the results show that we've addressed both of the problems we set out to solve: the test passes, and the suite is hundreds of times faster than it was.

{% codeblock lang:bash %}
$ > rake
Run options: --seed 49193

# Running:

.

Finished in 0.003122s, 320.3415 runs/s, 1922.0488 assertions/s.

1 runs, 6 assertions, 0 failures, 0 errors, 0 skips
{% endcodeblock %}

## Limitations, Conditions, and Other Fine Print

WebMock is a polished tool that solves a very narrow class of problems, but to use it effectively, you need to remain conscious of your objectives.  Specifically, you have zero control over the availability and responses delivered from the external service, so you cannot verify the behavior of your application as a whole.  Your request stubs represent a set of assumptions you've made about the way the API works.  These assumptions already exist in your code, but you're now effectively copying them into your tests as well.  When the API changes or disappears, it's the responsibility of the developer to update those assumptions accordingly.

The FiveThirtyEight Tracker example makes this point perfectly.  As I'm writing this, it's just a few days until election day, and I can reasonably expect that the API this code uses will disappear shortly thereafter.  My tests won't know that though, so if I'm not careful, I could find myself in the confusing position of having green tests and a broken application.
