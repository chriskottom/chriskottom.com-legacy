---
layout: post
title: "Building Your Own Baseline Vagrant Box"
date: 2014-04-07 09:30:18 +0200
comments: true
categories: [development, DevOps, Vagrant, Chef, 'Chef Solo', Berkshelf, example, tutorial]
featured: 500
---
{% img no-border right /images/old_vagrant_logo.png Vagrant %}
I've had a long-running open source crush on [Vagrant][1] - kind of like a fanboy from a distance.  I've long fantasized about conjuring up a pristine development server on my local workstation, provisioning some software to put it into a production-like state, and having it start serving requests for my application.  And even though I've worked on several projects where it would have been a great fit, I've never found the time to sit down and really dig into it until now.  The work I'm planning for [BetterFBO][2] will probably require me to set up infrastructure components that are a bit outside my usual development stack, so it seems like now is the time to dive a little deeper into [Vagrant][1] and [Chef][3] in order to better manage the configuration and avoid installing these pieces directly on my workstation.

Initial provisioning of virtual machines can take some time and experimentation, so my initial intermediate goal was to package up a box that would serve as a starting point for all future VMs.  Fortunately, [Vagrant][1] makes this pretty simple.<!--more-->

## Step 1: Install and Set Up Vagrant ##
I've had [Vagrant][1] installed for a long time, but it was in need of an upgrade.  It used to be that this was a matter of installing the gem, but over time [Mitchell][4] has tried to steer the product toward a more general audience rather than just Ruby developers, and he's been releasing [platform-specific installation packages][5].  Grab the right one for your OS of choice and install it on your system.  When it's done, you should have a `vagrant` executable installed somewhere on your `$PATH` which you can test out by typing `vagrant -h` on the command line.  It should respond by printing out something like the following:

{% codeblock lang:bash %}
ck1@ramanujan:~/Projects/vagrant_berkshelf_example$ vagrant -h
Usage: vagrant [-v] [-h] command [<args>]

    -v, --version                    Print the version and exit.
    -h, --help                       Print this help.
		
Available subcommands:
     box          manages boxes: installation, removal, etc.
     destroy      stops and deletes all traces of the vagrant machine
     halt         stops the vagrant machine
     help         shows the help for a subcommand
     init         initializes a new Vagrant environment by creating a Vagrantfile
     package      packages a running vagrant environment into a box
     plugin       manages plugins: install, uninstall, update, etc.
     provision    provisions the vagrant machine
     reload       restarts vagrant machine, loads new Vagrantfile configuration
     resume       resume a suspended vagrant machine
     ssh          connects to machine via SSH
     ssh-config   outputs OpenSSH valid configuration to connect to the machine
     status       outputs status of the vagrant machine
     suspend      suspends the machine
     up           starts and provisions the vagrant environment
     vbguest      

For help on any individual command run `vagrant COMMAND -h`
{% endcodeblock %}

## Step 2: Install a Base Box ##
Next, you'll need to install a [Vagrant][1] box to serve as the starting point for your own.  These can be found at the old [Vagrantbox.es][6], which is a public directory of privately hosted boxes, or the new [VagrantCloud][7], which is currently in beta and looks like it will be a box hosting service using a free-paid hybrid business model similar to [GitHub][8].  I generally use Ubuntu Server for production deployments, so I'm starting with a the most recent long-term support (LTS) version of that which happens to be 12.04 Precise Pangolin.  In order to save myself some time, I created a base box with a baseline set of software packages installed and configured to save myself time during provisioning and called it `chriskottom-precise64.box` and added it to [Vagrant][1] with the command:

{% codeblock lang:bash %}
vagrant box add precise64 http://files.vagrantup.com/precise64.box
{% endcodeblock %}

## Step 3: Set Up Bundler ##
You'll start by setting up your Gemfile with two gems.  [Chef][3] is what you'll use for provisioning software and managing the configuration on the virtual machines in your development environment, while [Berkshelf][9] provides a way of managing the cookbooks you'll use for that purpose.  In the end, your Gemfile should look like this:

{% codeblock lang:ruby Gemfile %}
source "https://rubygems.org"

gem "chef"
gem "berkshelf"
{% endcodeblock %}

## Step 4: Write a Chef Cookbook to Install the Required Software ##
[Chef][3] makes it pretty easy to define instructions for provisioning hardware in the form of *cookbooks* which define the instructions, configuration parameters, and templates needed to put a machine into some desired state.  The syntax and libraries it provides for defining the instructions, known in [Chef][3] lingo as *recipes*, offers a platform-independent way of performing common tasks like installing packages, creating scheduled tasks, controlling users and groups, and so on.  Complete specs of the [DSL syntax][11] and the [available resources][12] can be found on the [Chef][3] documentation site, but for now, we'll define a simple cookbook in just a few steps.

[Chef][3] is packaged with a command-line tool known as *knife* that provides a bunch of utility functions for working with the software.  Here we'll use it to create a new cookbook called `chriskottom_precise64` in the directory `cookbooks` with the following one-liner:

{% codeblock lang:bash %}
knife cookbook create chriskottom_precise64 -o cookbooks
{% endcodeblock %}

The resulting directory structure in the cookbook directory you specified is comprehensive:

{% codeblock lang:bash %}
ck1@ramanujan:~/Projects/vagrant_base_box$ tree cookbooks/chriskottom_precise64
cookbooks/chriskottom_precise64
├── attributes
├── CHANGELOG.md
├── definitions
├── files
│   └── default
├── libraries
├── metadata.rb
├── providers
├── README.md
├── recipes
│   └── default.rb
├── resources
└── templates
    └── default
{% endcodeblock %}

For the purposes of this exercise, we only retain three files - `metadata.rb`, `README.md`, and `recipes/default.rb` - and the `attributes/` directory, so you can delete everything else.

In `attributes/` you'll want to create a file called `default.rb` and use it to define the array of package names you want to install.  This is what my list looks like:

{% codeblock lang:ruby cookbooks/chriskottom_precise64/attributes/default.rb %}
default['chriskottom_precise64']['packages'] =
  %w( make automake autoconf gcc build-essential xinetd sharutils git-core
      wget htop tree chkconfig traceroute sysstat iptraf nmap ngrep ack iotop
      iftop ntp emacs23-nox sqlite3 openssl libsqlite3-dev libxml2-dev
      libxslt-dev libreadline-dev zlib1g zlib1g-dev libssl-dev libc6-dev
      libyaml-dev libcurl4-openssl-dev ncurses-dev libncurses5-dev libgdbm-dev
      libffi-dev libtool bison )
{% endcodeblock %}

Then we only need to set up the default recipe to install all the packages on the list:

{% codeblock lang:ruby cookbooks/chriskottom_precise64/recipes/default.rb %}
packages = node['chriskottom_precise64']['packages']
packages.each do |pkg|
  package pkg do
    action :install
  end
end
{% endcodeblock %}

## Step 5: Set Up Berkshelf ##
[Berkshelf][9] wasn't a tool that I'd used before, but you can think of it as being like [Bundler][10] but for managing [Chef][3] cookbooks instead of Ruby gems with similar command line semantics and a manifest format similar to the one used for Gemfiles.

Set up your own Berksfile manifest by entering `berks init` on the command line and declare the cookbooks you'll need to provision your environment by editing the Berksfile.  It should end up looking like this:

{% codeblock lang:ruby Berksfile %}
site :opscode

cookbook 'apt'
cookbook 'chriskottom_precise64', path: 'cookbooks/chriskottom_precise64'
cookbook 'rbenv', github: 'fnichol/chef-rbenv', tag: 'v0.7.2'
cookbook 'ruby_build'
{% endcodeblock %}

This is a simple example, but it showcases examples of [Berkshelf's][9] ability to acquire cookbooks from a variety of resources: from the [Opscode Community repository][13], from a [GitHub][8] repository, or from a local directory source.

[Berkshelf][10] implements a `berks install` command that can be used to download and install all the required cookbooks and their dependencies, but because the two are used together often, they've developed a [Vagrant plugin][12] that provides direct integration and handles the downloading of required cookbooks whenever you provision a VM.  Install the plugin by typing `vagrant plugin install vagrant-berkshelf`.

It's worth a brief comment here explaining why I'm installing the `rbenv' and `ruby_build` cookbooks.  The Ubuntu distribution I'm using as a baseline was originally released in 2012, and the new LTS won't drop for a few weeks from this writing and won't be installed on my production servers for a while after that.  While these releases are still suitable and supported, they do contain some antiquated software including old versions of Ruby that won't run some more recently developed [Chef][3] cookbooks.  In order to get around this, I replace the bare-metal Rubies installed on most [Vagrant][1] base boxes with something more recent, and I use [rbenv][14] and [ruby-build][15] to manage the Ruby installations on my machines since it provides a little more ease of use in development and all other environments.

## Step 6: Set Up Vagrant ##
[Vagrant][1] virtual machines are configured by way of a Vagrantfile in the project directory.  You can create an initial template with the `vagrant init` command and edit it like so:

{% codeblock lang:ruby Vagrantfile %}
VAGRANTFILE_API_VERSION = '2'

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = 'precise64'
  config.berkshelf.enabled = true

  config.vm.provision :chef_solo do |chef|
    chef.add_recipe 'apt'
    chef.add_recipe 'chriskottom_precise64'
    chef.add_recipe 'ruby_build'
    chef.add_recipe 'rbenv::system'
    chef.add_recipe 'rbenv::vagrant'
    chef.json = {
      rbenv: {
        global: '2.1.0',
        rubies: [ '2.1.0' ],
        upgrade: true,
        gems: {
          '2.1.0' => [{ name: 'bundler' },
                      { name: 'main' },
                      { name: 'map' },
                      { name: 'open4' },
                      { name: 'multi_json' },
                      { name: 'net-ssh', version: '~> 2.2.0' },
                      { name: 'aws-sdk' },
                      { name: 'chef' },
                      { name: 'ohai' }]
        }
      },
  }
  end
end
{% endcodeblock %}

Let's look at what I've done here:
1. I specified that I want to use the `precise64` box as the basis for all created virtual machines.
2. I activate the [Berkshelf][10] plugin to manage [Chef][3] cookbook dependencies.
3. I indicate that I want to use the `:chef-solo` provisioner when setting up the VM.
4. I specify a list of [Chef][3] recipes that should be executed, in order, on the newly created VM.
5. I provide a Hash of parameters that the recipes will need to do their work.

(**Note:** Yes, I'm aware that Ruby 2.1.1 has been released, but some combination of Ubuntu Precise, the libraries that are installed, and Ruby 2.1.1 seems to make Nokogiri compilation choke.  Downgrading Ruby to 2.1.0 seemed to solve the problem.) 

## Step 6: Vagrant UP! ##
It's time to light this thing up with `vagrant up`.

Just to set expectations, the first run will take some time (dependent on your system specs and your connection throughput) due to the need to install loads of voluminous software, but when it finishes, you'll have a running VM with all the required software.

## Step 7: Package the Box ##
[Vagrant][1] lets you package up a running VM as a box from the command line with one line:

{% codeblock lang:bash %}
vagrant package --output chriskottom-precise64.box
{% endcodeblock %}

The finished product should be a portable tar file called `chriskottom-precise64.box` containing the box configuration and disk image.

## Step 8: Add the Box to Vagrant ##
Before the new box can be used as the basis for another project, you'll need to import it into [Vagrant's][1] library using the following command:

{% codeblock lang:bash %}
vagrant box add chriskottom-precise64 chriskottom-precise64.box
{% endcodeblock %}


And that's it.  Future projects can now refer to the `chriskottom-precise64` box and have a VM that is recently updated and running a current version of Ruby.

I put the code up in a [GitHub repo][16] for anyone who's interested.  Feel free to use it for your own explorations or as the basis for building something awesome.


[1]: http://www.vagrantup.com/
[2]: http://betterfbo.com/
[3]: http://www.getchef.com/chef/
[4]: http://mitchellh.com/
[5]: http://www.vagrantup.com/downloads/
[6]: http://www.vagrantbox.es/
[7]: https://vagrantcloud.com/
[8]: https://github.com/
[9]: http://berkshelf.com/
[10]: http://bundler.io/
[11]: http://docs.opscode.com/chef/dsl_recipe.html
[12]: http://docs.opscode.com/resource.html
[13]: http://community.opscode.com/
[14]: http://rbenv.org/
[15]: https://github.com/sstephenson/ruby-build/
[16]: https://github.com/chriskottom/vagrant_base_box_example/