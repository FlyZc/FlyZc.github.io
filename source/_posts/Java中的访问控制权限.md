---
title: Java中的访问控制权限
date: 2020-02-21 21:57:33
tags:
    - Java
categories:
    - 笔记
---

### 1.Java中的常见修饰符

| 可见/访问性 | 在同一类中 | 同一包中 | 不同包中  | 同一包子类中  | 不同包子类中  |
| --- | --- | --- | --- | --- | --- |
| public | yes | yes | yes | yes | yes |
| protected  | yes | yes | no | yes | yes |
| package  | yes | yes | no | yes | no |
| private | yes | no | no | no | no |

* 在 java 中有 public、protected、private 三种显示的修饰符用于控制可见性，package 不是显示的修饰符，它是隐含的，即如果在类、变量等前没加显示的可见性修饰符，那它就是 package级别的。如果在类的定义中没有指定 package，那么java会把它放在缺省包中，一般来说这个缺省的包就是当前目录。
* 在子类中的方法如果重载了父类的方法，那么该方法的可见级别应更底或者相同，如父类中的方法是 public，那么子类中方法必须是public。
* 在java中，一般来说，变量成员最好是 private，对它们的访问可以通过 public 的方法，在这些方法中可以做些控制以保证数据的一致性。这些方法名一般以 get 和 set 做为前缀。

### 2.包的管理

包名一般为小写，而类名的第一个字母一般为大写，这样在引用时，可以明显的分辨出包名和类名。如果在类的定义之前没有使用package定义包名，那么该类就属于缺省的包。

#### 2.1 Hello Package

首先通过一个简单的package的定义来学习package的使用：

```java
package testPackage;
public class Test {
    public static void main(String args[]) {
        mNode node = new mNode();
        node.print("hello");
    }
}
```

注意：
* 使用 package 关键字指明类所在的包
* package 语句必须在文件的最前面
* 编译时可使用`javac –d . Test.java`自动产生包需要目录
* 可以使用`java testPackage.Test`来执行编译后的代码

#### 2.2 包的几个作用

- 可以更好的组织类，包与文件夹类似，文件夹可以将不同的文件放在同一个文件夹中，而包也可以将不同的类文件放在同一包中
- 减少类名的冲突问题，这也与文件夹类似，同一文件夹中的文件不能重名，不同文件中的文件可以重名，同一包中的类名不能重复，不同包中的类名可以重复
- 对包中的类起了一定的保护作用，详见java的访问控制

#### 2.3 import的使用

- 直接引用指定的类，如`import java.util.Vector`
- 引用一个包中的多个类，如`import java.awt.*`。更确切的说，它并不是引用`java.awt`中的所有类，而只引用定义为 public 的类，并且只引用被代码引用的类，所以这种引用方法并不会降低程序的性能
- \*号代替类名，在不能代替包名，如`import java.awt.*`，只引用`java.awt`下的类，而不引用`java.awt`下的包
- `import java.awt.F*`，这种使用方法是错误的
- import 语句在所有类定义之前，在 package 定义之后
- import只告诉编译器及解释器哪里可以找到类、变量、方法的定义，而并没有将这些定义引入代码中

#### 2.4 包中类的使用
有以下几种机制可以使用包中的类：

- 如果要使用的类是属于java.lang包的，那么可以直接使用类名来引用指定的类，而不需要加上包名，因为包java.lang不用显示使用import，它是缺省引入的；
- 如果要使用的类在其它包（java.lang除外）中，那么可以通过包名加上类名来引用该类，如`java.awt.Font`
- 对于经常要使用的类（该类在其它包中），那么最好使用import引用指定的包，如`java.awt.*`
- 如果import引入的不同的包中包含有相同的类名，那么这些类的使用必须加上包名
- 接口也可以属于某个包，也可以使用import引入其它包中的类和接口
