---
title: Hive 1.2.2环境搭建
date: 2022-02-02 20:09:16
tags:
	- Hive
categories:
	- 大数据
---

### 安装包准备

* apache-hive-1.2.2-bin.tar.gz
* mysql-connector-java-5.1.49.tar.gz
* jline-2.12.jar

### 解压apache-hive-1.2.2-bin.tar.gz(master)

* `cd /usr/local/src`
* `tar -zxvf apache-hive-1.2.2-bin.tar.gz`

### 修改Hive配置信息(master)

* `cd apache-hive-1.2.2-bin/conf`
* `vim hive-site.xml`

```xml
<?xml version="1.0"?>
<?xml-stylesheet type="text/xsl" href="configuration.xsl"?>
<configuration>
        <property>
                <name>javax.jdo.option.ConnectionURL</name>
                <value>jdbc:mysql://master:3306/hive?createDatabaseIfNotExist=true&amp;useSSL=false</value>
        </property>
        <property>
                <name>javax.jdo.option.ConnectionDriverName</name>
                <value>com.mysql.jdbc.Driver</value>
        </property>
        <property>
                <name>javax.jdo.option.ConnectionUserName</name>
                <value>root</value>
        </property>
        <property>
                <name>javax.jdo.option.ConnectionPassword</name>
                <value>123456</value>
        </property>
        <property>
               <name>hive.metastore.warehouse.dir</name>                         
               <value>/user/hive/warehouse</value>
       </property>
       <property>
             <name>yarn.app.mapreduce.am.command-opts</name>
             <value>-Djava.net.preferIPv4Stack=true -Xmx500m</value>
       </property>
       <property>
             <name>mapreduce.map.java.opts</name>
             <value>-Djava.net.preferIPv4Stack=true -Xmx500m</value>
       </property>
       <property>
            <name>mapreduce.reduce.java.opts</name>
            <value>-Djava.net.preferIPv4Stack=true -Xmx500m</value>
       </property>
</configuration>
```

* `vim hive-env.sh`

```bash
# Set HADOOP_HOME to point to a specific hadoop install directory
export HADOOP_HOME=/usr/local/src/hadoop-2.7.7
# Hive Configuration Directory can be controlled by:
export HIVE_CONF_DIR=/usr/local/src/apache-hive-1.2.2-bin/conf
# Folder containing extra libraries required for hive compilation/execution can be controlled by:
export HIVE_AUX_JARS_PATH=/usr/local/src/apache-hive-1.2.2-bin/lib
```

### 添加环境变量(master,slave1,slave2)

* `vim ~/.bashrc`

```bash
export HIVE_HOME=/usr/local/src/apache-hive-1.2.2-bin
export PATH=$PATH:$HIVE_HOME/bin
```

* `source ~/.bashrc`

### [安装MySQL](https://zhoufeichi.com/2022/01/25/Centos-7-6安装Mysql/)

### 安装MySQL连接工具(master)

* 将mysql-connector-java-5.1.45-bin.jar放入/usr/local/src/apache-hive-1.2.2-bin/lib
* 将jline-2.12.jar放入/usr/local/src/hadoop-2.7.7/share/hadoop/yarn/lib(master，slave1,slave2均设置)

### slave节点配置

* scp -r /usr/local/src/apache-hive-1.2.2-bin root@slave1:/usr/local/src/apache-hive-1.2.2-bin
* scp -r /usr/local/src/apache-hive-1.2.2-bin root@slave2:/usr/local/src/apache-hive-1.2.2-bin

### 启动Hive
