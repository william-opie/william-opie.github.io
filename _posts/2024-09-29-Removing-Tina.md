---
title: Removing Tina.io
date: 2024-09-29T14:45:00.000Z
published: true
author: Will
---
[A few months ago](https://op13.dev/2024/05/12/moving-from-jekyll-admin-to-tina.io.html), I decided to switch from Jekyll Admin to Tina.io for this blog's CMS. Jekyll Admin seems to be abandoned, and Tina came with some nice quality of life features. These modern features turned out to be a double-edged sword, however, as I started receiving security alerts (20+ in four months) from Dependabot for packages used by Tina.

These alerts were usually easily resolved by simply merging the Dependabot PR, but they were still irritating. Ultimately, I decided that Tina wasn't worth the hassle. This is a one-man blog, so using VSCode's built-in [Markdown editor](https://code.visualstudio.com/Docs/languages/markdown) and the [Doc Writer Profile Template](https://code.visualstudio.com/docs/editor/profiles#_doc-writer-profile-template) works just fine.

Sometimes simple is better.

___

P.S. I'll be updating this blog more frequently going forward. Look forward to a writeup on the [docker-compose-nas fork](https://github.com/william-opie/docker-compose-nas) in the near future. 