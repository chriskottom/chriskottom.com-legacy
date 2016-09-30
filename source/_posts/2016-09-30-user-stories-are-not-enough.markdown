---
layout: post
title: "User Stories Are Not Enough"
date: 2016-09-30 10:05:54 +0200
comments: true
categories: ["user stories", development, specifications, documentation]
description: User stories are great for driving the development process based on user priorities, but the way they're often applied can lead a project team astray.
---
{% img no-border right /images/agile-backlog.jpg 500 Scrum sprint backlog %}
As adoption of agile methodologies increases, more teams are finding user stories to be a useful tool for framing discussions with customers.  By defining features using simple, clear language and emphasizing the direct benefits to end users, project teams can organize and plan development activities in a way that's accessible to both business and technical stakeholders.

But like many other agile practices, much is lost between theory and application.  The original concept that drove the invention of user stories has been obscured with increaed popularity and wider adoption.  As a result, many development teams are trying to use the technique to solve problems it was never intended to address and seeing lackluster results.

**Understand this: user stories are not a lightweight substitute for traditional requirements management and documentation.**  They're great when used as a high level outline of project features, but they're not a solution to every problem, and certainly not a replacement for a good specification.  By following an approach that includes user stories and selected, well-maintained documentation, development teams are able to better address a wider range of needs that every project will encounter.<!--more-->

## Developers need more context, not less.

User stories are limited by design - in scope and in detail.  Heck, the habit of writing them on physical index cards was originally a hack for enforcing brevity and preventing sprawl.  And when one of your priorities is to deliver new versions of working software at the end of each iteration, you want to make sure that developers have lots of manageably sized tasks to work on so you can show measurable progress all the time.

But projects need somewhere to think through and record long-term planning and big picture information.  When developers work without direct contact with users (which is more common than not) and are only focused on one feature at a time, they'll usually write code that's more brittle, ages poorly, and requires more maintenance over the long haul.  Providing them access to everything that's known about the features they're being asked to develop, they'll be better equipped to empathize with the user, engage their critical minds, ask follow-up questions, and ultimately build software more closely aligned with user needs.

## Design is both a noun and a verb.

Back in the days of waterfall development, it was considered normal and responsible to block out anywhere from 20-40% of the schedule for requirements and design and produce copious documents that showed the work that had been done.  Upon completion, you'd get everyone together in a conference room to agree that the documents accurately described *The Thing That Shall Be Built*, and from that point forward, everyone was locked into that plan.  Come hell or high water.

As you can imagine, the results that came out of this sort of Plan-Driven Development were not always awesome.  Eventually, a few smart people started taking notice and looking for ways to structure development projects differently.  Specifically, they noted that the requirements for these projects needed to be set and agreed at a point when the team had the least information about the target system - before implementation began.  Better would be an approach that let you go forth and build *The Thing That <u>Should</u> Be Built*, regardless of when you happened to figure out what that was.  Most teams practicing agile today have done away with [Big Design Up Front](http://c2.com/cgi/wiki?BigDesignUpFront) and replaced it with a just-in-time approach - feature-driven, test-driven development that advances the application one bloody yard at a time.

Choosing between quite literally "plan all the things" or winging it is a false dichotomy, though.  Any non-trivial piece of software can realize benefits when someone takes the time to collect and write down some basic objectives and available information about it before coding.  It aligns the project team, but more importantly, the act of gathering requirements and producing a spec is proof that at least one person has thought deeply about what the system needs to do, what that implies, and how it might be achieved.  This isn't to say that everything written is true - always and forever, maybe not even ten minutes after it's written.  But the process here matters at least as much as the product.

This doesn't only pertain to the technical solution.  The same principles apply equally well to other aspects of the project that add value or help produce better outcomes.

* Wireframes and mockups
* Front-end style guides
* Process diagrams, flowcharts
* Operations manuals, scaling plans

Agile asks more of users than other software development approaches in that it really requires them to own their feature requests.  It shouldn't ask them to become experts, though, on all the other aspects of designing, building, and operating software.  That's our job, and we should take it seriously enough to write down what's important enough to remember about those areas.

## It's not just about you.

Of all the various bits of software I've worked on over the years, there are only a few that I'm still working on today.  Many projects ended up as dropped bits or stashed in a directory on someone's hard disk, but there are several that are still doing their thing.  No one emails or calls about these systems anymore.  They're someone else's job now because I handed them off.

I like the term *knowledge transfer* for this situation because it covers all the possible scenarios where you'll need to dump what you know into someone else's head:

* The application is going live, and the support team needs enough info to handle tickets.
* The business is being sold, and the new potential owners want to conduct a technical audit.
* A new developer starts Monday, and she needs some basic materials to get acquainted with the system.

User stories are a uniquely poor vehicle for this kind of knowledge. They are most useful within the context of a development iteration and rapidly lose value almost immediately thereafter.  Documentation, on the other hand, is less focused on cranking out code and more on the thing that was produced with the ability to organize it in a way that makes sense outside the context of the project.  But if you're practicing agile as most teams do, the set of documents available to bring new folks up to speed might be pretty thin indeed.  

[Martin Fowler has written about agile handovers on his blog](http://martinfowler.com/bliki/AgileHandover.html), and his take on the problem is very much at home in the agile playbook - establish cross-functional teams, transition only gradually, address knowledge transfer needs in a just-in-time fashion.  I've never seen it work as cleanly as he describes it, but he is Martin Fowler, and Martin Fowler is way smarter than I'll ever be.  I've seen acceptable results with a combination of written docs and in-person Q&amp;A sessions.

Developer onboarding is perhaps the most interesting situation of this type since it's a recurring event that occurs without much lead time.  Team leads need to be ready to bring someone up to speed at any time in much the same way that they should be able to deploy new releases of the system at any time.   Imagine the reaction from management you first needed [a bespoke strategy and implementation](https://kingsinsight.com/2011/02/10/agile-documentation-handover-to-production-support/) before you could deploy a new version of an application.  Good luck with that.

## The Toughlove Conclusion

A hammer is the perfect tool when you've got a hammering job to do.  In other cases though, it's a poor fit at best and downright destructive at worst.  I think user stories are the same - a valuable technique during planning, outlining, estimation, and prioritization.  But they fall short as a way of organizing collected knowledge about the software to be built, and they're completely hopeless as an artifact of a system in operation.  For that, you need to fall back to more traditional, less fashionable approaches.

**Everyone wants the benefits of having written documentation without, you know, all the writing.**  But keep in mind that the value of the documentation process is at least as great as that of the product.  To get the benefit, you need to be prepared to put in the work.
