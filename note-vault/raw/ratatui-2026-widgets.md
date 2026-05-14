---
title: Ratatui Widgets 证据卡
created: 2026-05-02
author: Ratatui
year: 2026
source: "https://ratatui.rs/showcase/widgets/"
evidence-id: "evidence_f768a80e7dc44cee8c331918888c1830"
archive-evidence-id: "evidence_f768a80e7dc44cee8c331918888c1830"
archive-artifact-id: "artifact_f406f019745c4d10bd67b55495c41cde"
archive-status: archived
archive-backend: node
dag-node: "node_8df617a443cf47faacab0c2cd2b4e7ab"
trust-level: 4
retrieved: 2026-05-02
tags:
  - raw-source
  - tui
  - full-screen-tui
  - ui-components
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[command-mode-tui-components-are-projections]]"
  - "[[tui-ux-patterns-are-interaction-contracts]]"
---

# Ratatui Widgets 证据卡

## 离线摘要
Ratatui widgets showcase 提供 full-screen TUI 组件分类，如 block、list、table、tabs、chart、gauge、scrollbar 等。它对本研究的价值不是直接照搬组件，而是帮助区分 full-screen widget 与 command-mode readable component。

## 原文短摘录
> “Ratatui has a wide variety of built-in widgets.”

> “Widgets are rendered into a buffer.”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_f768a80e7dc44cee8c331918888c1830` (`archived`, backend `node`)
- web archive artifact: `artifact_f406f019745c4d10bd67b55495c41cde` (3,743 chars)
- DAG: `node_8df617a443cf47faacab0c2cd2b4e7ab` <= supports = `evidence_f768a80e7dc44cee8c331918888c1830`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_f406f019745c4d10bd67b55495c41cde") | .body'`

## 原文离线释义
Tabs、scrollbar、viewport、chart 等组件通常依赖持续渲染、焦点状态和屏幕布局。它们可以作为未来 full-screen profile 的组件证据，但不应成为 cdp-cli command-mode 默认 readable output 的布局基础。

## 可支撑的规范条款
- full-screen TUI 组件只能作为 taxonomy / future enhancement。
- command-mode TUI 不引入 persistent footer、tabs、modal 或 viewport state。
- list/table 等跨 profile 组件在 command-mode 中必须退化为一次性 result projection。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[command-mode-tui-components-are-projections]] — 支撑 full-screen widget 与 command component 区分。
- [[tui-ux-patterns-are-interaction-contracts]] — profile 区分属于 UX contract。

