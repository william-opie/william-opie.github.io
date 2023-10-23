---
title: How to Create a Blog with GitHub Pages
layout: post
date: '2023-10-20 22:11:46'
author: Will
---

Creating a blog is a great way to document and share the knowledge you've gained. While there are many free and/or cheap blogging platforms available, using [GitHub Pages](https://pages.github.com/) to host your blog provides an opportunity to get hands on experience with web development tools, Git, DNS records (if you want to use a custom domain for your blog), and more. It's a great project for beginners, and it's something you can build upon and refine over time. This post catalogs links with instructions for all of the steps needed to create a basic blog hosted on GitHub Pages.

These instructions are written for Windows users. If you're using other platforms, Jekyll (a static site generator) has [a step-by-step tutorial](http://https://jekyllrb.com/docs/step-by-step/01-setup/) with instructions for other platforms. 

**Prerequisites**
A few tools are recommended/required before you begin:
1. [Git](https://git-scm.com/download/win): Git is a version control tool. The links below utilize Git to push code for the blog to GitHub. This link from GitHub provides instructions for installing and setting up Git: https://docs.github.com/en/get-started/quickstart/set-up-git
2. [VSCode](https://code.visualstudio.com/Download): Visual Studio Code (aka VSCode) is a free code editor from Microsoft. You can use VSCode to edit configuration files for the blog, and you can its integrated terminal to run the commands listed in the the below links.

If you want to use a custom domain for your blog, you'll need to purchase a domain name. There are many domain registrars on the web, but these instructions will provide steps for creating DNS records on [Namecheap](https://www.namecheap.com/). If you're not sure how to buy/register a domain name, [this article from Namecheap](https://www.namecheap.com/support/knowledgebase/article.aspx/10072/35/how-to-register-a-domain-name/) provides instructions.

You'll also need a GitHub account. If you don't already have a GitHub account, [this article from GitHub](https://docs.github.com/en/get-started/onboarding/getting-started-with-your-github-account) provides instructions for creating an account.

**Steps**
1. Install Jekyll: [Jekyll's documentation](https://jekyllrb.com/docs/installation/windows/) provides detailed instructions for installing Jekyll on Windows. The TLDR is that you'll need to install [Ruby+Devkit](https://rubyinstaller.org/downloads/) first, then Jekyll.
2. Create a repo on GitHub for the blog: [GitHub provides detailed instructions](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/creating-a-github-pages-site-with-jekyll#creating-a-repository-for-your-site) for creating a new repository (also known as a "repo") for your blog.
3. Create the blog: [Continuing from previous link](https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/creating-a-github-pages-site-with-jekyll#creating-your-site), GitHub provides instructions for creating and deploying a "Hello World" version of the website. The Gemfile configuration steps (Steps 8-11) and the \_config.yml step (Step 13) are important; getting these set properly now will save you some time later on. For initial testing, you can set the domain and URL in \_config.yml to the GitHub pages URL (ex. william-opie.github.io); if you plan to use a custom domain name, you will need to change this to your custom domain later on.
4. Setup your custom domain: If you plan on using a custom domain, these links from GitHub cover all of the steps required:
* https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages
* https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
* https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages
*NOTE*: When verifying your custom domain, GitHub provides values for a DNS TXT record (see example):![](https://docs.github.com/assets/cb-168509/mw-1440/images/help/pages/verify-dns.webp)
When creating this TXT record on Namecheap, **do not** include your domain in the Host field (using the above screenshot as an example, you would not include ".example.com" in the Host field when creating the TXT record-- only include the "\_github-pages-challenge..." portion).

After verifying your custom domain, go back to the \_config.yml file and set the domain and URL to your custom domain, then push the updated \_config.yml file to your GitHub repo. After a few minutes, you should be able to access your blog from your custom domain. Congrats! You're now ready to add content to your new blog.

This link from GitHub provides instructions for adding posts and pages to your blog: https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/adding-content-to-your-github-pages-site-using-jekyll

You can also customize the theme used for your blog: https://docs.github.com/en/pages/setting-up-a-github-pages-site-with-jekyll/adding-a-theme-to-your-github-pages-site-using-jekyll

I recommend using [Jekyll Admin](https://github.com/jekyll/jekyll-admin#readme) as a CMS for creating/editing/managing content on your new blog. There are other Jekyll CMS options available (ex. [Strapi](https://medium.com/strapi/building-a-static-blog-using-jekyll-and-strapi-2f3281ddc166)) that you may prefer to use instead.

Congrats-- you now have a blog hosted on GitHub pages! This is just the beginning though. You can further customize your blog however you see fit (ex. adding a search bar, [comments](https://staticman.net/), etc). I hope this post helped you with creating your blog.
