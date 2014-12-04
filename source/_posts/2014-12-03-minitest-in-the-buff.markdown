---
layout: post
title: "Minitest in the Buff"
date: 2014-12-03 11:27:09 +0100
comments: true
categories: [development, Ruby, Minitest, "command line", "verbose", "single test"]
description: Minitest offers little in the way of frills in many places, but there are a few command line options that you should know about
---
If you're like most Ruby devs, you probably run your test suite on the command line using `rake test`.  It's a fast way to run all tests which is probably what you want to do most of the time, and it's the default task for Rails projects and well documented for other types of Ruby projects.  Every once in a while though, you want more control over the tests that run.  Rake might not give you what you need in these cases, but fortuntely, Minitest provides some nice but not very well known options that can be used when called directly from the command line to help you tailor your test run.<!--more-->

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

In this case though, I would need to create a Rakefile with a `test` task that's configured for my project.  In most cases, I'll probably do just that, but I could also just ask Minitest to do the same thing by entering the following on the command line:

{% codeblock lang:bash %}
ruby -r minitest/autorun test/example_test.rb
{% endcodeblock %}

It's a little wordier than `rake test`, but all it's saying here is: fire up the Ruby interpreter, require `minitest/autorun`, and execute the program at `test/example_test.rb`.

## Display More Detailed Reports ##

Minitest also supports a `--verbose` or `-v` option which can be specified after the path to the test case file:

{% codeblock lang:bash %}
ruby -r minitest/autorun test/example_test.rb -v
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

## Run Only Selected Tests ##

Using the `--name` or `-n` option, you can also specify the name of a particular test or tests you want to run.  Let's say, for example, that we only want to run the `test_pass` test.  We could type the following:

{% codeblock lang:bash %}
ruby -r minitest/autorun test/example_test.rb -v -n test_pass
{% endcodeblock %}

Minitest select out only that test, and we get the following as a result:

{% codeblock lang:bash %}
# Running:

ExampleTest#test_pass = 0.00 s = .

Finished in 0.000751s, 1331.7157 runs/s, 1331.7157 assertions/s.

1 runs, 1 assertions, 0 failures, 0 errors, 0 skips
{% endcodeblock %}

Since Minitest converts this parameter into a Regexp object, we also have the option of passing a regular expression literal that will indicate a pattern to match against test names.  If we were to type the following:

{% codeblock lang:bash %}
ruby -r minitest/autorun -Ilib:test test/example_test.rb -v -n /operation/
{% endcodeblock %}

Minitest should select any test with the string `operation` in the name as shown below:

{% codeblock lang:bash %}
# Running:

ExampleTest#test_a_fast_operation = 0.00 s = .
ExampleTest#test_a_really_slow_operation = 1.00 s = .
ExampleTest#test_a_slower_operation = 0.33 s = .

Finished in 1.333025s, 2.2505 runs/s, 2.2505 assertions/s.

3 runs, 3 assertions, 0 failures, 0 errors, 0 skips
{% endcodeblock %}

This can be particularly useful when working with the spec-style Minitest syntax since the tests are named by convention as a concatenation of all the `describe` block names.  Let's suppose we convert the test we've been using into a spec as follows:

{% codeblock ruby test/example_spec.rb %}
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

Running with no name specified shows us how the names for the tests are generated by Minitest.

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

We can filter the tests that are run by passing part of the name corresponding to the block we're interested in as a parameter:

{% codeblock lang:bash %}
ruby -r minitest/autorun -Ilib:test test/example_spec.rb -v -n /Example::Operations/
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

**Note:** If I want to specify a name pattern that contains whitespace, I need to either escape the spaces within my regular expression (`/Example::Things\ that\ pass/`) or enclose the name in quotes (`/"Example:: Things that pass"/`).


None of these is likely to change the way you test, of course.  Think of them instead as nice additions that give you a few additional options for tailoring your test runs.

{% include mailchimp/minitest_after_post.html %}
