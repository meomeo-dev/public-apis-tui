---
title: Carbon Inline Loading 证据卡
created: 2026-05-02
author: IBM Carbon Design System
year: 2026
source: "https://carbondesignsystem.com/components/inline-loading/usage/"
evidence-id: "evidence_0409ca21b9f1421c9665b28f45ebfea0"
archive-evidence-id: "evidence_0409ca21b9f1421c9665b28f45ebfea0"
archive-artifact-id: "artifact_9628bccfc02f4288b43221e842ae61c3"
archive-status: archived
archive-backend: node
dag-node: "node_8547332a847442ed9500f35edfe28d50"
trust-level: 5
retrieved: 2026-05-02
tags:
  - raw-source
  - design-system
  - loading-state
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[command-tui-motion-is-lifecycle-feedback]]"
---

# Carbon Inline Loading 证据卡

## 离线摘要
Carbon Inline Loading 给出 loading 组件的状态模型：active、success、error、inactive 等。它适合迁移为 command-mode TUI 的状态动效映射：只有 active / in-progress 可动，success/error/inactive 应落到静态终态。

## 原文短摘录
> “Inline loading spinners are used when performing actions.”

> “Status can be active, finished, error, or inactive.”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_0409ca21b9f1421c9665b28f45ebfea0` (`archived`, backend `node`)
- web archive artifact: `artifact_9628bccfc02f4288b43221e842ae61c3` (5,136 chars)
- DAG: `node_8547332a847442ed9500f35edfe28d50` <= supports = `evidence_0409ca21b9f1421c9665b28f45ebfea0`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_9628bccfc02f4288b43221e842ae61c3") | .body'`

## 原文离线释义
状态动效应只覆盖“正在执行”。成功、错误、取消、空状态、部分完成等都应是稳定文本状态，而不是动画状态。retrying 可以短暂显示离散尝试次数，但不应无限循环。

## 可支撑的规范条款
- loading/running 可使用 spinner 或 progress。
- success/error/inactive 等终态必须静态化。
- retrying 必须有次数或时间边界。

## 连接
- [[command-tui-motion-is-lifecycle-feedback]] — 支撑状态动效映射。

