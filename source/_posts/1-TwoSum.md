---
title: 1.TwoSum
date: 2019-07-28 21:57:33
tags:
    - LeetCode
categories:
    - 算法
---

##### Description

ce

Given an array of integers, return indices of the two numbers such that they add up to a specific target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

Example:

Given nums = [2, 7, 11, 15], target = 9,
Because nums[0] + nums[1] = 2 + 7 = 9,
return [0, 1].

##### Code

```Java
    class Solution {
        public int[] twoSum(int[] nums, int target) {
            int[] index = {-1, -1};
            HashMap<Integer, Integer> map = new HashMap<>(nums.length);
            for (int i = 0; i < nums.length; i++) {
                int other = target - nums[i];
                if (map.containsKey(other) && map.get(other) != i) {
                    index[0] = i < map.get(other) ? i : map.get(other);
                    index[1] = i > map.get(other) ? i : map.get(other);
                    return  index;
                }
                map.put(nums[i], i);
            }
            return index;
        }
    }
```
