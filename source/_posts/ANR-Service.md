---
title: ANR-Service
date: 2018-02-13 11:13:35
tags: 
    - Android
    - 四大组件
categories: 
    - 笔记
---
Service Timeout有两类:     

* 对于前台服务，则超时为SERVICE_TIMEOUT = 20s       
* 对于后台服务，则超时为SERVICE_BACKGROUND_TIMET = 200s     

##### 埋炸弹             
&emsp;&emsp;与 Service 相关的 ANR，埋炸弹阶段出现在`realStartServiceLocked()`方法中。

```java
    realStartServiceLocked
        bumpServiceExecutingLocked
            scheduleServiceTimeoutLocked

```

&emsp;&emsp;在`realStartServiceLocked`方法中先是通过`bumpServiceExecutingLocked`发送一个delay消息(SERVICE_TIMEOUT_MSG)。而在`bumpServiceExecutingLocked`中是通过调用`scheduleServiceTimeoutLocked`来实现的。
在`scheduleServiceTimeoutLocked`方法中，如果超时后依旧没有 remove 掉该 SERVICE_TIME_OUT 消息，那么会进入到service timeout流程。此时炸弹已经埋下，如果不希望炸弹被引爆，那么就需要在炸弹爆炸之前拆除炸弹。

##### 拆炸弹
&emsp;&emsp;拆炸弹的过程发生在目标进程的主线程调用`handleCreateService`的过程中。
```java
    handleCreateService
        serviceDoneExecuting
            removeMessages
```
&emsp;&emsp;在`handleCreateService`方法的处理过程中，会创建目标服务对象，以及回调onCreate方法，最后会执行`ActivityManagerNative.getDefault().serviceDoneExecuting`，这个过程是经过多次调用最后回到system server进程来执行 serviceDoneExecuting 以达到移除服务启动超时消息的目的。 

##### 引爆炸弹
&emsp;&emsp;如果没有在指定时间之内拆掉炸弹，那么炸弹爆炸后会导致ANR。当计时结束之后，system server 进程中名为ActivityManager 的 Handler 线程会收到 SERVICE_TIMEOUT_MSG 的消息，ActivityManager 通过 handler 的通信方式，将该 MSG 发送给 MainHandler 线程，MainHandler线程从消息队列中获得该消息，通过handleMessage 方法来进入serviceTimeout过程，最终便是调用`appNotResponding(...)`方法。
```java
    handleMessage(...)
        AS.serviceTimeout(...)
            AMS.appNotResponding(...)
```

&emsp;&emsp;Service 运行在主线程里面，在 Service 里编写了非常耗时的代码会出现 ANR。可以在 Service 中再创建一个子线程，然后在这里去处理耗时逻辑，或者使用远程Service的方式。但是在使用远程Service的方式的时候，Service 和 Activity 不在同一个进程，这个时候，不能通过传统的方式来建立关联，需要使用 AIDL 来进行跨进程通信。远程服务是独立的进程，进程名格式为所在包名你指定的`android:process`字符串。


