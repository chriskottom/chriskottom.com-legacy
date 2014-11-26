---
layout: post
title: "Stop Fiddling with Date Ranges in Google Analytics"
date: 2014-06-22 11:00:15 +0200
comments: true
categories: [marketing, Google Analytics, tips, date range]
description: Create a bookmarklet that passes custom date range parameters to Google Analytics.
---
{% img no-border right /images/ga_date_range_selector.png 500 Google Analytics date range selector %}

In spite of being generally awesome, Google Analytics is like a lot of applications that deliver lots of functionality: people who use it enough find nit-picky things that bug the crap out of them.  For me, it's the face that GA shows the previous 30 *full* days of data by default - that means up to and including yesterday but not the current day.  If you want to see information for today in your views, you'll need to click into the date selector in the upper righthand corner and select a new range that includes the current date, and because there's no preference for setting this as a default, you'll have to do this **each and every time you access the application**.  I got tired of doing this, so I went looking for a simple solution that would solve it once for always and forever.<!--more-->  I came up with this little gadget to create a bookmarklet for accessing Google Analytics.

{% render_partial _includes/ga_last_thirty_days_bookmarklet.html %}

When you enter Google Analytics and click through to one of your properties, the URL you follow looks something like this:

```
https://www.google.com/analytics/web/?#report/visitors-overview/<GA property identifier>/
```

Google Analytics data is built around a three-level hierarchy consisting of *Accounts*, *Properties*, and *Views* which, roughly speaking, define the ownership, source, and subsets of analytics data that will be used in rendering a given view.  The property identifier parameter points to a single data set under your account and relating to a selected property.  For more information about the way GA partitions its data, see the [Google help page][1] on the topic.

If you then specify a custom date range, GA will append those dates to the end of the URL as follows:

```
https://www.google.com/analytics/web/?#report/visitors-overview/<GA property identifier>/?_u.date00=20140523&_u.date01=20140622/
```

The formatting here is pretty straightforward, so finishing the job is just a matter of capturing the form inputs, formatting the Javascript URL string using that information, and dumping it to the page.

{% codeblock lang:javascript %}
    $("#ga-bookmarklet-tool form").submit(function (event) {
        // Don't execute default behavior
        event.preventDefault();
		
		// Grab form input data
        var gaIdentifier = $("input#ga-id").val();
        var anchorText = $("input#text").val();
        var numberOfDays = $("input#days").val();

        // Write a function to create and open the correct URL
        var url = "javascript:(function(){var id=\""+gaIdentifier + "\";function twoDigitize(a){a=String(a);a.length<2&&(a=\"0\"+a);return a}var c=new Date,b=\"\";b+=c.getFullYear();b+=twoDigitize(c.getMonth()+1);b+=twoDigitize(c.getDate());var f=new Date(c-(1000*60*60*24*" + numberOfDays + ")),e=\"\";e+=f.getFullYear();e+=twoDigitize(f.getMonth()+1);e+=twoDigitize(f.getDate());location.href=\"https://www.google.com/analytics/web/?#report/visitors-overview/\"+id+\"/%3F_u.date00%3D\"+e+\"%26_u.date01%3D\"+b+\"/=\";})();";
		
		// Drop in the new bookmarklet / link
    	var target = $("#ga-bookmarklet-tool #bookmarklet");
        target.html("<a href='" + url + "'>" + anchorText + "</a>");
    });
{% endcodeblock %}

Rather than giving you the whole play-by-play of the formatting, it made more sense to give youthe generator above.  Enjoy!


[1]: https://support.google.com/analytics/answer/1009618?hl=en
