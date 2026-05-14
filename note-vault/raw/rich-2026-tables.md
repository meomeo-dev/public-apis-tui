---
title: Rich Tables 证据卡
created: 2026-05-02
author: Textualize
year: 2026
source: "https://rich.readthedocs.io/en/latest/tables.html"
evidence-id: "evidence_df4bbec2108e4afeb9b630e47bbdb270"
archive-evidence-id: "evidence_df4bbec2108e4afeb9b630e47bbdb270"
archive-artifact-id: "artifact_682b24bd6f7a41519618f51e8b17e50c"
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

# Rich Tables 证据卡

## 离线摘要
Rich Tables 是面向终端输出的表格组件文档，展示了 column、header、row、caption、box、padding、alignment 等结构能力。它适合作为 command-mode readable TUI 的同构集合展示证据，但也提醒表格布局依赖终端宽度和字符宽度，必须提供窄终端或 plain fallback。

## 原文短摘录
> “Rich can render flexible tables with unicode box characters.”

> “To add a row of data, call `add_row()`.”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_df4bbec2108e4afeb9b630e47bbdb270` (`archived`, backend `node`)
- web archive artifact: `artifact_682b24bd6f7a41519618f51e8b17e50c` (7,937 chars)
- DAG: `node_8df617a443cf47faacab0c2cd2b4e7ab` <= supports = `evidence_df4bbec2108e4afeb9b630e47bbdb270`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_682b24bd6f7a41519618f51e8b17e50c") | .body'`

## 原文离线释义
表格是终端 readable output 的有效组件，但只适合稳定、同构、列数有限的数据集合。对 cdp-cli 模板而言，sites、workflows、browser sessions、endpoints 这类结构稳定集合适合表格；站点派生 search result 是否适合表格，必须由站点 / API SPEC 决定。

## 可支撑的规范条款
- 表格必须有 header，列数应受控。
- 窄终端或非 TTY 下，表格可降级为 repeated key-value blocks。
- 表格只展示 JSON result 的投影，不应成为机器可解析数据源。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[command-mode-tui-components-are-projections]] — 表格是 JSON result 的投影组件。
- [[command-tui-layout-is-block-contract]] — 表格属于 layout 的 command-variable details block。

