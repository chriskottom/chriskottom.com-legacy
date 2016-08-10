# -*- coding: utf-8 -*-
# Title: Simple Image tag for Jekyll
# Authors: Brandon Mathis http://brandonmathis.com
#          Felix Schäfer, Frederic Hemberger
# Description: Easily output images with optional class names, width, height, title and alt attributes
#
# Syntax {% imgcap [class name(s)] [http[s]:/]/path/to/image [width [height]] [title text | "title text" ["alt text"]] %}
#
# Examples:
# {% imgcap /images/ninja.png Ninja Attack! %}
# {% imgcap left half http://site.com/images/ninja.png Ninja Attack! %}
# {% imgcap left half http://site.com/images/ninja.png 150 150 "Ninja Attack!" "Ninja in attack posture" %}
#
# Output:
# <figure><img src="/images/ninja.png"><figcaption></figcaption</figure>
# <figure class="left half"><img src="http://site.com/images/ninja.png" title="Ninja Attack!" alt="Ninja Attack!"><figcaption>Ninja Attack!</figcaption></figure>
# <figure class="left half"><img src="http://site.com/images/ninja.png" width="150" height="150" title="Ninja Attack!" alt="Ninja in attack posture"><figcaption>Ninja Attack!</figcaption></figure>
#

require_relative "./image_tag"
module Jekyll

  class CaptionedImageTag < ImageTag
    @class = ''
    def initialize(tag_name, markup, tokens)
      super
    end

    def render(context)
      if @img
        if @img['class']
          @class = @img['class']
          @img.delete('class')
        end
        "<figure class='#{@class}'><img #{@img.collect {|k,v| "#{k}=\"#{v}\"" if v}.join(" ")}><figcaption>#{@img['title']}</figcaption></figure>"
      else
        "Error processing input, expected syntax: {% img [class name(s)] [http[s]:/]/path/to/image [width [height]] [title text | \"title text\" [\"alt text\"]] %}"
      end
    end
  end
end

Liquid::Template.register_tag('imgcap', Jekyll::CaptionedImageTag)
