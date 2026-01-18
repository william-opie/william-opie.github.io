---
title: Installing Ubuntu on Acer Aspire E 15 E5-575G-53VG (2015)
layout: post
date: '2024-03-01 23:01:46'
author: Will
---

I recently installed Ubuntu 23.10 on my old Acer Aspire laptop. When the install completed, I was greeted with a "No bootable device" error. A reinstall didn't fix the issue, and some <a href="https://forums.linuxmint.com/viewtopic.php?t=400606" target="_blank">well-meaning forum posts</a> ended up wasting my time.

Thankfully, the fix for this issue is simple:

1. Reboot your computer. Press the F2 key to enter BIOS.
2. Navigate to the "Boot" tab with your arrow keys. Next, change the "Boot Mode" to "Legacy."
3. Press F10 to save and exit.

Note: You may need to install Ubuntu again after completing this step (assuming you tried installing it before making these changes).

Congrats! You should now be able to boot into Ubuntu without issue.