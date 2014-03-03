---
layout: post
title: "The Black Screen of Death: A Survival Guide"
date: 2013-10-19 12:12
comments: true
categories: [NVIDIA, Ubuntu, 'black screen', tech, upgrade]
---
Ubuntu upgrades are always nice because they combine two things everyone loves: *new* and *free*. It's like geek Christmas if Christmas came twice a year and was mostly about unusual stocking stuffers and only the occasional big-ticket present.

Having been through these more than a few times though, upgrade days also fill me with a mild unease and a healthy dose of nerves. In the past, I've spent hours or days trying to fix issues with audio or video or fiddling with defaults and settings for some applications, and some past upgrades have made disorienting changes to the user interface, most of which seem to be chasing recent updates to OS X or Windows. Since I spend 90% of my time in the terminal or browser, the impact is usually minimal, but I've still been burned enough times to know better than to upgrade during a break from pressing work.<!--more-->

So it didn't come as a complete surprise when I upgraded yesterday and rebooted to find:

{% img center /images/black_screen.gif "Behold: The Black Screen of Death!" %}

An appropriate reaction to this unfolds in three stages.

### Stage 1: Panic and Desperation

The "oh, shit" allotment for this sort of thing is about 30 seconds. Indulge and move on.

After you're done wetting the keyboard with your tears, you realize that there's no sense in panicking. Tens of thousands of other people are out there doing the same upgrade on hundreds or thousands of different platform and hardware configurations. It's pretty likely that someone else has already seen this and has filed a bug.

### Stage 2: Curiosity

The disk activity LED was doing nothing after boot, so I made the assumption that the system was failing to completely boot up. Ouch.

My first attempts at googling for salvation produced lots of results that pointed to all manner of possible causes but didn't immediately help me to home in on a single specific problem. Some referred to bugs with Xorg or the new Linux kernel, others speculated that the late decision to remove the new Mir display manager were causing problems, and so on. In any case, there's nothing more depressing than looking at a blank screen and feeling your best course of action involves the tweaking of search terms that look like *ubuntu 13.10 boot failure* and *ubuntu upgrade black screen*. Just the same though, protip: never start an upgrade without having an alternate means of getting on the Internet.

I was able to boot into a root shell in safe mode, so obviously all was not lost. The first stop was `/var/logs` where I started looking through the usual suspects. Grepping through the system log showed lots of noise and very few things that looked like signal, but I was able to find the following lines amongst the wreckage:

{% img center /images/black_screen_error1.png %}

OK, so this might not be the end of the world after all. Checking the Xorg logs I found additional evidence of the same thing.

{% img center /images/black_screen_error2.png %}

Armed with a whole new set of keywords to try, I started searching around for information related to problems with the NVIDIA drivers and found a [disturbingly well organized Q & A][1] on Ask Ubuntu talking about the Black Screen of Death and providing various remedies in cases involving installs, upgrades, and other common causes. I appreciated how easy it was to find what I needed finally, but the level of polish didn't instill much confidence once I realized that it was a consequence of Ubuntu BSoD being a not-uncommon problem.

### Stage 3: Resolution

After a little exploration, I found some [advice related to NVIDIA][2] that called for removal and reinstallation of the drivers, and with a few keystrokes and a reboot, I was back to having a fully functional system. It wasn't magic, and it wasn't without some stress, but I and my system are no worse off for it.

### Conclusions

Like a lot of quirky things, you've got to look past certain idiosyncrasies to enjoy Linux, and that goes double for upgrade days. It's not for everyone, and it is the sort of thing that has been known to evoke strong opinions. Windows people get stuck at Stage 1 because of the helplessness they've learned from years of using locked-down office PCs, and Followers of Jobs see this as a low-rent option that doesn't comport with their sense of aesthetics. For me though, running Linux on the desktop is like owning an MG. They're like the R2D2 of classic sports coupes - comically adorable with a lot of personality. Given the right care and feeding, they can be strikingly beautiful.

{% imgcap center /images/mg_midget_after.jpg 800 "[MG Midget][4] by [meg_nicol][5], [CC BY-NC-ND 2.0][6]" "MG Midget by meg_nicol, CC BY-NC-ND 2.0" %}

But as MG owners everywhere understand, you need to make sure that you've got a good set of tools at your disposal because a lot of mechanics won't touch them and sometimes you're going to have to lift the hood to deal with this:

{% imgcap center /images/mg_midget_before.jpg 420 "[1975 MG Midget Engine][8] by [Brain Toad][9], [CC BY-NC-SA 2.0][10]" "1975 MG Midget Engine by Brain Toad, CC BY-NC-SA 2.0" %}

You can view that as an intolerable inconvenience and an imposition on your precious time. You can throw up your hands and argue how technical stuff is beyond you. Or you can choose to see it as something that brings you a little closer to your machine, something that makes it a little less like an appliance and a little more like a pet.

Now if you'll excuse me, I've got actual work to catch up on.

[1]: http://askubuntu.com/questions/162075/my-computer-boots-to-a-black-screen-what-options-do-i-have-to-fix-it
[2]: http://askubuntu.com/questions/41681/blank-screen-after-installing-nvidia-restricted-driver
[3]: http://chriskottom.com/wp-content/uploads/2013/10/mg_midget_after.jpg
[4]: http://www.flickr.com/photos/meg_nicol/2316658375/
[5]: https://secure.flickr.com/photos/meg_nicol/
[6]: https://creativecommons.org/licenses/by-nc-nd/2.0/
[7]: http://chriskottom.com/wp-content/uploads/2013/10/mg_midget_before.jpg
[8]: http://www.flickr.com/photos/braintoad/2508267274/
[9]: https://secure.flickr.com/photos/braintoad/
[10]: https://creativecommons.org/licenses/by-nc-sa/2.0/
