---
title: Broadcast广播机制
date: 2018-02-09 10:23:33
tags: 
    - Android
    - 四大组件
categories: 
    - 笔记
---

##### 介绍

* 广播发送
    * 普通广播：通过Context.sendBroadcast()发送，可并行处理
    * 有序广播：通过Context.sendOrderedBroadcast()发送，串行处理
    * Sticky广播：通过Context.sendStickyBroadcast()发送，用此函数发送的广播会一直滞留，当有匹配此广播的广播接 收器被注册后，该广播接收器就会收到此条信息。
* 广播接收(BroadcastReceiver)
    * 静态广播接收者：通过AndroidManifest.xml的标签来注册的BroadcastReceiver
    * 动态广播接收者：通过AMS.registerReceiver()方式注册的BroadcastReceiver，不需要的时候可以通过 unregisterReceiver()取消注册。
* BroadcastRecord  
&emsp;&emsp;广播在系统中以BroadcastRecord对象来记录, BroadcastRecord的数据结构如下：
```java
    final class BroadcastRecord extends Binder {
    final ProcessRecord callerApp; //广播发送者所在进程
    final String callerPackage; //广播发送者所在包名
    final List receivers;   // 包括动态注册的BroadcastFilter和静态注册的ResolveInfo

    final int callingPid;   // 广播发送者pid
    int nextReceiver;  // 下一个被执行的接收者
    IBinder receiver; // 当前正在处理的接收者
    int anrCount;   //广播ANR次数

    long enqueueClockTime;  //入队列时间
    long dispatchTime;      //分发时间
    long dispatchClockTime; //分发时间
    long receiverTime;      //接收时间(首次等于dispatchClockTime)
    long finishTime;        //广播完成时间
}
```
&emsp;&emsp;其中 enqueueClockTime 伴随着scheduleBroadcastsLocked，dispatchClockTime伴随着deliverToRegisteredReceiverLocked，finishTime位于addBroadcastToHistoryLocked方法内

##### 注册广播
&emsp;&emsp;注册广播通常是在Activity/Service中通过调用`registerReceiver()`的方式实现。而Activity或Service都间 接继承于Context抽象类，真正的实现是交给ContextImpl类。     

&emsp;&emsp;首先通过调用`CI.regitsterReceiver()`方法来启动注册广播的流程，registerReceiver()有两个重载的方法:
```java
    public Intent registerReceiver(BroadcastReceiver receiver, IntentFilter filter) {
        return registerReceiver(receiver, filter, null, null);
    }

    public Intent registerReceiver(BroadcastReceiver receiver, IntentFilter filter, String broadcastPermission, Handler scheduler) {
        return registerReceiverInternal(receiver, getUserId(),
                filter, broadcastPermission, scheduler, getOuterContext());
    }
```
&emsp;&emsp;其中`broadcastPermission`拥有广播的权限控制，scheduler用于指定接收到广播时onRecive执行线程，当`scheduler=null`则默认代表在主线程中执行，这也是最常见的用法。

&emsp;&emsp;在`registerReceiver`方法中，通过调用`CI.registerReceiverInternal()`方法，同时返回调用该方法后得到 的值。在`CI.registerReceiverInternal()`方法体中，首先会将主线程Handler赋给 scheduler，接着获取`IIntentReceiver`对象：
```java
    IIntentReceiver rd = mPackageInfo.getReceiverDispatcher(receiver, context, scheduler, mMainThread.getInstrumentation(), true);
```
&emsp;&emsp;在`LoadedApk.getReceiverDispatcher()`方法中，会试图获取到 `LoadedApk.ReceiverDispatcher`对象 rd 。如果广播发布者 rd 为空，那么会重新创建一个`ReceiverDispatcher`，`ReceiverDispatcher`对象中有一个内部类`InnerReceiver`，该内部类继承于`IIntentReceiver.Stub`，这是一个Binder服务端，广播发布者通过`rd.getIIntentReceiver()`可以获取到该 Binder服务端对象`InnerReceiver`用于Binder通信。得到`ReceiverDispatcher`对象 rd 后通过`rd.getIIntentReceiver()`来获得 IIntentReceiver 对象，同时将该对象返回。

&emsp;&emsp;前面部分已经得到一个`IIntentReceiver`对象 rd 了，接着在`registerReceiverInternal`方法中继续调用`ActivityManagerNative.getDefault().registerReceiver()`方法，`ActivityManagerNative.getDefault()`返回的是 `ActivityManagerProxy`对象，方法中参数`mMainThread.getApplicationThread()`返回的是ApplicationThread，这是Binder 的Bn端，用于system_server进程与该进程的通信。

&emsp;&emsp;接下来在`AMP.registerReceiver()`方法中，通过`mRemote.transact()`方法，AMP通过Binder驱动将传递来的信息发送给 system_server 进程中的 AMS 对象，接下来进入到`AMS.registerReceiver()`的执行过程中。

&emsp;&emsp;在`AMS.registerReceiver()`方法体中，首先会通过`getRecordForAppLocked(caller)`方法获得调用者的进程信息。并将获得的 ProcessRecord 对象赋值给 callerApp 。接来下，需要获得 IntentFilter 中的的 actions ，这就是所需 要监听的广播 action。
```java
    Iterator<String> actions = filter.actionsIterator();
```

&emsp;&emsp;接着判断注册的是不是sticky广播，首先需要根据用户id来获取所有的sticky intent，再根据action来获取符合该action的intent，同时将找到的intent加入到stickyIntents队列中。
```java
    int[] userIds = { UserHandle.USER_ALL, UserHandle.getUserId(callingUid) };
    while (actions.hasNext()) {
        String action = actions.next();
        for (int id : userIds) {
            //从mStickyBroadcasts中查看用户的sticky Intent
            ArrayMap<String, ArrayList<Intent>> stickies = mStickyBroadcasts.get(id);
            if (stickies != null) {
                ArrayList<Intent> intents = stickies.get(action);
                if (intents != null) {
                    if (stickyIntents == null) {
                        stickyIntents = new ArrayList<Intent>();
                    }
                    //将sticky Intent加入到队列
                    stickyIntents.addAll(intents);
                }
            }
        }
    }
```

&emsp;&emsp;继续往下走，还要继续通过`IntentFilter.matcher()`方法来继续匹配发起的Intent数据是否匹配成功。
```java
    ArrayList<Intent> allSticky = null;
    if (stickyIntents != null) {
        final ContentResolver resolver = mContext.getContentResolver();
        for (int i = 0, N = stickyIntents.size(); i < N; i++) {
            Intent intent = stickyIntents.get(i);
            //查询匹配的sticky广播
            if (filter.match(resolver, intent, true, TAG) >= 0) {
                if (allSticky == null) {
                    allSticky = new ArrayList<Intent>();
                }
                //匹配成功，则将给intent添加到allSticky队列
                allSticky.add(intent);
            }
        }
    }
```

&emsp;&emsp;判断完是不是 sticky 广播之后，继续往下走，当广播 receiver 没有注册过，则创建广播接收者队列`ReceiverList`，该对象继承于`ArrayList`，并将创建的`ReceiverList`添加到已注册广播队列`AMS.mRegisteredReceivers`中。`mRegisteredReceivers`记录着所有已注册的广播，以`receiver IBinder`为 key, `ReceiverList`为 value 的 HashMap。 接者创建`BroadcastFilter`对象，并添加到`AMS.mReceiverResolver`队列中，以及刚才创建的`ReceiverList`中。

&emsp;&emsp;对于所有通过刚才操作匹配的 sticky 广播，接下来需要进行入队操作，根据这些sticky广播的 intent 来返回 前台或者后台广播队列。创建好`BroadcastRecord`之后，便可以把该创建好的`BroadcastRecord`添加到并行广播队列中。在 BroadcastQueue中有两个广播队列mParallelBroadcasts,mOrderedBroadcasts，数据类型都为ArrayList：

  * mParallelBroadcasts:并行广播队列，可以立刻执行，而无需等待另一个广播运行完成，该队列只允许动态已注册的广播，从而避免发生同时拉起大量进程来执行广播，前台的和后台的广播分别位于独立的队列。
  * mOrderedBroadcasts：有序广播队列，同一时间只允许执行一个广播，该队列顶部的广播便是活动广播，其他广播必须等待该广播结束才能运行，也是独立区别前台的和后台的广播。

&emsp;&emsp;`broadcastQueueForIntent(Intent intent)`通过判断`intent.getFlags()`是否包含 FLAG_RECEIVER_FOREGROUND 来决定是前台或后台广播，进而返回相应的广播队列 mFgBroadcastQueue 或者 mBgBroadcastQueue。

* 当 Intent 的 flags 包含 FLAG_RECEIVER_FOREGROUND，则返回 mFgBroadcastQueue；
* 当 Intent 的 flags 不包含 FLAG_RECEIVER_FOREGROUND，则返回 mBgBroadcastQueue；

##### 发送广播
&emsp;&emsp;发送广播是在Activity和Service中通过调用`sendBroadcast()`，因此实际上也是通过ContextImpl类来实现的。在`CI.sendBroadcast(Intent intent)`方法中，调用了`AMP.broadcastIntent()`，在`AMP.broadcastIntent()`中，通过`mRemote.transact()`方法，AMP通过Binder驱动将传递来的信息发送给system_server进程中的AMS对象，接下来进入到`AMS.broadcastIntent()`的执行过程中。

&emsp;&emsp;在`AMS.broadcastIntent()`方法中，通过传进来的两个布尔参数serialized和sticky来共同决定是普通广播， 有序广播,还是Sticky广播。在方法体中首先验证广播intent是否有效，获取调用者进程记录对象，接着调用`AMS.broadcastIntentLocked`。

&emsp;&emsp;在`AMS.broadcastIntentLocked`中首先需要设置广播 flag ,添加`flag=FLAG_EXCLUDE_STOPPED_PACKAGES`，保证已停止app不会收到该广播。当系统还没有启动完成，则不允许启动新进程，即只有动态注册 receiver 才能接受广播。当非USER_ALL广播且当前用户并没有处于Running的情况下，除非是系统升级广播或者关机广播，否则直接返回。

&emsp;&emsp;设置完flag之后进行广播权限验证，对于callingAppId为SYSTEM_UID，PHONE_UID，SHELL_UID，BLUETOOTH_UID，NFC_UID之一或者callingUid == 0时都畅通无阻。否则当调用者进程为空或者非persistent进程的情况下：

* 当发送的是受保护广播mProtectedBroadcasts(只允许系统使用)，则抛出异常；
* 当action为ACTION_APPWIDGET_CONFIGURE时，虽然不希望该应用发送这种广播，处于兼容性考虑，限制该广播只允许发送 给自己，否则抛出异常。

&emsp;&emsp;接着就是处理系统相关广播和增加sticky广播，将sticky广播增加到list，并放入mStickyBroadcasts里面。接下来查询receivers和registeredReceivers，当广播的intent没有设置FLAG_RECEIVER_REGISTERED_ONLY，则允许静态广播接收者来处理该广播，receivers记录着匹配当前intent的所有静态注册广播接收者。registeredReceivers记录着匹配当前的所有动态注册的广播接收者。

&emsp;&emsp;接着处理并行广播，处理并行广播主要是针对动态已注册的广播者，因此首先会获取到 registeredReceivers 中广播的数目。根据动态已注册的广播接受者的信息创建BroadcastRecord，将该BroadcastRecord加入到并行广播队列，在广播队列中有一个ArrayList类型的成员变量 mParallelBroadcasts 来维护所有的并行广播，然后接着调用 BroadcastQueue 的`scheduleBroadcastsLocked`方法来完成的不同广播的处理。

&emsp;&emsp;处理完并行广播之后，将 registerReceivers 合并到 receivers ，合并的过程中会比较优先级。合并完之后再 统一按串行方式处理，处理串行广播的过程中，也是先创建一个 BroadcastRecord 对象，然后将该 BroadcastRecord 对象加入到 有序广播队列中，在广播队列中有一个ArrayList类型的成员变量 mOrderedBroadcasts 来维护所有的有序广播同样的接着调 用 BroadcastQueue 的`scheduleBroadcastsLocked`方法来完成的不同广播的处理。

##### 处理广播

&emsp;&emsp;广播的处理是通过执行`scheduleBroadcastsLocked`方法来进行处理的。在该方法中，首先根据`mBroadcastsScheduled`来判断此时是否正在处理`BROADCAST_INTENT_MSG`消息，如果是，那么直接返回。否则，则通过 sendMessage 的方式来发送`BROADCAST_INTENT_MSG`消息，同时修改`mBroadcastsScheduled`的值为 true。在 BroadcastQueue 对象创建时，就会绑定一个 Looper 对象，接下来交由 mHandler 的`handleMessage`来处理。在`handleMessage`方法中，调用了`processNextBroadcast`方法。

&emsp;&emsp;首先处理并行广播，通过while循环, 一次性分发完所有的并发广播后,分发完成后则添加到历史广播队列。 分 发广播给已注册的 receiver 是通过调用`deliverToRegisteredReceiverLocked()`来实现的。下一步处理串行广播，首先会 获取所有该广播的接受者。同时如果广播处理时间超时，那么会强制结束这条广播。正常情况，继续往下通过调用`performReceiveLocked()`方法处理广播消息，处理完之后会取消`BROADCAST_TIMEOUT_MSG`消息。接着获取下条有序广播，在 这个过程中，首先设置广播超时时间，然后获取下一个广播接收者。如果该广播接收者是动态注册的，那么直接调用`deliverToRegisteredReceiverLocked()`方法来处理广播就好，对于静态注册的广播，会进行各种权限检测，权限不满足时会 设置`skip = true`，接着在后面会执行
```java
    if (skip) {
        r.receiver = null;
        r.curFilter = null;
        r.state = BroadcastRecord.IDLE;
        scheduleBroadcastsLocked();
        return;
    }
```

&emsp;&emsp;接着处理下条有序广播，如果广播接受者所在进程已经运行，则调用方法`processCurBroadcastLocked(r, app)`直接处理，如果 receiver 所对应的进程尚未启动，则调用`startProcessLocked()`创建该进程，如果创建失败，那么结束该 receiver，同时重新调用`scheduleBroadcastsLocked()`，如果线程创建成功，则将重新将这个 BroadcastRecord 对象加入 到 mPendingBroadcast 中，以便下次处理有序广播时继续处理该对象。

&emsp;&emsp;在`deliverToRegisteredReceiverLocked`方法中，首先检查发送者是否有BroadcastFilter所需权限，以及接收者是否有发送者所需的权限等等，当权限都满足时，接着执行`performReceiveLocked()`方法。在这个方法里，通过binder 机制，通过`ATP.scheduleRegisteredReceiver()`向receiver 发送intent。ATP位于 system_server 进程，是 Binder Bp 端通过 Binder 驱动向 Binder Bn 端发送消息, ATP所对应的Bn 端位于发送广播调用端所在进程的 ApplicationThread， 即 进入`AT.scheduleRegisteredReceiver`，在该方法里继续调用`InnerReceiver.performReceive()`方法，在`performReceive()`方法里会调用`ReceiverDispatcher.performReceive()`，在`ReceiverDispatcher.performReceive()`方法里，首先会构造 参数 args。再通过 post() 的方式把消息放入 MessageQueue，再调用 Args 的 run() 方法。

```java
    Args args = new Args(intent, resultCode, data, extras, ordered, sticky, sendingUser);
    //通过handler消息机制发送args.
    mActivityThread.post(args)
```
&emsp;&emsp;在 run() 方法中，便进入了主线程，最终调用 BroadcastReceiver 具体实现类的 onReceiver() 方法。最后会 执行`PengdingResult.finish()`方法。在 finish() 方法中，对于

* 静态注册的广播接收者:
    * 当 QueuedWork 工作未完成, 即 SharedPreferences 写入磁盘的操作没有完成, 则等待完成再执行 sendFinished 方法
    * 当 QueuedWork 工作已完成, 则直接调用 sendFinished 方法
* 动态注册的广播接收者:
    * 当发送的是串行广播, 则直接调用 sendFinished 方法

&emsp;&emsp;接着便是`sendFinished()`方法。在`sendFinished()`方法中，调用了`AMP.finishReceiver()`方法，最终通过 binder 的通信方式，进入`AMS.finishReceiver()`方法中，最终调用`BroadcastQueue.finishReceiverLocked()`方法以及调 
用`processNextBroadcast`继续处理下一条广播。



