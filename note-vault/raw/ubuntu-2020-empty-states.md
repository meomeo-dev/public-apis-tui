---
title: Ubuntu Empty States 证据卡
created: 2026-05-02
author: Ubuntu Design System
year: 2020
source: "https://discourse.ubuntu.com/t/empty-states/18885"
evidence-id: "evidence_3abba727828149d494c990c14cbfd199"
archive-evidence-id: "evidence_3abba727828149d494c990c14cbfd199"
archive-artifact-id: "artifact_11407e2970664e37b378db0a8f910000"
archive-status: archived
archive-backend: node
dag-node: "node_8df617a443cf47faacab0c2cd2b4e7ab"
trust-level: 4
retrieved: 2026-05-02
tags:
  - raw-source
  - cli
  - empty-state
  - ui-components
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[command-mode-tui-components-are-projections]]"
  - "[[command-tui-layout-is-block-contract]]"
---

# Ubuntu Empty States 证据卡

## 离线摘要
Ubuntu CLI empty states 指南强调空状态也是有效输出：命令没有数据时不应静默，也不应误报失败；输出需要保留用户预期的格式，并给出理解原因或下一步的提示。它直接支撑 command-mode readable TUI 的 empty state 组件。

## 原文短摘录
> “An empty state is a moment in the user's experience where there is no data to display.”

> “Avoid returning nothing.”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_3abba727828149d494c990c14cbfd199` (`archived`, backend `node`)
- web archive artifact: `artifact_11407e2970664e37b378db0a8f910000` (1,969 chars)
- DAG: `node_8df617a443cf47faacab0c2cd2b4e7ab` <= supports = `evidence_3abba727828149d494c990c14cbfd199`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_11407e2970664e37b378db0a8f910000") | .body'`

## 原文离线释义
空状态必须区分“命令失败”和“结果为空”。对 `sites`、`workflows`、`browser list`、`endpoints` 等命令，empty state 应保留对应 block 或 header，并给出可执行 next step 或配置提示。

## 可支撑的规范条款
- 空列表必须显示 explicit empty state。
- empty state 不应破坏 stdout 所选格式。
- empty state 可以带 next steps，但不得假设站点特定交互。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[command-mode-tui-components-are-projections]] — empty state 是 result projection 的一部分。
- [[command-tui-layout-is-block-contract]] — empty state 属于 details 或 summary 的命令变化 block。

