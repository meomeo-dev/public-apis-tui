---
title: Textual Widget Gallery 证据卡
created: 2026-05-02
author: Textualize
year: 2026
source: "https://textual.textualize.io/widget_gallery/"
evidence-id: "evidence_46b575a6905344639696ec0910385186"
archive-evidence-id: "evidence_46b575a6905344639696ec0910385186"
archive-artifact-id: "artifact_9bb0bdc8d0f140d297bb7ea12210aeab"
archive-status: archived
archive-backend: node
dag-node: "node_8df617a443cf47faacab0c2cd2b4e7ab"
trust-level: 4
retrieved: 2026-05-02
tags:
  - raw-source
  - tui
  - full-screen-tui
  - ui-components
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[command-mode-tui-components-are-projections]]"
  - "[[tui-ux-patterns-are-interaction-contracts]]"
---

# Textual Widget Gallery 证据卡

## 离线摘要
Textual widget gallery 展示 full-screen TUI widgets，包括 header、footer、list view、tree、data table、log、markdown、input 等。它适合作为组件 taxonomy 证据，但这些 widgets 多数依赖应用生命周期、焦点和布局容器，不应被默认为一次性 CLI command output。

## 原文短摘录
> “This page contains a gallery of widgets built in to Textual.”

> “The Header widget displays application information.”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_46b575a6905344639696ec0910385186` (`archived`, backend `node`)
- web archive artifact: `artifact_9bb0bdc8d0f140d297bb7ea12210aeab` (29,597 chars)
- DAG: `node_8df617a443cf47faacab0c2cd2b4e7ab` <= supports = `evidence_46b575a6905344639696ec0910385186`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_9bb0bdc8d0f140d297bb7ea12210aeab") | .body'`

## 原文离线释义
Textual 的 Header/Footer/Log/Tree 等 widget 适合持续应用，不适合直接变成 cdp-cli 的默认 `--format text` 布局。对 command-mode SPEC 来说，它们的正确用法是标记“full-screen only”或“future interactive enhancement”，而不是塞入每次命令输出。

## 可支撑的规范条款
- persistent header/footer、tree、viewport/log pane 不属于默认 command-mode readable output。
- command-mode layout 只保留稳定 block slot，不维护 screen stack。
- future interactive profile 必须另立 SPEC。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[command-mode-tui-components-are-projections]] — 支撑 widget / component profile 区分。
- [[tui-ux-patterns-are-interaction-contracts]] — 组件适用性由 interaction profile 决定。

