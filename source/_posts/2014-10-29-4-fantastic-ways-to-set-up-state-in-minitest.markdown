---
layout: post
title: "4 Fantastic Ways to Set Up State in Minitest"
date: 2014-10-29 14:26:06 +0200
comments: true
categories: [development, Ruby, Minitest, before, let, setup, testing]
featured: 500
description: How to set up system state in Minitest using a variety of techniques and the power of Ruby
---
{% img no-border right /images/fantastic_four.jpg The Fantastic Four %}

When it comes to exercising a piece of application logic with automated unit tests, there's a well-understood process that most frameworks and testing tools follow:

1. **Setup:** Establishes instances of data objects and preconditions essential for running the test.
2. **Exercise:** Executes the method or logic to be tested.
3. **Verify:** Verifies that the tested method has produced the expected result by making one or more assertions.
4. **Teardown:** Cleans up or resets application state that should not be allowed to persist between tests.

Perform a Google search for *"unit test anatomy"*, and you'll see this same pattern described in books and articles for many programming languages and methodologies - sometimes with slightly different terminology, but still following the same basic sequence. But the way that a given tool or testing library realizes each phase can vary a lot - a fact which has launched [hundreds of testing frameworks][1] and thousands of flame wars.<!--more-->

The original Ruby standard for testing was established by the Test::Unit library (itself based on the [xUnit model][2]) which was part of the Ruby standard library going back many years and many more releases.  Minitest follows the same model by providing a `setup` method which can be overridden and will be run by the framework before each individual test.

RSpec came along quite a bit later and introduced a more granular scheme of hooks for setting up test state that mapped more naturally to its block-based syntax.

* **before(:each) -** logic to run before each individual test method
* **before(:all) / before(:context) -** logic to run at the start of a context/describe block
* **before(:suite) -** logic to run before the test suite runs
* **let -** memoizes the result of a block and provides an accessor method for it

Minitest has built-in support for some but not all of these.  In this post, I'm going to show you how to achieve the same effects in your own tests using the features that Minitest gives you along with a sprinkling of plain old Ruby.  Because in the end, it's all just Ruby.

## Setup Before Running Each Test ##

You probably already know that Minitest::Test provides a `setup` method that you can override to define logic that runs before each test.

{% codeblock lang:ruby test/thing_test.rb %}
require 'test/test_helper'

class ThingTest < Minitest::Test
  def setup
    @a_thing = Thing.new
    @another = Thing.new
  end

  def test_a_thing
    assert_instance_of Thing, @a_thing
  end

  // more tests follow
end
{% endcodeblock %}

Minitest::Spec provides an equivalent in the form of its `before` block:

{% codeblock lang:ruby test/thing_test.rb %}
require 'test/test_helper'

describe 'Thing' do
  before do
    @a_thing = Thing.new
    @another = Thing.new
  end

  it 'is a Thing' do
    @a_thing.must_be_instance_of Thing
  end

  // more tests follow
end
{% endcodeblock %}

## What Exactly Does :let Do Again? ##

Using `let` provides an alternate and some would say more elegant way of setting up testing state with a more declarative syntax.  The following would be comparable to the example in the previous section.

{% codeblock lang:ruby test/thing_test.rb %}
require 'test/test_helper'

class ThingTest < Minitest::Test
  extend Minitest::Spec::DSL

  let(:a_thing) { Thing.new }
  let(:another) { Thing.new }

  def test_a_thing
    assert_instance_of Thing, a_thing
  end

  // more tests follow
end
{% endcodeblock %}

Comparable, but not equivalent.  Each `let` invocation defines a new method with the specified name that executes the block argument upon the first invocation and caches the result for later access - in other words, a lazy initializer.  The main advantage of this technique over the use of instance variables defined in a `setup` method or `before` block is that the setup logic can be divided into smaller units and executed only in tests where they're needed.

What's more, `let` gives you the ability to define and redefine the block assigned to each name so that tests can be run against a set of values and preconditions defined within the most immediate block, then the enclosing block, and so on. Take the following sample spec as an example:

{% codeblock lang:ruby test/thing_test.rb %}
require 'test/test_helper'

describe 'ThingList' do
  subject { [thing] }

  describe 'inner block' do
    let(:thing) { Thing.new(name: 'foo') }

    it 'has one Thing named "foo"' do
      subject.length.must_equal 1
      first_thing = subject.first
      first_thing.name.must_equal 'foo'
    end

    describe 'more inner block' do
      let(:thing) { Thing.new(name: 'bar') }

      it 'has one Thing named "bar"' do
        subject.length.must_equal 1
        first_thing = subject.first
        first_thing.name.must_equal 'bar'
      end
    end
  end
end
{% endcodeblock %}

Both of these tests will pass since the contents of the list in each case will be determined by whatever is most immediately assigned to `thing` in the enclosing block.  This can be a really powerful tool, and I've found it's really effective in situations where I need to test the same method with different inputs, but bear in mind that nesting `describe` blocks too deeply will make your tests harder to understand and leave you and other developers confused about what's actually being tested.

(Special thanks to **@jemmyw** for calling out the fact that this was not well covered in the original version of the post.)

I had always assumed that the memoized result was cached and available for use across all tests in a test case after the first invocation, but because Minitest runs each test using a fresh instance of the test class, the value is associated with a single test instance, not shared across instances.

## Setup Before Running the Test Case ##

RSpec gives developers the ability to define setup code that would only run before the start of each test case using a `before(:all)` block -- now also aliased as `before(:context)`.  Minitest doesn't support the same syntax, but it's easy enough to implement by executing class-level code and using class variables to store references to any shared resources as in the following example.

{% codeblock lang:ruby test/facebook_test.rb %}
require "test_helper"

class FacebookTest < Minitest::Test
  @@fb_client = Koala::Facebook::API.new(OAUTH_ACCESS_TOKEN)

  def test_connection
    refute_nil @@fb_client
  end
end
{% endcodeblock %}

In this case, we're assuming that the call to the Facebook API will be slow, so in order to perform that initialization just once rather than before every single test, we assign the class variable `@@fb_client` one time at the start of the test case.  All instances of the test case will then have access to the shared client resource without creating a new connection.

While this is a nice tool to have at our disposal, it has the potential of being taken too far by, for example, using it for setting up anything involving database access.  Overusing class variables in this way reduces [test isolation][4] and introduces the potential that tests will begin to fail (or worse, *not fail*) randomly, and so I'd be somewhat cautious about where and how often you apply this model.

**Extra credit homework:** Read the [GitHub issue][3] that requests the inclusion of support for `before(:all)` and the discussion afterward.  It specifically describes the technique explained above, and the comments provide a lot of insight about how to take a conservative approach to library design.

## Setting Up Before Running the Suite ##

Setup code intended to run once before *all* tests in the suite use a similar technique as shown in the previous section, but in this case, we'll need to modify Minitest::Test in our `test_helper.rb` file instead of the individual test cases.  The code will look like this:

{% codeblock lang:ruby test/test_helper.rb %}
require "minitest/autorun"

class Minitest::Test
  @@fb_client = Koala::Facebook::API.new(OAUTH_ACCESS_TOKEN)
end
{% endcodeblock %}

The result is a Facebook API client that's shared between all test cases in the suite and which is set up once before any tests are executed.

The fact that this *can* be done doesn't mean that it *should* be done though.  Before using a technique such as this though, you need to ask yourself what effect it will have on your suite.  Tests should be written as much as possible in a single file with as much verbosity and repetition as is needed to convey their meaning, and I'd personally be really reluctant to distribute code that's essential to a clear understanding of my test case into other files.

{% include mailchimp/minitest_after_post3.html %}

[1]: https://en.wikipedia.org/wiki/List_of_unit_testing_frameworks
[2]: https://en.wikipedia.org/wiki/XUnit
[3]: https://github.com/seattlerb/minitest/issues/61
[4]: http://c2.com/cgi/wiki?UnitTestIsolation
