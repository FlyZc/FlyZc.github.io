---
title: ContentProvider
date: 2018-02-12 11:04:41
tags:
    - Android
    - 四大组件
categories:
    - 笔记
---

##### 介绍
ContentProvider 是一个抽象类，当实现自己的 ContentProvider 类，只需继承于 ContentProvider ，并且实 现以下六个 abstract 方法即可：

* insert(Uri, ContentValues)：插入新数据；
* delete(Uri, String, String[])：删除已有数据；
* update(Uri, ContentValues, String, String[])：更新数据；
* query(Uri, String[], String, String[], String)：查询数据；
* onCreate()：执行初始化工作；
* getType(Uri)：获取数据MIME类型。

ContentProvider 的数据操作方法可以看出都依赖于 Uri ，例如`content://com.philo.articles/android/contentprovider`，其中：

* content:// ：作为前缀，这是 Uri 默认的固定开头格式
* com.philo.articles ：作为授权，唯一标识 provider
* /android/contentprovider ：作为路径，标明具体的数据位置

##### 查询 ContentProvider

&emsp;&emsp;其他进程或者 app 如果想要操作 ContentProvider ，那么首先需要获取其对应的 ContentResolver ，再利用
ContentResolver 类来完成对数据的增删改查操作。
```java
    ContentResolver cr = getContentResolver();  //获取ContentResolver
    Uri uri = Uri.parse("content://com.philo.articles/android/contentprovider");
    Cursor cursor = cr.query(uri, null, null, null, null);  //执行查询操作
    ...
    cursor.close(); //关闭
```

&emsp;&emsp;`getContentResolver()` 方法经过层层调用来到 ContextImpl 类，得到的返回值是在 ContextImpl 对象创建过程中就创建好的 ApplicationContentResolver 类型的对象。
&emsp;&emsp;而在 query() 方法中，首先调用`ContentResolver.acquireUnstableProvider()`方法，试图通过 uri 获取 unstableProvider 对象，`CR.acquireUnstableProvider()`方法是通过调用 `ACR.acquireUnstableProvider()`来实现的。
`ACR.acquireUnstableProvider()`方法会返回一个 IContentProvider 类型的对象，而在该方法中，最终会调用到`ActivityThread.acquireProvider()`方法。
```java
    CR.query()
        CR.acquireUnstableProvider()
            ACR.acquireUnstableProvider()
                AT.acquireProvider()
                    AT.acquireExistingProvider()
                    AMP.getContentProvider()
                    AMS.getContentProvider()
                        AMS.getContentProviderImpl()

```
&emsp;&emsp;在`AT.acquireProvider()`方法中，首先通过调用方法`AT.acquireExistingProvider()`尝试获取已存储的 provider ，当成功获取则直接返回，否则继续执行。在`AT.acquireExistingProvider()`中：

* 首先从 ActivityThread 的 mProviderMap 查询是否存在相对应的 provider，若不存在则直接返回
* 当 provider 记录存在,但其所在进程已经死亡，则调用`handleUnstableProviderDiedLocked()`清理 provider 信息, 并返回
* 当 provider 记录存在,且进程存活的情况下,则在 provider 引用计数不为空时则继续增加引用计数

&emsp;&emsp;如果`AT.acquireExistingProvider()`没有成功获取到 provider 对象，那么需要通过`AMP.getContentProvider()`来获取 provider ，当无法获取 auth 所对应的 provider 则直接返回，否则继续执行。在`AMP.getContentProvider()`中，AMP经过 binder IPC 通信传递给 AMS 来完成相应工作, 因此接着执行`AMS.getContentProvider()`方法。在`AMS.getContentProvider()`方法中又会继续调用`AMS.getContentProviderImpl()`方法。`AMS.getContentProviderImpl()`方法中首先会获得调用者的进程记录 ProcessRecord ，接着从 AMS 中查询相应的 ContentProviderRecord 对象 cpr ，接下来就是需要判断目标 provider 的情况：

* 目标 provider 已存在
    * 权限检查
    * 当允许运行在调用者进程且已发布，则直接返回
    * 增加引用计数
    * 更新进程 LRU 队列
    * 更新进程 adj
    * 当 provider 进程被杀时，则减少引用计数并调用 appDiedLocked ，且设置 ContentProvider 为没有发布的状态
* 目标 provider 不存在
    * 根据 authority，获取 ProviderInfo 对象；
    * 权限检查
    * 当 provider 不是运行在 system 进程，且系统未准备好，则抛出 IllegalArgumentException
    * 当拥有该 provider 的用户并没有运行，则直接返回
    * 根据 ComponentName，从 AMS.mProviderMap 中查询相应的 ContentProviderRecord
    * 当首次调用，则创建对象 ContentProviderRecord
    * 当允许运行在调用者进程且 ProcessRecord 不为空，则直接返回。该 ContentProvider 是否能运行在调用者所在 进程需要同时满足以下条件：
        * ContentProvider 在 AndroidManifest.xml 文件配置 multiprocess=true；或调用者进程与 ContentProvider 在同一个进程。
        * ContentProvider 进程跟调用者所在进程是同一个 uid。
    * 当 provider 并没有处于 mLaunchingProviders 队列，则启动它
        * 当 ProcessRecord 不为空，则加入到 pubProviders，并开始安装 provider;
        * 当 ProcessRecord 为空，则启动进程
    * 增加引用计数
* 循环等待 provider 发布

&emsp;&emsp;到此处，`AT.acquireProvider()`方法应该已成功获取了 Provider 对象, 接下来便是在调用端安装 Provider ，接着就要调用`AT.installProvider()`方法来安装 provider ,并增加该 provider 的引用计数。
```java
    AT.installProvider()
        AMP.removeContentProvider()
        AMS.removeContentProvider()
            AMS.decProviderCountLocked()
        AT.installProviderAuthoritiesLocked()
```

&emsp;&emsp;上述步骤如果获取到的 unstableProvider 为空，直接返回。获取到 unstableProvider 对象后，执行 query 操作。`ContentProviderProxy.query()`方法里通过调用`mRemote.transact()`方法发送给 Binder 服务端， Binder 服务端
通过`CPN.onTransact()`交由`Transport.query()`处理， Transport 类继承 ContentProvider 类。到这里真正调用了目标 
provider的`query()`方法。

&emsp;&emsp;在查询的过程中如果抛出 DeadObjectException 异常，那么表示 ContentProvider 所在进程死亡，接下来尝试 获取 stable 的 ContentProvider。

* 先调用`unstableProviderDied()`, 清理刚创建的 unstable 的 ContentProvider
* 调用`acquireProvider()`，尝试获取 stable 的 ContentProvider, 此时当 ContentProvider 进程死亡，则会杀掉该 ContentProvider 的客户端进程
* 然后执行 query 操作

&emsp;&emsp;采用 unstable 类型的 ContentProvider 的 app 不会因为远程 ContentProvider 进程的死亡而被杀，stable 则恰恰相反。对于 app 无法事先决定创建的 ContentProvider 是 stable，还是 unstable 类型的，也便无法得知自己的进 程是否会依赖于远程 ContentProvider 的生死。

##### Provider 进程
&emsp;&emsp;发布ContentProvider分两种情况：

* Provider进程尚未启动：system_server 进程调用 `startProcessLocked()`创建 provider 进程且 attach 到 system_server 后, 通过 binder 方式通知 provider 进程执行 `AT.bindApplication()`方法

&emsp;&emsp;执行`AT.bindApplication()`方法时，也是通过 handler 的通信方式，通过`sendMessage()`方法，主线程在
`handMessage()`方法时，会调用`AT.handleBindApplication()`方法。
```java
    AT.handleBindApplication()
        AT.installContentProvider()
            AT.installProvider()
                ContentProvider.getIContentProvider()
            AMP.publishContentProviders()
            AMS.publishContentProviders()
        mInstrumentation.callApplicationOnCreate()
```
&emsp;&emsp;在`AT.installProvider()`方法中主要是通过反射，创建目标 ContentProvider 对象,并通过调用`ContentProvider.getIContentProvider()`得到创建的 ContentProvider 对象，并调用该对象 onCreate 方法.随后便是 publish 的过程，一旦 publish 成功,则会移除 provider 发布超时的消息,并且调用 `notifyAll()`来唤醒所有等待的 Client 端进程。 Provider进程的工作便是完成，接下来便开始执行 installProvider过程。

* Provider 进程已启动但未发布： 发现 provider 进程已存在且 attach 到 system_server，但所对应的 provider 还没 有发布, 通过binder 方式通知 provider 进程执行 `AT.scheduleInstallProvider()`方法
```java
    AT.scheduleInstallProvider()
        sendMessage()
        AT.handleInstallProvider
            AT.installContentProvider()
                AT.installProvider()
                    ContentProvider.getIContentProvider()
                AMP.publishContentProviders()
                AMS.publishContentProviders()
            mInstrumentation.callApplicationOnCreate()
```