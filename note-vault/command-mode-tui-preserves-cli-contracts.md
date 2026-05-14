---
title: 命令模式 TUI 必须保留 CLI 契约
created: 2026-05-02
updated: 2026-05-02
aliases:
  - command-mode TUI
  - CLI command TUI
tags:
  - permanent-note
note-type: "[[permanent-note]]"
status: evergreen
maturity: evergreen
links:
  - "[[tui-ux-patterns-are-interaction-contracts]]"
  - "[[tui-design-systems-are-layered-constraints]]"
  - "[[raw/clig-2025-command-line-guidelines]]"
  - "[[raw/fuchsia-2025-cli-guidance]]"
  - "[[raw/salesforce-2026-cli-interactivity]]"
  - "[[raw/heroku-2025-cli-style-guide]]"
  - "[[raw/patternfly-2025-cli-handbook]]"
  - "[[raw/rich-2025-console-api]]"
  - "[[command-mode-tui-components-are-projections]]"
  - "[[command-tui-layout-is-block-contract]]"
graph-label: Concept
graph-relations:
  - target: "[[tui-ux-patterns-are-interaction-contracts]]"
    relation: TO
    why: "命令模式 TUI 是 UX/UI 交互契约中的一个独立 profile"
  - target: "[[tui-design-systems-are-layered-constraints]]"
    relation: TO
    why: "它修正三层设计系统中的 UX/UI 层适用范围"
  - target: "[[raw/clig-2025-command-line-guidelines]]"
    relation: OF
    why: "提供 stdout/stderr、TTY、管道和 full-screen 边界依据"
  - target: "[[raw/fuchsia-2025-cli-guidance]]"
    relation: OF
    why: "提供显式交互/非交互模式依据"
  - target: "[[raw/salesforce-2026-cli-interactivity]]"
    relation: OF
    why: "提供 JSON/scriptable mode 与 prompt suppression 依据"
  - target: "[[raw/heroku-2025-cli-style-guide]]"
    relation: OF
    why: "提供 action/output command 和 stderr 进度依据"
  - target: "[[raw/patternfly-2025-cli-handbook]]"
    relation: OF
    why: "提供 guided/non-interactive/yes 模式依据"
  - target: "[[raw/rich-2025-console-api]]"
    relation: OF
    why: "提供 TTY-only 视觉增强与 plain fallback 实现证据"
---

# 命令模式 TUI 必须保留 CLI 契约

## 主张
如果 TUI 是为 CLI command 交互设计，它应是 CLI 契约的渐进增强，而不是替代 CLI 的全屏应用。

## 论证
命令模式 TUI 从一次命令调用开始，以退出码结束。它必须保留 `args`、`flags`、`stdin`、`stdout`、`stderr`、exit code、TTY detection、JSON/structured output、`--yes`、`--non-interactive` 等 CLI 契约。交互界面只能帮助用户构造命令、选择参数、预览影响、确认危险操作、观察进度和恢复错误，不能成为唯一入口。非 TTY、CI、pipe 或 `--json` 场景下，prompt、spinner、全屏 alternate screen 都应关闭或降级。与 persistent/full-screen TUI 相比，命令模式 TUI 的核心不是 screen stack 和长期焦点状态，而是让一次命令更可理解、更安全、更可复现，同时不破坏脚本化和组合性。

## 连接
- [[tui-ux-patterns-are-interaction-contracts]] — 命令模式 TUI 是其中的 `command-interaction-profile`。
- [[tui-design-systems-are-layered-constraints]] — 三层设计系统应把 CLI contract 纳入 UX/UI 层。
- [[raw/clig-2025-command-line-guidelines]] — CLI 可组合性和 TTY 边界证据。
- [[raw/fuchsia-2025-cli-guidance]] — 显式交互/非交互模式证据。
- [[raw/salesforce-2026-cli-interactivity]] — JSON 输出与 prompt suppression 证据。
- [[raw/heroku-2025-cli-style-guide]] — stderr 进度和 prompt bypass 证据。
- [[raw/patternfly-2025-cli-handbook]] — guided/non-interactive 模式证据。
