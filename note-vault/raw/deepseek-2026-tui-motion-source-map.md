---
title: DeepSeek TUI 动效来源路线图
created: 2026-05-02
author: DeepSeek
year: 2026
source: "local command: deepseek reply --search on"
tags:
  - raw-source
  - tui
  - motion
  - research-map
note-type: "[[raw-source]]"
links:
  - "[[command-tui-motion-is-lifecycle-feedback]]"
  - "[[raw/w3c-2023-animation-from-interactions]]"
  - "[[raw/w3c-2023-three-flashes]]"
  - "[[raw/carbon-2026-motion-overview]]"
  - "[[raw/carbon-2026-inline-loading]]"
  - "[[raw/rich-2026-console-status]]"
  - "[[raw/charmbracelet-2026-spinner]]"
---

# DeepSeek TUI 动效来源路线图

## 用途
这是 `deepseek` 生成的 TUI 状态动效来源候选路线图，只作为线索，不作为已验证证据。已验证证据见本卡连接的 raw 证据卡与 deep-research DAG。

## 本阶段边界
只研究 CLI command-mode readable TUI 中 UI components 的动效状态。它不设计 full-screen TUI 的动画系统，也不假设具体站点 / API 的页面行为。

## 候选维度
- transient states：starting、loading、waiting、running、retrying、stopping、importing、exporting。
- final states：success、warning、error、empty、partial、cancelled、timeout。
- 约束：motion 不能是唯一语义来源；必须支持 reduced motion；不能污染 `--format json`；CI、pipe、非 TTY 禁用动画。

## 待验证来源
- WCAG Animation from Interactions：交互触发动效应可禁用。
- WCAG Three Flashes：避免闪烁风险。
- Carbon Motion / Inline Loading：动效应有目的，loading 状态可映射到 active/success/error/inactive。
- Rich Console status / Progress：终端 status/spinner/progress 是临时反馈。
- Charmbracelet Bubbles spinner：spinner 是帧序列 + FPS，需要终端能力与降级约束。

## 连接
- [[command-tui-motion-is-lifecycle-feedback]] — 将候选来源转化为 command-mode 动效原则。

