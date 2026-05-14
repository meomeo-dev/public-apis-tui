---
title: XTerm 控制序列参考证据卡
created: 2026-05-02
author: Thomas E. Dickey
year: 2025
source: "https://invisible-island.net/xterm/ctlseqs/ctlseqs.html"
evidence-id: "evidence_572c2d6d34064ba28db9b78894ef7e93"
archive-evidence-id: "evidence_60a92d49fcd34111be9f4875e75b5623"
archive-artifact-id: "artifact_9a554c5db35a4a89a8fd9cf927bdf1f1"
archive-status: archived
archive-backend: node
dag-node: "node_b8590c2f02c045799b8ee813cb1f32f8"
trust-level: 5
retrieved: 2026-05-02
tags:
  - raw-source
  - tui
  - terminal
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[terminal-substrate-determines-tui-primitives]]"
  - "[[tui-aesthetics-are-tokenized-constraints]]"
---

# XTerm 控制序列参考证据卡

## 离线摘要
XTerm control sequences 是现实终端兼容层的重要参考，说明 ECMA-48、DEC 私有序列、xterm 扩展、SGR 颜色、鼠标追踪、备用屏幕、括号粘贴等功能如何在现代终端中表达。

## 原文短摘录
> “XTerm decodes control sequences using a state machine.”

> “Many of the features are optional”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_60a92d49fcd34111be9f4875e75b5623` (`archived`, backend `node`)
- web archive artifact: `artifact_9a554c5db35a4a89a8fd9cf927bdf1f1` (138,966 chars)
- DAG: `node_b8590c2f02c045799b8ee813cb1f32f8` <= supports = `evidence_60a92d49fcd34111be9f4875e75b5623`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_9a554c5db35a4a89a8fd9cf927bdf1f1") | .body'`

## 原文离线释义
xterm 文档把控制序列解析描述为状态机，并说明许多功能是可选的。它还把 ECMA-48、DEC 终端族和 xterm-dependent functions 放在同一现实兼容语境中。规范文件引用时，应把 xterm 作为事实兼容层：用于定义 `xterm-compatible`、`mouse-enabled`、`alternate-screen`、`bracketed-paste`、`256-color`、`truecolor` 等能力，而不能把这些能力当作所有终端默认能力。

## 可支撑的规范条款
- 能力矩阵应有 `xterm-compatible`、`mouse-enabled`、`bracketed-paste`、`alternate-screen`、`256-color`、`truecolor` 等维度。
- 颜色和鼠标是能力增强，不能成为唯一交互路径。
- full-screen TUI 使用 alternate screen 时必须定义退出恢复和异常恢复。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[terminal-substrate-determines-tui-primitives]] — xterm 说明现实终端能力边界。
- [[tui-aesthetics-are-tokenized-constraints]] — 颜色/边框/样式 token 需要能力降级。
