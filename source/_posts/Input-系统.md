---
title: Input 系统
date: 2018-02-22 10:22:46
tags:
    - Android
categories:
	- 笔记
---

##### 介绍

&emsp;&emsp;当用户触摸屏幕或者按键操作，首次触发硬件驱动，驱动收到事件后，将该相应事件写入到输入设备节点，接着，输入系统取出原生态的事件，经过层层封装后成为 KeyEvent 或者 MotionEvent 。最后，交付给相应的目标窗口(Window)来消费该输入事件。可见，输入系统在整个过程起到承上启下的衔接作用。

&emsp;&emsp; Input 模块的作用如下:

* Native 层的 InputReader 负责从 EventHub 取出事件并处理，再交给 InputDispatcher
* Native 层的 InputDispatcher 接收来自 InputReader 的输入事件，并记录 WMS 的窗口信息，用于派发事件到合适的窗口
* Java 层的 InputManagerService 跟 WMS 交互，WMS 记录所有窗口信息，并同步更新到 IMS ，为 InputDispatcher 正确派发事件到 ViewRootImpl 提供保障
* Native 层的 InputReader 对象中含有一个类型为 QueueInputListener 的对象 mQueuedListener 。mQueuedListener 的内部类 mInnerListener 是和 InputDispatcher 通信的纽带。

##### 启动过程

&emsp;&emsp; IMS 服务是随着 system_server 进程的启动而启动的,所调用的方法的逻辑关系如下:

```java
	InputManagerService(初始化)
		nativeInit
			NativeInputManager
				EventHub
				InputManager
					InputDispatcher
						Looper
					InputReader
						QueuedInputListener
					initialize
						InputReaderThread
						InputDispatcherThread
	IMS.start(启动)
	    nativeStart
			InputManager.start
				InputReaderThread->run
				InputDispatcherThread->run
```

&emsp;&emsp; InputManagerService 的初始化过程是通过`new InputManagerService(context)`，在 new 的过程中，首先有一个初始化 native 对象的过程，在这个过程中，首先会获取 native 消息队列，最后还需要创建 Native 的 InputManager 对象。通过`new NativeInputManager(...)`创建 NativeInputManager 对象时，其实是根据上层 IMS 的 context 以及上层 IMS 对象来进行一些变量的赋值，同时在构造 NativeInputManager 对象时，还需要创建 EventHub 对象和 InputManager 对象。

&emsp;&emsp;在创建 EventHub 对象时，首先会创建 epoll 实例，并会初始化 INotify 来监听 /dev/input，并会将 INotify 添加到 epoll 实例。然后做的就是创建非阻塞模式的管道，并添加到 epoll 。

&emsp;&emsp;在 InputManager 类的构造函数中，会创建 InputDispatcher 对象和 InputReader 对象。

&emsp;&emsp;在 InputDispatcher 的构造函数中，会创建属于自己线程的 Looper 对象，接着获取分发超时参数，超时参数来自 IMS ，参数默认值 keyRepeatTimeout = 500， keyRepeatDelay = 50。

&emsp;&emsp;在 InputReader 的构造函数中，会创建输入监听对象`new QueuedInputListener(listener)`，这里的 listener 便是 InputDispatcher 类型。

&emsp;&emsp;到此处，便是创建好了 InputManager 对象，接着就是执行 initialize 的过程，初始化的主要工作就是创建两个(InputReaderThread 和 InputDispatcherThread)能访问 Java 代码的 native 线程。InputManagerService 对象初始化过程并完成，接下来便是调用其 start 方法。

&emsp;&emsp;在`IMS.start()`方法中，首先会通过`nativeStart(mPtr)`启动 native 对象，此处 ptr 记录的是 NativeInputManager 对象，获取到 NativeInputManager 对象 im 后，通过`im->getInputManager()->start()`来启动，在`InputManager.start()`方法中，主要做的就是启动 InputReaderThread 和 InputDispatcherThread 两个线程。启动好 native 对象之后，接着使用`registerPointerSpeedSettingObserver()`注册触摸点速度的观察者，使用`registerShowTouchesSettingObserver()`注册是否显示功能的观察者，然后再注册广播，通过接受广播来更新触摸点速度以及确定是否在屏幕上显示触摸点。
