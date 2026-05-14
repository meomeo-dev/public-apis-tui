---
title: W3C Design Tokens Format 证据卡
created: 2026-05-02
author: W3C Design Tokens Community Group
year: 2025
source: "https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/"
evidence-id: "evidence_6e07e8f206dc4ae2acc6155d40e654a2"
archive-evidence-id: "evidence_ac6a93e4855a4fa7bc3994b2aac6073f"
archive-artifact-id: "artifact_93231eb892f64ac4b2e36d944f7909cb"
archive-status: archived
archive-backend: node
dag-node: "node_ed9ca338c90e41e1a9403ed39721b509"
trust-level: 5
retrieved: 2026-05-02
tags:
  - raw-source
  - design-tokens
  - tui
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[tui-aesthetics-are-tokenized-constraints]]"
---

# W3C Design Tokens Format 证据卡

## 离线摘要
Design Tokens Format Module 定义跨工具交换设计 token 的格式，包括 token 名称、类型、值、描述、分组、引用和复合 token。它支撑把 TUI 美学从“风格描述”转成可维护的语义 token 系统。

## 原文短摘录
> “Name and value are both required.”

> “Design token files are JSON”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_ac6a93e4855a4fa7bc3994b2aac6073f` (`archived`, backend `node`)
- web archive artifact: `artifact_93231eb892f64ac4b2e36d944f7909cb` (84,656 chars)
- DAG: `node_ed9ca338c90e41e1a9403ed39721b509` <= supports = `evidence_ac6a93e4855a4fa7bc3994b2aac6073f`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_93231eb892f64ac4b2e36d944f7909cb") | .body'`

## 原文离线释义
DTCG 规范把 token 定义为至少包含 name/value 的信息结构，并通过 `$type`、`$description`、group、alias/reference、composite token 等机制支持跨工具交换。规范文件引用时，应把 TUI 的 type、space、color、border、symbol、motion、density 都定义为可命名、可分组、可引用、可降级的 token。

## 可支撑的规范条款
- TUI 设计系统应以语义 token 表达 type、space、color、border、symbol、motion、density。
- token 应有描述、类型、值和 fallback 映射，而不是直接散落在组件里。
- 能力映射可以作为 token group 或 profile 表达。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[tui-aesthetics-are-tokenized-constraints]] — 支撑美学 token 化。
