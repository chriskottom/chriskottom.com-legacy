---
layout: post
title: "Unexpected: The New Minitest::Spec Syntax"
date: 2015-04-14 07:27:59 +0200
comments: true
categories: [development, Ruby, Minitest, spec, expectations, expect, value]
description: The latest Minitest release introduces some fundamental changes for users of Minitest::Spec expectations. Here's everything you need to know about it.
---
A lot of of developers got started with Minitest during the past few years because of Minitest::Spec.  Particularly in the case of seasoned RSpec users, the API and syntax of spec-style testing have provided a smoother transition between the two tools and enabled them to leverage all the experience and habits they've built up over the years.  Yesterday's release of Minitest 5.6.0 brought some important changes to the framework, and even though your existing tests will keep on working as they always have, you'll want to pay attention to avoid unpleasant surprises in the future.  This post explains what you should expect and why it's happening.<!--more-->

(Wordplay aside, [this change](https://github.com/seattlerb/minitest/commit/9e78cc974f3ef0d9716f1cca2675753cf5f648d0) has been in the works for several weeks already and available for review on GitHub.)

## A Little Background ##

If you're already a Minitest::Spec user, you know how the syntax works.  Instead of calling assertion methods within your test, the framework monkeypatches expectation methods directly into Module, and you define expectations directly on the object under test as shown here.

{% codeblock lang:ruby %}
class Lebowski
  attr_accessor  :name

  def initialize(name = "Jeffrey")
    self.name = name
  end

  def abide?
    true
  end
end

module Minitest::Expectations
  alias_method :must, :must_be
end

describe "Lebowski", "old syntax" do
  let(:the_dude)  { Lebowski.new(name: "Jeff") }
  
  it "should abide" do
    the_dude.must :abide?
  end
end
{% endcodeblock %}

The latest version introduces a new **Minitest::Expectation** class that exposes all the familiar expectation methods and wraps the object under test.  You'll be able to create a new instance of the class using the `_` (underscore) method or one of the two aliases defined for it - `expect` or `value`.

{% codeblock lang:ruby %}
class Minitest::Expectation
  alias_method :must, :must_be
end

describe "Lebowski", "new syntax" do
  let(:the_dude)  { Lebowski.new(name: "Jeffrey") }

  it "should abide" do
    _(the_dude).must :abide?
    expect(the_dude).must :abide?
    value(the_dude).must :abide?
  end
end
{% endcodeblock %}

## Why the change? ##

The fact that expectations have been patched directly into core objects has been a source of (mostly unjustified) gripes for years now, and while this change resolves those complaints, they weren't the reason for it.  To understand that, we need to look at how an assertion becomes an expectation.

As I outlined in [Customizing Minitest Assertions and Expectations](http://chriskottom.com/blog/2014/08/customize-minitest-assertions-and-expectations/) a few months back, every expectation has an assertion underlying it, and every assertion is an instance method of Minitest::Test, and the framework provided the `infect_an_assertion` method to map the old assertion method to the new expectation method.

{% codeblock minitest/spec.rb lang:ruby https://github.com/seattlerb/minitest/blob/d863ac2d02d0efcbe73e8e2f6d3b6a22da20ca91/lib/minitest/spec.rb link %}
class Module # :nodoc:
  def infect_an_assertion meth, new_name, dont_flip = false # :nodoc:
    # warn "%-22p -> %p %p" % [meth, new_name, dont_flip]
    self.class_eval <<-EOM
      def #{new_name} *args
        case
        when #{!!dont_flip} then
          Minitest::Spec.current.#{meth}(self, *args)
        when Proc === self then
          Minitest::Spec.current.#{meth}(*args, &self)
        else
          Minitest::Spec.current.#{meth}(args.first, self, *args[1..-1])
        end
      end
    EOM
  end
end
{% endcodeblock %}

In each case, invoking an expectation ultimately calls an assertion (with the name `meth`) on the *currently running instance of Minitest::Spec*.  This method is just an accessor for a thread-local variable that holds a reference to each Minitest::Spec instance within Thread where it runs, but without that reference, there's no target for the assertion method call.

This approach works just fine in most cases, but it has a tendency to blow up when the test needs to create a new Thread and attempts to run expectations within it.

{% codeblock lang:ruby %}
describe "Equality" do
  it "doesn't work inside new Threads" do
    1.must_equal 1       # passes
	
    t = Thread.new do
      1.must_equal 1     # raises NoMethodError           
    end
    t.join
  end
end
{% endcodeblock %}

The first expectation above passes as expected because it executes within a Thread that has access to the thread-local variable.  The second expectation, however, executes within the newly created Thread which doesn't have access to that reference since thread-local variables are not copied from parent Threads to children.  As a result, `Minitest::Spec.current` returns `nil`, and the subsequent call to the related assertion (`assert_equal` in this case) raises a *NoMethodError*.

The new version of `infect_an_assertion` addresses the problem by using a new instance of the Minitest::Expectation class as an intermediary between the expectation and the assertion so that there's always a consistent reference back to the current spec.

{% codeblock minitest/spec.rb lang:ruby https://github.com/seattlerb/minitest/blob/9e78cc974f3ef0d9716f1cca2675753cf5f648d0/lib/minitest/spec.rb link %}
class Module # :nodoc:
  def infect_an_assertion meth, new_name, dont_flip = false # :nodoc:
    # warn "%-22p -> %p %p" % [meth, new_name, dont_flip]
    self.class_eval <<-EOM
      def #{new_name} *args
        Minitest::Expectation.new(self, Minitest::Spec.current).#{new_name}(*args)
      end
    EOM
                                  
    Minitest::Expectation.class_eval <<-EOM, __FILE__, __LINE__ + 1
      def #{new_name} *args
        case
        when #{!!dont_flip} then
          ctx.#{meth}(target, *args)
        when Proc === target then
          ctx.#{meth}(*args, &target)
        else
          ctx.#{meth}(args.first, target, *args[1..-1])
        end
      end
    EOM
  end
end
{% endcodeblock %}																															 

## How does this affect you? ##

The changes will be phased in over time and across several releases.  Right now, using the old syntax doesn't produce any deprecation warnings, so you'll have some time to get used to the change.  Some time before version 6.0 drops, the old syntax will be deprecated and the monkeypatches on Module will be removed, so if you've got a lot of Minitest suites, it might be a good idea to get started on the conversions sooner than later.

Whether you're using the new syntax or the old though, the underlying implementation will change, and it's clear that this new approach will cause more objects to be instantiated in order to run the same tests.  Since a lot of Minitest's edge over competitors in performance and memory usage has been the result of creating fewer instances, we may start to see some erosion of that advantage, though the differences probably won't be significant for most test suites.

### Resources: ###

* [Customize Minitest Assertions and Expectations](http://chriskottom.com/blog/2014/08/customize-minitest-assertions-and-expectations/) - understand the assertion-expectation connection
* [Spec-inflected assertions raise NoMethodError in child threads](https://github.com/seattlerb/minitest/issues/337) - first issue about Threads within tests
* [Added Minitest::Expectation value monad.](https://github.com/seattlerb/minitest/commit/9e78cc974f3ef0d9716f1cca2675753cf5f648d0) - the GitHub commit reference introducing the new syntax
* [Great Expectations](http://blog.zenspider.com/blog/2015/04/great-expectations.html) - Ryan Davis' blog post about the new syntax
* [The Big Lebowski](http://www.imdb.com/title/tt0118715/) - You haven't seen this!?!  Stop whatever you're doing and go watch it.
