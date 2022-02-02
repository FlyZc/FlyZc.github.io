---
title: Centos 7.6安装Mysql
date: 2022-01-25 21:27:28
tags:
	- Mysql
categories:
	- 数据库
---

### 安装mysql服务

* `wget -i -c http://dev.mysql.com/get/mysql57-community-release-el7-10.noarch.rpm`
* `yum -y install mysql57-community-release-el7-10.noarch.rpm`
* `yum -y install mysql-community-server`
* 如果安装过程中出现如下类似信息：

>Failing package is: mysql-community-libs-compat-5.7.37-1.el7.x86_64
GPG Keys are configured as: file:///etc/pki/rpm-gpg/RPM-GPG-KEY-mysql

* 更新GPG
  * `rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2022`

### 启动mysql服务

* `systemctl start  mysqld.service`
* 设置mysql开机自启
  * `systemctl enable mysqld`
* 查看mysql状态
  * `systemctl status mysqld.service`
* 查看mysql临时密码
  * `grep "password" /var/log/mysqld.log`
* 登陆mysql
  * `mysql -uroot -p`
* 修改mysql密码
  * `set global validate_password_policy=0;`
  * `set global validate_password_length=1;`
  * `alter user 'root'@'localhost' identified by '123456';`
* 配置用户权限及授权
  * `grant all on *.* to 'root'@'%' identified by '123456';`
  * `grant all on *.* to 'root'@'localhost' identified by '123456';`
  * `grant all on *.* to 'root'@'master' identified by '123456';`
  * `flush privileges;`
* 取消自动更新
  * `yum -y remove mysql57-community-release-el7-10.noarch`
