---
layout: post
title: "Testing Ruby Mixins in Isolation"
date: 2015-03-06 08:29:52 +0100
comments: true
categories: [development, Ruby, Minitest, metaprogramming, mixins, testing]
description: Testing Ruby mixins doesn't have to be a pain. This post shows a simple, lightweight technique for testing them in isolation.
---
Ruby's approach to inheritance by module inclusion isn't unique in the world of programming languages, but it gets a lot of attention and hits a sweet spot for a lot of use cases.  Finding the right patterns to test them, though, has been a challenge for many because, as mixins, they tend to get... You know... mixed into things.  Testing something that can't be instantiated on its own requires a little consideration and different treatment than a standard class, so a lot of programmers resort to testing the inherited behaviors in each including class or, only slightly better, using shared helpers or RSpec shared examples.

All of these techniques have their place in testing, but in a perfect world, they're not the tools that you should reach for as a first option.  Ideally you're first making a good-faith effort at testing your mixins, to the greatest possible degree, in isolation from the classes that include them. 

For the purposes of this discussion, there are two types of mixins we’re concerned with: those that are coupled with the classes that include them, and those that aren't.  And as you might imagine, non-coupled modules are easier to test than their coupled cousins, even though the patterns used in each case are similar.

## Non-Coupled Mixins ##

Suppose you have a simple mixin that allows instances of the extended class to shout out a generic greeting.

{% codeblock lang:ruby lib/greetable.rb %}
module Greetable
  def greet
    print 'Ohai!'
  end
end
{% endcodeblock %}

This module doesn't rely on any state or methods of the included class to do its job - it's non-coupled.  You may have several classes that include this mixin, but rather than duplicate the same tests for each of them, you can test the functionality in isolation by creating an Object instance and extending it directly with the Greetable module.

{% codeblock lang:ruby test/greetable_test.rb %}
require 'test_helper'

class GreetableTest < Minitest::Test
  def setup
    @greetable = Object.new
    @greetable.extend(Greetable)
  end

  def test_greeting_delivered
    assert_output 'Ohai!' do
      @greetable.greet
    end
  end
end
{% endcodeblock %}

By extending the Object instance, we're getting the simplest possible Greetable we can, and we've managed to do it without re-opening the Object class.

## Coupled Mixins ##

Suppose instead you'd like to let Greetable be a little more familiar with the included class.  In cases where the receiver has a `name` attribute, Greetable should deliver a personal greeting instead of the generic one like so:

{% codeblock lang:ruby lib/greetable.rb %}
module Greetable
  def greet
    if self.respond_to?(:name)
      print "Hey, #{ self.name }."
    else
      print 'Ohai!'
    end
  end
end
{% endcodeblock %}

You'll need to extend the test case to cover this new wrinkle.  Specifically, you'll want to add a new test that will check that a Greetable with a `name` method uses it in formatting the greeting.  It would be simple enough to use a technique similar to the one you used earlier, although in this case you might want to change the structure just a bit.

{% codeblock lang:ruby test/greetable_test.rb %}
require 'test_helper'

class GreetableTest < Minitest::Test
  def test_personalized_greeting_delivered
    @greetable = Object.new
	@greetable.extend(Greetable)
	
    class << @greetable
      def name
        'Matz'
      end
    end

    assert_output('Hey, Matz.') do
      @greetable.greet
    end
  end

  def test_generic_greeting_delivered
    @greetable = Object.new
    @greetable.extend(Greetable)

    assert_output 'Ohai!' do
      @greetable.greet
    end
  end
end
{% endcodeblock %}

Here you start with a vanilla Object instance and extend it with the Greetable module, same as before, but in this case, you also need to define `name` as a *singleton method* on the Object as well.  Just as the name implies, this is a method that belongs *only to this instance*, and it's just enough to meet the minimum criteria needed to test the new personalized greeting behavior.

This works just fine, but some might find it unnecessarily complicated or be turned off by the metaprogramming tricksiness.  Fortunately, there's another method that's simpler to understand and involves less monkeypatching, and that's to use a Ruby Struct.

{% codeblock lang:ruby test/greetable_test.rb %}
require 'test_helper'

class GreetableTest < Minitest::Test
  ThingWithName = Struct.new(:name) do
    include Greetable
  end

  def test_personalized_greeting_delivered
    greetable = ThingWithName.new('Matz')
	
    assert_output('Hey, Matz.') do
      greetable.greet
    end
  end

  ...
end
{% endcodeblock %}

In this case, you define a new ThingWithName class just for this test case using `Struct.new` which looks like a constructor but actually returns a Ruby Class.  The instances of this class will have whatever list of attributes you passed to `Struct.new` - in this case, a name.  This method also takes an optional block argument which, when present, is evaluated within the context of the returned Class.  Once you get into the body of the test, you only need to instantiate a new ThingWithName instance and pass it a String `:name` argument.

Clearly these are simple examples and only scratch the surface of what you might encounter in your own day-to-day work, but they're a great example of how mixing the simplicity of the Minitest framework with good, old-fashioned Ruby know-how can solve a potentially thorny problem.

{% include convertkit/minitest_after_post2.html %}
