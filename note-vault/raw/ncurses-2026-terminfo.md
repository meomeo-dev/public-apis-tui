---
title: ncurses terminfo 能力数据库证据卡
created: 2026-05-02
author: ncurses
year: 2026
source: "https://invisible-island.net/ncurses/man/terminfo.5.html"
evidence-id: "evidence_87c7b1aa72ee453596252b9e4a4c0073"
archive-evidence-id: "evidence_dec2865125744c478314cdf8058d2570"
archive-artifact-id: "artifact_5c6e8c52d6ec429ea7ca9a5eebaabebb"
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
---

# ncurses terminfo 能力数据库证据卡

## 离线摘要
terminfo 用 boolean、numeric、string capabilities 描述终端能力和操作序列，是程序查询终端能力而不是硬编码控制序列的重要机制。

## 原文短摘录
> “Terminfo describes terminals by giving a set of capabilities”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_dec2865125744c478314cdf8058d2570` (`archived`, backend `node`)
- web archive artifact: `artifact_5c6e8c52d6ec429ea7ca9a5eebaabebb` (98,449 chars)
- DAG: `node_b8590c2f02c045799b8ee813cb1f32f8` <= supports = `evidence_dec2865125744c478314cdf8058d2570`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_5c6e8c52d6ec429ea7ca9a5eebaabebb") | .body'`

## 原文离线释义
terminfo 页面说明终端通过一组 capabilities 被描述，包括屏幕操作方法、padding requirements 和初始化序列。规范文件引用时，应把 terminfo 作为“能力查询/声明层”的依据：组件、token、交互增强都需要标明最低能力要求和 fallback。

## 可支撑的规范条款
- TUI 设计系统必须有能力查询与 fallback 层，不能假设所有终端支持同一组控制序列。
- 组件规范应标注最低能力要求和降级行为。
- `$TERM` 与能力数据库是运行时适配的一部分，不是实现细节。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[terminal-substrate-determines-tui-primitives]] — terminfo 支撑 capability token 和 fallback 设计。
