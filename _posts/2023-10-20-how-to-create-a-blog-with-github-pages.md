---
title: How to Create a Blog with GitHub Pages
layout: post
date: '2023-10-20 22:11:46'
---

Creating a blog is a great way to document and share the knowledge you've gained. While there are many free and/or cheap blogging platforms available, using GitHub Pages to host your blog provides an opportunity to get hands on experience with web development tools, Git, DNS records (if you want to use a custom domain for your blog), and more. It's a great project for beginners, and it's something you can build upon and refine over time. This post will walk through the all the steps needed to create a basic blog hosted on GitHub Pages.

These instructions are written for Windows users. If you're using other platforms, Jekyll (a static site generator) has [a step-by-step tutorial](http://https://jekyllrb.com/docs/step-by-step/01-setup/) with instructions for other platforms. This post includes instructions for an absolute beginner, so anyone can follow along. Feel free to skip ahead as needed. :)

**Prerequisites**
A few tools are needed before we can begin:
1. [Git](https://git-scm.com/download/win): Git is a version control tool. In this post, we'll be using it to push code for the blog to GitHub. Download and install Git.
2. [VSCode](https://code.visualstudio.com/Download): Visual Studio Code (aka VSCode) is a free code editor from Microsoft. In this post, we'll be using VSCode to edit configuration files for the blog. Download and install VSCode.

If you want to use a custom domain for your blog, you'll need to purchase a domain name. There are many domain registrars on the web, but these instructions will provide steps for creating DNS records on [Namecheap](https://www.namecheap.com/). If you're not sure how to buy/register a domain name, [this article from Namecheap](https://www.namecheap.com/support/knowledgebase/article.aspx/10072/35/how-to-register-a-domain-name/) provides instructions.

You'll also need a GitHub account. If you don't already have a GitHub account, [this article from GitHub](https://docs.github.com/en/get-started/onboarding/getting-started-with-your-github-account) provides instructions for creating an account.
