---
title: Textual Loading and Progress 证据卡
created: 2026-05-02
author: Textualize
year: 2026
source: "https://textual.textualize.io/widgets/loading_indicator/ ; https://textual.textualize.io/widgets/progress_bar/"
evidence-id:
  - "evidence_26928d3d91cb4c3296aa273ac3aba75d"
  - "evidence_28b98b48146b426f957d8662283862bf"
archive-evidence-id:
  - "evidence_26928d3d91cb4c3296aa273ac3aba75d"
  - "evidence_28b98b48146b426f957d8662283862bf"
archive-artifact-id:
  - "artifact_29866cdaad254fb89effa351f5cdb3ce"
  - "artifact_9d8d0ff8932944cbbfa877a3ef84ae93"
archive-status: archived
archive-backend: node
dag-node: "node_6b0c8f36567846fe8fbdf26b1cffb445"
trust-level: 4
retrieved: 2026-05-02
tags:
  - raw-source
  - tui
  - loading-state
  - progress
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[modern-tui-motion-is-event-loop-driven]]"
  - "[[command-tui-motion-is-lifecycle-feedback]]"
---

# Textual Loading and Progress 证据卡

## 离线摘要
Textual LoadingIndicator 和 ProgressBar 说明现代 TUI 把 loading 与 progress 分成两类：未知总量时显示 loading indicator，已知总量时显示 progress bar，并支持 total、percentage、ETA、advance/update 等状态更新。

## 原文短摘录
> “A widget to show that content is loading.”

> “A progress bar widget.”

## 本地原文归档
- loading evidence: `evidence_26928d3d91cb4c3296aa273ac3aba75d` → `artifact_29866cdaad254fb89effa351f5cdb3ce` (5,144 chars)
- progress evidence: `evidence_28b98b48146b426f957d8662283862bf` → `artifact_9d8d0ff8932944cbbfa877a3ef84ae93` (15,376 chars)
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="<artifact-id>") | .body'`

## 原文离线释义
Loading 与 progress 不应混用。对 command-mode TUI，未知总量时用低频 status/spinner；已知 total 或 count 时用 determinate progress 或离散 count log。最终仍落成静态状态。

## 可支撑的规范条款
- Unknown duration → `spinner-indeterminate` 或 `status-line`。
- Known total → `progress-determinate`。
- Loading/progress 都是 transient，不是 final state。

## 连接
- [[modern-tui-motion-is-event-loop-driven]] — 支撑现代 TUI 状态组件分类。
- [[command-tui-motion-is-lifecycle-feedback]] — 支撑 command-mode 状态映射。

