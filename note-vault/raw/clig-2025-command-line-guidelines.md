---
title: Command Line Interface Guidelines 证据卡
created: 2026-05-02
author: clig.dev
year: 2025
source: "https://clig.dev/"
evidence-id: "evidence_0fdb5a5e605a432085d55fa6c59d323d"
archive-evidence-id: "evidence_90c49bc877e64efc905c08cd746a5848"
archive-artifact-id: "artifact_6e867270be69477b9ebe24fa103bf23d"
archive-status: archived
archive-backend: node
dag-node: "node_72e52d90b8ac4248bd74ffd8329646f2"
trust-level: 4
retrieved: 2026-05-02
tags:
  - raw-source
  - cli
  - command-mode-tui
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[command-mode-tui-preserves-cli-contracts]]"
  - "[[tui-ux-patterns-are-interaction-contracts]]"
---

# Command Line Interface Guidelines 证据卡

## 离线摘要
CLIG 是高质量 CLI UX 指南，强调命令行工具要尊重 stdout/stderr、exit code、管道、TTY 检测、无颜色输出、非交互环境和脚本化组合。它还明确其范围不包含 full-screen terminal programs，因此非常适合界定 command-mode TUI 与 persistent TUI 的边界。

## 原文短摘录
> “This guide doesn’t cover full-screen terminal programs like emacs and vim.”

> “Send output to `stdout`.”

> “Never require a prompt.”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_90c49bc877e64efc905c08cd746a5848` (`archived`, backend `node`)
- web archive artifact: `artifact_6e867270be69477b9ebe24fa103bf23d` (64,912 chars)
- DAG: `node_72e52d90b8ac4248bd74ffd8329646f2` <= supports = `evidence_90c49bc877e64efc905c08cd746a5848`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_6e867270be69477b9ebe24fa103bf23d") | .body'`

## 原文离线释义
CLIG 同时给出边界和契约：它研究 CLI program，不覆盖 full-screen terminal programs；主输出走 stdout，日志/错误/消息走 stderr；prompt 必须可用 flags 或 arguments 替代。规范文件引用时，应把它作为 `command-interaction-profile` 的主证据。

## 可支撑的规范条款
- CLI command TUI 必须保留 stdout/stderr/exit code 契约。
- prompt 和动画只应在 TTY/交互场景出现，不能污染机器可读输出。
- TUI 是命令交互增强层，不应把功能只藏在 full-screen session 中。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[command-mode-tui-preserves-cli-contracts]] — 命令模式 TUI 的主证据之一。
- [[tui-ux-patterns-are-interaction-contracts]] — 支撑 UX contract 的输出和可组合边界。
