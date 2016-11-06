---
layout: post
title: "A Few Modest Best Practices for Git"
date: 2014-02-26 12:39:06 +0100
comments: true
categories: development git
description: A few tricks and practices I've picked up over the past five years that make Git more enjoyable and my work more effective.
---
{% img right /images/git-logo-two-color.png 500 Git logo  %}

I've only been using Git and GitHub since 2009 - [\#114899](http://caius.github.io/github_id/#chriskottom), if you're into that sort of thing.  It sure seems longer than that though, because I can't think of any other tool that has had such a profound effect on the way I develop software, and I can't remember what it felt like to write code without it.  Interesting thing though: the rapid adoption across certain segments of the industry combined with the ad-hoc way that many of us have come to and learned about these two tools has created situations where there are wildly different practices and levels of skill within project teams.  I'm definitely no Git expert, but I have picked up a few tricks and practices over the past five years that have made my Git experience more enjoyable and working with others more effective.  See if you agree.<!--more-->

## Review code before checkin with *git diff*.
Do whatever you want before you check in, but if you want to look like a pro, quickly review your changes before you check them in.  An extra minute spent looking over the output from `git diff` might help you catch the odd bug, but more importantly, it's great for weeding out stuff you don't want in your commits - debug code, caremad source code comments, and blocks of commented-out code that will never be uncommented again.

## Use  *git add .* sparingly.
Your repository is a place to put (pre-build) source code, tests, configuration, seed data, and maybe some limited documentation.  That leaves out old versions of files, notes, dependencies, and a lot of the other cruft that sometimes finds its way into repos.  But the first examples shown in almost every beginning Git tutorial show a familiar sequence: init, create files, add everything, commit, make changes, add everything, commit, repeat.  In the real world, development is usually a lot messier than this, and the diff between my working directory and the repo `HEAD` often includes multiple commits worth of changes and things that aren't intended for checkin.  That's why when it's time to start thinking about a commit I'll use `git status` and `git add <some file or directory>` to select only the files I want to put into the next commit.  It takes a little longer, but it ensures that my team only sees what I intend for them to see.

## Keep your commits tight.
This is the logical extension of the previous tip.  The commit log of a well-managed repository tells a story, and so when you're reviewing changes using `git status` and `git diff`, you should be looking for small commits that implement a single logical change to the code base and can be described with a simple statement.  If the commit message you have in mind contains multiple sentences, semicolons, conjunctions, or lots of commas, it's a good indication that you might need to try to break it up into two or more smaller commits.

## Use aliases for common Git commands.
I've got a few handy aliases that I use all the time in my `.gitconfig` file.  The longer ones save me from having to remember long sequences of flags, while the short ones at the end save typing for commands I might use hundreds of times in a day-long session.

```
[alias]
lg = log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr, %cn)%Creset' --abbrev-commit --date=relative
hist = log --graph --pretty=format:'%h %ad | %s%d [%an]' --date=short
last = log -1 HEAD
unstage = reset HEAD --
amend = commit --amend -C HEAD
co = checkout
ci = commit
st = status
br = branch
```

## Practice good branch hygiene.
Using Git opens up a whole lot of possibilities for workflows using branches with different conventions, but if you don't take the time every so often to delete those old branches, especially on very active projects, it doesn't take long before you find yourself lost in a forest.  The best practice is to delete branches as they're merged, but doing a periodic sweep works all right too.

If you delete a branch on your machine and you know that it's not needed on the upstream remote anymore, please be a dear and delete it on there as well.  You can do it via the Branches page for the repo on GitHub or via the command line.

```
git push origin --delete <branch name>
```

## Leave a clean commit history.
When you're doing your initial work on a solo project, managing your commit history probably isn't something that needs a lot of thought; you're working, committing, and things happen in a more or less linear flow, and the commit history reflects that.  But when you're working on a team or performing maintenance, it's likely that you're going to have work going on in several different branches simultaneously.  Overusing straight `git merge` will leave you with a tangle of branches and merge commits that can make the history a lot harder to read.  For that reason, I like to use a combination of `git rebase` and `git merge` locally before I push changes to the upstream remote.  The flow looks something like this:

```
git checkout master
git pull origin
git checkout -b new_feature
(make some changes, time passes)
git add file1 file 2
git commit -m "awesome changes to file1 and file2"
```
Now this is where it gets good.  You'll want to rebase your local topic branch from master and then push the changes directly back to the remote.  This will allow you to resolve any merge conflicts locally and give the master branch a nice straight line of commits that should be easily understandable to future-you.  And you should always be coding and committing with future-you in mind.

```
git rebase origin/master
git push origin new_feature:master
```
And then simply wash, rinse, and repeat to continue on with your development.

```
git checkout master
git pull origin
git branch -d new_feature
git checkout -b another_feature
```

## Use pull requests wherever it makes sense.
Most examples for using GitHub pull requests assume a public project, usually open source, with contributors requesting pulls from forks, but the same benefits are available and just as useful to teams working on single-repo internal projects using branches instead of forks.  When used properly, pull requests provide a great way for the members of an organization to keep tabs on what's going on, track changes made, correlate commits to work items, collaborate on code while it's being developed, and perform distributed code reviews before merging.  The only downside to using pull requests is that the merges show up as merge commits in the history rather than having the nice linear flow we'd prefer, but even so, when working with teams (especially with remote teams), the benefits should be weighed against the drawbacks.

## Conclusion
When I think back about the old days when I worked on projects that ran on other revision control systems, I remember all the time wasted trying to figure out how to merge one team's changes with another's.  Git has reduced the need for this kind of table talk pretty substantially, and the features that GitHub has layered on top of version control have created a flexible solution for running large projects with a minimum of synchronous communication.  Every team is free to come up with their own best practices, so I hope some of these will be of use to you and your team.

What about you and the teams that you've worked on?  Have you used or invented any of your own best practices for using Git or GitHub that you'd like to share?  Leave a comment.





