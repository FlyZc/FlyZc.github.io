---
title: VMware安装Hadoop环境
date: 2022-01-24 22:32:39
tags:
  - Hadoop
categories:
  - 大数据
---

### 配置Master节点环境

* 配置IP信息
 `vi /etc/sysconfig/network-scripts/ifcfg-ens33`

<div align=center><img src="https://blogpic-1301978692.cos.ap-chongqing.myqcloud.com/bolg/ifcfg.png" width = 500> </div>

* 虚拟机NAT设置

<div align=center><img src="https://blogpic-1301978692.cos.ap-chongqing.myqcloud.com/bolg/natcfg.png" width = 500></div>

* 虚拟机DHCP设置

 <div align = center><image src = "https://blogpic-1301978692.cos.ap-chongqing.myqcloud.com/bolg/dhcpcfg.png" width =500></div>

* 重启网络
 `systemctl restart network`

* 配置host信息
  
  ```vim
  vim /etc/hosts

  192.168.159.19 master
  192.168.159.20 slave1
  192.168.159.21 slave2
  ```

* 配置network
  
  ```vim
  vim /etc/sysconfig/network
  NETWORKING=yes
  HOSTNAME=master
  ```

* 配置hostname

  ```vim
  vim /etc/hostname
  master
  ```

* 关闭网络管理
  
  `systemctl stop NetworkManager`
  `systemctl disable NetworkManager`

* 关闭linux内核防火墙

  ```vim
  vim /etc/selinux/config
  SELINUX=disable
  ```

* 内核防火墙置空

  `setenfore 0`

* 关闭防火墙

  `systemctl stop firewalld`
  `systemctl disable firewalld`

* 配置hadoop和jdk环境

  ```vim
  vim ~/.bashrc

  export JAVA_HOME=/usr/local/src/jdk1.8.0_172
  export CLASSPATH=.:$CLASSPATH:$JAVA_HOME/lib
  export HADOOP_HOME=/usr/local/src/hadoop-2.7.7
  export M2_HOME=/opt/apache-maven-3.5.4
  export PATH=$PATH:$JAVA_HOME/bin:$HADOOP_HOME/bin:$HADOOP_HOME/sbin
  export HADOOP_OPTS="-Djava.library.path=${HADOOP_HOME}/lib/native"
  export PATH=$PATH:$M2_HOME/bin
  export FINDBUGS_HOME=/opt/findbugs-3.0.1
  export PATH=$PATH:$FINDBUGS_HOME/bin
  export HIVE_HOME=/usr/local/src/apache-hive-1.2.2-bin
  export PATH=$PATH:$HIVE_HOME/bin
  ```

* 覆盖hadoop目录etc/hadoop下列文件
  * core-site.xml
  * hdfs-site.xml
  * mapred-site.xml
  * slaves
  * yarn-site.xml

### 配置Slave节点环境

master配置完毕后，拷贝镜像文件分别配置slave1和slave2，并修改以下参数信息

* `vi /etc/sysconfig/network-scripts/ifcfg-ens33`
* `vim /etc/sysconfig/network`
* `vim /etc/hostname`
* `systemctl restart network`

### 配置三台设备互信

* `ssh-keygen -t rsa`
* `cat /root/.ssh/id_rsa.pub > /root/.ssh/authorized_keys`
* `ssh master cat /root/.ssh/authorized_keys >> /root/.ssh/authorized_keys`

### 磁盘格式化

* `hadoop namenode -format`

### 故障处理

如果集群出错，先停止集群进程，三台设备均删除相关文件后重新进行磁盘格式化

* `stop-all.sh`
* `rm -rf /dfs /logs /tmp`
* `hadoop namenode -format`
