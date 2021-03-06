---
title: Input系统之InputDisptcher线程
date: 2018-03-30 13:17:43
tags:
	- Android
categories:
	- 笔记
---

&emsp;&emsp; InputReader 利用 EventHub 获取数据后生成 EventEntry 事件，加入到 InputDispatcher 的 mInboundQueue 队列，再唤醒 InputDispatcher 线程。InputDispatcher，同样从 threadLoop 为起点开始。`threadLoop()`中执行完`dispatchOnce()`之后会返回 Bool 类型的值。线程 Thread 类中有一个虚函数 `threadLoop()`，对于 Thread 的派生类 InputDispatcherThread 就实现了`threadLoop()`方法。事件的读取和派送过程是一直循环的，这就需要`threadLoop()`不断循环的执行。在 Thread 的`run()`方法中会实现创建线程的过程，在 Thread 类的`run()`方法执行后，会调用底层库 libpthread 的方法`pthread_create()`创建线程，并执行回调方法`_threadLoop()`。`_threadLoop()`便控制着`threadLoop()`的循环，这是在`_threadLoop()`方法中，有一个do while循环，每次执行完`threadLoop()`之后会记录`threadLoop()`的返回值，如果返回值不是 false ，那么便会一直循环执行`threadLoop()`。

&emsp;&emsp; InputDispatcher 对象在初始化的过程中，需要创建自己的 Looper 对象，然后获取分发超时参数，超时参数来自于 IMS ，参数默认值 keyRepeatTimeout = 500 ，keyRepeatDelay = 50。事件的分发是通过不断循环地调用 InputDispatcher 的`dispatchOnce()`来分发事件。在`dispatchOnce()`方法中，

``` cpp
	dispatchOnce()
		dispatchOnceInnerLocked(...)
			mInboundQueue.dequeueAtHead()
			resetANRTimeoutsLocked()
			dispatchKeyLocked(...)
			dropInboundEventLocked(...)
			releasePendingEventLocked()
		runCommandsLockedInterruptible()
		mLooper->pollOnce(timeoutMillis)
```

&emsp;&emsp;在`dispathOnceInnerLocked(...)`方法中，首先判断是否需要冻结事件分发工作不再执行，如果事件分发正常进行，判断事件分发的事件点距离该事件加入 mInboundQueue 的时间是否超过 500ms，超过500ms，则认为 app 切换过期，接下来就需要判断在 mInboundQueue 中是否有事件需要处理，如果没有需要处理的事件，那么会直接 return 返回。如果存在需要处理的事件，那么需要从 mInboundQueue 中取出头部的事件`mInboundQueue.dequeueAtHead()`，接着调用`resetANRTimeoutsLocked()`重置 ANR 信息。获取到需要处理的事件 mPendingEvent 之后，判断待处理事件的类型，根据不同的类型会相应的执行分发事件的操作，比如对于按键事件的分发则是通过`dispatchKeyLocked(...)`来实现的，分发动作完成之后会进行任务完成之后 done 的操作，首先需要判断是否需要丢弃事件，对于需要丢弃的事件，那么需要调用`dropInboundEventLocked(...)`来处理，最后还需要调用`releasePendingEventLocked()`释放当前正在处理的事件 mPendingEvent。在 dispatchKeyLocked 的分发事件执行完之后，

* 不会执行 done 的情况:
	* 当前 Event 时间小于唤醒时间
	* 让 policy 有机会执行拦截操作
	* 调用 findFocusedWindowTargetsLocked 方法的返回结果是 INPUT_EVENT_INJECTION_PENDING, 即 targets 没有处于 Ready 状态
* 会执行 done 的情况:
	* 该事件需要丢弃，即 dropReason != DROP_REASON_NOT_DROPPED
	* findFocusedWindowTargetsLocked 的返回结果不是 INPUT_EVENT_INJECTION_PENDING(没有正在处理的事件)

&emsp;&emsp;在`dispatchKeyLocked()`方法中，会根据事件的 interceptKeyResult 的类型来进行不同的处理，如果 interceptKeyResult 的类型为`KeyEntry::INTERCEPT_KEY_RESULT_TRY_AGAIN_LATER`那么会进行唤醒时间的判断，如果当前时间小于唤醒时间，那么会进入等待状态，同时返回 false 。如果 interceptKetResult 的类型为`KeyEntry::INTERCEPT_KEY_RESULT_UNKNOWN`，那么就会让 policy 有机会执行拦截操作，同时也会返回 false 。如果需要丢弃该事件，需要执行清理操作，直接返回 true 。然后需要做的就是调用方法`findFocusedWindowTargetsLocked(...)`寻找焦点。如果寻找焦点失败，那么直接返回 false 。只有寻找焦点的结果 injectionResult 是成功的，那么才有机会真正的分发事件`dispatchEventLocked(...)`，因此可知，下列场景可能导致无法分发事件。

* 当前时间小于唤醒时间
* policy 提前拦截事件
* 需要 drop 事件的情况
* 寻找聚焦窗口失败

&emsp;&emsp;如果不出现上述的这些情况，那么会正常进入事件分发的过程，在事件分发完成之后，也会正常进入前面提到的 Done 的处理过程，
