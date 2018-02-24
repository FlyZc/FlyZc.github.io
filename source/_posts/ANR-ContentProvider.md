---
title: ANR-ContentProvider
date: 2018-02-24 14:09:58
tags:
    - Android
    - 四大组件
categories:
    - 笔记
---

&emsp;&emsp; 当 ActivityManager 线程中的 AMS.MainHandler 收到 CONTENT_PROVIDER_PUBLISH_TIMEOUT_MSG 消息时会触发 ContentProvider Timeout 事件。ContentProvider 超时与 Provider 进程启动过程相关， CONTENT_PROVIDER_PUBLISH_TIMEOUT = 10s。

#### 埋炸弹
&emsp;&emsp;在 Provider 启动的过程中，埋炸弹会发生在进程创建的阶段，进程创建后会调用`AMS.attachApplicationLocked()`进入 system_server 进程。在`AMS.attachApplicationLocked()`方法中，app 进程存在正在启动中的 provider ,则超时10s后发送 CONTENT_PROVIDER_PUBLISH_TIMEOUT_MSG 消息。
```java
    if (providers != null && checkAppInLaunchingProvidersLocked(app)) {
        Message msg = mHandler.obtainMessage(CONTENT_PROVIDER_PUBLISH_TIMEOUT_MSG);
        msg.obj = app;
        mHandler.sendMessageDelayed(msg, CONTENT_PROVIDER_PUBLISH_TIMEOUT);
    }
```

#### 拆炸弹
&emsp;&emsp;当 provider 通过`AMS.publishContentProviders(...)`成功 publish 之后,便会通过`mHandler.removeMessages(...)`拆除该炸弹。

#### 引爆炸弹
&emsp;&emsp;在前面埋炸弹的过程，会通过`mHandler.sendMessageDelayed(msg, CONTENT_PROVIDER_PUBLISH_TIMEOUT)`来发送一个超时消息，那么在倒计时结束后便会向 system_server 进程中名为 ActivityManager 的 handler 线程发送 CONTENT_PROVIDER_PUBLISH_TIMEOUT_MSG 消息。该线程通过`handleMessage(...)`的方式，来处理超时消息。
```java
    handleMessage(...)
        AMS.processContentProviderPublishTimedOutLocked(...)
            AMS.cleanupAppInLaunchingProvidersLocked(...)
                AMS.removeDyingProviderLocked(...)
            AMS.removeProcessLocked(...)
```

&emsp;&emsp;`removeDyingProviderLocked()`方法的作用是移除死亡的 provider，在处理的过程中跟 provider 的类型有关：

* 对于 stable 类型的 provider (即conn.stableCount > 0),则会杀掉所有跟该 provider 建立 stable 连接的非 persistent 进程
* 对于 unstable 类型的 provider (即conn.unstableCount > 0),并不会导致 client 进程被级联所杀

&emsp;&emsp;对于 Service, Broadcast 发生 ANR 之后,最终都会调用 AMS.appNotResponding 。对于 provider ,在其进程启动时 publish 过程可能会出现 ANR, 则会直接杀进程以及清理相应信息,而不会弹出 ANR 的对话框。
