---
layout: post
title: "Rails Helper Testing Made Simple"
date: 2017-06-13 11:46:47 +0200
comments: true
categories: [Rails, helpers, testing]
description: Rails view helpers can be hard to navigate, but they don't have to be hard to test. This post gets to the core of what helpers are and provides a clear guide for how you can test them.
---
Rails relies on a standard project structure and a strong set of conventions to keep things neat and tidy - models separated from controllers, configuration in another folder structured just so. The exception that proves the rule in this case, though, would have to be Rails view helpers. Helpers tend to be a dumping ground for all the random bits of view logic, formatting, and utility code that accumulate in every web application, and if you're not disciplined (and most of us aren't), `app/helpers` can degenerate into a jungle quickly.

But helpers fill a necessary role in our applications by removing presentation logic from our templates and moving it to methods which makes it easier to test. So even though they're going to be hard to organize almost by definition, we can still be disciplined about testing them. In other words: your view helpers might still look like spaghetti, but at least we can make sure it's well-tested spaghetti.<!--more-->

## The Only Two Things You Need to Know About Helpers

Faced with a collection of arbitrary functions, many developers skip testing helpers altogether. A lot of my older applications have zero tests for helpers, and it was mostly because the benefits just didn't seem to justify the effort required. That changed the day I came to two important realizations. First, understand that **helpers are just Ruby mixins**. From a testing perspective, there's nothing special or unusual about them, and that means that we can apply [the same tools and techniques that we already use to test other kind of mixins](/blog/2015/03/testing-ruby-mixins-in-isolation/).

Second, since they're just modules mixed into the view, **there are only two types of helpers we need to consider**: methods that depend on the thing they're mixed into, and methods that don't. The rest of this post will explain how to know which type of method you're dealing with and how to write a test for it once you do.

## Testing Standalone Helpers

A standalone helper for our purposes is essentially a [pure function](https://en.wikipedia.org/wiki/Pure_function) - a method whose return value is based solely on the inputs given to and which produces no other side effects. Common examples of these include methods used to format numbers, dates and text stored in a model for display or those that wrap other Rails view helpers to add more specific functionality - usually anywhere from 50-90% of helpers. The block below shows just a sample of the types of methods I mean:

{% codeblock lang:ruby app/helpers/products_helper.rb %}
module ProductsHelper
  def link_to_product(product)
    link_to product.name, product
  end

  def product_thumbnail(product)
    image_tag product.image.url(:thumbnail), alt: product.name
  end

  def product_price(product)
    tag.span number_to_currency(product.price), class: 'price'
  end

  def product_list_entry(product)
    tag.div(id: "product-#{ product.id }", class: 'product') do
      content  = product_thumbnail(product)
      content += tag.span(link_to_product(product), class: 'name')
      content += product_price(product)
      content
    end
  end
end
{% endcodeblock %}

While the Rails view mixes in all your helper modules with every request, helper tests based on ActionView::TestCase only include the helper module currently under test. The result, though, is that methods from the helper are available as part of the test, so we can call them directly as you see in the test below.

{% codeblock lang:ruby test/helpers/products_helper_test.rb %}
require 'test_helper'

class ProductsHelperTest < ActionView::TestCase
  setup do
    @product = products(:bacon)
  end

  test '#link_to_product produces a product link' do
    assert_equal "<a href=\"#{ product_path(@product) }\">#{ @product.name }</a>",
                 link_to_product(@product)
  end

  test '#product_list_entry contains a thumbnail image' do
    image_regexp = /src="#{ @product.image.url(:thumbnail) }"/
    assert_match image_regexp, product_list_entry(@product)
  end

  test '#product_list_entry contains the product name' do
    assert_match /#{ @product.name }/, product_list_entry(@product)
  end

  test '#product_list_entry contains the product price' do
    assert_match /\$#{ @product.price }/, product_list_entry(@product)
  end
end
{% endcodeblock %}

Testing methods like this is simple - given known inputs, make assertions about the outputs. Another common Rails pattern is a helper method that takes a block parameter. Methods like these can be used to generate markup that will be wrap code defined in the template. One example might be a helper that takes a block and prepares a form tag specifically tailored to a given model class and interface type.

{% codeblock lang:ruby app/helpers/products_helper.rb %}
module ProductsHelper
  # ...

  def product_form_with(**params, &block)
    params[:model] ||= Product.new

    if params[:class]
      params[:class] += ' product form-horizontal'
    else
      params[:class] = 'product form-horizontal'
    end

    form_with(**params) do |form|
      yield form if block_given?
    end
  end
end
{% endcodeblock %}

When testing a method like this, it's possible to make assertions about the parameters passed to the block argument in addition to the return value as you see in the example test.

{% codeblock lang:ruby test/helpers/products_helper_test.rb %}
require 'test_helper'

class ProductsHelperTest < ActionView::TestCase
  # ...

  test '#product_form_with adds classes to the form' do
    assert_match /class="[^"]*product form\-horizontal"/, product_form_with
  end

  test '#product_form_with sets the object to a new instance if not present' do
    product_form_with do |form|
      product = form.object
      %w(id name price created_at updated_at).each do |attr_name|
        assert_nil product[attr_name]
      end
      assert product.new_record?, 'Expected product to be new'
    end
  end
end
{% endcodeblock %}

## Testing Helpers That Depend on the View

In most cases, I find it cleaner to write helper methods as pure functions by passing in all the state needed to evaluate it. But in certain cases, it's better to let helpers be helpers by not being ignorant about their relationship to the view. Case in point: a friend of mine shared an example with me a few weeks ago where he was working on building up a string of DOM classes in the view. He'd written a method like the one below to generate the class for the link to the current URL:

{% codeblock lang:ruby app/helpers/pages_helper.rb %}
module PagesHelper
  def active?(path)
    'active' if current_page? path
  end
end
{% endcodeblock %}

This could have been written by passing in the Boolean result of `current_page?(path)`, but the route he chose was definitely cleaner and more Rails-like. The problem that he was having, though, was: how best to test this?

My advice to him was first to understand what you don't need to test. Specifically, you don't have to care how `current_page?` arrives at a result, you only care about the result itself and what your code does with it. Once you realize that, then all you need is to stub the possible values of that method and make assertions about what your code returns.

Here again, the helper module and all the Rails standard view helpers are mixed directly into the test case, so the test behaves just like a Rails view. We can stub `current_page?` directly in the test like this:

{% codeblock lang:ruby test/helpers/pages_helper_test.rb %}
require 'test_helper'

class PagesHelperTest < ActionView::TestCase
  test '#active? page returns true for current_page?' do
    stub :current_page?, true do
      assert_equal 'active', active?('pages/some/path')
    end
  end

  test '#active? page returns nil on any other page' do
    stub :current_page?, false do
      assert_nil active?('pages/other/path')
    end
  end
end
{% endcodeblock %}

## Is Testing Helpers Worth Your Time?

I don't test every single helper that I write. There's just very little return on the time you spend writing a test for a function that formats the current date or wraps a call to `link_to`. Through experience though, I've become more aware when I find myself writing a helper that probably needs to be tested. Any methods with the following characteristics are usually good candidates:

* Contains conditionals or `switch` statements
* Long methods (> 10 LOC including any executed private methods)
* Uses String composition to generate complex markup
* Takes more than one parameter
