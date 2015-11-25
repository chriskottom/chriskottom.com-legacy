---
layout: post
title: "Bulletproof Rails Background Jobs"
date: 2015-11-12 13:24:35 +0100
comments: true
categories: [development, Rails, Active Job, Sidekiq, background jobs]
---
{% img no-border right /images/bulletproof_superman.jpg %}
The ability to run operations with long or uncertain execution times in the background has become a standard tool for modern web applications, and most frameworks and platforms now include some sort of support for encapsulating pieces of logic that involve heavy lifting out of the main request/response cycle.  For example, I recently finished work on a relatively simple Rails application that had about a dozen different background jobs written for a whole range of standard-ish use cases:

* Sending bulk notifications to a group of users
* Consuming data from external APIs and updating the database
* Batch creation of work items to users
* Importing records from an uploaded data file
* Complex object state manipulation that doesn't fit in an AR callback
* Refreshing scores cached in the database after an admin changes the weights used to calculate them

The way I write and test background workers has evolved over the years, and since I'm getting ready to start a new project that will have a big background processing component, I thought it would be a good time to reflect on my approach and what I've learned.<!--more-->

Background processing libraries differ a little from one another in their semantics.  The examples in this post are written using Active Job and were backed by Sidekiq in the production environment, but For the purposes of this post, but most of the same patterns and principles can be applied generally regardless of the framework you choose.

## Separate Business Logic from Job Execution

{% img no-border right /images/poro_all_the_things.jpg PORO ALL THE THINGS!! %}
Rails developers, especially in the beginning, can get a little hung up on the One True Way of doing things and look to squeeze their applications into the buckets that Rails gives them - `assets`, `controllers`, `models`, and so on.  But if I had to give you one piece of advice for writing better background workers, it would be this: **look for opportunities to pull bits of business logic out of your jobs and into plain-old Ruby objects**.  As a rule, I'd like to keep my job's `#perform` method as lean as possible - 10-15 lines of code is a good target.

Encapsulating most of the processing logic in POROs will usually help you achieve that goal while maintaining a nice [separation of concerns](http://deviq.com/separation-of-concerns/) between logic that belongs to your business domain and logic associated with your queueing and retrying jobs.  Later, when you decide to switch background processing frameworks or want to move the processing to some other part of the application, you'll have a much easier time of it.

For example, one of my recent apps includes a scoring feature that lets users rate items on a 1-5 scale using various criteria.  The total score is computed based on the individual ratings and the weights assigned to each of the criteria which can be changed at any time by the administrator.  Ranking the items by their average scores might involve thousands of calculations, so the application caches the score calculated for each user's assessment to make the calculation easier and faster when displaying a table of leaders.  And I do this with a background job that leans heavily on a PORO.

{% codeblock lang:ruby app/models/assessment_scorer.rb %}
class AssessmentScorer
  def self.score(assessments)
    assessments.each do |assessment|
      score = calculate_score(assessment)
      assessment.score = score && assessment.save!
      yield assessment, score if block_given?
    end
  end

  def self.calculate_score(assessment)
    # ...
  end
end
{% endcodeblock %}

{% codeblock lang:ruby app/jobs/recalculate_assessment_scores_job.rb %}
class RecalculateAssessmentScoresJob < ActiveJob::Base
  queue_as :medium_priority

  def perform(category_id)
    assessments = Assessment.where(category_id: category_id)
    AssessmentScorer.score(assessments) do |assessment, score|
      logger.debug "Scored assessment #{ assessment.id } at #{ score }"
    end
  end
end
{% endcodeblock %}

I like this pattern for a couple of different reasons.  First of all, the `#perform` method stays really simple - get the input parameters, fetch the necessary model objects, and delegate the important logic to something else.

Second, let's take a moment to appreciate the interface of this PORO.  It's clean, it's easy to understand, and I can pick it up and use it anywhere - in a controller action, as part of a Rake task, from the console, wherever.

You can also see that I'm leaving open the option of passing a block to the logic in my PORO.  I tend to use this pattern a lot to inject logic that isn't strictly business-related but should be run sort of like a callback.  These are especially nice when you're processing a collection of objects as I am here.

## Let the Job Be Responsible for Flow Control

Based on the previous example, you might be led to believe that the background job is nothing but a mechanism for executing the business logic asynchronously.  That's part of the picture, but more broadly, the job has a few responsibilities of its own:

* Handling input parameters
* Delegating processing to models, service objects, etc.
* Handling exceptions
* Follow-up activities (retries, scheduling further jobs)

In the same application, I wrote another job to handle bulk loading of user records based on a CSV file uploaded by the administrator.  Rather than forcing the user to wait for all the new records to be created, the controller just queued an import job to run in the background and rendered a response.  The job was then responsible for reporting back to the admin with the results of the import.

{% codeblock lang:ruby app/jobs/process_imported_users_job.rb %}
class ProcessImportedUsersJob < ActiveJob::Base
  queue_as :medium_priority

  def perform(import_id)
    user_import = UserImport.find(import_id)
    csv = user_import.user_data

    users, errors = UserBulkLoader.load(csv) do |user|
      logger.debug "Created new user account: #{ user.login }"
    end

    UserImportsMailer.import_completed(user_import, users, errors).deliver_now
  rescue ActiveRecord::RecordNotFound, CSV::MalformedCSVError => e
    UserImportsMailer.import_failed(user_import, e).deliver_now
  end
end
{% endcodeblock %}

In this case, the `#process` method is doing more than we saw in the previous example, but it sticks to the areas of responsibility that we outlined previously.

* Fetching the model that contains the CSV data to be imported based on the input parameter
* Delegating responsibility for the actual bulk loading process to the UserBulkLoader class
* Handling and logging the newly created records along with any errors
* Sending an email after the job finishes notification with the results
* Notifying the admin in case the job failed due to bad inputs

In cases where we want to handle an exception by retrying the job, we can do that at the level of the class by including a `rescue_from` block like the one shown below.

{% codeblock lang:ruby app/jobs/process_imported_users_job.rb %}
class ProcessImportedUsersJob < ActiveJob::Base
  queue_as :medium_priority

  rescue_from(ActiveRecord::ConnectionNotEstablished) do
    retry_job wait: 60.seconds, queue: :low_priority
  end

  # ...
end
{% endcodeblock %}

As Rails applications have grown and matured, we've asked them to do more complete and weighty tasks, and background jobs have been a necessity to keep the web application side of things responsive and zippy.  But in a lot of cases, developers simply dump code into workers and call it a day.  Just by following a few common-sense patterns, you can keep the back side of your code as neat and well-ordered as the front.

{% include mailchimp/minitest_after_post_rails.html %}


