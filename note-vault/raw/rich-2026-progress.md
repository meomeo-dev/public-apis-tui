---
title: Rich Progress 证据卡
created: 2026-05-02
author: Textualize
year: 2026
source: "https://rich.readthedocs.io/en/latest/progress.html"
evidence-id: "evidence_e0cb25a71a7842c0bda80b904957682a"
archive-evidence-id: "evidence_e0cb25a71a7842c0bda80b904957682a"
archive-artifact-id: "artifact_952a968bec054ca89f9e3204656dafc3"
archive-status: archived
archive-backend: node
dag-node: "node_8df617a443cf47faacab0c2cd2b4e7ab"
trust-level: 4
retrieved: 2026-05-02
tags:
  - raw-source
  - tui
  - progress
  - ui-components
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[command-mode-tui-components-are-projections]]"
  - "[[command-mode-tui-preserves-cli-contracts]]"
---

# Rich Progress 证据卡

## 离线摘要
Rich Progress 说明终端里可以显示进度条、多任务进度、百分比、完成数与时间估计。对 command-mode TUI 而言，它支撑“进度是 lifecycle feedback”的组件概念，但不改变主结果通道：进度、spinner 和实时状态应走 stderr，并在非 TTY、CI 或 `--format json` 场景降级为离散日志或关闭。

## 原文短摘录
> “Rich can display continuously updated information regarding the progress of long running tasks.”

> “For basic usage, wrap any sequence in the `track` function.”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_e0cb25a71a7842c0bda80b904957682a` (`archived`, backend `node`)
- web archive artifact: `artifact_952a968bec054ca89f9e3204656dafc3` (13,646 chars)
- DAG: `node_8df617a443cf47faacab0c2cd2b4e7ab` <= supports = `evidence_e0cb25a71a7842c0bda80b904957682a`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_952a968bec054ca89f9e3204656dafc3") | .body'`

## 原文离线释义
进度组件服务于“用户等待时理解当前发生什么”，而不是结果数据。它不应出现在 JSON stdout 中，也不应让动画成为唯一信息。长任务结束后，stdout 仍只输出最终 result projection。

## 可支撑的规范条款
- progress/spinner 属于 stderr lifecycle component。
- 非 TTY、CI、pipe、`--format json` 场景关闭动态进度。
- 进度组件必须有文本 fallback。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[command-mode-tui-components-are-projections]] — 进度是 lifecycle component，不是 result component。
- [[command-mode-tui-preserves-cli-contracts]] — 支撑 stderr 与 stdout 分离。

