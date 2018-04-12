---
title: Crash处理流程
date: 2018-04-11 14:23:39
tags:
	- Android
categories:
	- 笔记
---

&emsp;&emsp;我们通常使用`try...catch`语句来捕获异常，对于没有有效的`catch exception`，就会导致应用 crash ，当出现 exception 没有 catch 的情况，系统便会来进行捕获，并进入 crash 流程。在进程创建之初会设置未捕获异常的处理器，当系统抛出未捕获的异常时，最终都交给异常处理器。进程创建过程中，会调用`RuntimeInit.java`的`commonInit()`方法设置 KillApplicationHandler , 用于处理未捕获异常。

&emsp;&emsp;在`RuntimeInit`类中的`commonInit()`方法中，通过`Thread.setDefaultUncaughtExceptionHandler(new KillApplicationHandler())`将异常处理器 handler 对象赋给 Thread 成员变量,在 KillApplicationHandler 类中，复写了`uncaughtException(...)`方法，在`uncaughtException(...)`方法中，会根据进程类型，分别打印对应的 FATAL EXCEPTION 信息，接着会启动 crash 对话框`ActivityManager.getService.handleApplicationCrash(mApplicationObject, new ApplicationErrorReport.ParcelableCrashInfo(e))`，等待处理完成。AMP 经过 binder 调用最终交给 ActivityManagerService 中相应的方法去处理，故接下来调用的是`AMS.handleApplicationCrash()`。在 CrashInfo 对象中，会封装好 crash 信息文件名，类名，方法名，对应行号以及异常信息，同时会输出栈 trace 。

&emsp;&emsp;在 AMS 的`handleApplicationCrash(...)`中，首先需要获取进程 record 对象，根据获取到的对象来获取进程名，此时有几种情况：

* 当远程IBinder对象为空时，则进程名为system_server
* 当远程IBinder对象不为空，且ProcessRecord为空时，则进程名为unknown
* 当远程IBinder对象不为空，且ProcessRecord不为空时，则进程名为ProcessRecord对象中相应进程名

&emsp;&emsp;获取到进程名之后，会进入到方法`handleApplicationCrashInner(...)`方法的执行过程当中。在这个方法中，会将 Crash 信息写入到 EventLog 中，将错误信息添加到 DropBox 中，将错误信息添加到 DropBox 其实是将 crash 信息输出到目录 /data/system/dropbox 。例如 system_server 的 dropbox 文件名为 system_server_crash@xxx.txt (xxx代表的是时间戳)。接下来就需要执行`crashApplication(...)`方法。

&emsp;&emsp; AMS 中的`crashApplication(...)`方法中调用了`makeAppCrashingLocked(...)`来继续处理 crash 流程，还需要做的事情就是发送消息 SHOW_ERROR_MSG ，弹出提示 crash 的对话框，等待用户选择。进入到`makeAppCrashingLocked(...)`方法的执行过程中，需要做的事情就是先把 crash 信息封装到 crashingReport 对象中。

```java
	makeAppCrashingLocked(...)
		app.crashingReport = generateProcessError(...)
		startAppProblemLocked(app)
		app.stopFreezingAllLocked()
		return handleAppCrashLocked(...)
```

&emsp;&emsp;那么在`startAppProblemLocked(app)`方法中，

```java
	startAppProblemLocked(app)
		app.errorReportReceiver = ApplicationErrorReport.getErrorReportReceiver(...)
		skipCurrentReceiverLocked(app)
```

&emsp;&emsp;会获取当前用户下的 crash 应用的 error receiver，然后会忽略当前 app 的广播接收。在忽略当前 app 的广播接收过程中，其实是针对每个广播队列，都会执行对应队列的`skipCurrentReceiverLocked(app)`方法来结束 app 进程对应的广播的接收。

&emsp;&emsp;在`startAppProblemLocked(app)`执行完了之后，便会执行`stopFreezingAllLocked()`来执行停止屏幕冻结的操作。

```java
	ProcessRecord.stopFreezingAllLocked()
		activities.get(i).stopFreezingScreenLocked(force:true)    //ActivityRecord.stopFreezingScreenLocked
			service.mWindowManager.stopFreezingScreen(appToken, force)	//WMS.stopFreezingScreen
				WMS.stopFreezingDisplayLocked()
```

&emsp;&emsp;在`WMS.stopFreezingDisplayLocked()`方法中，做的事情包括:

* 处理屏幕旋转相关逻辑
* 移除冻屏的超时消息
* 屏幕旋转动画的相关操作
* 使能输入事件分发功能
* display冻结时，执行gc操作
* 更新当前的屏幕方向
* 向mH发送configuraion改变的消息

&emsp;&esmp;到此处`stopFreezingAllLocked()`方法执行结束，接下来就是需要执行`handleAppCrashLocked(...)`方法，在该方法中，主要的执行逻辑如下:

* 当同一进程在时间间隔小于1分钟时连续两次crash，则执行的情况下：
	* 对于非persistent进程：
		* mStackSupervisor.handleAppCrashLocked(app)
		* removeProcessLocked(app, false, false, “crash”)
		* mStackSupervisor.resumeTopActivitiesLocked()
	* 对于persistent进程，则只执行
		* mStackSupervisor.resumeTopActivitiesLocked()
* 否则执行
	* mStackSupervisor.finishTopRunningActivityLocked(app, reason)

&emsp;&emsp;在方法`ActivityStackSupervisor.handleAppCrashLocked(app)`中，

```java
	ASS.handleAppCrashLocked(app)
		ActivityStack.handleAppCrashLocked(app)
```

&emsp;&emsp;这个方法的目的就是用来结束当前 activity ，在方法体内，通过遍历 stack 中 task ，获取到 task 中的所有 activity ，遍历所有 activities ，找到位于该 ProcessRecord 的所有 ActivityRecord ，通过调用`finishCurrentActivityLocked(...)`方法来结束该 activity 。

&emsp;&emsp;下一步会执行`AMS.removeProcessLocked(...)`方法，在该方法中，首先会从 mProcessNames 中移除该进程，还需要通过`app.kill()`进行杀进程的操作，移除进程并清空该进程相关联的 activity/service 等组件。此处 mProcessNames 数据类型为 ProcessMap，这是以进程名为 key，记录着所有的ProcessRecord 信息。移除进程并清空该进程相关联的 activity/service 等组件是通过`AMS.handleAppDiedLocked()`来处理，主要包括清除应用中的 activity/service/receiver/ContentProvider 信息。

&emsp;&emsp;下一步就是执行`ASS.resumeTopActivitiesLocked()`，该方法执行完，就完成了 activity 的 resume 的过程。

```java
	ASS.resumeTopActivitiesLocked()
		AS.resumeTopActivityLocked()
			As.resumeTopActivityInnerLocked()
```

&emsp;&emsp;针对另一种情况，在执行`ASS.finishTopRunningActivityLocked(...)`方法的时候，

```java
	ASS.finishTopRunningActivityLocked(...)
		stack.finishTopRunningActivityLocked(app, reason)
			AS.finishActivityLocked(...)
```

&emsp;&emsp;在这个方法中，最终会回调到 activity 的 pause 方法。最后处理完`makeAppCrashingLocked(...)`方法，则会再发送消息 SHOW_ERROR_MSG ，弹出提示 crash 的对话框。处理 SHOW_ERROR_MSG 的消息则是 UiHandler 通过 handleMessage 来完成的。系统会弹出提示 crash 的对话框，并阻塞等待用户选择是“退出”或 “退出并报告”，当用户不做任何选择时 5min 超时后，默认选择“退出”，当手机休眠时也默认选择“退出”。到这里，最后在 uncaughtException 中在finnally语句块还有一个杀进程的动作，通过 finnally 语句块中执行`Process.killProcess(...)`来保证彻底杀掉 crash 进程。

&emsp;&emsp;最后还有一个 Binder 的死亡回调过程，在应用进程创建的过程中有一个`attachApplicationLocked()`方法的过程中便会创建死亡通知。当 binder 服务端挂了之后，便会通过 binder 的 DeathRecipient 来通知 AMS 进行相应的清理收尾工作。前面讲到 crash 的进程会被 kill 掉，那么当该进程被杀，则会回调到`binderDied()`方法。

```java
	AMS.binderDied()
		AMS.appDiedLocked()
			AMS.handleAppDiedLocked(...)
				AMS.cleanUpApplicationRecordLocked(...) 	//清理应用程序service, BroadcastReceiver, ContentProvider相关信息
				app.activities.clear() 	//清理 activity 相关信息
```

&emsp;&emsp;清理 ContentProvider 的过程，首先获取该进程已发表的 ContentProvider ，将 DyingProvider 清理掉，这包括 ContentProvider 的服务端和客户端都会被杀。还需要处理的就是正在启动并且有客户端正在等待的 ContentProvider 。最后就是取消已连接的 ContentProvider 的注册。清理 BroadcaseReceiver 主要就是取消注册的广播接收者。

&emsp;&emsp;当 crash 进程执行 kill 操作后，进程被杀。由于 crash 进程中拥有一个 Binder 服务端 ApplicationThread ，而应用进程在创建过程调用`attachApplicationLocked()`，从而 attach 到 system_server 进程，在 system_server 进程内有一个 ApplicationThreadProxy ，这是相对应的 Binder 客户端。当 Binder 服务端 ApplicationThread 所在进程(即 crash 进程)挂掉后，则 Binder 客户端能收到相应的死亡通知，从而进入 binderDied 流程。


