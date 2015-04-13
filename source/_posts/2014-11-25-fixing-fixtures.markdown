---
layout: post
title: "Fixing Fixtures"
date: 2014-11-25 10:47:46 +0100
comments: true
categories: [development, Rails, Ruby, testing, fixtures, factories]
description: A set of tips and practices to help keep your Rails fixtures manageable and your tests readable
---
Rails fixtures have received a bad rap from almost everybody in the Rails world (core team excluded) for almost as long as the framework has been around.  Ever since alternatives like [factory_girl][1] and [Fabrication][2] arrived on the scene, it's been considered uncool to use them for anything serious.  Reasons cited by the haters include:

* Test readability: Managing a separate file with test data makes it unclear what's really being tested.
* Maintainability: Changes to attributes or validations might require changes to multiple fixtures.
* In-memory objects: A tool like factory_girl's `build_stubbed` speeds tests by walling off the database.

For all their problems though, fixtures do have a few things going for them:

* Speed: They're bulk loaded before the test run, so they can be faster than factories in many cases.
* Stable: You always know the state of your test database, at least when using transactional fixtures.

Lately there's been a big uptick in the number of developers who've been pursuing a more "back to basics" approach to testing, and fixtures have seen a surge in usage over where they were a few years ago. Call it a hipster plot if you want, I think that's a neat trend.  But popularity isn't enough to solve any of the fundamental issues with using fixtures.  Here are a few tips and pointers I use to keep my fixtures manageable.<!--more-->

## Don't Choose Between Naming Conventions ##

The recommendations I've seen for naming Rails fixtures have generally fallen into two categories: memorable and functional.

* Memorable names should be fun and easy to recall when you're writing your tests in a different editor window.  Think: names of cartoon and film characters, famous cities, etc.
* Functional names should be descriptive, occasionally over-long, but clear about the state of the model.

Most books and articles focus on one or the other, but I think both are needed.

When you reference a fixture-derived model within one of your tests, you want the character of the model to be absolutely clear to the reader.  Which of these do you think will be more meaningful?

{% codeblock lang:ruby %}
def test_completed_task_cant_be_completed_again
  completed_task1 = tasks(:complete)
  completed_task2 = tasks(:freds_task)
  ...
end
{% endcodeblock %}

In this case, I prefer `tasks(:completed)` because, as the name of the test indicates, I'm checking the model's behavior when it's already in a completed state. So the name of the fixture model should make that completely clear.

This becomes doubly important in edge-case tests where I might have multiple aspects of the model that are relevant to reproduce a specific condition - maybe corresponding to a real-world bug.  In these cases, the name should be as long as it needs to be to reflect all relevant aspects of the model state.

Having said all that though, I usually prefer to use memorable names when the model state is not as important or when defining the relationships between models.  They're more relatable and usually involve less typing.  So superhero names, characters from Office Space, and so on all have their place as is correct and proper.

## Define the Right Records ##

As we alluded to just now, using fixtures will mean (gulp) defining your own test data (double-gulp) in advance (big gulp) for at least a few different scenarios.  I'm not saying you should immediately fill in your boilerplate fixture files with records in every conceivable state, but you should expect to grow your fixtures as you grow your tests.  This is where most developers run into problems - as the fixture files grow and become more difficult to manage.

These are the types of records that I find are needed most often in my own test suites.

* One record with only the minimum set of valid attributes
* One record with a (realistic) full set of attributes
* Records for defined model states, identified boundary conditions

Each of these will correspond to a specific function within your test cases.  I generally use the first type of record for testing Rails and custom validations in my models.  First, verify the validity of the minimum record, and then test each validation individually to be sure that it works as intended.  For most simple Rails validations, these kinds of tests are trivial but still necessary, and for more complex conditions, they're indispensable.  Essentially, I want to show that a barebones valid record can fail each validation in turn and independently.

{% codeblock lang:ruby test/models/task_test.rb %}
class TaskTest < ActiveSupport::TestCase
  def task
    @task ||= task(:barebones)
  end

  def test_valid
    assert task.valid?
  end

  def test_invalid_without_description
    task.description = nil
	assert task.invalid?
  end
end
{% endcodeblock %}

I'll also use the minimal record and the realistic record to test miscellaneous methods such as virtual attributes, business logic, and so on.  By having something that seems close to reality, I'll see if my code works well for most of the happy-case scenarios, while using the minimum valid model shows me where my logic could be made more robust.  The objective here is more about development than testing - basically being sure I'm designing the empty states for model behavior as well as the "normal" state.

The last category requires some further explanation.  For model behavior that's affected by state, you'll want to ensure that you've paid attention to the kinds of edge cases that can come up, for example:

* State violations - e.g. marking a task as complete when it's already been completed, selling an item that's already been sold, etc.
* Boundary conditions - e.g. withdrawal from an account with zero balance, triggering stock replenishment when inventory falls below a threshhold value, etc.

To keep your tests expressive, it's not a bad idea to use specifically labelled models in your fixtures that address the various states and conditions involved in your tests.  In some cases, these models will only be used for single tests which might feel wasteful, but it's all in the service of keeping your tests readable.

**Note:** You can also expect that tests that are added to your suite during bug-fixing to replicate a particular error case found in the wild will probably involve the introduction of new models to your fixtures.

## Use YAML to DRY Out Your Fixtures ##

You might have seen some more recent Rails applications that use the alias and merge features in YAML to remove duplications in the database configuration file:

{% codeblock lang:yaml config/database.yml %}
default: &default
  adapter: sqlite3
  pool: 5
  timeout: 5000

development:
  <<: *default
  database: db/development.sqlite3

test:
  <<: *default
  database: db/test.sqlite3

production:
  <<: *default
  database: db/production.sqlite3
{% endcodeblock %}

Did you know you can do the same thing in your fixtures?  This is advanced-level kung fu, and it's the trick that makes fixtures usable for me.  The example below shows how you can use these in fixtures and how I use it to pull together the ideas we've already discussed.

{% codeblock lang:yaml test/fixtures/tasks.yml %}
barebones: &minimal
  description: Design new search feature

incomplete: &realistic
  <<: *minimal
  completed: false
  project: top_secret
  assignee: mark

complete:
  <<: *realistic
  completed: true

security:
  <<: *realistic
  description: Fix security bug
{% endcodeblock %}

Here we define a `barebones` Task at the same time as the alias `minimal_attributes` which is used with the merge key *<<* to insert into a more complete record below it.  I'm then using that `&realistic` alias to populate attributes for all the remaining records. Overwriting any attribute for a specific model is possible by simply assigning it after the merge as I've done with the `complete` model's completion state and the description text for `security`.

## Don't Be Afraid to Create Objects ##

Finally, remember that you're testing *objects* at the end of the day, not data.  If you feel like your test's readability suffers when the object under test is defined elsewhere, there's nothing wrong with instantiating new model instances right there in your tests.  Whenever possible, you should try to use `new` instead of `create` to avoid spending time writing to the database if it's not needed.

* * * * *

I like how Eric Steele explained it in his [Getting Friendly with Fixtures][3] post:

> But here’s the thing about fixtures: They get easier over time. Getting started with fixtures is a little painful, but can be pretty damned enjoyable once the data requirements settle down.

And it's true.  Fixtures are an investment in your application and your tests.  In the beginning, it will seem like a lot of work as you're changing your data model often, but if you spend enough time with them to get past the initial squirm of discomfort, it can pay off down the line.

## Further Reading ##

OMG, Fixtures have enjoyed such a resurgence that people have been blogging about them!!  Check out some of these posts for additional insight and tips.

* [Tricks and Tips for using Fixtures effectively in Rails][6] - by Prathamesh Sonpatki
* [Getting Friendly with Fixtures][3] - by Eric Steele
* [7 Reasons Why I'm Sticking with Minitest and Fixtures in Rails][4] - by Brandon Hilkert
* [Time to Bring Back Fixtures][5] - by Jason Roelofs

{% include mailchimp/minitest_after_post3.html %}

[1]: https://github.com/thoughtbot/factory_girl
[2]: http://github.com/notahat/machinist
[3]: https://whatdoitest.com/getting-friendly-with-fixtures
[4]: http://brandonhilkert.com/blog/7-reasons-why-im-sticking-with-minitest-and-fixtures-in-rails/
[5]: http://collectiveidea.com/blog/archives/2014/08/06/time-to-bring-back-fixtures/
[6]: http://blog.bigbinary.com/2014/09/21/tricks-and-tips-for-using-fixtures-in-rails.html
