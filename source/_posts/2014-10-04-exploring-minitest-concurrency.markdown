---
layout: post
title: "Exploring Minitest Concurrency"
date: 2014-10-04 10:36:27 +0200
comments: true
categories: [development, Ruby, Rails, Minitest, concurrency, parallelization, testing]
featured: 100
---
Among all the other morsels of sunshine and goodness it offers, [Minitest][1] gives you the ability to denote that some or all of your test cases are able to run concurrently, and as pointed out in the source comments, that can only mean one thing: that you rule and your tests are awesome.

{% img center /images/you_rule_and_your_tests_are_awesome.png In doing so, you're admitting that you rule and your tests are awesome %}

I wanted to better understand how and when to use parallelization in my own code, so I dove into the source and ran some simple bench tests to come up with some guidelines for how to put it to work.<!--more-->

## The Basics ##

There are two ways to switch on parallelization in your tests. You can apply it to all test cases in your suite by adding the following lines to your `test_helper.rb` file:

{% codeblock lang:ruby test/test_helper.rb %}
require 'minitest/hell'

class Minitest::Test
  parallelize_me!
end
{% endcodeblock %}

The inclusion of [Minitest::Hell][2] ensures that the tests in all cases will be executed in random order by overriding Minitest::Test.test_order to return `:parallel`.  The call to `parallelize_me!` causes all test cases to queue tests across a pool of concurrent worker threads via the Minitest::Parallel::Executor helper class.  The [implementation][3] is worth checking out because it's super simple and does its job nicely - a really great example of restrained, focus code.

It's also perfectly reasonable, though presumably somewhat less awesome, to call `parallelize_me!` only on certain individual test cases when some tests require execution in a strict order.  It's also possible to override global parallelization settings on individual test cases to require serial execution by calling `i_suck_and_my_tests_are_order_dependent!` within the test class.

{% include rails_testing_tips_plug.html %}

One additional feature that's not documented anywhere that I could find except in the source code: you can specify the number of worker threads started and run by Minitest::Parallel::Executor by providing an environment variable on the command line when you run your tests like so: `N=4 rake test`.  (Minitest defaults to `N=2` if no other value is given.)

## Ruby Concurrency vs. Ruby Parallelism ##

There's an important difference between these two concepts that needs to be made clear before moving forward: *concurrency* indicates an ability to manage several tasks, while *parallelism* implies that I can actually **do** multiple things simultaneously.  (Ilya Grigorik summed this up better than I ever could in an [article][5] he wrote on the subject.)  As an example, I'm might be able to juggle lots of chainsaws (excellent concurrency), but I probably can't hold more than one of them at any given time (no parallelism).

{% img center /images/juggling_chainsaws.jpg Juggling chainsaws %}

**In Ruby, whether you achieve parallelism or only concurrency depends on the thread model implemented by the interpreter.**  This is a decision that you the developer make. Minitest can't influence it either way.  Concretely, MRI's thread model maps Ruby Thread objects onto system-level threads, but the Global Interpreter Lock (GIL) ensures thread safety by ensuring that only one is ever allowed to execute at any given time, so parallelism within a single Ruby process is impossible.  Other Ruby implementations - JRuby and Rubinius, as examples - don't have the GIL, and so true parallel execution is possible in both these environments.

Ryan Davis, the author of Minitest makes no secret about [what Minitest::Parallel was written for][4]:

> I don’t care in the slightest about trying to make your tests run faster. You deserve your pain if you write slow tests. What I do care about greatly is making your tests hurt and this will do that.
>
> *- Ryan Davis*

And he's right, of course.  Randomizing the order in which tests are executed gives you a certain measure of confidence that you've managed to write independent tests, and that's the default behavior Minitest provides.  But by then executing tests across multiple threads that don't share state between, you're adding an additional level of isolation insurance.  But why shouldn't we have all of that **and** the fastest possible test execution?  Are there any trade-offs?

## The Setup ##

I set up a base project that consisted of an empty Ruby gem with a basic Rakefile and code to generate 1000 tests spread over ten more or less identical test cases which all followed the same pattern:

{% codeblock lang:ruby test/one_fake_test.rb %}
require "test_helper"

class OneFakeTest < Minitest::Test
  (1..100).each do |i|
    define_method("test_#{ i }") do
      (1..8000).reduce(:*)
      assert(true)
    end
  end
end
{% endcodeblock %}

My goal was to demonstrate test suite performance for three options:

* Baseline - serial execution only
* Minimally parallel - concurrent with two workers
* Maximally parallel - concurrent with eight workers (= number of CPU threads on my development machine)

In order to see how Minitest behaved across different interpreters, I ran the same test using MRI Ruby 2.1.1, JRuby 1.7.9, and Rubinius 2.2.10.

{% include rails_testing_tips_plug.html %}

For each implementation and each concurrency level, I executed three test runs and calculated the averages values for suite execution and number of assertions per second as reported by Minitest as well as the total and CPU times reported by the Unix `time` command.  The tables below show the averages along with the relative differences over the baseline (serial) case in parentheses.

## Round 1: MRI ##

<table class="results">
  <col style="width: 20%">
  <col style="width: 20%">
  <col style="width: 20%">
  <col style="width: 20%">
  <col style="width: 20%">
  <thead>
    <tr class="header">
      <th colspan="5">MRI Ruby 2.1.1</th>
    </tr>
    <tr class="header">
      <th></th>
      <th>Total Time (MT)</th>
      <th>Assertions/s (MT)</th>
      <th>Total Time<br/>(UNIX time)</th>
      <th>CPU Time<br/>(UNIX time)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th class="center">
	    Serial
		<br/>
		(baseline)
      </th>
      <td class="center">
	    23.42s
	  </td>
      <td class="center">
	    42.71
	  </td>
      <td class="center">
	    24.06s
	  </td>
      <td class="center">
	    23.81s
	  </td>
    </tr>
    <tr>
      <th class="center">
	    Parallel
		<br/>
		(2 threads)
	  </th>
      <td class="center">
	    26.99s
		<br/>
		<span class="delta">(15.28%)</span>
	  </td>
      <td class="center">
	    37.07
		<br/>
		<span class="delta">(-13.20%)</span>
	  </td>
      <td class="center">
	    27.65s
		<br/>
		<span class="delta">(14.95%)</span>
	  </td>
      <td class="center">
	    27.39s
		<br/>
		<span class="delta">(15.02%)</span>
	  </td>
    </tr>
    <tr>
      <th class="center">
	    Parallel
	    <br/>
	    (8 threads)
	  </th>
      <td class="center">
	    29.99s
		<br/>
		<span class="delta">(28.09%)</span>
	  </td>
      <td class="center">
	    33.34
		<br/>
		<span class="delta">(-21.93%)</span>
	  </td>
      <td class="center">
	    30.66s
		<br/>
		<span class="delta">(27.45%)</span>
	  </td>
      <td class="center">
	    30.18s
		<br/>
		<span class="delta">(26.74%)</span>
	  </td>
    </tr>
  </tbody>
</table>

The GIL optimizes for single-threaded execution, so while the additional concurrency might be giving us better assurances that each test is isolated and independent, it's not free.  It's not too painful in this test application, but if I were running a suite for a large, well-covered Rails application where some slower tests are usually unavoidable, I might feel like the added insurance is too expensive.

## Round 2: JRuby ##

<table class="results">
  <col style="width: 20%">
  <col style="width: 20%">
  <col style="width: 20%">
  <col style="width: 20%">
  <col style="width: 20%">
  <thead>
    <tr class="header">
      <th colspan="5">MRI Ruby 2.1.1</th>
    </tr>
    <tr class="header">
      <th></th>
      <th>Total Time (MT)</th>
      <th>Assertions/s (MT)</th>
      <th>Total Time<br/>(UNIX time)</th>
      <th>CPU Time<br/>(UNIX time)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th class="center">
	    Serial
		<br/>
		(baseline)
      </th>
      <td class="center">
	    66.18s
	  </td>
      <td class="center">
	    15.11
	  </td>
      <td class="center">
	    72.12s
	  </td>
      <td class="center">
	    81.96s
	  </td>
    </tr>
    <tr>
      <th class="center">
	    Parallel
		<br/>
		(2 threads)
	  </th>
      <td class="center">
	    40.35s
		<br/>
		<span class="delta">(-39.04%)</span>
	  </td>
      <td class="center">
	    26.83
		<br/>
		<span class="delta">(77.53%)</span>
	  </td>
      <td class="center">
	    46.45s
		<br/>
		<span class="delta">(-35.59%)</span>
	  </td>
      <td class="center">
	    95.75s
		<br/>
		<span class="delta">(16.82%)</span>
	  </td>
    </tr>
    <tr>
      <th class="center">
	    Parallel
	    <br/>
	    (8 threads)
	  </th>
      <td class="center">
	    17.28s
		<br/>
		<span class="delta">(-73.90%)</span>
	  </td>
      <td class="center">
	    58.02
		<br/>
		<span class="delta">(283.96%)</span>
	  </td>
      <td class="center">
	    23.24s
		<br/>
		<span class="delta">(-67.77%)</span>
	  </td>
      <td class="center">
	    134.28s
		<br/>
		<span class="delta">(63.83%)</span>
	  </td>
    </tr>
  </tbody>
</table>

My expectations for JRuby were higher because it uses a threading model that allows for fully parallel execution in multicore environments, and I was not disappointed.  Despite being kind of a slow starter, JRuby was able utilize a lot more available CPU when I increased the concurrency, and I was able to run the test suite in about one-third the time.

## Round 3: Rubinius ##

<table class="results">
  <col style="width: 20%">
  <col style="width: 20%">
  <col style="width: 20%">
  <col style="width: 20%">
  <col style="width: 20%">
  <thead>
    <tr class="header">
      <th colspan="5">MRI Ruby 2.1.1</th>
    </tr>
    <tr class="header">
      <th></th>
      <th>Total Time (MT)</th>
      <th>Assertions/s (MT)</th>
      <th>Total Time<br/>(UNIX time)</th>
      <th>CPU Time<br/>(UNIX time)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th class="center">
	    Serial
		<br/>
		(baseline)
      </th>
      <td class="center">
	    24.31s
	  </td>
      <td class="center">
	    41.15
	  </td>
      <td class="center">
	    27.22s
	  </td>
      <td class="center">
	    28.80s
	  </td>
    </tr>
    <tr>
      <th class="center">
	    Parallel
		<br/>
		(2 threads)
	  </th>
      <td class="center">
	    16.51s
		<br/>
		<span class="delta">(-32.07%)</span>
	  </td>
      <td class="center">
	    60.61
		<br/>
		<span class="delta">(47.30%)</span>
	  </td>
      <td class="center">
	    19.25s
		<br/>
		<span class="delta">(-29.29%)</span>
	  </td>
      <td class="center">
	    35.14s
		<br/>
		<span class="delta">(22.02%)</span>
	  </td>
    </tr>
    <tr>
      <th class="center">
	    Parallel
	    <br/>
	    (8 threads)
	  </th>
      <td class="center">
	    12.81
		<br/>
		<span class="delta">(-47.31%)</span>
	  </td>
      <td class="center">
	    78.10
		<br/>
		<span class="delta">(89.80%)</span>
	  </td>
      <td class="center">
	    15.62s
		<br/>
		<span class="delta">(-42.62%)</span>
	  </td>
      <td class="center">
	    63.42s
		<br/>
		<span class="delta">(120.18%)</span>
	  </td>
    </tr>
  </tbody>
</table>

Rubinius was the quickest interpreter I tested by a mile.  Even though the performance gains from each additional thread weren't as substantial as I saw in JRuby and tapered off more quickly, the fact is that Rubinius was really nimble, did a good job utilizing multiple cores, and needed about half the startup time of JRuby.  I haven't used Rubinius before, but this experience has convinced me to take a closer look at it in the future.


## The Long and Short of It ##

In the end, I learned as much about Ruby and Ruby implementations as I did about Minitest, and so even though this all took some time to think through and set up, it was time well spent.

* Concurrent execution in Minitest isn't just (or even primarily) about speed.  Even with no improvement in performance, the increased test isolation is a worthwhile benefit.
* When using a Ruby implementation that allows for true parallel execution, enable parallel execution with concurrency equal to or approaching the number of available CPU cores on your test system.
* When using MRI Ruby, you'll see the best performance when running in a single thread, but taking a slight performance hit to run concurrently in two threads would probably be a good compromise.

YMMV when it comes to implementing (or not) concurrent execution within your own real-world tests, but hopefully this will give you a better understanding of how it works in Minitest, what you gain from it, and how to make it work for you.

### Additional References ###

* [Minitest Parallelization and You][4] by Ryan Davis
* [Parallelism is a Myth in Ruby][5] by Ilya Grigorik
* [Concurrency in Ruby Explained][7] by Matt Aimonetti
* [More about MRI and the GIL][6] by Jesse Storimer

{% include mailchimp/minitest_after_post2.html %}

[1]: https://github.com/seattlerb/minitest
[2]: https://github.com/seattlerb/minitest/blob/master/lib/minitest/hell.rb
[3]: https://github.com/seattlerb/minitest/blob/master/lib/minitest/parallel.rb
[4]: http://blog.zenspider.com/blog/2012/12/minitest-parallelization-and-you.html
[5]: https://www.igvita.com/2008/11/13/concurrency-is-a-myth-in-ruby/
[6]: http://www.jstorimer.com/pages/more-about-mri-and-the-gil
[7]: http://merbist.com/2011/02/22/concurrency-in-ruby-explained/
