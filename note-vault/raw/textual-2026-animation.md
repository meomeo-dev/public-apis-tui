---
title: Textual Animation 证据卡
created: 2026-05-02
author: Textualize
year: 2026
source: "https://textual.textualize.io/guide/animation/"
evidence-id: "evidence_c90b92764e5d4eb7a01150627f16c305"
archive-evidence-id: "evidence_c90b92764e5d4eb7a01150627f16c305"
archive-artifact-id: "artifact_30907759fa5f43b38be2fe8c05bba39e"
archive-status: archived
archive-backend: node
dag-node: "node_6b0c8f36567846fe8fbdf26b1cffb445"
trust-level: 4
retrieved: 2026-05-02
tags:
  - raw-source
  - tui
  - motion
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[modern-tui-motion-is-event-loop-driven]]"
  - "[[command-tui-motion-is-lifecycle-feedback]]"
---

# Textual Animation 证据卡

## 离线摘要
Textual Animation 指南展示现代 full-screen TUI 可以直接为 widget 属性定义持续时间、速度、延迟、缓动和完成回调。它支撑“现代 TUI 动效是 event-loop / widget-state 驱动”的判断，但不意味着 command-mode CLI 应照搬 full-screen transition。

## 原文短摘录
> “Textual has a powerful animation system.”

> “You can animate properties on widgets.”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_c90b92764e5d4eb7a01150627f16c305` (`archived`, backend `node`)
- web archive artifact: `artifact_30907759fa5f43b38be2fe8c05bba39e` (9,226 chars)
- DAG: `node_6b0c8f36567846fe8fbdf26b1cffb445` <= supports = `evidence_c90b92764e5d4eb7a01150627f16c305`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_30907759fa5f43b38be2fe8c05bba39e") | .body'`

## 原文离线释义
Textual 代表 app-profile：它有 widget tree、消息循环、状态变化和持续渲染，因此可以设计 transition。cdp-cli 的 command-profile 只能借鉴 motion token，而不能把 transition 当作默认命令输出。

## 可支撑的规范条款
- Full-screen TUI 可以有 transition token。
- Command-mode TUI 应把 transition 标记为 `transition-fullscreen-only`。
- 现代 TUI 动效需要 duration、easing、delay、completion 等参数化约束。

## 连接
- [[modern-tui-motion-is-event-loop-driven]] — 支撑现代 TUI 动效机制判断。
- [[command-tui-motion-is-lifecycle-feedback]] — 区分 command-mode 降级边界。

