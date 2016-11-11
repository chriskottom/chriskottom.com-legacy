---
layout: post
title: "(Keep On) WebMockin' in the Real World"
date: 2016-11-08 11:54:11 +0100
comments: true
categories: ["Ruby", "WebMock", "external APIs", "testing", "Minitest", "stubs"]
description: In the last post, we introduced WebMock as a helpful library for stubbing external integrations.  Now here are some more advanced patterns for using WebMock to solve specific cases in your tests.
---
{% img no-border right /images/neil-young.png 600 Keep on rockin' %}
[In the last article](/blog/2016/10/stubbing-external-apis-with-webmock/), I explained why it's a bad idea to test your Ruby code against real API endpoints and introduced [WebMock](https://github.com/bblimke/webmock) as one option for stubbing out those integrations and keeping your tests speedy and manageable even as your suite grows.

That post used a really basic [example application](https://github.com/chriskottom/fivethirtyeight-tracker) to show how to structure your tests under a simple use case.  But writing and testing distributed applications is rarely that simple, and most of the time, you'll find yourself needing to stub whole classes of requests and handle a number of common edge cases.  So using the patterns from last time as a baseline, let's now take a look at some other practical WebMock techniques to help you use it more effectively.<!--more-->

## Constrain a Request Stub

Basic stubbing of HTTP requests with WebMock can be pretty straightforward, as we saw last time:

{% codeblock lang:ruby test/fivethirtyeight/feed_test.rb %}
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

This works just fine for simple cases like the one in that example application, but expect that sometimes you'll need to demonstrate that parameters are passed to the endpoint as expected.  That means checking the HTTP headers, query string, and request body.  Fortunately `WebMock::RequestStub` provides the `with` method that allows users to do just that.

{% codeblock lang:ruby %}
# GET request with query Hash
stub_request(:get, url).
  with(query: { q: 'chunky%20bacon' }).
  to_return(status: 200, body: get_response_body)

# POST request with HTTP headers and body Hashes
stub_request(:post, other_url).
  with(headers: { 'Content-Type' => 'application/json',
                  'User-Agent' => 'Faraday v0.9.2' },
       body: { animal: 'cartoon fox', vegetable: 'chunky bacon' }).
  to_return(status: 200, body: post_response_body)
{% endcodeblock %}

Request query and body Strings are parsed (regardless of encoding method - e.g. URL encoding, XML, JSON) and compared to any Hash instances passed via the `query` and `body` parameters.  WebMock will also accept Strings for these parameters, but in this case, keep in mind that parameter order matters.

In cases where you don't care about all of the parameters in the query string or request body, you can use the `hash_including` method to indicate a partial match:

{% codeblock lang:ruby %}
# In the query string
stub_request(:get, url).
  with(query: hash_including({ q: 'chunky bacon', a: 'pet ham' })).
  to_return(status: 200, body: get_response_body)

# In the body
stub_request(:post, other_url).
  with(body: hash_including({ animal: 'cartoon fox' })).
  to_return(status: 200, body: post_response_body)
{% endcodeblock %}

## Generalize a Request Stub

Some of the stub parameters can also be regular expressions in cases where we want stubs to respond to a wider range of requests:

{% codeblock lang:ruby %}
# URL: matches both http/https, different domains
stub_request(:get, /^https?:\/\/(www|staging|test)\.example\.com\//).
  to_return(status: 200, body: get_response_body)

# Headers: send request with MSIE 6 user-agent
stub_request(:get, url).
  with(headers: { 'User-Agent' => /compatible; MSIE 6\.0/ }).
  to_return(status: 200, body: get_response_body)

# Body: ensure that the user's token is somewhere in the POST body
stub_request(:post, post_url).
  with(body: /token=#{ user_token }/).
  to_return(status: 200, body: post_response_body)
{% endcodeblock %}

## Stub an Error Response

In addition to the usual "happy path", integration code also needs to handle errors received from the external endpoint in a variety of common ways - e.g. propagating an exception, writing to a log file, printing to the screen, etc.  [In the previous post](/blog/2016/10/stubbing-external-apis-with-webmock/), we showed how to make helper methods more flexible by allowing them to take a Hash of options including status code and response body.

{% codeblock lang:ruby test/fivethirtyeight/feed_test.rb %}
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

That design decision pays off right here.  Now we can use the same helper method that we used for the default scenario to produce an error response, and stubbing right at the point where the HTTP request is made keeps the focus of the test mainly on business-level functionality.

{% codeblock lang:ruby test/fivethirtyeight/feed_test.rb %}
describe FiveThirtyEight::Feed do
  include FiveThirtyEightHelpers

  let(:feed) { FiveThirtyEight::Feed.new }

  describe "when the response has no body string" do
    it "raises an exception" do
      stub_summary_request(status: 404, response_body: '')
      assert_raises(FiveThirtyEight::APIResponseError) do
        feed.current_forecast
      end
    end
  end
end
{% endcodeblock %}

## Simulate a Timeout

Most HTTP clients provide a way of defining a timeout period for requests, and WebMock makes it easy to simulate a server timeout across all platforms and without the wait by immediately raising the appropriate error depending on the library in use.

{% codeblock lang:ruby test/support/fivethirtyeight_helpers.rb %}
module FiveThirtyEightHelpers
  SUMMARY_URL = "http://projects.fivethirtyeight.com/2016-election-forecast/summary.json"

  def stub_summary_timeout
    stub_request(:get, SUMMARY_URL).to_timeout
  end
end
{% endcodeblock %}

Like any other sort of error, you can choose how to handle these in your own application.  In this case, the example code catches the the low level timeout error and raises an application-specific error.

{% codeblock lang:ruby test/fivethirtyeight/feed_test.rb %}
describe FiveThirtyEight::Feed do
  include FiveThirtyEightHelpers

  let(:feed) { FiveThirtyEight::Feed.new }

  describe "when the request times out" do
    before do
      stub_summary_timeout
    end

    it "raises an APITimeout" do
      assert_raises(FiveThirtyEight::APITimeout) do
        feed.current_forecast
      end      
    end
  end
end
{% endcodeblock %}

## Verify a Stubbed Request

Most of the time, APIs should deliver a meaningful response back to the client - something indicating the result of the request - but that's not always possible.  In some cases, processing is handed off to a background job, and the result might not be available when the response is generated.  In cases such as a logging service, the success or failure of individual requests might not be all that important.  And there are still other situations where a result is received but has no noticeable effect on the system under test - no new database records, no messages written to the log, etc.

In these cases, we still want to verify that the endpoint was called as expected, but what we need is closer to the [classic definition of a mock object](http://martinfowler.com/articles/mocksArentStubs.html) than a stub.  We're checking that a collaborator (in this case, an external service) was called as expected, not that the object under test does the right thing with the result.  Fortunately for us, the `WebMock::RequestStub` returned by `stub_request` can be verified just like a regular mock object with the assertions WebMock provides.

{% codeblock lang:ruby test/fivethirtyeight/feed_test.rb %}
describe FiveThirtyEight::Feed do
  include FiveThirtyEightHelpers

  let(:feed) { FiveThirtyEight::Feed.new }

  describe "when the API delivers a successful response" do
    before do
      @api_stub = stub_summary_request
    end

    it "requests data from the API" do
      feed.current_forecast
      assert_requested @api_stub    # opposite: #assert_not_requested
    end
  end
end
{% endcodeblock %}

{% include mailchimp/minitest_after_post3.html %}

