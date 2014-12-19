---
layout: post
title: "Command Line Flags for Minitest in the Raw"
date: 2014-12-03 11:27:09 +0100
comments: true
categories: [development, Ruby, Minitest, "command line", "verbose", "single test"]
description: Minitest can be used to invoke your tests directly from the Ruby interpreter, and it has its own command line options that can be used for certain common use cases encountered by many Rubyists.
---
If you're like most Ruby devs, you probably run your test suite on the command line using `rake test`.  In addition to being a fast way to run all tests which is probably what you want to do most of the time, it's also the default task for Rails projects and well documented for other types of Ruby projects.  Every once in a while though, you want more control over the tests that run.  Rake might not give you what you need in these cases, but fortuntely, Minitest provides some nice but not widely known options that can be used directly from the command line to help you tailor your test runs.<!--more-->

For the following examples, I'm using a simple standalone project, but the same approach will work for any Ruby or Rails project.  I've written a single example test case that looks like this:

{% codeblock ruby test/example_test.rb %}
class ExampleTest < Minitest::Test
  def test_a_fast_operation
    pass
  end

  def test_a_slower_operation
    sleep(0.33) && pass
  end

  def test_a_really_slow_operation
    sleep(1) && pass
  end

  def test_pass
    pass
  end

  def test_fail
    fail
  end
end
{% endcodeblock %}

## Run a Single Test Case ##

Rake::TestTask allows you to run a single test case using the `TEST` environment variable as:

{% codeblock lang:bash %}
rake test TEST=test/example_test.rb
{% endcodeblock %}

To make this work, I'll need to create a Rakefile with a `test` task configured for my project.  In most cases, I'll probably do just that, but I could also just require Minitest on the command line and get a similar result:

{% codeblock lang:bash %}
ruby -r minitest/autorun test/example_test.rb
{% endcodeblock %}

It's slightly wordier than `rake test`, but all it's saying here is: fire up the Ruby interpreter, require `minitest/autorun`, and execute the program at `test/example_test.rb`.

**Edit:** In real life though, as Ryan Davis points out in the comments, no one in their right mind would ever put the required Minitest file on the command line like this.  You'd instead require `autorun.rb` in the test case file directly or in a common test helper which would then be required in all tests.  Assume for the remaining examples that we've done exactly that.

## Display More Detailed Reports ##

Minitest also supports a `--verbose` option which can be specified after the path to the test case file:

{% codeblock lang:bash %}
ruby test/example_test.rb -v
{% endcodeblock %}

Specifying this option replaces the usual dot-dot-dot report output with the full name of each test, the time it took to run it, and the result indicator as shown below:

{% codeblock lang:bash %}
# Running:

ExampleTest#test_pass = 0.00 s = .
ExampleTest#test_a_really_slow_operation = 1.00 s = .
ExampleTest#test_fail = 0.00 s = E
ExampleTest#test_a_fast_operation = 0.00 s = .
ExampleTest#test_a_slower_operation = 0.33 s = .

Finished in 1.333212s, 3.7503 runs/s, 3.0003 assertions/s.

  1) Error:
ExampleTest#test_fail:
RuntimeError:
    test/example_test.rb:19:in `test_fail'
	
5 runs, 4 assertions, 0 failures, 1 errors, 0 skips
{% endcodeblock %}

## Run Selected Tests Only ##

Using the `--name` flag, you can also specify the name of a particular test or tests you want to run.  Let's say, for example, that we only want to run the `test_pass` test.  We could type the following:

{% codeblock lang:bash %}
ruby test/example_test.rb -v -n test_pass
{% endcodeblock %}

Minitest converts my input to a Regexp object and uses it to select just the test we want:

{% codeblock lang:bash %}
# Running:

ExampleTest#test_pass = 0.00 s = .

Finished in 0.000751s, 1331.7157 runs/s, 1331.7157 assertions/s.

1 runs, 1 assertions, 0 failures, 0 errors, 0 skips
{% endcodeblock %}

Using regular expressions, we also have the option of passing a a pattern that filters test method names that should be included in the run.  So for example, typing the following:

{% codeblock lang:bash %}
ruby -Ilib:test test/example_test.rb -v -n /operation/
{% endcodeblock %}

Would indicate to Minitest that only tests containing "operation" should be included:

{% codeblock lang:bash %}
# Running:

ExampleTest#test_a_fast_operation = 0.00 s = .
ExampleTest#test_a_really_slow_operation = 1.00 s = .
ExampleTest#test_a_slower_operation = 0.33 s = .

Finished in 1.333025s, 2.2505 runs/s, 2.2505 assertions/s.

3 runs, 3 assertions, 0 failures, 0 errors, 0 skips
{% endcodeblock %}

This is particularly useful when using Minitest::Spec syntax since tests are named by convention as a concatenation of all the `describe` block names.  So let's suppose we convert the test we've been using into a spec as follows:

{% codeblock ruby test/example_spec.rb %}
require 'minitest/autorun'

describe "Example" do
  describe "Operations" do
    it "should do a fast thing" do
      pass
    end

    it "should do a slower thing" do
      sleep(0.33) && pass
    end

    it "should do a really slow thing" do
      sleep(1) && pass
    end
  end

  describe "Things that pass and fail" do
    it "should pass" do
      pass
    end

    it "should fail" do
      fail
    end
  end
end
{% endcodeblock %}

Running with only the `--verbose` flag shows the names generated for each test:

{% codeblock lang:bash %}
# Running:

Example::Things that pass and fail#test_0001_should pass = 0.00 s = .
Example::Things that pass and fail#test_0002_should fail = 0.00 s = E
Example::Operations#test_0001_should do a fast thing = 0.00 s = .
Example::Operations#test_0002_should do a slower thing = 0.33 s = .
Example::Operations#test_0003_should do a really slow thing = 1.00 s = .

Finished in 1.332970s, 3.7510 runs/s, 3.0008 assertions/s.

  1) Error:
Example::Things that pass and fail#test_0002_should fail:
RuntimeError: 
    test/example_spec.rb:22:in `block (3 levels) in <main>'
	  
5 runs, 4 assertions, 0 failures, 1 errors, 0 skips
{% endcodeblock %}

You can filter the tests that are run by passing part of the name corresponding to the block you want to focus on as a parameter:

{% codeblock lang:bash %}
ruby test/example_spec.rb -v -n /Operations/
{% endcodeblock %}

That would yield the following output similar to the previous one:

{% codeblock lang:bash %}
# Running:

Example::Operations#test_0001_should do a fast thing = 0.00 s = .
Example::Operations#test_0003_should do a really slow thing = 1.00 s = .
Example::Operations#test_0002_should do a slower thing = 0.33 s = .

Finished in 1.331907s, 2.2524 runs/s, 2.2524 assertions/s.

3 runs, 3 assertions, 0 failures, 0 errors, 0 skips
{% endcodeblock %}

**Note:** If I want to specify a name pattern that contains whitespace as can happen with spec-style tests, these need to be escaped (`/Example::Things\ that\ pass/`) or quoted (`/"Example:: Things that pass"/`) within my regular expression.


I still try to keep my test suite fast enough to run as a whole most of the time, so this isn't something that I need every day, but [running a single test is a common problem for more than a few people](http://stackoverflow.com/questions/5285711/is-it-possible-to-run-a-single-test-in-minitest) that, world-changing or not, it's nice to have the option available.

{% include convertkit/minitest_after_post.html %}
