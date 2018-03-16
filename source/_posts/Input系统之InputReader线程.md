---
title: Input系统之InputReader线程
date: 2018-03-16 10:01:33
tags:
	- Android
categories:
	- 笔记
---

##### 获取事件

&emsp;&emsp; InputReader 线程的执行过程从 threadLoop 开始，在`threadLoop()`中，会调用`loopOnce()`方法，同时会返回 true 。返回值 true 代表会不断的循环调用`loopOnce()`方法。进入到 loopOnce() 方法中，需要通过`mEventHub->getEvents`从 EventHub 中获取事件，在 EventHub 类的 getEvents 方法中，会有如下的操作过程，

```cpp
	getEvents(...)
		scanDevicesLocked()
			scanDirLocked(DEVICE_PATH)
				openDeviceLocked(devname)
					addDeviceLocked(device)
```

&emsp;&emsp;那么从进入到`getEvents(...)`方法体中开始，如果需要扫描设备，那么则先会通过调用`scanDevicesLocked()`来扫描 DEVICE_PATH 为`/dev/input`的所有设备，在`scanDevicesLocked()`方法体内会进一步调用`scanDirLocked(DEVICE_PATH)`方法，在`scanDirLocked(...)`中，根据传进来的 DEVICE_PATH 路径，接下来要做的就是读取`/dev/input/`目录下所有的设备节点。读取到设备节点之后通过调用`openDeviceLocked(...)`方法来打开相应的设备节点，在`openDeviceLocked(...)`方法中需要处理以下事件:

* 打开设备文件 `fd = open(devicePath, ...)`
* 获取设备名
* 获取设备物理地址
* 获取设备唯一ID uniqueId
* 将获取到的设备名、设备物理地址、唯一 ID 等这些 identifier 信息填充到刚开始打开的设备文件中
* 设置 fd 为非阻塞方式
* 获取设备Id(deviceId)，为设备对象分配内存空间`device = new Device(...)`
* 注册 epoll
* 调用 addDeviceLocked(device)，该方法的作用就是将 device 添加到 mDevices 队列，同时将 device 对象赋值给 mOpeningDevies。

##### 处理事件

&emsp;&emsp;前面便是 EventHub 已经完成了从设备节点获取事件并将事件封装成 RawEvent 的过程，获取事件之后会通过调用`InputReader::processEventsLocked(...)`方法来处理事件，也会根据事件的类型来进行一些设备增删等操作，

* DEVICE_ADDED: 设备增加

```cpp
	addDeviceLocked(...)
		createDeviceLocked(...)
		mDevices.add(deviceId, device)
```

&emsp;&emsp;在`createDeviceLocked(...)`方法的作用就是创建并获得一个 InputDevice 对象，那么在这个方法中首先就是创建了一个 InputDevice 对象，将 InputReader 的 mContext 赋值给 InputDevice 对象所对应的变量。然后需要根据设备类型来创建并添加相应的 InputMapper ，同时设置 mContext 。 input 设备类型有常见的以下几种： 

> 键盘类设备：KeyboardInputMapper		
> 触摸屏设备：MultiTouchInputMapper 或 SingleTouchInputMapper		
> 鼠标类设备：CursorInputMapper

* DEVICE_REMOVED: 设备移除
* FINISHED_DEVICE_SCAN: 设备扫描完成

&emsp;&emsp;除了设备的增删这些事件的操作，事件的处理是通过`processEventsForDeviceLocked(...)`方法来实现，

```cpp
	processEventsForDeviceLocked(...)
		device->process(...)
			mapper->process(rawEvent)
```

&emsp;&emsp;在`processEventsForDeviceLocked(...)`方法中，需要先获得 InputDevice 对象 device ，然后通过调用`device->process(...)`来进一步处理。最终也是根据不同的 InputMapper 种类来处理不同的按键事件。比如对于键盘类设备，调用的是 KeyboardInputMapper 类中的`process()`方法。

```cpp
	mapper->processs(...)
		getEventHub()->mapKey(...)
			KeyCharacterMap->mapKey(...)
		InputMapper.processKey(...)
			 getListener()->notifyKey(...)
```

&emsp;&emsp;在`process()`方法中，首先就是需要获取 keyCode ，然后再是`processKey(...)`的过程。在这个过程中，判断是键盘是按下还是抬起，并获取相应的 keyCode 事件，根据获取到的 keyCode 等信息最终需要通知 key 事件，此处 KeyboardInputMapper 的 mContext 指向 InputReader，`getListener()`获取的便是 mQueuedListener 。 接下来调用该对象的 `notifyKey(...)`方法，在`notifyKey(...)`中，会将该 key 事件压入类型为 Vector<NotifyArgs*>栈顶，接下来要做的就是将事件发送给 InputDispatcher 线程。

##### 发送事件

&emsp;&emsp;执行完`processEventsLocked()`后，需要通过`mQueuedListener->flush()`来实现将事件发送给 InputDispatcher 线程。

```cpp
	flush()
		args->notify(mInnerListener)
			mInnerListener->notifyKey(this)  // this是指NotifyKeyArgs
				event.initialize(...)	//初始化 KeyEvent 对象
				mPolicy->interceptKeyBeforeQueueing(...)
				mPolicy->filterInputEvent(...)
				new KeyEntry(...)	//创建 KeyEntry 对象
				enqueueInboundEventLocked(newEntry)
				mLooper->wake()	 //唤醒 InputDispatcher 线程
```

&emsp;&emsp;我们知道前面处理的是 KeyCode 相关的事件，因此此处的 args 是 NotifyKeyArgs 对象， mInnerListener 是 InputDispatcher 类型， mPolicy 是指 NativeInputManager 对象。调用`NativeInputManager.interceptKeyBeforeQueueing(...)`方法在加入队列前执行拦截动作时会调用 Java 层的`InputManagerService.interceptKeyBeforeQueueing()`方法。当 mInputFilterEnabled = true(该值默认为false,可通过 setInputFilterEnabled 设置),则调用`NativeInputManager.filterInputEvent(...)`过滤输入事件。

&emsp;&emsp;在`enqueueInboundEventLocked(newEntry)`方法中，EventEntry 类型为 TYPE_MOTION ，那么需要执行`findTouchedWindowAtLocked(...)`来查找可触摸窗口。最后执行完如果满足下列条件，那么则需要唤醒 InputDispatcher 线程。

* 执行`enqueueInboundEventLocked(...)`方法前， mInboundQueue 队列为空,执行完必然不再为空,则需要唤醒分发线程
* 当事件类型为 key 事件，且发生一对按下和抬起操作,则需要唤醒
* 当事件类型为 motion 事件，且当前可触摸的窗口属于另一个应用，则需要唤醒

&emsp;&emsp; InputReader 的所做的事情就是从 EventHub 获取数据后生成 EventEntry 事件，加入到 InputDispatcher 的 mInboundQueue 队列，再唤醒 InputDispatcher 线程。
