---
title: Input系统之UI线程
date: 2018-03-20 14:05:36
tags:
	- Android
categories:
	- 笔记
---

&emsp;&emsp; InputReader 和 InputDispatcher 运行在 system_server 进程，用户点击的界面往往可能是某个 app 。而每个 app 运行在自己的进程，这就涉及到跨进程之间的通信，也就是 app 进行和 system 进程建立通信。


