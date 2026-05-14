---
title: DeepSeek TUI 设计美学来源路线图
created: 2026-05-02
author: DeepSeek
year: 2026
source: "local command: deepseek reply"
tags:
  - raw-source
  - tui
  - aesthetics
  - research-map
note-type: "[[raw-source]]"
---

# DeepSeek TUI 设计美学来源路线图

## 用途

这是 `deepseek` 生成的设计美学来源候选路线图，只作为线索，不作为已验证证据。

## 本阶段边界

只研究美学原则与设计系统 token：文本密度、层级、留白、色彩、分隔/边框、符号、动效节奏、品牌一致性。所有美学建议必须服从 no-color fallback、small viewport、keyboard-only 与 plain/log output。

## 候选维度

- 文本密度：行距、段落间距、信息量。
- 信息层级：标题、标签、正文、辅助信息的层级 token。
- 留白：cell 单位 spacing、padding、分组节奏。
- 色彩：语义色与 no-color fallback。
- 分隔与边框：grouping、container、分隔线与低噪声结构。
- 符号与图标：ASCII/Unicode fallback、状态符号。
- 动效节奏：spinner、progress、减少动态、文本 fallback。
- 品牌一致性：tone、token、主题边界。

## 待验证来源

- WCAG 2.2: 色彩不能作为唯一信息、对比度、焦点可见。
- W3C Design Tokens Community Group: token 格式与设计系统 token 化方式。
- Material Design 3: typography、layout、motion、color roles。
- Carbon Design System: color、motion、icons、spacing 等 token 与可访问性。
- Microsoft Fluent Design: motion/accessibility/color 方向。
- Textual/Rich docs: terminal-aware style、markup、theme、color 系统。
- Charmbracelet Lip Gloss docs: terminal style primitives、adaptive color、borders。

