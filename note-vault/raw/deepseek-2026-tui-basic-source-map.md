---
title: DeepSeek TUI 基本原理来源路线图
created: 2026-05-02
author: DeepSeek
year: 2026
source: "local command: deepseek reply"
tags:
  - raw-source
  - tui
  - research-map
note-type: "[[raw-source]]"
---

# DeepSeek TUI 基本原理来源路线图

## 用途

这是 `deepseek` 生成的来源候选路线图，只作为线索，不作为已验证证据。

## 本阶段边界

只研究 TUI 基本原理层：终端字符网格、控制序列、输入模型、能力协商、颜色能力、Unicode 宽度、屏幕缓冲与跨平台 VT 行为。暂不进入 UX/UI、组件模式、视觉美学或框架选型。

## 候选维度

- 字符网格：终端输出以字符单元和行列坐标表达。
- 控制序列：ECMA-48、VT100/DEC 与 xterm 扩展共同构成现实兼容层。
- 输入模型：键盘、修饰键、鼠标、粘贴等事件最终仍以字节流或转义序列表达。
- 能力协商：`$TERM` 与 terminfo 描述终端能力，不能硬编码“ANSI 全支持”。
- 颜色能力：8/16 色、88/256 色、真彩色需要分层降级。
- Unicode 宽度：固定网格里的字符宽度不是字节数，且 ambiguous width 依赖上下文。
- 屏幕缓冲：全屏 TUI 常使用备用屏幕与恢复序列。
- 可访问性限制：终端可访问性需要单独验证，不能默认等同 GUI 或 Web。

## 待验证来源

- ECMA-48: 控制函数与 CSI 语法。
- Xterm Control Sequences: 现实终端控制、颜色、鼠标、备用屏幕。
- ncurses terminfo: 终端能力数据库与能力查询。
- Linux man-pages termios / TIOCGWINSZ: 输入模式与窗口尺寸。
- Unicode UAX #11: East Asian Width 与固定宽度文本布局。
- Microsoft Console VT Sequences: Windows VT 兼容与差异。
- Ratatui docs: 现代 TUI 框架如何抽象 buffer/frame/backend。

