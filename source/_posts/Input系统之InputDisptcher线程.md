---
title: Input系统之InputDisptcher线程.md
date: 2018-03-16 10:35:43
tags:
	- Android
categories:
	- 笔记
---

&emsp;&emsp; InputReader 利用 EventHub 获取数据后生成 EventEntry 事件，加入到 InputDispatcher 的 mInboundQueue 队列，再唤醒 InputDispatcher 线程。InputDispatcher，同样从 threadLoop 为起点开始。`threadLoop()`中执行完`dispatchOnce()`之后会返回 Bool 类型的值 true 。线程 Thread 类中有一个虚函数 `threadLoop()`，对于 Thread 的派生类 InputDispatcherThread 就实现了`threadLoop()`方法。事件的读取和派送过程是一直循环的，这就需要`threadLoop()`不断循环的执行。在 Thread 的`run()`方法中会实现创建线程的过程，在 Thread 类的`run()`方法执行后，会调用底层库 libpthread 的方法`pthread_create()`创建线程，并执行回调方法`_threadLoop()`。`_threadLoop()`便控制着`threadLoop()`的循环，这是在`_threadLoop()`方法中，有一个do while循环，每次执行完`threadLoop()`之后会记录`threadLoop()`的返回值，如果返回值不是 false ，那么便会一直循环执行`threadLoop()`。

&emsp;&emsp; InputDispatcher 对象的初始化
