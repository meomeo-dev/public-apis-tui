---
title: Carbon Motion Overview 证据卡
created: 2026-05-02
author: IBM Carbon Design System
year: 2026
source: "https://carbondesignsystem.com/elements/motion/overview/"
evidence-id: "evidence_2da86de2ab6843b39447771f3a41de66"
archive-evidence-id: "evidence_2da86de2ab6843b39447771f3a41de66"
archive-artifact-id: "artifact_cbd18b80677143739642b7ccddb9d5d9"
archive-status: archived
archive-backend: node
dag-node: "node_8547332a847442ed9500f35edfe28d50"
trust-level: 5
retrieved: 2026-05-02
tags:
  - raw-source
  - design-system
  - motion
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[command-tui-motion-is-lifecycle-feedback]]"
  - "[[tui-aesthetics-are-tokenized-constraints]]"
---

# Carbon Motion Overview 证据卡

## 离线摘要
Carbon Motion Overview 将 motion 视为设计系统中的有目的反馈，而不是装饰。它强调 motion 要帮助用户理解变化、保持一致节奏，并考虑可访问性。这支撑 TUI 动效 token 化：动效只表达过渡或等待，不承载最终语义。

## 原文短摘录
> “Motion is used to provide feedback to the user.”

> “Motion should be subtle, responsive, and expressive.”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_2da86de2ab6843b39447771f3a41de66` (`archived`, backend `node`)
- web archive artifact: `artifact_cbd18b80677143739642b7ccddb9d5d9` (9,768 chars)
- DAG: `node_8547332a847442ed9500f35edfe28d50` <= supports = `evidence_2da86de2ab6843b39447771f3a41de66`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_cbd18b80677143739642b7ccddb9d5d9") | .body'`

## 原文离线释义
把 motion 当作 token 能避免每个命令随意发明 spinner、闪烁或状态动画。cdp-cli 的 motion token 应少而保守：`none`、`discrete-log`、`spinner`、`determinate-progress`，并由终端能力决定启用。

## 可支撑的规范条款
- 动效必须有明确目的：等待、进度、重试或取消。
- 终态不使用循环动效。
- motion token 必须服从可访问性和能力降级。

## 连接
- [[command-tui-motion-is-lifecycle-feedback]] — 支撑 motion token 化和保守使用。
- [[tui-aesthetics-are-tokenized-constraints]] — motion 是美学 token 的一部分。

