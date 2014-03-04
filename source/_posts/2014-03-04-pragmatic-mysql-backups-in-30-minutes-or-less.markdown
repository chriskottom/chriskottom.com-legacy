---
layout: post
title: "Pragmatic MySQL Backups in 30 Minutes or Less"
date: 2014-03-04 12:56:06 +0100
comments: true
categories: development MySQL database backup Tarsnap
---
If you're writing web applications, it's more than likely that you're running a MySQL install somewhere - maybe several somewheres.  However you might feel about the MySQL soap opera, it's still [consistently ranked](http://db-engines.com/en/ranking_trend) among the most popular databases on the planet, and even if it's lost some of its caché in recent years, it's arguably the default choice for most developers starting a new project.

While MySQL earned its place as a developer's database because it was easy to set up and run with minimal tinkering, customer-facing databases need a little more management and care, and that means all the DBA-type activities that you might prefer to ignore: security, planning, tuning, and data protection.  Do what you want in your development environment, but be an adult in production and get you some backups.<!--more-->

What's the simplest thing that could work?  Well, in order to protect yourself and your users, you need to cover at least the following:

1. Backup creation
1. Backup automation
1. Offsite storage

In this post, I'm going to show you how I implement database backups for public-facing applications.  The goal should be to build out a simple solution that fulfills all these requirements and can be put in place in the time it takes to get a pizza delivered.

## Backup Creation
There are lots of free and commercial options for creating database backups with MySQL,but assuming that your database isn't enormous and doesn't get tons and tons of traffic, you're probably best served using the `mysqldump` tool that comes bundled with every MySQL server install.  It's fast, easy to use, and gives you a portable SQL file to recreate and repopulate your database as output.  The tool has a lot of options that let you customize your output in any number of different ways, but the defaults they provide are actually pretty awesome and provide an optimal output file.  These include:

* `--opt` - Aggregates a number of command line options:
  * `--add-drop-table` - Drops tables prior to creation
  * `--add-locks` - Locks tables before insert, unlocks after completed
  * `--create-options` - Uses MySQL-specific options for table creation: database engine, etc.
  * `--disable-keys` - Disables keys before inserting, enables them once completed
  * `--extended-insert` - Uses multiple-row `INSERT` statements
  * `--lock-tables` - Locks each table before dumping
  * `--quick` - Conserves memory by fetching rows one at a time instead of buffering all
  * `--set-charset` - Sets the DB connection charset to be used during restore
* `--comments` - Writes server and DB configuration information into comments
* `--dump-date` - Includes a timestamp comment indicating when the dump completed
* `--quote-names` - Quotes database, table, and column names
* `--triggers` - Dump triggers for each dumped table
* `--tz-utc` - Timestamps should be dumped in internationalized (UTC) format

I create my backups using a one-liner similar to the following:

{% codeblock lang:sh %}
mysqldump -u root -p --single-transaction --skip-lock-tables awesome_db | \
  gzip > awesome_db_$(date "+%Y%m%d%H%M").sql.gz
{% endcodeblock %}

There are a few important things going on here.

* Never enter your database password on the command line immediately after the `-p` flag or it will persist in your `.bash_history` file.  Instead, use the syntax shown above and enter the password when challenged, for the time being.
* I use the `--single-transaction` option to ensure that my dump represents a consistent version of the database structure and contents even if there are changes while `mysqldump` is running.  This only works for the InnoDB or XtraDB storage engines, but since these are the default storage engines for MySQL, MariaDB, and Percona, this should work in most situations.
* Because I'm performing my dump within a single transaction, the state of the database is guaranteed to be consistent, so the `lock-tables` option is unnecessary.  I've shut this off using `--skip-lock-tables`.
* I'm piping the output of `mysqldump` directly through the `gzip` command to compress the data stream directly before writing it to storage.  You'll want to try this out in your own environment to be sure that it's not too much of a performance killer for your data set.
* Finally, I'm redirecting the compressed output to an output file that includes a the name of my database, dynamically-generated timestamp, and a ".sql.gz" suffix so that it's pretty obvious later what the contents are.

## Backup Automation
Before we go any further, I want you to know that I like and respect you.  I'd never say an unkind word about you, but as your friend, I think you need to hear this.

**You're unreliable.**  More unreliable than `crond` anyway.  You don't get to call it a backup strategy unless it runs without your intervention, and that means automation.  Unfortunately, the previous section requires the user to enter the database password on the command line interactively which you won't be able to do if you're not there.  The straightforward answer to this is to put the password in a script or in the crontab, but please, don't do it.  There's a better solution.

Start by creating a new database user with just enough permissions to back up any database on your server.  Open up a `mysql` command prompt and execute the following:

{% codeblock lang:mysql %}
CREATE USER 'backup'@'localhost' IDENTIFIED BY 'Flibbledydo';
GRANT LOCK TABLES,
      SELECT,
      FILE,
      RELOAD,
      SUPER,
      SHOW VIEW
ON *.* TO 'backup'@'localhost'
WITH MAX_QUERIES_PER_HOUR 0 MAX_CONNECTIONS_PER_HOUR 0 MAX_UPDATES_PER_HOUR 0 MAX_USER_CONNECTIONS 0;
{% endcodeblock %}

Next you'll create a `.my.cnf` file in the home directory of the (unprivileged!) system user that the cron job will run as.  It should look like this:

{% codeblock lang:sh /home/backup-dude/.my.cnf %}
[mysqldump]
user=backup
password=Flibbledydo
{% endcodeblock %}

If you set the permissions on the file with `chmod 600 .my.cnf`, it will prevent anyone else from reading or writing it.

Finally, I set up two jobs in the crontab for the selected user like the ones below.

{% codeblock lang:sh /var/spool/cron/crontabs/backup-dude %}
  0  */12 *  *  *    /usr/bin/mysqldump --single-transaction --skip-lock-tables awesome_db | /bin/gzip > /var/backups/mysql/awesome_db_$(date "+\%Y\%m\%d\%H\%M\%S").sql.gz
  0  1    *  *  *    find /var/backups/mysql -name "awesome_db_*" -ctime +7 -delete
{% endcodeblock %}

The first one creates a gzipped dump of the selected database every 12 hours and puts it in a directory of my choosing, while the second performs a daily cleanup of that directory by removing any files more than a week old.  It's not exactly a retention policy, but it should keep your risk of filling up the disk with dump files under control.

## Offsite Storage
All that's been done to this point will cover you in cases of accidental deletion or easy access to data for development, but it won't do much for you when your disk blows up.  So at least weekly (and maybe more often depending on how much you value your data) you're going to want to copy at least one dump file to another location to serve as an if-all-else-fails backup.  Depending on the situation and requirements, I've used a number of different solutions for this piece including:

* Daily/weekly upload to Amazon S3
* Dropbox
* Local workstation job (anacron) to `scp` a recent backup

I still use the last of these to provide myself with an absolute failsafe for data that I care about enough to back up but not enough to spend money on.  I'll throw a script like this one into into `/etc/cron.daily` on my local machine to make sure that I've got a copy of the most recent backup in case the disk decides to commit suicide.

{% codeblock lang:sh /etc/cron.daily/backup-transfer %}
#!/bin/sh

MY_SERVER=chriskottom.com
SOURCE_DIR=/var/backups/mysql
TARGET_DIR=/var/backups/mysql
BACKUP_NAME=awesome_db_backup.sql.gz

cd $TARGET_DIR
scp -qp $MY_SERVER:`ssh $MY_SERVER ls -1rtd $SOURCE_DIR/\* | tail -1` $BACKUP_NAME
{% endcodeblock %}

For anything that involves sensitive or valuable data, I'd recommend going with [Tarsnap](https://www.tarsnap.com/).  It combines a paranoid level of security with a Unix-style interface that's suitable for setting up scheduled jobs for copying dump files to offsite storage.  Let's say we wanted to set up a cron task to move a copy of the most recent dump file to Tarsnap once a week.  It might just require one additional line in the crontab.

{% codeblock lang:sh /var/spool/cron/crontabs/root %}
  0  2    *  *  0    cd /var/backups/mysql && tarsnap -c -q -f awesome_db_$(date "+\%Y\%m\%d\%H\%M\%S") `ls -Art | tail -n 1`
{% endcodeblock %}

In keeping with the paranoid security, Tarsnap is pretty picky about who it allows to play with it, so you'll either need to put this line into the root crontab or call sudo from the crontab of a user authorized to do so.

Tarsnap is also aggressively efficient with respect to stored data and bandwidth, so storing even large backup files won't chew through your budget.

The tool requires a little bit of setup which they describe nicely in their [documentation](https://www.tarsnap.com/documentation.html).  You'll need to generate a key for any machines you want to use the tool from, and there are a number of configuration and tuning parameters (e.g. bandwidth limits) that you'll want to set up before using it on a public facing server.  The [man page](https://www.tarsnap.com/man-tarsnap.1.html) for Tarsnap does a decent job of explaining the various config options and how to set them up.  It might cause a few one-time headaches to the less experienced admin, but it's still less time than you'll spend setting up to encrypt dump files for upload to S3

## Sleep Well
Awesome!  You've now got a strategy for backing up and protecting your database that will probably be more than adequate for 90% of MySQL installs.  This solution can always be improved upon and made more efficient, but you can tell the boss not to worry.
