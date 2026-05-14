---
title: 现代 TUI 动效由事件循环驱动但应 token 化
created: 2026-05-02
updated: 2026-05-02
aliases:
  - modern TUI motion
  - TUI event-loop motion
tags:
  - permanent-note
note-type: "[[permanent-note]]"
status: evergreen
maturity: evergreen
links:
  - "[[command-tui-motion-is-lifecycle-feedback]]"
  - "[[command-mode-tui-components-are-projections]]"
  - "[[raw/textual-2026-animation]]"
  - "[[raw/textual-2026-loading-progress]]"
  - "[[raw/bubbletea-2026-tick-loop]]"
  - "[[raw/ratatui-2026-render-event-loop]]"
  - "[[raw/ora-2026-spinner]]"
  - "[[raw/cli-spinners-2026-frame-catalog]]"
  - "[[raw/deepseek-2026-modern-tui-motion-search]]"
graph-label: Concept
graph-relations:
  - target: "[[command-tui-motion-is-lifecycle-feedback]]"
    relation: TO
    why: "现代 TUI 动效机制需要被降级到 command-mode 生命周期反馈"
  - target: "[[command-mode-tui-components-are-projections]]"
    relation: TO
    why: "动效组件也必须区分 full-screen widget 与 command projection"
  - target: "[[raw/textual-2026-animation]]"
    relation: OF
    why: "提供 full-screen TUI transition 与 animation 参数证据"
  - target: "[[raw/textual-2026-loading-progress]]"
    relation: OF
    why: "提供 loading/progress 组件状态证据"
  - target: "[[raw/bubbletea-2026-tick-loop]]"
    relation: OF
    why: "提供 tick-driven event loop 证据"
  - target: "[[raw/ratatui-2026-render-event-loop]]"
    relation: OF
    why: "提供 render/event loop 与 buffer redraw 证据"
  - target: "[[raw/ora-2026-spinner]]"
    relation: OF
    why: "提供 command-mode spinner enable/silent 证据"
  - target: "[[raw/cli-spinners-2026-frame-catalog]]"
    relation: OF
    why: "提供 spinner frame/interval token 证据"
---

# 现代 TUI 动效由事件循环驱动但应 token 化

## 主张
现代 TUI 动效通常由事件循环、tick、timer、render loop 或 live update 驱动，但设计系统不应直接复制框架动画，而应把 motion token 化。

## 论证
Textual、Bubble Tea 和 Ratatui 代表 full-screen TUI 路径：它们有 widget tree、message/update loop、terminal buffer 和持续 redraw，因此可以做 transition、loading indicator、progress update、tick animation 和 live panel。Ora 与 cli-spinners 代表 CLI command 路径：它们把动效压缩为 spinner frames、interval、enable/silent policy 和 stream 输出。两类实践共同说明，动效必须有机制边界和目的边界。设计系统应定义 `none`、`discrete-log`、`status-line`、`spinner-indeterminate`、`progress-determinate`、`live-region-update`、`transition-fullscreen-only` 等 token，而不是让每个命令任意选择动画。

对 cdp-cli 这样的 command-mode readable TUI，现代 full-screen 动效只能作为参考：transition、focus animation、viewport live panel 属于 future interactive/full-screen profile；默认命令输出仍应采用 [[command-tui-motion-is-lifecycle-feedback]]，即 transient 状态短暂动、final 状态静态化、JSON/CI/pipe/reduced-motion 禁用动画。

## 连接
- [[command-tui-motion-is-lifecycle-feedback]] — 把现代 TUI 动效机制收敛为 command-mode 规则。
- [[command-mode-tui-components-are-projections]] — 说明 motion component 也不能变成常驻 widget。
- [[raw/textual-2026-animation]]、[[raw/bubbletea-2026-tick-loop]]、[[raw/ratatui-2026-render-event-loop]] — full-screen event-loop 动效证据。
- [[raw/ora-2026-spinner]]、[[raw/cli-spinners-2026-frame-catalog]] — CLI spinner token 证据。

