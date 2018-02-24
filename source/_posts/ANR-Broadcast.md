---
title: ANR-Broadcast
date: 2018-02-24 10:23:33
tags:
    - Android
    - 四大组件
categories:
    - 笔记
---

&emsp;&emsp; 串行广播需要考虑超时的情况，接收者是串行处理的，前一个 receiver 处理慢，会影响后一个 receiver 。对于并行广播则是通过一个循环一次性向所有的receiver分发广播事件，所以不存在彼此影响的问题，则没有广播超时。
串行广播通常有两种超时情况：

* 某个广播总处理时间 > 2 * receiver 总个数 * mTimeoutPeriod
* 某个 receiver 的执行时间超过 mTimeoutPeriod

&emsp;&emsp; BroadcastQueue.BroadcastHandler 收到 BROADCAST_TIMEOUT_MSG 消息时会触发 ANR 事件。广播队列有两种：

* foreground 队列：对于前台广播，超时设置为 BROADCAST_FG_TIMEOUT = 10s
* background 队列：对于后台广播，超时设置为 BROADCAST_BG_TIMEOUT = 60s

#### 埋炸弹
&emsp;&emsp;processNextBroadcast 来处理广播时，首先处理并行广播,再处理当前有序广播,最后获取并处理下条有序广播。在这个过程中，在处理有序广播时，首先会获取该广播的所有接受者，然后就需要判断此时该广播的总时间是否超时，如果超时那么需要结束这条广播。如果没有超时，那么往下走就是进入处理广播消息的过程，处理完广播消息，系统需要获取下条有序广播，那么在获取下条有序广播的时候就有一个埋炸弹的过程，埋炸弹就是通过`setBroadcastTimeoutLocked(timeoutTime)`给该广播设置一个时间戳，以便后面来处理广播消息时判断是否已经超时。这需要在`setBroadcastTimeoutLocked(...)`方法中设置定时广播 BROADCAST_TIMEOUT_MSG，即当前往后推 mTimeoutPeriod 时间广播还没处理完毕，则进入广播超时流程。

#### 拆炸弹
&emsp;&emsp;正如前面说的在 processNextBroadcast 方法内，广播如果没有超时，那么会调用方法`performReceiveLocked(...)`来处理广播，执行完该方法之后，就会进行拆除炸弹的操作。拆除炸弹是通过`cancelBroadcastTimeoutLocked()`来移除广播超时消息 BROADCAST_TIMEOUT_MSG 。

#### 引爆炸弹
&emsp;&emsp; 引爆炸弹的过程发生在 `broadcastTimeoutLocked()`方法中，首先判断是否有下列几种情况：

* mOrderedBroadcasts 已处理完成，则不会发生 anr
* 正在执行 dexopt，则不会 anr
* 系统还没有进入 ready 状态(mProcessesReady=false)，则不会anr
* 如果当前正在执行的 receiver 没有超时，则重新设置广播超时，不会 anr

&emsp;&emsp;如果不是上面的几种情况，那么会通过`mHandler.post(new AppNotResponding(app, anrMessage))`发送 AppNotResponding 的消息，此时会进入 ANR 处理流程。
```java
    private final class AppNotResponding implements Runnable {
        ...
        public void run() {
            // 进入ANR处理流程
            mService.appNotResponding(mApp, null, null, false, mAnnotation);
        }
    }
```
