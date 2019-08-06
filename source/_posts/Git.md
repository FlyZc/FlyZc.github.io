---
title: Git使用总结
date: 2018-03-11 18:23:39
tags:
	- Git
categories:
	- 笔记
---

### 创建仓库
* 进入一个目录    
    `cd dir`
    
* 为仓库新建一个空的目录  
    `mkdir myrepository`

* 进入该新的目录   
    `cd myrepository` 

* 初始化目录，使其成为一个空的仓库  
    `git init`

### 往仓库添加内容
* 使用`add`命令往仓库添加内容    
    `git add "file_name"`

* 提交内容  
    `git commit -m "notes"`   
    参数说明：   
    * `-m: "notes"`描述此次修改的说明，如果不加 `-m` 参数，那么会进去`vi`编辑模式，让你添加内容    
    * `vi`模式中, 
        * 命令 i 表示插入  
        * `shift + :`表示进入命令行，可以输入指令  
        * `wq`表示强制性写入文件并退出，即使文件没有被修改也强制写入，并更新文件的修改时间
        * `x`表示写入文件并退出，仅当文件被修改时才写入，并更新文件修改时间，否则不会更新文件修改时间 
    * 当 commit 的时候发现 message 信息写错时
        * 还未 push 的情况下，通过`git commit --amend -m "message"来修改注释信息
        * 已经 push ，但是远程没有其他人下载或者改动
            * `git commit --amend -m "message"`修改信息
            * `git push --force-with-lease origin master`推送到远程
        * 已经 push ，而且已经有其他人下载或改动
            * git fetch origin
            * git reset --hard origin/master
* 可以使用`git status`来查看当前的仓库状态，包括是否发生更改，但是还未提交。当我们知道有内容更改后可以继续用`git diff`命令来查看修改的东西

### 版本回退
* 使用命令`git reset --hard HEAD^`来回到上一个版本
    * `HEAD^`表示上一个版本
    * `HEAD^^`表示回退两个版本，以此类推
    * `HEAD~100`表示回退100个版本

* 使用`git reflog`来查看你的历史操作

* 只在工作区修改，使用`git checkout -- "file_name"`来撤销工作区的修改

* 已经 add 到暂存区了，使用`git reset HEAD "file_name"`来撤销暂存区的修改（它是将版本库中的文件恢复到暂存区中），然后再用`git checkout -- "file_name"`来撤销工作区的修改（它是将暂存区中的文件恢复到工作区中）

### 创建分支
* 创建分支可以用 `git checkout -b dev`，相当于两个语句：    
    * `git branch dev`: 创建分支  
    * `git checkout dev`: 切换到分支 

* `git branch` 列出所有分支，当前分支前面有个 *

* `git checkout -- "file_name"`用于恢复文件，从暂存区恢复文件到工作区
  
* `git checkout dev`用于切换分支

* `git merge dev`合并分支，这种方式是 fast forward 方式，也就是直接把 master 指向 dev 的当前提交，所以合并速度非常快

* `git merge --no-ff -m "master: merger dev with no-ff" dev`，这种方式是因为本次合并要创建一个新的 commit ，所以加上 -m 参数，把 commit 描述写进去，这种方式 master 指向自己的提交

* `git branch -d dev`用于删除分支

* `git log --graph`用于查看分支合并图

* 当前任务没完成时，如果需要完成其他任务，可以使用命令`git stash`先保存当前工作现场，完成其他任务后，切换到原来的分支，然后可以使用命令`git stash list`来查看保存有哪些工作现场，找到目的工作现场，然后使用`git stash pop`命令来恢复现场，同时也可以使用`git stash apply stash@{0}`来恢复`stash@{0}`的工作现场
    * `git stash apply`: 恢复工作现场后，stash 内容不删除，要使用`git stash drop`来删除
    * `git stash pop`恢复工作现场后，stash 内容直接删除了

### 远程仓库
* 进入你想要和远程仓库关联的本地仓库目录下，使用`git remote add origin "远程仓库地址"`，添加后 origin 就是远程仓库的地址

* 使用`git push -u origin master`，将当前分支 master 推送到远程仓库上，由于远程库是空的，我们第一次推送 master 分支时，加上了 -u 参数，git 不但会把本地的 master 分支内容推送的远程新的 master 分支，还会把本地的 master 分支和远程的 master 分支关联起来，在以后的推送或者拉取时就可以简化命令。以后可以直接使用命令`git push origin master`

* git 支持多种协议，包括https，但通过 ssh 支持的原生 git 协议速度最快

* 使用命令将`git clone "远程仓库地址"`克隆到本地
