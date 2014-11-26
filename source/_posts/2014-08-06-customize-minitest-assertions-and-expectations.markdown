---
layout: post
title: "Customize Minitest Assertions and Expectations"
date: 2014-08-06 09:52:54 +0200
comments: true
categories: [development, Ruby, Minitest, "Minitest::Spec", assertions, expectations, testing]
featured: 100
description: Extend Minitest assertions with your own creations, and learn to turn any assertion into a Minitest::Spec expectation.
---
[Minitest][1] has grown its popularity by keeping things simple.  Out-of-the-box, it provides a lean and mean 19 assertions, and a lot of programmers find that to be more than sufficient for testing a wide range of code.  (I mean really, when was the last time you typed ```assert_predicate``` in a test?)  Sometimes though, you wouldn't mind writing in a language that maps more closely to your problem domain - whether it's to be more expressive in your tests or to check a number of conditions in one domain-specific assertion.  Rails provides some nice examples of this sort of thing in the way they extend ```Minitest::Test``` for some of the more common testing operations needed for web applications and templates, and you can do the same by building your own custom assertions or expectations (in case you're using Minitest Spec) that let you write tests more like you like them.  Remember: [Minitest][1] is just Ruby.<!--more-->

## Write a custom assertion ##

As an example, it's not uncommon to want to check that two collections have the same elements without respect to sort order. As a definition, we might say that this requires three conditions to be met:

1. Both the expected and actual values must be ```Enumerable```.
2. The two must have the same number of entries.
3. Each entry in the tested result must be present in the expected result.

We can add our custom assertion to ```Minitest::Assertions``` by reopening the module and adding an assertion and a refutation for the conditions we're interested in testing.  Generally, these will involve calls to the ```assert``` and ```refute``` methods.

{% codeblock lang:ruby test/custom_assertions.rb %}
require 'minitest/assertions'

module Minitest::Assertions
  #
  #  Fails unless +expected and +actual have the same items.
  #
  def assert_same_items(expected, actual)
    assert same_items(expected, actual),
      "Expected #{ expected.inspect } and #{ actual.inspect } to have the same items"
  end

  #
  #  Fails if +expected and +actual have the same items.
  #
  def refute_same_items(expected, actual)
    refute same_items(expected, actual),
    "Expected #{ expected.inspect } and #{ actual.inspect } would not have the same items"
  end

  private

  def same_items(expected, actual)
    actual.is_a?(Enumerable) && expected.is_a?(Enumerable) &&
	  expected.count == actual.count && actual.all? { |e| expected.include?(e) }
	end
  end
end
{% endcodeblock %}

For the sake of manageability, I've written my assertions into a separate file which I can then include into my ```test/test_helper``` file.

{% include minitest_cookbook_plug.html %}

## From assertion to expectation ##

If your particular brand of poison falls more to the spec-style syntax like mine does, don't worry.  Now that we've got our new assertions written, it's stupid simple to carry our customizations over to Minitest::Spec-land.

{% codeblock lang:ruby test/custom_assertions.rb %}
require 'minitest/spec'

module Minitest::Expectations
  #
  #  Fails unless the subject and parameter have the same items
  #
  Enumerable.infect_an_assertion :assert_same_items, :must_have_same_items_as

  #
  #  Fails if the subject and parameter have the same items
  #
  Enumerable.infect_an_assertion :refute_same_items, :wont_have_same_items_as
end
{% endcodeblock %}

All this power is brought to you courtesy of first method declaration in [```minitest/spec```][2] which is probably the most "magical" thing you'll find in all of the source code.

{% codeblock minitest/spec.rb lang:ruby https://github.com/seattlerb/minitest/blob/master/lib/minitest/spec.rb link %}
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

This code does a couple of nice things for us:

First, it extends Module, so it can effectively be called on anything.  That's how I used it above when I called it on Enumerable, but you could also do what [zenspider][3] does when he defines all the standard [Minitest expectations][4] which is to call ```infect_an_assertion``` without any explicit target.  This implicitly calls the method on Kernel which is included by the Object class, thus making the expectation callable on any Object.

Next, It uses a ```class_eval``` block called on the target to define a new method with the name selected for the new expectation and a variable number of parameters.  The new method just delegates to the assertion method that was passed to it.

Between the case statement and the way that the new method's arguments are passed to the underlying assertion, there are four common cases that are handled.

### Binary expectations ###

This is what we've utilized with our example code above thanks to: ```Minitest::Spec.current.#{meth}(args.first, self, *args[1..-1])```

As you can see, the target object maps to the actual value, the first parameter to the expectation maps to the expected value, and the rest of the arguments if there are any are simply passed along as extras.

This option is the most conventional and probably covers the large majority of custom expectations you'll want to write.

### Block/proc expectations ###

Sometimes you want to execute a block or Proc and check on the effects that it produces.  In this case, the equivalent to your **actual** parameter will be a block argument passed to the assertion, not anything that's part of the ```args``` array, so when doing the mapping for from the new expectation to the assertion, you'll pass the whole list of parameters to the expectation untouched and pass the callable thing to be executed -- in this case ```self``` -- as a block argument to the assertion as: ```Minitest::Spec.current.#{meth}(*args, &self)```.

This is how Minitest all its assertions with block arguments into expectations: ```must_raise```, ```must_output```, etc.

### Reverse expectations ###

In certain cases, the relationship between the arguments to the assertion is not actual and expected, but something else entirely.  Take ```assert_respond_to``` as an example: the first argument should be the **actual** value being tested, while the second should be a symbol or String representing the method that it responds to or not.  In this case, you're calling ```respond_to?``` on the first parameter instead of the second as is more traditional, so we're looking to pass ```self``` to the assertion as the first argument and the remaining parameters passed to the expectation method as the rest.  To reverse direction like this, ```infect_an_assertion``` gives us a third parameter which, if we pass anything [truthy][5], will give us the desired effect.

### Unary expectations ###

A special case of the previous one occurs when we want to check a condition on the object under test instead of comparing or checking the relationship to something else.  A classic example would be if we wanted to check whether or not a User object is an administrator using a method like ```User.admin?```, but there are others.  These types of assertions involve calling a method on the actual object under test with no additional arguments which is the same as the reverse case except the ```*args``` passed to the assertion will just be empty or at most include just an optional message.  So in such cases, we'll want to pass a [truthy][5] third argument to ```infect_an_assertion``` - preferably one that indicates that the expectation takes no arguments like ```:unary``` or ```:single_and_loving_it```.


{% include mailchimp/minitest_after_post.html %}

[1]: https://github.com/seattlerb/minitest
[2]: https://github.com/seattlerb/minitest/blob/master/lib/minitest/spec.rb
[3]: https://github.com/zenspider
[4]: https://github.com/seattlerb/minitest/blob/master/lib/minitest/expectations.rb
[5]: https://gist.github.com/jfarmer/2647362
