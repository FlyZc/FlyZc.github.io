---
title: Input系统ANR总结
date: 2018-03-30 15:46:44
tags:
	- Android
categories:
	- 笔记
---

&emsp;&emsp; InputReader 的工作主要是:

* 调用 EventHub 的`getEvents()`读取节点 /dev/input 的 input_event 结构体，转换成 RawEvent 结构体， RawEvent 根据不同 InputMapper 来转换相应的 EventEntry，比如按键事件，那么对应的是 KeyEntry ，触摸事件则对应的是 MotionEntry 。那么这个过程就是将 input_event 转换成 EventEntry 。

* 将事件添加到 mInboundQueue 队列尾部，加入该队列前首先会执行`IMS.interceptKeyBeforeQueueing(...)`方法，在这个方法里可以增加业务逻辑，然后会执行`IMS.filterInputEvent(...)`方法，这个方法用来处理可拦截事件，当该方法的返回值为 false 的时候，会直接拦截，这种情况下，该事件没有机会加入到 mInboundQueue 队列，不会再继续往下分发，如果事件没有被拦截到，那么该事件将会被加入到 mInboundQueue 队列尾部，事件加入到 mInboundQueue 队列之后，会通过`mLooper->wake`来唤醒 InputDispatcher 线程。

* 在InputReader 的工作过程中，还会调用`KeyboardInputMapper.processKey()`来记录按下 down 事件的时间点。

&emsp;&emsp; InputDispatcher 的工作主要是:

* 通过调用`dispatchOnceInnerLocked()`从 InputDispatcher 的 mInboundQueue 队列中取出事件 EventEntry 。该方法开始执行的时间点是后续操作 dispatchEntry 的分发事件。获取到 EventEntry 事件之后，会生成事件 DispatchEntry 并加入 connection 的 outbound 队列 。`startDispatchCycleLocked()`负责从 outboundQueue 队列中取出事件 DispatchEntry ，并放入 connection 的 waitQueue 队列中。

* 通过`runCommandsLockedInterruptible()`方法循环遍历的方式，依次处理 mCommandQueue 队列中的所有命令。而 mCommandQueue 队列中的命令是通过`postCommandLocked()`方式向该队列添加的，ANR 回调命令便是在这个时机执行。

* `handleTargetsNotReadyLocked()`方法会判断是否等待超过 5s 来决定是否调用`onANRLocked()`。
