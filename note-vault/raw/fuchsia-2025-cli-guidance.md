---
title: Fuchsia CLI 指南证据卡
created: 2026-05-02
author: Google Fuchsia
year: 2025
source: "https://fuchsia.dev/fuchsia-src/development/api/cli"
evidence-id: "evidence_11b2df9948eb409f9d91d36290bd58bd"
archive-evidence-id: "evidence_88a8513fad914c20b3d21026dea43c55"
archive-artifact-id: "artifact_a752ccf3430b42ac842eee90d0e47802"
archive-status: archived
archive-backend: node
dag-node: "node_72e52d90b8ac4248bd74ffd8329646f2"
trust-level: 5
retrieved: 2026-05-02
tags:
  - raw-source
  - cli
  - command-mode-tui
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[command-mode-tui-preserves-cli-contracts]]"
---

# Fuchsia CLI 指南证据卡

## 离线摘要
Fuchsia CLI 指南区分用户交互与程序化交互，要求工具能明确进入交互或非交互模式，避免意外 prompt，正确使用 stdout/stderr，并用退出码表达结果。

## 原文短摘录
> “A tool may be run interactively by a human user or programmatically via a script”

> “avoid requesting user input”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_88a8513fad914c20b3d21026dea43c55` (`archived`, backend `node`)
- web archive artifact: `artifact_a752ccf3430b42ac842eee90d0e47802` (48,262 chars)
- DAG: `node_72e52d90b8ac4248bd74ffd8329646f2` <= supports = `evidence_88a8513fad914c20b3d21026dea43c55`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_a752ccf3430b42ac842eee90d0e47802") | .body'`

## 原文离线释义
Fuchsia 指南明确把 CLI 工具分成 human interactive 与 programmatic/script 两种使用方式，并要求即使工具能自动判断模式，也要允许用户显式指定交互或非交互模式。规范文件引用时，应把它作为 `--interactive`、`--non-interactive`、`--machine`、`--yes` 等模式边界的证据。

## 可支撑的规范条款
- 交互模式必须显式或可预测，不能突然阻塞脚本。
- command-mode TUI 需要 `--non-interactive`、`--yes` 或等价绕过路径。
- stdout 输出结果，stderr 输出诊断/进度，这应写进规范。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[command-mode-tui-preserves-cli-contracts]] — 支撑 CLI contract first 的设计原则。
