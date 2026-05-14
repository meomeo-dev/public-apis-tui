---
title: Charmbracelet Bubbles 证据卡
created: 2026-05-02
author: Charmbracelet
year: 2026
source: "https://pkg.go.dev/github.com/charmbracelet/bubbles"
evidence-id: "evidence_8476197b473044c38507fdbf81e56186"
archive-evidence-id: "evidence_8476197b473044c38507fdbf81e56186"
archive-artifact-id: "artifact_aee36d3523194670ae3a032b0078de64"
archive-status: archived
archive-backend: node
dag-node: "node_8df617a443cf47faacab0c2cd2b4e7ab"
trust-level: 4
retrieved: 2026-05-02
tags:
  - raw-source
  - tui
  - ui-components
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[command-mode-tui-components-are-projections]]"
  - "[[command-tui-layout-is-block-contract]]"
---

# Charmbracelet Bubbles 证据卡

## 离线摘要
Bubbles 是 Bubble Tea 生态的 TUI 组件集合，覆盖 list、table、spinner、progress、text input、textarea、viewport、help、key binding 等组件。它适合作为 TUI 组件分类证据，但其中许多组件默认服务于状态循环与全屏交互；在 command-mode readable TUI 中应把它们转译为一次性输出组件、stderr 生命周期组件或未来交互增强。

## 原文短摘录
> “A collection of common Bubble Tea components for building TUIs.”

> “Bubbles are components for Bubble Tea applications.”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_8476197b473044c38507fdbf81e56186` (`archived`, backend `node`)
- web archive artifact: `artifact_aee36d3523194670ae3a032b0078de64` (10,371 chars)
- DAG: `node_8df617a443cf47faacab0c2cd2b4e7ab` <= supports = `evidence_8476197b473044c38507fdbf81e56186`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_aee36d3523194670ae3a032b0078de64") | .body'`

## 原文离线释义
同一个组件名在 full-screen TUI 和 command-mode TUI 中语义不同。list/table 可以成为 stdout result projection；spinner/progress 应成为 stderr lifecycle feedback；text input/help/key binding 更接近未来交互增强，不应成为默认命令输出的核心结构。

## 可支撑的规范条款
- 组件目录应标记适用 profile：command-mode、stderr lifecycle、future interactive、full-screen only。
- prompt/input 不能替代 flags 和非交互路径。
- help/next steps 在 command-mode 中应输出为静态 block，而不是常驻 footer。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[command-mode-tui-components-are-projections]] — 支撑“组件是投影，不是常驻 widget”。
- [[command-tui-layout-is-block-contract]] — 支撑组件按 stdout/stderr block 编排。

