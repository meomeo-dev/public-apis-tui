---
title: TUI UX 模式是能力感知的交互契约
created: 2026-05-02
updated: 2026-05-02
aliases:
  - TUI UX 交互契约
  - capability-aware TUI UX
tags:
  - permanent-note
note-type: "[[permanent-note]]"
status: evergreen
maturity: evergreen
links:
  - "[[terminal-substrate-determines-tui-primitives]]"
  - "[[tui-aesthetics-are-tokenized-constraints]]"
  - "[[command-mode-tui-preserves-cli-contracts]]"
  - "[[raw/patternfly-2025-cli-handbook]]"
  - "[[raw/w3c-2026-aria-keyboard]]"
  - "[[raw/w3c-2023-wcag-color-motion]]"
  - "[[raw/ratatui-2026-terminal-abstraction]]"
  - "[[command-mode-tui-components-are-projections]]"
  - "[[command-tui-layout-is-block-contract]]"
graph-label: Concept
graph-relations:
  - target: "[[terminal-substrate-determines-tui-primitives]]"
    relation: TO
    why: "交互契约需要继承终端能力矩阵"
  - target: "[[tui-aesthetics-are-tokenized-constraints]]"
    relation: TO
    why: "美学表达必须服从交互契约"
  - target: "[[command-mode-tui-preserves-cli-contracts]]"
    relation: TO
    why: "CLI command 场景需要与 full-screen TUI 区分"
  - target: "[[raw/patternfly-2025-cli-handbook]]"
    relation: OF
    why: "提供 CLI 交互、反馈和可访问性证据"
  - target: "[[raw/w3c-2026-aria-keyboard]]"
    relation: OF
    why: "提供焦点、键盘和 selection 区分依据"
  - target: "[[raw/w3c-2023-wcag-color-motion]]"
    relation: OF
    why: "提供颜色、焦点和动态内容约束"
  - target: "[[raw/ratatui-2026-terminal-abstraction]]"
    relation: OF
    why: "提供 full-screen TUI render-loop 证据，用于区分 profile"
---

# TUI UX 模式是能力感知的交互契约

## 主张
TUI UX/UI 模式应被定义为能力感知的交互契约，并且必须区分 `interactive-app-profile` 与 `command-interaction-profile`。

## 论证
TUI 用户需要知道自己在哪里、能做什么、如何退出、如何恢复。screen、navigation、focus、selection、binding、form、collection、feedback 和 recovery 都必须明确状态、输入、输出、发现路径和恢复路径。因为终端能力不稳定，每个模式都要有 keyboard-only、no-color、small viewport、no-mouse、plain/log output fallback。命令发现不能只是文档，应该包括常驻轻提示、上下文帮助和完整 help/command palette。错误也不能只是红色文字，而要包含原因、影响、下一步、重试、撤销或日志路径。这样设计出来的 TUI 才能在终端限制下保持可学、可控、可恢复。

CLI command 场景还要额外遵守 [[command-mode-tui-preserves-cli-contracts]]：TUI 是命令构造、预览、确认、进度和恢复的增强层，而不是替代 `args`、`flags`、`stdin`、`stdout`、`stderr`、exit code 和非交互模式的全屏应用。

## 连接
- [[terminal-substrate-determines-tui-primitives]] — 解释能力矩阵和 fallback 从何而来。
- [[tui-aesthetics-are-tokenized-constraints]] — 解释美学为何不能破坏可发现性和恢复路径。
- [[command-mode-tui-preserves-cli-contracts]] — 解释为什么 CLI command TUI 要优先保留脚本化、管道和退出码契约。
- [[raw/patternfly-2025-cli-handbook]] — CLI 交互和可访问性证据。
- [[raw/w3c-2026-aria-keyboard]] — 键盘和焦点模型证据。
- [[raw/w3c-2023-wcag-color-motion]] — 状态表达与动态内容约束证据。
