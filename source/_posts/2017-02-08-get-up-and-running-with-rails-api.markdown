---
layout: post
title: "Get Up and Running with Rails API"
date: 2017-02-08 11:43:33 +0100
comments: true
categories: [Ruby, "Rails API", API, JSON, "web services"]
description: The introduction of API-only applications in Rails 5 makes it easier than ever to set up simplified apps that deliver JSON responses. This tutorial offers a quick overview of the first steps needed to get set up and coding on a new API application.
---
{% img no-border right /images/ruby-plus-json.png 600 Ruby &hearts; JSON %}
The introduction of API-only applications in Rails 5 makes it easier than ever to write simplified apps that render JSON responses.  This is terrific news for those of us who've spent years building up expertise in the platform, but as we already know, getting off on the right foot makes a big difference in how development proceeds.  This tutorial offers a quick overview of the first steps you'll use to get set up and coding on a typical Rails API application.<!--more-->

## Generate the boilerplate application

We can create a Rails API application just as we would any other Rails app - by using the generator to set up the folder structure with all the default files that we can then modify to suit our needs.  The only change is in the addition of the `--api` flag:

{% codeblock lang:bash %}
rails new my_new_app --api
{% endcodeblock %}

This new application is a slimmed down version of the familiar structure we all know and love but with a few key differences:

* The base controller, ApplicationController, inherits from ActionController::API which doesn’t include some of the typical features controllers need when generating HTML - template rendering, cookies, sessions, flash, etc.
* Everything related to the asset pipeline is missing - the app/assets folder, asset-related gems, etc.
* Rails generators won't generate views, helpers or assets and will use templates more suitable for API apps for the files they do generate.

In many cases, you can trim down the generated application even further by skipping other parts of the framework.  For example:

{% codeblock lang:bash %}
rails new my_new_app --api --skip-action-cable --skip-action-mailer
{% endcodeblock %}

## Specify your dependencies

Using Rails for API development means you have access to the same great developer experience and ecosystem of gems that are available for your server-generated HTML apps.  Even so, there are a few specific gems that I tend to add to every new API project right away.

* [ActiveModel::Serializers](https://github.com/rails-api/active_model_serializers) - standardize and simplify model object serialization
* [Rack::Cors](https://github.com/cyu/rack-cors) - for serving client and server-side applications from different domains
* [rack-attack](https://github.com/kickstarter/rack-attack) - request throttling, blacklisting and whitelisting

I've also been taking a look at [Knock](https://github.com/nsarno/knock) for easy integration of JSON Web Tokens for authentication.

## Configure CORS

If you're planning to serve your API and your client application from the same domain, setting up CORS right from the start might be overkill for you, but being able to host a client from S3 or to open your API up to selected developers, for example, can give you a lot of flexibility and room for growth in the future.  So I usually set this up right out of the gate.

Rails API applications include a commented out line in the `Gemfile` for the Rack::Cors middleware.  Just uncomment that and `bundle` to install the gem.

Your application will also include a sample initializer at `config/initializers/cors.rb`.  You’ll need to uncomment the lines there and configure CORS to handle requests from other valid origins.  For development, we might want to open up the application to serve requests from anywhere, but you may end up wanting to lock it down more tightly in production environments.  For that reason, I find it helpful to use an environment variable to specify the valid origins as in the sample code below.

{% codeblock lang:ruby config/initializers/cors.rb %}
cors_origins = ( ENV['CORS_ORIGINS'] ? Regexp.new(ENV['CORS_ORIGINS']) : '*' )

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins cors_origins
	resource '*',
	  headers: :any,
	  methods: [:get, :post, :put, :patch, :delete, :options, :head]
  end
end
{% endcodeblock %}

I usually use [dotenv](https://github.com/bkeepers/dotenv) to manage environment variables in development and test, so in `.env` for development, I'd have:

{% codeblock lang:ruby .env %}
CORS_ORIGINS='.*'
{% endcodeblock %}

## When in doubt, use JSON:API

Rails has always made it easy to develop web service endpoints as part or all of your application.  The difficult part has always been in answering the multitude of design decisions involved in each new project:

* What's the best way to represent the primary data in API responses?  How much should the client have to know about what it expects to receive?
* How can you standardize the representation of server-side errors?
* Is there a flexible, common way of including related data directly in the response?
* What about links to the current request and related objects?
* How should application-specific concerns be represented - ex: sorting, filtering, pagination, etc?
* And so on...

Starting every project by debating these questions from first principles is going to be counter-productive and frustrating, but fortunately, that's not necessary.

[JSON:API](http://jsonapi.org/) bills itself as "the anti-bikeshedding tool" for JSON-based APIs.  Essentially, it provides answers to all of the questions above and more as part of a single, evolving specification.  By adopting it, you get to avoid reinventing the wheel and all those lengthy discussions.

ActiveModel::Serializers, which you should install right from the start, bundles a JSON:API adapter, so setting up your Rails API application to conform to the standard is trivially easy.  Start by creating a new initializer to specify the JSON:API adapter:

{% codeblock lang:ruby config/initializers/active_model_serializers.rb %}
ActiveModel::Serializer.config.adapter = :json_api
{% endcodeblock %}

If you plan for any of your serializers to include links to the current or related resources, you'll also need to add a block of code to `config/environments/development.rb` and `config/environments/test.rb` that specifies the default URL options:

{% codeblock lang:ruby config/environments/development.rb %}
Rails.application.configure do
  # ...

  # Configure URL options for Rails helpers.
  config.after_initialize do
    Rails.application.routes.default_url_options = {
      host: 'localhost',
      port: '3000'
    }
  end
end
{% endcodeblock %}

The ActiveModel::Serializers repo includes [valuable documentation](https://github.com/rails-api/active_model_serializers/tree/master/docs) on how to use the library and what to expect when using the JSON:API adapter.  These along with the [JSON:API spec](http://jsonapi.org/format/) should be enough information to get most developers started and headed in the right direction.

## And the rest: déjà vu all over again...

Most of the actual work of involved in delivering a Rails API application from this point forward is similar or identical to that of traditional server-rendered Rails apps.

* Domain modeling with Active Record or your favorite ORM
* Business logic coding using POROs
* Controller action development with Action Controller
* Writing model and controller tests with Minitest or RSpec
* Deployment to Heroku or with Capistrano
* Consistent command line tooling and development environment

All of these should look very familiar, even to novice Rails programmers with no prior web services experience, which is probably the single biggest advantage to using Rails for building APIs - that same great developer experience extended to a new kind of application.
