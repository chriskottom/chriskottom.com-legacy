---
layout: post
title: "Ruby and Rails Testing Changes Roundup"
date: 2015-07-04 14:18:48 -0500
comments: true
categories: [development, Ruby, "Rails 5", Minitest, changes]
description: The latest Minitest release introduces some fundamental changes for users of Minitest::Spec expectations. Here's everything you need to know about it.
---
{% img no-border right /images/change_we_need.jpg Change We Need %}

Ruby and Rails provide developers with an awesome set of tools for testing your code and applications. If you've followed this blog at all, you're probably already aware that it's kind of a thing with me. :)

But both the language and the framework have active ecosystems, so if you want to survive and thrive as a developer, you need to be ready to commit a certain portion of your time and mental energy toward maintaining your skills and keeping up with the latest changes.  A number of these have come along since I shipped [The Minitest Cookbook](http://chriskottom.com/minitestcookbook/), and this is the summary of the most important and interesting that I've been meaning to post for some time.<!--more-->

## Minitest Expectation Syntax ##

[I've written about the change to Minitest::Spec expectations before](http://chriskottom.com/blog/2015/04/unexpected-the-new-minitest-spec-syntax/), but as this is an essential change that will almost certainly require you to migrate some old code bases in the future, a quick review is warranted.

Minitest::Spec has historically worked by monkeypatching its expectation methods (`must_equal`, `must_include`, &hellip;) directly into every class which allowed developers to make assertions by calling methods directly on the object under test.

{% codeblock lang:ruby %}
describe User do
  let(:admin)  { User.new(username: "admin" }
  
  it "must have a username to be valid" do
    admin.must_be :valid?
    admin.username = nil
    admin.wont_be :valid?
  end
end
{% endcodeblock %}

This nice, human-readable syntax earned Minitest a lot of devotees over the years, many of whom were converting after years of using RSpec and liked the combination of familiarity and greater simplicity.

Since the release of Minitest 5.6 though, the preferred method of creating assertions requires that you wrap the object under test in a __Minitest::Expectation__ object before calling the expectation methods on them.  That changes the test above to the following:

{% codeblock lang:ruby %}
describe User do
  let(:admin)  { User.new(username: "admin" }
  
  it "must have a username to be valid" do
    expect(admin).must_be :valid?
    admin.username = nil
    expect(admin).wont_be :valid?
  end
end
{% endcodeblock %}

For the time being, both of these are supported, but the legacy syntax will be deprecated and later removed sometime in the not too distant future, so it's best to start writing future proofed code now rather than later.

### Related Links ###

* [Added Minitest::Expectation value monad.](https://github.com/seattlerb/minitest/commit/9e78cc974f3ef0d9716f1cca2675753cf5f648d0) - the GitHub commit reference introducing the new syntax
* [Great Expectations](http://blog.zenspider.com/blog/2015/04/great-expectations.html) - Ryan Davis’ blog post about the new syntax
* [Unexpected: The New Minitest::Spec Syntax](http://chriskottom.com/blog/2015/04/unexpected-the-new-minitest-spec-syntax/) - my earlier post on the new syntax and the reasons for it

## Rails Deprecations ##

Rails 5 will deprecate two methods that have been commonly used in controller tests since the beginning: `assigns` and `assert_template`.  The rationale here is that testing with these kinds of methods is too invasive and too closely tied to the implementation of a feature instead of the observable effects produced by the system - e.g. the HTTP response code sent, redirects sent, session variables and cookies set, markup and data rendered, etc.  DHH has come right out in favor of writing more integration and acceptance tests, and this change signals a step toward establishing that style as a Rails best practice.

It took me some time to learn to love this change when I first heard about it.  Since the beginning, Rails has (rightly or wrongly) used instance variables as a way of passing state from controllers to templates, and the idea that we'd suddenly stop testing that interface seemed wrong to me.  But most of us have generally negative feelings about controller tests anyway.  They often feel like busy work because they can be repetitive to write and feel unimportant to our test suite.  So I'm personally really ready to start moving my [test pyramid](http://martinfowler.com/bliki/TestPyramid.html) to more of a [test hourglass](http://www.getautoma.com/blog/the-test-hourglass) (and hoping like crazy that it doesn't completely slow down my test runs).

### Related Links ###

* [Deprecate assigns() and assert_template in controller testing](https://github.com/rails/rails/issues/18950) - the PR and subsequent discussion

## Keyword Arguments for Rails Controller Request Helpers ##

Rails 5 will also introduce a change to the controller and integration test helpers used to simulate all the various request types - `#get`, `#post`, and so on.  These methods have always taken in a number of optional Hashes for passing in request parameters, session variables, and flash parameters, respectively, so to send a request with only some of these defined, you might need to pass placeholder arguments:

{% codeblock lang:ruby %}
describe CommentController do
  it "posts a comment" do
    post :create,
	  { user_id: 1, comment: "Awesome!" },
	  nil,
	  { notice: "Your comment has been posted." }
    # ...	  
  end
end
{% endcodeblock %}

The `nil` here is complete noise, though, and it's not at all clear what any of these method arguments is supposed to represent.  Rails 5 fixes this by implementing the argument list using Ruby 2 keyword arguments which will allow the same test to be rewritten as:

{% codeblock lang:ruby %}
describe CommentController do
  it "posts a comment" do
    post :create,
	  params: { user_id: 1, comment: "Awesome!" },
	  flash: { notice: "Your comment has been posted." }
    # ...	  
  end
end
{% endcodeblock %}

The three original arguments (`params`, `session`, and `flash`) will get the most use, but additional arguments for `body` and `xhr` are also supported where they're needed.

The non-keyword argument list will eventually be phased out completely, so you'll want to start getting used to the new syntax and using it as you start new projects based on Rails 5.

### Related Links ###

* [Use kwargs in ActionController::TestCase and ActionDispatch::Integration HTTP methods](https://github.com/rails/rails/pull/18323) - the PR

## A New Rails Test Runner ##

[Tenderlove's comparison of Minitest and RSpec](http://tenderlovemaking.com/2015/01/23/my-experience-with-minitest-and-rspec.html) pointed out some of the pros and cons of both frameworks, and while he prefers Minitest for his own projects, one place where RSpec shines is in its failure and error output.  That's because it lets the developer simply copy and paste one line from the report to re-run a single failing test.  Minitest certainly supports [various options for running individual and selected tests](http://chriskottom.com/blog/2014/12/command-line-flags-for-minitest-in-the-raw/), but they're not as simple or as intuitive as RSpec's interface.

The post was widely shared and gained a lot of traction within the community.  The discussions that followed led to the development of [minitest-sprint](https://github.com/seattlerb/minitest-sprint) and added momentum to projects already underway like the new Rails-bundled test runner. ([@kaspth](https://twitter.com/kaspth) points out that the first PR for what eventually became the Rails runner predates Tenderlove's post by a bit.) It replaces the Rake tasks that had previously been the preferred method of running tests for Rails applications in order to avoid the use of environment variables on the command line.  As of Rails 5, you'll be able to run your tests using the `rails` executable like so:

{% codeblock lang:bash %}
$ rails test                              # run all tests in your test directory
$ rails test test/models                  # run all tests from the specified directory
$ rails test test/models/user_test.rb     # run the specified test case
$ rails test test/models/user_test.rb:26  # run the test found at the specified file and line
{% endcodeblock %}

Failures and errors will be displayed by filename and line number to allow for easy re-running just by copying and pasting - same as with RSpec - and the the PR that introduces this change also updates the Rake task, so you'll still get the benefit of these new features even if your hands insist on typing `rake test`.

### Related Links ###

* [`bin/rails test` runner (rerun snippets, run tests by line, option documentation)](https://github.com/rails/rails/pull/19216) - initial PR introducing the new runner
* [Improve Test Runner's Minitest integration.](https://github.com/rails/rails/pull/19571) - subsequent PR to improve the implementation


I'll be looking to ship a big update to [The Minitest Cookbook](http://chriskottom.com/minitestcookbook/) sometime before the end of the year (which will be freely available to those of you who've already purchased the book), and all of these changes will figure prominently in the new version.  In the meantime though, I'll be trying to work them into my coding to see which ones produce changes in how I work and which ones are less important.
