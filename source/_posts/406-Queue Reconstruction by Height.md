---
title: 406.Queue Reconstruction by Height
date: 2020-02-10 21:57:33
tags:
    - LeetCode
categories:
    - 算法
---

##### Description

Suppose you have a random list of people standing in a queue. Each person is described by a pair of integers (h, k), where h is the height of the person and k is the number of people in front of this person who have a height greater than or equal to h. Write an algorithm to reconstruct the queue.

Note:
The number of people is less than 1,100.

Example:
Input:
[[7,0], [4,4], [7,1], [5,0], [6,1], [5,2]]

Output:
[[5,0], [7,0], [5,2], [6,1], [4,4], [7,1]]

##### Code

```Java
class Solution {
    public int[][] reconstructQueue(int[][] people) {
    Arrays.sort(people, new Comparator<int[]>() {
        @Override
        public int compare(int[] a, int[] b) {
            if (a[0] != b[0]) {
                return b[0] - a[0];
            }
        return a[1] - b[1];
        }
    });

    List<int[]> result = new LinkedList<>();
    for(int[] p : people){
        result.add(p[1], p);
    }
    return result.toArray(new int[people.length][]);
}
```
