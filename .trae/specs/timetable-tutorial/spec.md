# 课表页面实现教程博客 Spec

## Why

用户希望基于 fuwari 项目的课表页面代码，撰写一篇详细的教程博客，解析如何实现一个完整的课程表页面。这篇博客将帮助读者理解 Astro + TypeScript 构建复杂数据可视化页面的完整流程。

## What Changes

- 在 `e:\yxksw\yxk-blog\yxk-blog\src\content\posts\timetable-guide.mdx` 创建教程博客
- 详细解析 fuwari 项目中的课表相关代码
- 使用博客组件丰富内容展示

## Impact

- 新增一篇技术教程博客
- 展示 Astro 框架处理复杂数据的能力
- 提供完整的课程表实现参考

## ADDED Requirements

### Requirement: 教程博客内容

The system SHALL provide a comprehensive tutorial blog explaining the timetable page implementation.

#### Scenario: 页面路由解析

- **WHEN** 介绍课表页面时
- **THEN** 详细解释 `timetable.astro` 和 `[week].astro` 的路由设计
- **AND** 说明动态路由参数的使用方法

#### Scenario: 数据类型定义

- **WHEN** 介绍数据结构时
- **THEN** 解析 `TimetableConfigSegment`, `TimetableNodeTime`, `TimetableMetaSegment` 等类型
- **AND** 解释 ParsedTimetableData 的数据组织方式

#### Scenario: 数据解析工具

- **WHEN** 介绍数据处理时
- **THEN** 详细说明 `timetable-parser.ts` 的 JSON 解析逻辑
- **AND** 解释 `timetable-normalizer.ts` 的数据转换和当前周计算

#### Scenario: 组件架构

- **WHEN** 介绍组件设计时
- **THEN** 解析 TimetablePageContent 的页面结构
- **AND** 说明 TimetableGrid 的网格布局实现
- **AND** 解释 TimetableDayList 的移动端适配
- **AND** 介绍 TimetableCourseCard 的课程卡片设计
- **AND** 解析 LiveTimetableStatus 的实时状态计算

#### Scenario: 博客组件使用

- **WHEN** 撰写博客内容时
- **THEN** 使用 Tab 组件展示代码对比
- **AND** 使用 Folding 组件折叠详细代码
- **AND** 使用 Alert 组件标注重要提示
- **AND** 使用 Timeline 组件展示实现步骤
- **AND** 使用 Code 组件展示代码片段

## Content Structure

### 1. 项目概述

- 课表页面的整体架构
- 技术栈介绍 (Astro + TypeScript)

### 2. 数据结构设计

- JSON 数据格式说明
- TypeScript 类型定义详解

### 3. 数据解析层

- timetable-parser.ts 解析逻辑
- timetable-normalizer.ts 数据转换
- 当前周计算算法

### 4. 页面路由

- timetable.astro 首页实现
- [week].astro 动态路由

### 5. 组件层

- TimetablePageContent 页面容器
- TimetableGrid 桌面端网格
- TimetableDayList 移动端列表
- TimetableCourseCard 课程卡片
- LiveTimetableStatus 实时状态

### 6. 样式与交互

- CSS Grid 布局
- 响应式设计
- 客户端脚本

### 7. 总结与扩展

- 实现要点回顾
- 可扩展功能建议
