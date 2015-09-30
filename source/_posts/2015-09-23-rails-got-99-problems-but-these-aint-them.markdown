---
layout: post
title: "Rails Got 99 Problems (But These Ain't Them)"
date: 2015-09-23 12:24:15 +0200
comments: true
categories: [opinion, development, Rails, Ruby, frameworks]
description: Are companies developing new software and businesses on Rails making a mistake? Read my response to an opinion piece by Jared Friedman, co-founder of Scribd.
---
{% img no-border right /images/trolling.jpg 400 Not sure if trolling or genuinely missed the point %}

I just finished reading Jared Friedman's *[Why I wouldn’t use rails for a new company](http://blog.jaredfriedman.com/2015/09/15/why-i-wouldnt-use-rails-for-a-new-company/)*.  Mr. Friedman is the founding CTO of [Scribd](https://www.scribd.com/) which means he's overseen the development of one of the biggest Rails-based applications on the web, and he's been notably ahead of the curve on important matters of technology (Scribd's transition from Flash to HTML5) and policy (SOPA).  In short, when he says something about building businesses on the back of Rails-based software, it's probably worth paying attention.

Which is probably why I found reading this article so frustrating.  I expected a well-informed argument combining technology- and business-oriented reasons that Rails was no longer where it's at, but what I got was a mixture of opinion and cherry-picked facts that were at best selective and at worst intentionally misleading.  It was a missed opportunity to **have a serious discussion about the directions of Ruby and Rails as technologies and the factors that businesses should consider when deciding what tools to use when building out their applications**.

I still like Rails for new application development - not just because of the time I've spent learning the framework, but **because I still believe Rails is a force multiplier for software development**.  In this response to Mr. Friedman's piece, I want to examine the points he made in more detail, calling bullshit where necessary, and then add my two cents to the discussion by assessing what Rails does right and where it can still improve.<!--more-->

## Argument 1: Ruby Is Slow

Friedman points out that Ruby famously ranks poorly in language performance benchmarks and cites its status as a completely independent open source project with no deep-pocketed corporate backers investing money in speed improvements as the likely reason for it. 

Ruby has gotten faster over time, but it's still pretty slow as programming languages go.  Compiled languages like Java and C++ are an order of magnitude faster than Ruby, and even other interpreted languages like Python routinely outperform Ruby.  Every Rails developer already knows this, and its pretty much as true now as it was back in the mid-2000s when Scribd founders decided to use it to build out their platform.

There are two reasons that this is a strange argument to lead off with though. First while website page load times do play a role in [conversion rates](https://blog.kissmetrics.com/loading-time/), [search rankings](http://googlewebmastercentral.blogspot.cz/2010/04/using-site-speed-in-web-search-ranking.html), and IT expenses, language performance in benchmarks is a mediocre indicator of page load time for web applications built using that language.  Other factors like the design of the development framework and the architecture of the application are both arguably much more important, and modern Rails applications use caching, background jobs, Ajax, and other techniques to deliver end-user performance that's at least sufficient for most applications and in the best cases competitive.  And if poor programming language performance were really prohibitive to building a successful business, then there would be no explanation for companies that manage to serve millions of visitors each month with Rails-based applications - Shopify, Airbnb, Bloomberg, GitHub, Basecamp, and so on.

But the second more important reason, and this really gets at the heart of Friedman's thesis, is that it's really rare that poor application performance sinks a business.  Businesses fail far more often for other reasons:

* Failing to identify a viable market for their product - or a viable product for their market
* Inability to deliver a compelling solution to the identified problem
* Lack of cash

There are plenty of techniques and tactics that even moderately technically competent businesses can apply to solve performance problems, even if that involves throwing hardware at the problem.  But a fast application won't save a company that's failed to catch on with users.

## Argument 2: The Rails Framework Has Hit the Wall

Friedman states that Rails was one of the first web development frameworks to focus extensively on the issue of programmer productivity, but despite this early lead, he says that it's lost ground to other frameworks that have adopted many of its innovations. The lack of new features, he says, have led many large applications to remain on older versions of the framework.

Rails has been steadily dropping new releases with important features all along. The record is clear and available to anyone willing to look.

* 3.1 (August 2011) - Asset Pipeline, jQuery, CoffeeScript, Sass, reversible migrations, 
* 3.2 (January 2012) - faster development mode, ARel explain queries
* 4.0 (June 2013) - Turbolinks, Russian Doll Caching
* 4.1 (April 2014) - Spring, Action Mailer previews, enums
* 4.2 (December 2014) - Active Job, asynchronous email delivery, web console

Some features in that list have more fans than others, but it's not fair to say that the framework languished either.  (Friedman concedes later in the comments that Rails has evolved but has failed to meet the needs of larger companies, but he doesn't elaborate what these are or how they're different from the needs of smaller companies or the features that have actually been released.)

Friedman cites the fact that GitHub took years to upgrade its application to Rails 3 as evidence that new features just haven't been worth the pain of upgrading.  While I think that statement is probably true on the surface ([albeit perhaps incomplete, based on indications from insiders](http://shayfrendt.com/posts/upgrading-github-to-rails-3-with-zero-downtime/)), the complications involved in upgrading an application with the scale of a GitHub or a Scribd is substantially greater than it would be for the typical Rails application and is only exacerbated by following a big-bang approach as opposed to keeping up with patches.

Friedman also contrasts the relatively minor tweaks in the Scribd server-side application with the big changes in the front-end which has "gone from Prototype to jQuery to Coffeescript to Angular to React with major productivity improvements each time".

Wow...  That seems... scary.

The JavaScript landscape has seen more dramatic change than the Ruby back-end framework landscape, which has been dominated by Rails from the beginning, and I'll buy that React is a more productive tool than Prototype and probably more suited to a JavaScript-heavy site like Scribd.  **But are we to understand that Scribd has written their front-end application five times since their founding?**  Because that sounds completely monkey-balls to me as a developer and would seem like a big waste if I were someone with a stake in the business' bottom line.

## Argument 3: Rockstar Developers No Longer Interested

Finally, Friedman says that Rails has suffered from a loss of buzz in recent years, especially among experienced developers, and that this is because of the masses of junior programmers being minted by bootcamps and code schools.  He also claims that the future belongs to newer, shinier technologies like Node.js and Go which are winning the battle for developer mindshare.

To support his claims, he first shows a graph reposted from [an article](http://codingvc.com/which-technologies-do-startups-use-an-exploration-of-angellist-data) that shows technologies used by startups in the AngelList database.  Friedman says that the chart represents "server languages" and that it shows higher support for Node.js on the server side.  In fact though, the original article labels the chart as a comparison of "programming languages" only with no distinction made for client- or server-side technology.

{% img no-border center /images/angellist_languages.png AngelList programming language popularity %}

Most modern web applications use at least some JavaScript, and JavaScript and CoffeeScript are now considered necessary tools for the complete Rails developer.  That being the case, the chart tells us nothing definitive about the Node vs. Rails battle on the server side.

Next, Friedman presents a comparison of job listing data from Indeed showing the frequency of different search terms which shows a massive surge for Node.js, a fact that indicates that the future belongs to Node thanks to its extraordinary growth curve.  (I've removed some languages from the graph below for the sake of readability.)

<div style="width:540px" class="center">
<a href="http://www.indeed.com/jobtrends?q=php%2C+ruby%2C+rails%2C+python%2C+scala%2C+node.js&relative=1&relative=1" title="php, ruby, rails, python, scala, node.js Job Trends">
<img width="540" height="300" src="http://www.indeed.com/trendgraph/jobgraph.png?q=php%2C+ruby%2C+rails%2C+python%2C+scala%2C+node.js&relative=1" border="0" alt="php, ruby, rails, python, scala, node.js Job Trends graph">
</a>
<table width="100%" cellpadding="6" cellspacing="0" border="0" style="font-size:80%"><tr>
<td><a href="http://www.indeed.com/jobtrends?q=php%2C+ruby%2C+rails%2C+python%2C+scala%2C+node.js&relative=1&relative=1">php, ruby, rails, python, scala, node.js Job Trends</a></td>
<td align="right"><a href="http://www.indeed.com/jobs?q=PHP">PHP jobs</a> - <a href="http://www.indeed.com/jobs?q=Ruby">Ruby jobs</a> - <a href="http://www.indeed.com/jobs?q=Rails">Rails jobs</a> - <a href="http://www.indeed.com/jobs?q=Python">Python jobs</a> - <a href="http://www.indeed.com/jobs?q=Scala">Scala jobs</a> - <a href="http://www.indeed.com/jobs?q=Node.js">Node.js jobs</a></td>
</tr></table>
</div>

He fails to mention (except in a later comment) that the numbers are relative - Indeed doesn't actually say how we should interpret the graph - and that they don't reflect current jobs offered.  That would look more like this.

<div style="width:540px" class="center">
<a href="http://www.indeed.com/jobtrends?q=php%2C+ruby%2C+rails%2C+python%2C+scala%2C+node.js" title="php, ruby, rails, python, scala, node.js Job Trends">
<img width="540" height="300" src="http://www.indeed.com/trendgraph/jobgraph.png?q=php%2C+ruby%2C+rails%2C+python%2C+scala%2C+node.js" border="0" alt="php, ruby, rails, python, scala, node.js Job Trends graph">
</a>
<table width="100%" cellpadding="6" cellspacing="0" border="0" style="font-size:80%"><tr>
<td><a href="http://www.indeed.com/jobtrends?q=php%2C+ruby%2C+rails%2C+python%2C+scala%2C+node.js">php, ruby, rails, python, scala, node.js Job Trends</a></td>
<td align="right"><a href="http://www.indeed.com/jobs?q=PHP">PHP jobs</a> - <a href="http://www.indeed.com/jobs?q=Ruby">Ruby jobs</a> - <a href="http://www.indeed.com/jobs?q=Rails">Rails jobs</a> - <a href="http://www.indeed.com/jobs?q=Python">Python jobs</a> - <a href="http://www.indeed.com/jobs?q=Scala">Scala jobs</a> - <a href="http://www.indeed.com/jobs?q=Node.js">Node.js jobs</a></td>
</tr></table>
</div>

To read these numbers, you'd have to conclude that Python is the way to go, but chasing trends and the new thing is only valuable if you're able to monetize novelty.  If your business is software, novelty isn't going to make your developers more productive or your technology more reliable.  Most trends come and go, a few come and stick around, but choosing a technology to base your business on strictly by looking at the new hotness is going to produce more losers than winners because winners are hard to pick in every market.  As a technology manager, you need to select technologies based on the risks involved and how well suited it is to your business needs - not a snapshot of what's trendy this week.

When I think about the question of a large population of bootcamp graduates entering the community and the workforce, my outlook isn't nearly as grim as Friedman's seems to be.  I remember similar discussions about junior Java developers - some self-taught from books like "Learn Java in 30 Days", some graduating from certificate programs - back in the late 1990s, but Java remained and remains a viable technology even today.  The reality is that any serious development project, regardless of the tools used, is going to have a mix of tasks that need to be done - lots and lots of menial chores that simply need to be churned out along with a much smaller number of big, hard problems to be solved.  There will always be a place for the elite coders and architects to do the kind of work that juniors simply don't have the expertise to do, and the less experienced developers benefit from proximity to such work.  This is where "serious programmers" come from.

## Seeing Clearly, Minus the Ruby-Colored Glasses

{% img no-border right /images/anti-hate-shields.gif 500 Activate the anti-hate-shields! %}

Mr. Friedman's criticism is shallow and poorly researched, but I'm willing to concede my own bias.  **I still see Rails as a cheat code for building web-based applications.**  The total package that it provides out of the box - a well-structured application, effortless persistence, modern asset packaging, support for background jobs, steadily improving performance, and many other features - is hard to beat.

That said though, there are still big issues that need to be ironed out in order to improve Ruby on Rails as a development and deployment platform - just not the ones that Friedman thinks:

* The Ruby interpreter supports parallel execution only with multiple processes - a serious consideration when building large, multi-user applications for web and mobile.  (The JRuby and Rubinius interpreters don't have the same limitation.)
* A lot of well-respected developers have very publicly called out the patterns embedded in Rails, especially in its handling of model objects and persistence.
* Rails application architectures are usually relatively uniform and standardized with respect to the framework but often variable when it comes to areas not addressed by the framework.
* Tooling for Ruby and Rails development is still very immature compared to other languages and frameworks.
* The deployment story for Rails applications remains a work in progress with many different tools and operational models in use.
* Maintaining a Rails application over the long term with a larger team requires an investment of time and money to maintain high coding standards, though it's not clear that this is a shortcoming of either the language or the framework.

None of these is a showstopper when it comes to building a viable business, but they're all technical problems that I think are more cause for concern than those mentioned above.

More important to understand, though, is that **problems are a sign of life**.  In 2015, Rails serves a massive community, and the fact that there's still so much discussion about how the framework could improve and grow is a sign that developers still care and that Rails still matters.

{% include mailchimp/minitest_after_post3.html %}
