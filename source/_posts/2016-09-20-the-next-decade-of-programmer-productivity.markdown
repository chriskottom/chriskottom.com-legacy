---
layout: post
title: "The Next Decade of Programmer Productivity"
date: 2016-09-20 09:51:24 +0200
comments: true
categories: [development, productivity, communication]
description: "While we have solutions to most of the easy problems that impede programmers in their work, there's still one big class of issues yet to be tackled: communication."
---
Welcome to the future, coders.  We've got large publishers and small businesses churning out books and running courses and bootcamps to produce armies of freshly minted coders.  Our text editors and tools write a lot of the code for us - at least the most tedious boilerplate code.  We have access to servers we can spin-up and spin-down for pennies an hour.  There are active communities of experts online 24 hours a day eager to answer any questions we might have along the way.  The support for people learning to code or wanting to improve has achieved a level of maturity that would have been unimaginable decades ago.

But while all this has been going on, we've hit the wall in terms of our ability as an industry to solve real-world problems for consumers.  Improvements to hardware have allowed us add more window dressing to the systems we build, but what those systems are able to do remains mostly unchanged.  Software projects still routinely come in over-time and over-budget, [sometimes to an absurd degree](https://hbr.org/2011/09/why-your-it-project-may-be-riskier-than-you-think), and users and project sponsors are still routinely disappointed with the results they receive.  The root causes are at this point fairly well known.

* Unrealistic and poorly communicated objectives and schedules
* Insufficient or absent requirements definition and management
* Solutions that fail to solve users' most urgent problems
* Underestimation due to lack of detailed planning, overconfidence, or management or peer pressure
* Failure to identify and confront critical risk factors
* Poor management oversight and visibility into the development process
* Lack of end user involvement throughout the development process
<!--more-->
## No Silver Bullet

In his software engineering classic *The Mythical Man-Month*, Fred Brooks separates the problems that programmers face into two basic categories.  The **essential problems** of software are those which are inseparable from its function and include issues related to the conception and design of systems and managing them over time as requirements and the user environment changes.  The **accidental problems** are caused by the means and processes by which we represent the essence of the software - those things related to technologies, tools, processes, and so on.

Brooks predicted that the majority of improvements in productivity will come through addressing accidental issues, and in most respects, he's been proven right.  Advances in programming languages, development techniques, tooling, and development methodologies have removed a lot of the friction from the act of producing code.  In fact there are a lot of hassles in the daily work of programmers (see above) that we simply no longer consider, either because they've been simplified to the point of being unworthy of notice or because they've been automated so that we no longer have to deal with them at all.

But even as we continue to chip away at the accidental problems, the essential problems come to occupy an even larger part of the whole until we arrive at the point where we are now - that nearly all of the risks to our projects come from essential factors.  The friction in the process has been mostly stripped away exposing the fundamental issues beneath - how to manage complexity, change, and organizational factors.

The hard truth is that there's no Slack bot or Kanban board that's going to fix this.  Technological solutions will enable the change that has to take place, but we don't need new inventions or channels or apps to do what needs to be done.  **The future of programmer productivity is in improving the quality and frequency of our communication.**

## A Communications Manifesto

The Agile Manifesto began as a list of values shared by some of the best minds in software development.  That's how movements get started: as an idea put into words.  (You know, like communication!)  While there are many directions that this could go, here's a short list of what I've seen work in the past.

* Faithfully communicate what you plan to do and what you have done, and leave behind a functional written record of both.
* Curate a collection of great examples of technical writing, and model future communications on them.
* Be direct during group discussions.  As a developer, you're often in the best position to see the problem with a given approach or requirement.
* Standups, status updates, and other team checkpoints are critical for team cohesion and keeping everyone informed.  Don't treat them lightly, and don't make them optional.
* Use retrospectives or a similar kind of meeting to find opportunities for improvement.
* Assign mentors to new team members to ensure that team values are disseminated. 
* Communication problems can only be solved through conversations and team standards.  A tool is almost never the answer.
* Regularly explain verbally what you've done to end users and business stakeholders - in person if possible.
* Speak regularly with business users about their work to understand it better.

As with the Agile Manifesto, a declaration of values is only a first step.  The goal is to get others in the industry to think about how to communicate better and put these principles into action in their daily work.  But there's a big gap between recognizing the need and addressing it.  If we want to close this gap, we're going to need to put these values into action and let them permeate the instruments of our daily work.

* We need methodologies that systematize communication between developers and business units<sup>&dagger;</sup>.
* We need educational resources disseminate these methodologies and to teach engineers to be better listeners and more effective verbal and written communicators.
* We need tools that support and even require better communication within project teams.

If we apply the same energy and enthusiasm to solving the essential problems of software development as we did to the accidental problems, we can expect to see even bigger improvements.

*<sup>&dagger;</sup> I know what you're thinking: Don't methodologies like Scrum include mechanisms for just this kind of communication?  Yes, that's true, but many teams only select the elements of agile workflows and leave those that they'd rather skip.  The effect is that many teams' homegrown "Scrum Lite" frameworks include sprints and points and daily standups while leaving out the Product Owner role and many of the mandatory meetings.*

### Further Reading &amp; Things to Think About

* [Empathy: The key to a successful software project](https://www.oreilly.com/ideas/empathy-the-key-to-a-successful-software-project)
* [Wordsmiths](https://gettingreal.37signals.com/ch08_Wordsmiths.php)
* [10 Reasons Development Teams Don’t Communicate](http://blog.smartbear.com/management/10-reasons-development-teams-dont-communicate/)
* [Maker's Schedule, Manager's Schedule](http://paulgraham.com/makersschedule.html)
* [Manifesto for Agile Software Development](http://agilemanifesto.org/)
