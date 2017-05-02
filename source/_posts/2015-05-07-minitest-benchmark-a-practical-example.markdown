---
layout: post
title: "Minitest::Benchmark: A Practical Example"
date: 2015-05-07 11:36:30 +0200
comments: true
categories: [development, Ruby, Minitest, benchmarks, performance]
description: Minitest::Benchmark can be a useful tool in testing your code, but there's precious little information about how it's used in the wild. In the second installment of this series, we look at a practical example.
---
In the [last post](/blog/2015/04/minitest-benchmark-an-introduction/), we looked at Minitest::Benchmark as a high-level concept and sketched out a basic structure for how we might test with them.  I don't know about anyone else, but I've gotta say: the process of researching and writing that post gave me a lot of perspective on what Benchmarks do and where my own tests could benefit from their use.  There's a limit, though, to what you can learn from looking at technology from 10,000 feet.  What usually delivers the most bang for my buck is seeing how a thing is used in practice, trying it out myself, and seeing where I'm getting value from it.

In this post, we're going to take a first crack at a practical benchmarking example to get started down that path.  When we're finished, we'll reflect on what we've observed and what, if anything, we've learned from it.<!--more-->

## The code under test ##

{% img right no-border /images/get_sorted.png 250 Keep Calm and Get Sorted %}

Recall from the [previous post](/blog/2015/04/minitest-benchmark-an-introduction/) that Benchmarks run the code in a given block against progressively larger workloads.  So as much as I didn't want it to come to this, the example that I chose for this post is **sort algorithms**.  Why?

* They're familiar to a lot of programmers from CS courses they took years ago.  (Or in some cases, even decades...)
* Their performance characteristics are comprehensible and predictable.
* The workload is easily quantifiable as the size of the list of items to be sorted.

For demonstration purposes, it's enough to implement just one or two sorting algorithms, preferably with differing performance characteristics, and to build out a practical example project.  In this case, I took [insertion sort](https://en.wikipedia.org/wiki/Insertion_sort) and [merge sort](https://en.wikipedia.org/wiki/Merge_sort) as examples.

{% codeblock lang:ruby lib/sorters.rb %}
module Sorters
  class Base
    attr_reader :values
    def initialize(values)
      @values = values.dup
    end
  end

  # Insertion Sort
  # Move elements one by one into their proper position
  # within the sorted portion of the collection.
  class Insertion < Base
    def sort
      # insertion sort implementation...
    end
  end

  # Merge Sort
  # Divide the collection into two halves, and sort each half.
  # Then combine the sorted halves and sort the result.
  class Merge < Base
    def sort
      # merge sort implementation...
    end
  end
end
{% endcodeblock %}

(For those who are interested, all of the main source files for this post can be found in a [gist](https://gist.github.com/chriskottom/22ed11c5b332cd98bfce).)

Getting set up to test this code is similar to other projects you may have seen.  First, we'll want to create a Rakefile with tasks for running our tests.  While it's possible to run all tests with a single task, it's not going to be very useful.  Why?  Because when you're using unit tests to guide your development, you want to keep the feedback loop between running tests and writing code as tight as possible.  Not unlike acceptance tests in your Rails applications, a properly conceived Benchmark will most likely take more time to execute than you'll want to spend during regular development, TDD or otherwise.  For this reason, I'd recommend setting up a separate `:bench` task that you'll use to run your benchmarks as shown below.

{% codeblock lang:ruby Rakefile %}
require "rake/testtask"

Rake::TestTask.new(:test) do |t|
  t.libs = %w(lib test)
  t.pattern = 'test/**/*_test.rb'
end

Rake::TestTask.new(:bench) do |t|
  t.libs = %w(lib test)
  t.pattern = 'test/**/*_benchmark.rb'
end

task :default => :test
{% endcodeblock %}

Next, you'll want to set up the test helper file that will be required at the top of each of your tests.  This will be used both for regular unit tests and performance benchmarks, so you'll want to make sure that you explicitly require `minitest/benchmark` which is not otherwise required by `minitest/autorun`.

For the purposes of this example, I've also added a RandomArrayGenerator helper module with that I can use to generate lists of randomized numbers and Strings which my tests will use as targets for sorting.

{% codeblock lang:ruby test/test_helper.rb %}
require "minitest/autorun"
require "minitest/benchmark"

require "sorters"

module RandomArrayGenerator
  def random_numbers(size = 10)
    result = []
    size.times do
      result << rand
    end
    result
  end

  def random_strings(size = 10, length = 8)
    result = []
    size.times do
      result << random_string(length)
    end
    result
  end

  private

  def random_string(length = 8)
    (1..length).inject("") { |memo, n| memo << (rand(93) + 33) }
  end
end
{% endcodeblock %}

At this point, I realized that the Benchmarks I'm about to write don't mean much if the algorithms I've implemented don't work as expected, so I threw together a simple unit test that checks the results of my Sorter classes against the results of Ruby's `Array#sort` method.

{% codeblock lang:ruby test/sort_test.rb %}
require "test_helper"

class SortTest < Minitest::Test
  include RandomArrayGenerator

  def setup
    @numbers = random_numbers(25)
    @strings = random_strings(25)
  end

  def test_insertion_sort_numbers
    sorted = @numbers.sort
    sorter = Sorters::Insertion.new(@numbers)
    assert_equal sorted, sorter.sort
  end

  def test_insertion_sort_strings
    sorted = @strings.sort
    sorter = Sorters::Insertion.new(@strings)
    assert_equal sorted, sorter.sort
  end

  def test_merge_sort_numbers
    sorted = @numbers.sort
    sorter = Sorters::Merge.new(@numbers)
    assert_equal sorted, sorter.sort
  end

  def test_merge_sort_strings
    sorted = @strings.sort
    sorter = Sorters::Merge.new(@strings)
    assert_equal sorted, sorter.sort
  end
end
{% endcodeblock %}

Once we've seen that this test passes, we're ready to implement our Benchmark.  As a first step, we need to define the range of values and test data that can be used across the various runs.  As mentioned in the [previous post](/blog/2015/04/minitest-benchmark-an-introduction/), you define the range by overriding the `bench_range` class method as we've done below.  The resulting values will be: `[10, 100, 1_000, 10_000, 25_000]`.

{% codeblock lang:ruby test/sort_benchmark.rb %}
require "test_helper"

class SortBenchmark < Minitest::Benchmark
  def self.bench_range
    bench_exp(10, 10_000) << 25_000
  end

  # ...
end
{% endcodeblock %}

Practically speaking, it takes a little trial and error to find the right range for each Benchmark.  In some cases the default range (powers of 10 up to 10,000) might be just what you need, but my experiments so far have shown that while larger values may produce better regression function fit, they can also be prohibitively slow to run.  For example, an attempt at running bubble sort for arrays of 100,000 elements took several minutes to execute.  Ain't nobody got time fo dat.

Next, we'll initialize collections of test data with the number of elements required for each value from our `bench_range`.  To do that, we want to use a normal Minitest `setup` method implementation and the helper mixin that we wrote into the test helper.

{% codeblock lang:ruby test/sort_benchmark.rb %}
require "test_helper"

class SortBenchmark < Minitest::Benchmark
  include RandomArrayGenerator

  def self.bench_range
    bench_exp(10, 10_000) << 25_000
  end

  def setup
    @sort_targets = {}
    self.class.bench_range.each do |n|
      @sort_targets[n] = random_numbers(n)
    end
  end

  # ...
end
{% endcodeblock %}

We're finally ready to specify our benchmark tests, but first we need to have a hypothesis about the performance characteristics for each algorithm.  Fortunately for us, both of these have been studied by generations of CS students, so we already have some expectations:

* Insertion Sort - varies as the square of the number of elements (O(n&sup2;)) &rarr; `assert_performance_power`
* Merge Sort - varies as the logarithm of the number of elements (O(n log n)) &rarr; `assert_performance_power`

So our tests end up looking like this:

{% codeblock lang:ruby test/sort_benchmark.rb %}
require "test_helper"

class SortBenchmark < Minitest::Benchmark
  # ...

  def bench_insertion_sort
    assert_performance_power do |n|
      Sorters::Insertion.new(@sort_targets[n]).sort
    end
  end

  def bench_merge_sort
    assert_performance_power do |n|
      Sorters::Merge.new(@sort_targets[n]).sort
    end
  end
end
{% endcodeblock %}

Let's see how our assumptions measure up to reality:

{% codeblock lang:bash %}
$ rake bench
Run options: --seed 24581

# Running:

bench_insertion_sort     0.000038        0.000566        0.016178        1.567154        9.789949
Fbench_merge_sort        0.000055        0.000392        0.004488        0.050258        0.134776
.

Finished in 11.627200s, 0.1720 runs/s, 0.1720 assertions/s.

  1) Failure:
  SortBenchmark#bench_insertion_sort [/home/ck1/Projects/tiny_projects/sorting_algorithms/test/sort_benchmark.rb:18]:
  Expected 0.8140132616129555 to be >= 0.99.

  2 runs, 2 assertions, 1 failures, 0 errors, 0 skips
{% endcodeblock %}

It looks like our merge sort implementation has matched expectations, but insertion sort is off.  There are plenty of possible reasons for the results we're getting here:

* The algorithm isn't optimal.  In order to know that though, we'd need to better understand whether we're overperforming or underperforming with respect to the regression function.
* The test data isn't as random as expected.  Insertion sort performs better (closer to *linear*) with data sets that are better sorted.  (And in fact, further testing showed a better correlation with linear functions than power funtions for the values tested, though still not with an R-squared of 0.99 or more.)
* Natural variability in randomized data and different runs will produce different results.  That's unlikely to overcome the kind of gap you see here with our insertion sort, but it could result in failures on certain test runs for merge sort.
* External and interpreter-specific factors (e.g. garbage collection) could affect results.

And even though I've got a failing test here, I'm still getting some valuable feedback from it.  I can see how closely my results map to a specific fit type which gives me some insight into how well the code is likely to perform with larger and larger inputs.  Like any failing test, it could be telling me that my code needs to improve or it could be telling me that my *tests* need to improve.

I'll be honest with you: I'm just getting my feet wet with Minitest::Benchmark.  I still have plenty to learn, but I can see opportunities to include it in my suites in the future as: 

* An initial target for defining code performance characteristics
* A defensive measure to catch potential future regressions

In the next installment of this series, I'm going to take a look at how we might use this kind of testing to run benchmarks against a typical Rails application.

### Additional Resources: ###

* [Minitest::Benchmark example](https://gist.github.com/chriskottom/22ed11c5b332cd98bfce) - gist containing sample source for this post
* [Sorting Algorithms Animations](http://www.sorting-algorithms.com/) - a great site for visualizing different algorithms
