---
title: Binder通信
date: 2018-02-12 11:23:13
tags: 
    - Android
categories: 
    - 笔记
---

##### 介绍
TCP/IP五层通信架构    

* 应用层：直接为用户提供服务 
* 传输层：传输的是Segment报文段(TCP)或者Datagram数据报(UDP数据)
* 网络层：传输的是Package包
* 数据链路层：传输的是Frame帧
* 物理层：传输的是Bit比特

Binder IPC原理

&emsp;&emsp; Binder 通信采用C/S架构，包含Client、Server、Service Manager以及Binder驱动。其中ServiceManager用于管理系统中的各种服务。Client端和Server端通信时都需要先获取 Service Manager 接口。AMS需要通过Service Manager注册服务， Client端在使用AMS之前需要通过Service Manager获取服务，也就是首先获得AMS的代理类AMP。 获取到AMP代理类之后，就可以跟AMS通信了。

&emsp;&emsp;Client,Server,Service Manager之间不是直接交互的，都通过与 Binder Driver 进行交互的，从而实现 IPC 通信方式。其中 Binder 驱动位于内核空间，Client,Server,Service Manager位于用户空间。Binder 驱动和 Service Manager 可以看做是 Android 平台的基础架构，而 Client 和 Server 是 Android 的应用层。

&emsp;&emsp;不管是注册服务、请求服务还是使用服务，每次都会经历一个完整的 Binder IPC 的过程。



