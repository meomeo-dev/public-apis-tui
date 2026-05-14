---
title: 命令模式 TUI 组件是投影而不是常驻控件
created: 2026-05-02
updated: 2026-05-02
aliases:
  - TUI 组件投影
  - command TUI components
tags:
  - permanent-note
note-type: "[[permanent-note]]"
status: evergreen
maturity: evergreen
links:
  - "[[command-mode-tui-preserves-cli-contracts]]"
  - "[[tui-ux-patterns-are-interaction-contracts]]"
  - "[[command-tui-layout-is-block-contract]]"
  - "[[raw/rich-2026-tables]]"
  - "[[raw/rich-2026-progress]]"
  - "[[command-tui-motion-is-lifecycle-feedback]]"
  - "[[raw/rich-2026-console-status]]"
  - "[[raw/charmbracelet-2026-spinner]]"
  - "[[raw/charmbracelet-2026-bubbles]]"
  - "[[raw/ubuntu-2020-empty-states]]"
  - "[[raw/ratatui-2026-widgets]]"
  - "[[raw/textual-2026-widget-gallery]]"
graph-label: Concept
graph-relations:
  - target: "[[command-mode-tui-preserves-cli-contracts]]"
    relation: TO
    why: "组件必须服从 stdout/stderr/JSON/TTY 契约"
  - target: "[[tui-ux-patterns-are-interaction-contracts]]"
    relation: TO
    why: "组件适用性由 interaction profile 决定"
  - target: "[[command-tui-layout-is-block-contract]]"
    relation: TO
    why: "组件需要被组织进单次命令 layout block"
  - target: "[[raw/rich-2026-tables]]"
    relation: OF
    why: "提供表格组件和终端表格输出证据"
  - target: "[[raw/rich-2026-progress]]"
    relation: OF
    why: "提供进度组件作为 lifecycle feedback 的证据"
  - target: "[[raw/charmbracelet-2026-bubbles]]"
    relation: OF
    why: "提供常见 TUI component taxonomy"
  - target: "[[raw/ubuntu-2020-empty-states]]"
    relation: OF
    why: "提供 empty state 组件证据"
  - target: "[[raw/ratatui-2026-widgets]]"
    relation: OF
    why: "提供 full-screen widget taxonomy 作为边界证据"
  - target: "[[raw/textual-2026-widget-gallery]]"
    relation: OF
    why: "提供 full-screen widgets 与 command-mode 组件区分证据"
---

# 命令模式 TUI 组件是投影而不是常驻控件

## 主张
CLI command-mode readable TUI 的 UI components 应定义为 JSON result 或 stderr lifecycle event 的一次性投影，而不是长期存在的 widget。

## 论证
同样叫 table、list、spinner、help 或 input，放在 full-screen TUI 和一次性 CLI 命令里含义不同。full-screen TUI 的组件依赖 render loop、focus、selection、viewport、screen stack 和长期状态；command-mode TUI 则从命令调用开始，以 stdout/stderr 和 exit code 结束。因此 command-mode 组件必须先分通道：header、status、summary、table、list、empty state、evidence、next steps 属于 stdout result projection；progress、spinner、error、prompt 属于 stderr lifecycle / diagnostic surface。Text input、tabs、tree、modal、persistent footer 等可以作为未来交互增强或 full-screen profile 证据，但不应成为默认 readable output 的常驻结构。

## 连接
- [[command-mode-tui-preserves-cli-contracts]] — 说明为什么组件不能破坏 CLI 契约。
- [[tui-ux-patterns-are-interaction-contracts]] — 说明组件必须按 interaction profile 判定适用性。
- [[command-tui-layout-is-block-contract]] — 说明这些组件如何进入稳定 block layout。
- [[raw/charmbracelet-2026-bubbles]] — 组件 taxonomy 证据。
- [[raw/rich-2026-tables]] — 表格组件证据。
- [[raw/rich-2026-progress]] — 进度组件证据。
- [[raw/ubuntu-2020-empty-states]] — 空状态组件证据。
- [[raw/ratatui-2026-widgets]] 与 [[raw/textual-2026-widget-gallery]] — full-screen widget 边界证据。

