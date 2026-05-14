---
title: Ora Spinner 证据卡
created: 2026-05-02
author: Sindre Sorhus
year: 2026
source: "https://github.com/sindresorhus/ora"
evidence-id: "evidence_ae11b600cc85473da66c4f12bd37e0e0"
archive-evidence-id: "evidence_ae11b600cc85473da66c4f12bd37e0e0"
archive-artifact-id: "artifact_00c58b504f144bdb849d4c1518212526"
archive-status: archived
archive-backend: node
dag-node: "node_6b0c8f36567846fe8fbdf26b1cffb445"
trust-level: 4
retrieved: 2026-05-02
tags:
  - raw-source
  - cli
  - spinner
  - motion
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[modern-tui-motion-is-event-loop-driven]]"
  - "[[command-tui-motion-is-lifecycle-feedback]]"
---

# Ora Spinner 证据卡

## 离线摘要
Ora 是现代 CLI spinner 工具，提供 `isEnabled`、`isSilent`、stream、spinner 等选项。它直接支撑 command-mode 动效必须可禁用、可沉默、并与输出通道绑定的原则。

## 原文短摘录
> “Elegant terminal spinner.”

> “isEnabled: Force enable/disable the spinner.”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_ae11b600cc85473da66c4f12bd37e0e0` (`archived`, backend `node`)
- web archive artifact: `artifact_00c58b504f144bdb849d4c1518212526` (14,354 chars)
- DAG: `node_6b0c8f36567846fe8fbdf26b1cffb445` <= supports = `evidence_ae11b600cc85473da66c4f12bd37e0e0`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_00c58b504f144bdb849d4c1518212526") | .body'`

## 原文离线释义
CLI spinner 应显式受能力和环境控制。对 cdp-cli，这映射为：`--format json`、CI、pipe、非 TTY、reduced-motion 都应关闭 spinner；必要时用离散 stderr log 替代。

## 可支撑的规范条款
- Spinner 有 enable/silent policy。
- Command-mode 动效必须有 suppression matrix。
- Spinner 是 stderr lifecycle，不是 stdout result。

## 连接
- [[modern-tui-motion-is-event-loop-driven]] — 支撑 CLI spinner 的现代工具证据。
- [[command-tui-motion-is-lifecycle-feedback]] — 支撑 command-mode suppression 规则。

