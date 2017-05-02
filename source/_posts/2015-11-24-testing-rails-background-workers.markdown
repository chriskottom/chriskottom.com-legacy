---
layout: post
title: "Testing Rails Background Workers"
date: 2015-11-24 07:27:32 +0100
comments: true
categories: [development, Rails, Active Job, Sidekiq, background jobs, testing, Minitest]
---
{% img no-border right /images/set_it_and_forget_it.png Set it and forget it %}
When it was [released in Rails 4.2](http://weblog.rubyonrails.org/2014/12/19/Rails-4-2-final/), Active Job was an important addition to the platform.  Background jobs have been a part of the ecosystem for a long time, but this was the first time that developers had a single API to work with a variety of job queuing frameworks.  Having a common interface has led to a shared base of knowledge and patterns for developing and testing workers.

[In the last post, we looked at some good practices for writing well-designed background jobs in Rails using Active Job](/blog/2015/11/bulletproof-rails-background-jobs/), but we didn't get around to the question of how to test them.  This post will focus on a step-by-step strategy for testing all of your application's "set it and forget it" code - one that leverages the unified Active Job interface and the tools Rails and Minitest provide us.<!--more-->

## Testing Your Business Logic

In the last post, we said that moving business logic out of our background jobs and into plain old Ruby objects was a good way of future-proofing our applications.  As an example, we looked at a class that calculates the total score for a judge's evaluation from an app I've been working on.

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

By extracting the domain-specific processing into its own class, we keep it from becoming entangled with the other work our application does - persistence, serving web requests, or in our case, background processing.  The resulting PORO is completely portable and can be used anywhere in the application where you need to calculate a score.  Because the interface is so basic, it's also dead simple to test.

{% codeblock lang:ruby test/models/assessment_scorer_test.rb %}
class AssessmentScorerTest < ActiveSupport::TestCase
  test "scores for assessments are set" do
    assessments = [assessments(:good), assessments(:bad)]
    assessments.each { |j| assert_nil j.score }

    AssessmentScorer.score(assessments)
    assert_equal 46, assessments(:good).reload.score
    assert_equal 24, assessments(:bad).reload.score
  end
  
  # ...
end
{% endcodeblock %}

`AssessmentScorer.score` has no meaningful return value, so we test it by making assertions about direct public side effects - in this case, that the score for each Assessment has been set to the expected value.

## Testing the Job

As a rule of thumb, I try to keep my background workers lean and mean - 10-15 lines of code is usually plenty.  That's only possible by limiting what the job is allowed to do.  By removing all the business logic, you can reduce the `#perform` method to just a few basic responsibilities.

* Fetching models from the database
* Handling exceptions raised during business logic execution
* Retrying jobs, scheduling additional jobs, other follow-up actions

In the previous post, you saw an example that followed these guidelines about extracting business logic but used the job itself to handle flow control.

{% codeblock lang:ruby app/jobs/process_imported_users_job.rb %}
class ProcessImportedUsersJob < ActiveJob::Base
  queue_as :medium_priority

  rescue_from ActiveRecord::RecordNotFound, CSV::MalformedCSVError do |error|
    UserImportsMailer.import_failed(@import, error).deliver_now
  end

  def perform(import_id)
    @import = UserImport.find(import_id)
    csv = @import.user_data

    users, errors = UserBulkLoader.load(csv) do |user|
      logger.debug "Created new user account: #{ user.login }"
    end

    UserImportsMailer.import_completed(@import, users, errors).deliver_now
  end
end
{% endcodeblock %}

All the code for transforming the uploaded data into new user accounts has been refactored away to the UserBulkLoader class, so the worker is actually responsible for very little.  The test for the job can stay focused on two possible conditions: a successfully completed load and a rescued exception.

{% codeblock lang:ruby test/jobs/process_imported_users_job_test.rb %}
class ProcessImportedUsersJobTest < ActiveJob::TestCase
  include ActionMailer::TestHelper

  setup do
    @import = user_imports(:admin_import)
    ActionMailer::Base.deliveries.clear
  end

  test "send a message upon completing an import" do
    assert_no_emails
    ProcessImportedUsersJob.perform_now(@import)

    assert_emails 1
    message = ActionMailer::Base.deliveries.last
    assert_equal [@import.user.email], message.to
    assert_match /Your User Import Task Has Completed/, message.subject
  end


  test "a completely failing import job should notify the creator" do
    kaboom = -> (data) { raise ActiveRecord::RecordNotFound, "Oh no!" }
    UserBulkLoader.stub(:load, kaboom) do
      ProcessImportedUsersJob.perform_now(@import)
    end

    assert_emails 1

    message = ActionMailer::Base.deliveries.last
    body = message.html_part.to_s
    assert_match /Your User Import Task Has Failed/, message.subject
    assert_match /ActiveRecord::RecordNotFound/, body
    assert_match /Oh no\!/, body
  end
end
{% endcodeblock %}

Here we're using `perform_now` to execute the job immediately.  Since we're only interested in what happens inside the `#perform` method, we don't need to bother enqueuing an instance yet.

## Testing Job Queuing

Background jobs are usually conditionally fired off from a model callback or a controller action.  In the case of this user import process, I chose to queue it from the controller action that handles new UserImport creation.

{% codeblock lang:ruby app/controllers/user_imports_controller.rb %}
class UserImportsController < ApplicationController
  def create
    @user_import = current_user.user_imports.build(user_import_params)
    authorize! :create, @user_import

    respond_to do |format|
      if @user_import.save
        ProcessImportedUsersJob.perform_later(@user_import)
        format.html { redirect_to user_imports_path, notice:
          'User import was successfully created and is being processed.' }
      else
        format.html { render :new }
      end
    end
  end

  # ...
end
{% endcodeblock %}

To test this, we'll want to demonstrate that the controller action queues a job when the new record is successfully saved and that it does nothing when the save fails.

{% codeblock lang:ruby test/controllers/user_imports_controller_test.rb %}
describe UserImportsController, "as administrator" do
  include ActiveJob::TestHelper

  before do
    sign_in users(:admin)
  end

  describe "#create" do
    describe "with valid parameters" do
      it "redirects to the imports list" do
        assert_difference "UserImport.count" do
          post :create, user_import: { users_csv: csv_attachment }
        end
        assert_redirected_to user_imports_path
        expect(flash[:notice]).must_equal 'User import was successfully created and is being processed.'
      end

      it "enqueues one job to process the import" do
        assert_enqueued_with(job: ProcessImportedUsersJob) do
          post :create, user_import: { users_csv: csv_attachment }
        end
      end
    end

    describe "with no file upload specified" do
      it "displays the new screen again" do
        assert_no_enqueued_jobs do
          post :create, user_import: { users_csv: "" }
        end
        assert_response :success
      end      
    end
  end

  # ...
end
{% endcodeblock %}

You need to include the [ActiveJob::TestHelper module](http://api.rubyonrails.org/classes/ActiveJob/TestHelper.html) in your test case to gain access to the assertions and helper methods that needed to check which jobs have been queued or performed during the test.

Also, while Sidekiq is usually my Active Job backend of choice, I switch to the Rails-supplied test adapter for better control over job execution when running tests.  This is the default for all tests that subclass ActiveJob::TestCase, but I use it for all tests by including the following in my test helper.

{% codeblock lang:ruby test/test_helper.rb %}
class ActiveSupport::TestCase
  Rails.application.config.active_job.queue_adapter = :test
end
{% endcodeblock %}

Since Active Job provides a common interface for all supported queuing backends, we can swap in a different adapter with no changes to code or tests.

## Testing Your Application End-to-End

Has this ever happened to you?  All the components of your application are fully covered with tests, but still, there are bugs creeping in - maybe even bugs that show up only in production or, worse, randomly.  Who hasn't been bitten by bugs in code that *seemed* well tested at every level?

Running background jobs solves one problem in your application but creates another by spreading the work across multiple processes.  Some classes of issues only show up in concurrent systems, and developers are historically really bad at isolating them.  One classic example is when the background job attempts to work with data that the main application thread hasn't committed to the database yet.

You'll have a better shot at detecting these types of defects in development using some sort of end-to-end tests.  I like acceptance testing with [Capybara](https://github.com/jnicklas/capybara) and [Minitest](https://github.com/seattlerb/minitest) for this kind of thing, as [I've written about before](/blog/2015/07/three-options-for-top-down-rails-testing/), but you can use whichever tools you prefer - just as long as they simulate the way real users will interact with your application.

{% codeblock lang:ruby test/features/can_upload_user_csv_test.rb %}
feature "Can Upload User CSV" do
  include ActiveJob::TestHelper

  let(:user)     { users(:admin) }
  let(:csv_path) { File.join(Rails.root, "test/fixtures/files/users.csv") }

  scenario "upload a new batch of users" do
    visit root_path
    fill_in "email", with: user.email
    fill_in "password", with: "password"
    click_button "Sign In"
    expect(page).must_have_content "Hi, Admin User!"

    click_link "Create New User Import"
    expect(page).must_have_content "New User Batch Upload"

    assert_difference("User.count", 3) do
      assert_performed_with(job: ProcessImportedUsersJob) do
        attach_file "Users CSV File", csv_path
        click_button "Create User import"
        expect(page).must_have_content "User import was created and is being processed."
      end
    end
  end
end
{% endcodeblock %}

The test above mimics an administrator logging into the application and uploading a CSV file with user data.  As we already mentioned, using the Active Job test adapter ensures that jobs aren't performed except when we explicitly permit it.  In this case, only the jobs queued within the `assert_performed_with` block will be executed, and we wrap that in a further `assert_difference` block to verify that the visible side effect - the creation of new user accounts - actually occurs.

Automated acceptance tests like this one won't guarantee that you find every possible integration bug, but they will improve your chances substantially over manual testing.  They also happen to be great at surfacing regressions after code changes and problems with displayed data or DOM manipulation by client-side scripts.
