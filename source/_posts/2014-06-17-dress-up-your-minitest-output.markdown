---
layout: post
title: "Dress Up Your Minitest Output"
date: 2014-06-17 09:33:03 +0200
comments: true
categories: [development, Ruby, Minitest, testing]
description: Colorize and add important detail to your Minitest output using the minitest-reporters gem.
---
Ruby folks are known to be a hyperactive lot, and it seems like few things in the Ruby world are as subject to change as the new hotness in testing.  Over the years, I've used Test::Unit and [RSpec][1] at various times with a whole array of complementary libraries for test data and mocking and assertions and so on.  At the moment though, I'm using relatively unadorned [Minitest][2] for most projects.  Why?  Like a lot of people, I like that it's straightforward to use and takes no time to load up, but I'm also finding that the simplicity of the library means that it's pretty easily customizable - either using third-party gems or with a little bit of hacking on your own.

The output that Minitest produces by default is pretty basic, printing a dot for each passing test and a letter F for each failure.

{% img center /images/minitest_output_default.png 750 Minitest - default output %}

That's a decent place to start, but the bigger my test suite grows, the more I want those super-obvious visual cues that let me know what's going on with my tests.<!--more--> Minitest makes it easy enough to hack some of these things in on your own, but to save time, I can use the [minitest-reporters][3] to give myself a set of baseline hooks to use and customize for better Minitest output.  It provides a bunch of alternate formatters based on Minitest::StatisticsReporter that provide options for customizing your test output.

To get started, you'll need to add the gem to your Gemfile as follows:

{% codeblock lang:ruby Gemfile %}
gem 'minitest', group: :test
gem 'minitest-reporters', group: :test
{% endcodeblock %}

And then you just need to add a few lines to your ```test_helper.rb``` file to get started with a basic configuration.  (The examples that follow are real and taken from my current project which happens to be a Rails application, but nothing in the gem prevents its use with non-Rails projects.)

{% codeblock lang:ruby test/test_helper.rb %}
ENV['RAILS_ENV'] = 'test'
require File.expand_path('../../config/environment', __FILE__)
require 'rails/test_help'
require 'minitest/rails'
require 'minitest/reporters'
...
reporter_options = { color: true }
Minitest::Reporters.use! [Minitest::Reporters::DefaultReporter.new(reporter_options)]
{% endcodeblock %}

Just a few lines, and now I've got red-green coloring on my tests indicating pass-fail.  Nice.

{% img center /images/minitest_output_default_colors.png 750 Minitest - colored output %}

Another option that the DefaultReporter class has that I didn't know about until recently is the ability to list out the N slowest running tests from the suite by specifying a value for the ```:slow_count``` option.

{% codeblock lang:ruby test/test_helper.rb %}
reporter_options = { color: true, slow_count: 5 }
Minitest::Reporters.use! [Minitest::Reporters::DefaultReporter.new(reporter_options)]
{% endcodeblock %}

{% img center /images/minitest_output_colors_and_slow_tests.png 750 Minitest - slow tests %}

A feature like this, while awesomesauce, is still subject to the limitations of Ruby (random garbage collection) and Rails (stack initialization) and might not be all that useful to you if you're running a small test suite.  Still, if you notice that the same tests are consistently showing up on that list, it might be time to take a look to see what you can do about it.

Next, I need to make a few changes to save my old and broken eyes because, lucky me, I've had problems with colors since I was a kid - both distinguishing them (browns look like greens, blues look like purples, etc.) and seeing them at all unless there's sufficient contrast with the background.  In particular, the red-on-black error text is a bit of a pain for me to make out, so I wanted to change the color to something a little brighter.  The [ANSI escape codes][4] only allow for 16 colors, but fortunately, we can subclass Minitest::DefaultReporter to produce the desired behavior.  I'd suggest something like this:

{% codeblock lang:ruby test/test_helper.rb %}
module Minitest
  module Reporters
    class AwesomeReporter < DefaultReporter
      GREEN = '1;32'
      RED = '1;31'

      def color_up(string, color)
        color? ? "\e\[#{ color }m#{ string }#{ ANSI::Code::ENDCODE }" : string
      end

      def red(string)
        color_up(string, RED)
      end

      def green(string)
        color_up(string, GREEN)
      end
    end
  end
end

reporter_options = { color: true, slow_count: 5 }
Minitest::Reporters.use! [Minitest::Reporters::AwesomeReporter.new(reporter_options)]
{% endcodeblock %}

{% img center /images/minitest_output_custom_colors.png 750 Minitest - custom colors %}

Well, at least it's readable against the background.  I'm still probably going to tweak the color settings in my terminal.  :)

{% include minitest_cookbook_plug2.html %}

Finally, it would be nice, especially as the test suite grows and I add more and more extensive integration and acceptance tests, to provide an immmediate indication when a test runs longer than a certain threshold time.  The way that DefaultReporter is currently implemented doesn't really lend itself to making the kind of change I have in mind, so I've created my own [fork][5] of the gem and submitted a pull request that provides an easier way change the output for successful, failed, and skipped tests.  I'll just replace the Gemfile entry I added previously and have it point to my own repo and branch like so.  (See update at the end of this post.)

{% codeblock lang:ruby Gemfile %}
gem 'minitest', group: :test
gem 'minitest-reporters', git: 'git@github.com:chriskottom/minitest-reporters.git',
  branch: 'refactor-default-reporter-record', group: :test
{% endcodeblock %}

And then I can modify my AwesomeReporter class so that it accepts a ```:slow_threshold``` option and formats the output for successful tests based on the test run time.

{% codeblock lang:ruby Gemfile %}
module Minitest
  module Reporters
    class AwesomeReporter < DefaultReporter
      GRAY = '0;36'
      GREEN = '1;32'
      RED = '1;31'

      def initialize(options = {})
        super
        @slow_threshold = options.fetch(:slow_threshold, nil)
      end

      def record_pass(test)
        if @slow_threshold.nil? || test.time <= @slow_threshold
          super
        else
          gray('O')
        end
      end

      def color_up(string, color)
        color? ? "\e\[#{ color }m#{ string }#{ ANSI::Code::ENDCODE }" : string
      end

      def red(string)
        color_up(string, RED)
      end

      def green(string)
        color_up(string, GREEN)
      end

      def gray(string)
        color_up(string, GRAY)
      end
    end
  end
end
{% endcodeblock %}

We end up with testing output that says a lot about the current state of the application at a glance.  By drawing our attention to critical pieces of information, we can use this output to drive development to the areas that need our effort.

{% img center /images/minitest_output_custom_output.png 750 Minitest - final customized output %}

**Update:** The above-mentioned pull request was merged by the maintainer of Minitest::Reporters, so it's now recommended to refer to the canonical repository in your Gemfile:

{% codeblock lang:ruby Gemfile %}
gem 'minitest', group: :test
gem 'minitest-reporters', git: 'git@github.com:kern/minitest-reporters.git', group: :test
{% endcodeblock %}

{% include mailchimp/minitest_after_post3.html %}

[1]: http://rspec.info/
[2]: https://github.com/seattlerb/minitest
[3]: https://github.com/kern/minitest-reporters
[4]: https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
[5]: https://github.com/chriskottom/minitest-reporters
