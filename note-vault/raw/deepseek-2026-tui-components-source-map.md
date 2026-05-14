---
title: DeepSeek TUI 组件来源路线图
created: 2026-05-02
author: DeepSeek
year: 2026
source: "local command: deepseek reply --search on"
tags:
  - raw-source
  - tui
  - ui-components
  - research-map
note-type: "[[raw-source]]"
links:
  - "[[command-mode-tui-components-are-projections]]"
  - "[[command-tui-layout-is-block-contract]]"
  - "[[raw/rich-2026-tables]]"
  - "[[raw/rich-2026-progress]]"
  - "[[raw/charmbracelet-2026-bubbles]]"
  - "[[raw/ubuntu-2020-empty-states]]"
  - "[[raw/ratatui-2026-widgets]]"
  - "[[raw/textual-2026-widget-gallery]]"
---

# DeepSeek TUI 组件来源路线图

## 用途
这是 `deepseek` 生成的 TUI UI components 来源候选路线图，只作为线索，不作为已验证证据。已验证证据见本卡连接的 raw 证据卡与 deep-research DAG。

## 本阶段边界
只研究 CLI command-mode readable TUI 的组件目录与单次命令 layout。它不是 full-screen TUI 组件库选型，也不假设具体网站 / API 的搜索、翻页、查看内容 UX。

## 候选组件维度
- stdout result components：header、status、summary、section、key-value block、table、list、empty state、evidence block、next steps、warning block。
- stderr lifecycle components：progress line、spinner、discrete log、error block、confirmation prompt。
- full-screen taxonomy only：persistent header/footer、tabs、tree navigation、viewport/log pane、modal、command palette、text input widget、multi-select menu。

## 待验证来源
- Rich Tables / Progress：表格与进度组件。
- Charmbracelet Bubbles：list、table、spinner、progress、text input、help 等组件目录。
- PatternFly CLI handbook：prompt、错误、help、next steps 和非交互约束。
- Ubuntu CLI empty states：空状态不应破坏输出结构。
- Textual / Ratatui widget gallery：full-screen TUI 组件分类，用于识别哪些不应成为 command-mode 默认布局。

## 连接
- [[command-mode-tui-components-are-projections]] — 将候选组件转化为 command-mode 组件原则。
- [[command-tui-layout-is-block-contract]] — 将组件组织为单次命令 layout 契约。

