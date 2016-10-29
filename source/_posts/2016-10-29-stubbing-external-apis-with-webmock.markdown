---
layout: post
title: "Stubbing External APIs with WebMock"
date: 2016-10-29 17:32:55 +0200
comments: true
categories: ["Ruby", "WebMock", "JSON", "external APIs", "web services", "testing", "Minitest", "test doubles", "stubs"]
description: Learn to stub external web services and APIs with WebMock during testing, and keep your Ruby and Rails tests manageable, clean, fast, and reliable.
---
One of the projects I've been working on most recently consists of three separate Rails applications using data from several third-party providers.  When your application is built on flinging JSON blobs all over the place, you can't use the same direct testing style that you would with a monolith since it leaves you open to all sorts of potential problems including:

* Lousy test performance due to network overhead
* Unexpected failures caused by connectivity issues, API rate limiting, and other problems
* Undesired side effects from using a real web service (possibly even in the production environment)

But the bigger problem is the control you give up when using a real API in tests.  Working against a real system, it's a real trick to exercise your code against a full range of reasonable (and some unreasonable) responses, so you're usually stuck testing a few "happy path" scenarios and those issues that might throw an exception.<!--more-->

## Straight Outta the Headlines, A Practical Example

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

There's no way to know in advance, of course, what results the API will deliver on any given test run, so it's really unlikely that this test will ever pass.

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

Ignoring the obvious failure, a single test took nearly *one whole second* to run, and most of that was time spent talking to the API.  As we add more tests, each of which will make their own requests, the time to run the suite can be expected to increase linearly - assuming of course that the provider doesn't get tired of the constant requests and simply block our IP.

We need a way to test our handling code isolated from the network and the unpredictable results of the real API.

## WebMock to the Rescue

[WebMock](https://github.com/bblimke/webmock) is a gem that integrates with all the major testing frameworks (including [Minitest](https://github.com/seattlerb/minitest), natch) and allows us to stub and set expectations on HTTP requests made during testing.  By stubbing network requests and responses several layers removed from our application code, we can inject canned responses with a degree of control we'd never get using the API directly.

The rest of this post describes how I've used WebMock in my own tests and the methods I've used to keep my tests clean and manageable while removing the problems that come with integrated systems.

### Step 1: Unplug from the Internet.

Begin to isolate your tests by globally shutting down all HTTP requests.  Just include the gem in your Gemfile and add the following lines to your test helper:

{% codeblock lang:ruby test/test_helper.rb %}
require 'webmock/minitest'
WebMock.disable_net_connect!
{% endcodeblock %}

WebMock includes stub adapters for Net::HTTP and most other popular HTTP libraries, so any test attempting to make an HTTP request will terminate with an error.

### Step 2: Stub individual requests.

If we run our tests now, WebMock will provide a helpful message with stub code we can use directly in our test.

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

For a small application, that might be enough, but for larger projects, we'll want to refactor and improve test readability before we call it a day.  First, I want to extract the stub code to a helper method in a separate mixin.  It helps to declutter this test and maintains a nice level of DRY-ness.  In most cases, I'll let the helper method take a Hash of options to give me some flexibility over essential variables like HTTP status code, query string, and response body.

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

Next, I've found it a good practice to extract the test data from the helper method to a [fixture file](https://github.com/chriskottom/fivethirtyeight-tracker/tree/master/test/fixtures/json/fivethirtyeight_summary.json) which I'll usually place under the `test/fixtures/json` directory.  It leaves the Ruby code cleaner still, and it ensures that we can load the data from within the test body if the need arises.  I've got a number of helper methods that simplify access to the data in [a simple helper mixin](https://github.com/chriskottom/fivethirtyeight-tracker/tree/master/test/support/json_fixtures.rb) which I can then include in classes and modules that need it.

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

That allows us to simplify the API helper mixin quite a bit:

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

And finally, we end up with a nice clean test body:

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

Running the tests one last time shows that we've solved both of the problems we had before: the test passes, and the suite is hundreds of times faster than it was.

{% codeblock lang:bash %}
$ > rake
Run options: --seed 49193

# Running:

.

Finished in 0.003122s, 320.3415 runs/s, 1922.0488 assertions/s.

1 runs, 6 assertions, 0 failures, 0 errors, 0 skips
{% endcodeblock %}

## Always Read the Fine Print

WebMock is a polished tool that solves a very specific problem, but you need to understand the downsides.  As I'm writing this, it's just a few days until election day, and I expect that the FiveThirtyEight API this code uses will disappear shortly thereafter.  But my tests won't know that, and so I'll be in the confusing position of having green tests and a broken application.  It's the same problem that affects other types of test doubles.  By using them, you're copying the assumptions your code makes about a service beyond your control to your tests and isolating your tests from the real thing.
