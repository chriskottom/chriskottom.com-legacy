---
layout: post
title: Static Website Deployment with Capistrano
date: 2013-09-11 11:11
comments: true
categories: [Capistrano, Ruby, deployment, development, 'static website']
description: Deploy your static sites to a remote web server using the tool you already know, Capistrano.
---
Back in the day, deploying a new version of a website usually involved a combination of tools including `rsync` or `scp` (or insecure-as-hell-even-back-then `ftp`) to copy your files to the target server, `ssh` to change configuration files or fix something you broke during the copy, and all too often a nervous tool of a boss standing over your shoulder checking on how things were going. All this on the production web server, I might add. Seems pretty barbaric by today's standards.

At the moment, [SaaS Glossary][1] is just a static website I'm horsing around with, but still I wanted to implement something a little more automated to make deployment just a matter of one command at the terminal. As a Rubyist, my weapon of choice for these sorts of things is usually [Capistrano][2], but I'd only ever used it for deploying more complex applications from [GitHub][3], and even though I'm pushing all my code to [the remote repository][4] on a regular basis, I didn't want it to be a necessary part of the workflow for something this simple. Fortunately, Capistrano has an option that allows you to deploy directly from your local working directly to the remote web server.<!--more-->

## The basics

Setup was simple, though not entirely straightforward if you're used to deploying [Rack][5] applications, and there were a few settings that needed different values than any of the deployments I've set up in the past.
```ruby
set :scm, 'none'
set :deploy_via, :copy
set :repository, '.'
```
Capistrano supports many different tools for source control, but you don't need any of them for this. Instead, you want it to deploy the site by copying files from the current directory on your local machine.
```ruby
set :copy_exclude, %w( *~ .bundle Capfile config/ Gemfile Gemfile.lock bin/ deploy.rb vendor/ .git/ .gitignore )
```
In order to keep from transferring any files that are not relevant to the website, I specified a number of items to exclude. You should modify this list to fit the needs of your own site or application.

I needed to override some of the basic tasks that Capistrano ships with in order to work around the assumptions baked into them. Actually though, this isn't all that difficult, and I only needed to update two task definitions.

The `:default` task is what runs when you type `cap deploy` in the terminal. Normally this task will update the code on the remote server and request a restart, but since this isn't a Rack application, it's not needed or even possible using the usual method of calling `touch tmp/restart.txt` which is what the `restart` task does out of the box. The default task definition can be reduced to: k namespace :deploy do task :default do update end end

The `:finalize_update` creates symlinks to shared resources and handles some housekeeping details after the remote server is updated, but for the purposes of this application, all that's required is that the files have the proper ownership - specifically, group ownership - and permissions. I usually have application files owned by a special, non-privileged account used only for deployment and the group the web server runs as with group write permissions on the whole directory, so I reduced this task to just that.
```ruby
namespace :deploy do
  task :finalize_update do
    escaped_release = latest_release.to_s.shellescape
	commands = []
	commands << "chgrp -R #{group} #{escaped_release}"
	commands << "chmod -R -- g+w #{escaped_release}" if fetch(:group_writable, true)
	run commands.join(' && ') if commands.any?
  end
end
```
Using a small number of good tools and automating repetitive tasks are both keys to being a productive developer, and so setting this up was a big win for me.

P.S. - The complete recipe is available in a [Gist][6] on the 'Hub for anyone interested. Hope it helps someone out there.

[1]: http://saasglossary.com/
[2]: http://www.capistranorb.com/
[3]: https://github.com/
[4]: https://github.com/chriskottom/saas_glossary
[5]: http://rack.github.io/
[6]: https://gist.github.com/chriskottom/6507003
