---
title: Input系统之UI线程
date: 2018-03-20 14:05:36
tags:
	- Android
categories:
	- 笔记
---

&emsp;&emsp; InputReader 和 InputDispatcher 运行在 system_server 进程，用户点击的界面往往可能是某个 app 。而每个 app 运行在自己的进程，这就涉及到跨进程之间的通信，也就是 app 进行和 system 进程建立通信。

&emsp;&emsp; Activity 会对应一个应用窗口，每个应用窗口对应一个 ViewRootImpl 。在 Activity 启动时，会调用到`Activity.onCreate(...)`方法，在`onCreate(...)`方法中，会再调用`setContentView(...)`，这涉及到 AMS 和 WMS 的各种交互，再往下走最终会调用`WindowManagerGlobal.addView(...)`方法。在`addView(...)`方法中，

```java
	addView(...)
		ViewRootImpl root = new ViewRootImpl(...)
		root.setView(...)
```

&emsp;&emsp;在 创建 ViewRootImpl 的对象时，首先会通过`WindowManagerGlobal.getWindowSession()`获取 IWindowSession 的代理类，

```java
	getWindowSession()
		//获取 IMS 的代理类
		InputMethodManager imm = InputMethodManager.getInstance()
		//获取WMS的代理类
		IWindowManager windowManager = getWindowManagerService()
		//经过Binder调用，最终调用WMS
		sWindowSession = windowManager.openSession(..., imm.getClient(), imm.getInputContext())
		return sWindowSession
```

&emsp;&emsp;在这个过程中， Session 对象创建好了之后，会通过 Binder 将数据写回 app 进程，那么 app 进程便获得了 Session 的代理对象。接下类就是`setView(...)`的过程，

```java
	setView(...)
		mInputChannel = new InputChannel(); //创建InputChannel对象
		res = mWindowSession.addToDisplay(...)
		mInputEventReceiver = new WindowInputEventReceiver(...)
```

&emsp;&emsp;创建好的 mInputChannel 对象会作为参数传入`mWindowSession.addToDislplay(...)`方法中，这也是通过 Binder 的通信方式，最终调用的是`mService.addWindow(...)`方法，在`WMS.addWindow(...)`方法中，

```java
	WindowState win = new WindowState(...)
	//根据WindowState的HashCode以及title来生成InputChannel名称
	String name = win.makeInputChannelName()
	//创建一对InputChannel
	InputChannel[] inputChannels = InputChannel.openInputChannelPair(name)
	//将socket服务端保存到WindowState的mInputChannel
	win.setInputChannel(inputChannels[0])				        
	//socket客户端传递给outInputChannel
	inputChannels[1].transferTo(outInputChannel)
	//利用socket服务端作为参数
	mInputManager.registerInputChannel(win.mInputChannel, win.mInputWindowHandle)
	//设置当前聚焦窗口	
	mInputMonitor.updateInputWindowsLw(false /*force*/)
```

&emsp;&emsp;这里创建的 inputChannels 数组中，inputChannels[0] 对应的是服务端，而 inputChannels[1] 对应的是客户端，在这里将服务端保存在 WindowState 的 mInputChannel 中，客户端传送给 outInputChannel 对象，而这个 outInputChannel 正是作为参数传递过来的 App 进程中 ViewRootImpl 的 mInputChannel。

&emsp;&emsp;
