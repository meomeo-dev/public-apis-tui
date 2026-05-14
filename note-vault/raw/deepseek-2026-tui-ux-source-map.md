---
title: DeepSeek TUI UX/UI 来源路线图
created: 2026-05-02
author: DeepSeek
year: 2026
source: "local command: deepseek reply"
tags:
  - raw-source
  - tui
  - ux
  - research-map
note-type: "[[raw-source]]"
---

# DeepSeek TUI UX/UI 来源路线图

## 用途

这是 `deepseek` 生成的 UX/UI 来源候选路线图，只作为线索，不作为已验证证据。

## 本阶段边界

只研究 TUI/CLI 的交互结构与界面模式：信息架构、导航、命令发现、快捷键、焦点、表单、列表/表格、反馈、错误恢复与可访问性语义。暂不研究视觉美学、品牌、色彩风格、边框风格或动效审美。

## 候选维度

- 信息架构：命令分组、页面层级、全局/局部上下文。
- 导航：screen、tab、panel、返回路径、退出路径。
- 命令发现：help、command palette、快捷键提示、usage 示例。
- 快捷键：绑定、冲突、上下文优先级、可配置。
- 焦点管理：焦点顺序、可见焦点、modal trap、区域切换。
- 表单与输入：验证、提示、默认值、错误定位。
- 列表/表格：选择、排序、过滤、滚动、空状态。
- 反馈：长任务进度、状态、spinner、日志。
- 错误恢复：确认、撤销、危险操作保护、状态恢复。
- 可访问性语义：不依赖颜色/位置/动画传递唯一信息。

## 待验证来源

- Command Line Interface Guidelines: CLI UX 基线、帮助、错误、输出。
- IBM Carbon for IBM Products — Command line interfaces: 企业级 CLI 信息架构与交互规范。
- WAI-ARIA APG Keyboard Interface: 焦点、键盘可访问性、快捷键思想迁移。
- Textual docs: 现代 Python TUI 的 screens、input、bindings、widgets。
- Bubble Tea docs/examples: Elm-style TUI 状态更新与命令循环。
- Ratatui examples/docs: 列表、表格、表单与 frame/buffer 模式。
- Microsoft Console accessibility: 终端可访问性风险与宿主 API 限制。

