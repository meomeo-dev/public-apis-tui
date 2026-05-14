---
title: WCAG Animation from Interactions 证据卡
created: 2026-05-02
author: W3C WAI
year: 2023
source: "https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html"
evidence-id: "evidence_111dc9bf9b594a9eb88173134164cc24"
archive-evidence-id: "evidence_111dc9bf9b594a9eb88173134164cc24"
archive-artifact-id: "artifact_85bc082257a14c578ddf7d933f5c0710"
archive-status: archived
archive-backend: node
dag-node: "node_8547332a847442ed9500f35edfe28d50"
trust-level: 5
retrieved: 2026-05-02
tags:
  - raw-source
  - accessibility
  - motion
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[command-tui-motion-is-lifecycle-feedback]]"
  - "[[tui-aesthetics-are-tokenized-constraints]]"
---

# WCAG Animation from Interactions 证据卡

## 离线摘要
WCAG Animation from Interactions 要求由交互触发的 motion animation 可以被禁用，除非该动画对功能或信息表达必不可少。对 command-mode TUI 而言，spinner、progress 和状态刷新都不能成为唯一信息来源，且必须有 reduced-motion / non-TTY fallback。

## 原文短摘录
> “Motion animation triggered by interaction can be disabled.”

> “unless the animation is essential to the functionality or the information being conveyed.”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_111dc9bf9b594a9eb88173134164cc24` (`archived`, backend `node`)
- web archive artifact: `artifact_85bc082257a14c578ddf7d933f5c0710` (7,149 chars)
- DAG: `node_8547332a847442ed9500f35edfe28d50` <= supports = `evidence_111dc9bf9b594a9eb88173134164cc24`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_85bc082257a14c578ddf7d933f5c0710") | .body'`

## 原文离线释义
动效可以帮助用户理解状态变化，但必须可关闭。CLI 场景没有浏览器的 `prefers-reduced-motion` 一致语义，因此规范应把 CI、pipe、非 TTY、`--format json`、no-animation/reduced-motion 配置都视作禁用动效信号。

## 可支撑的规范条款
- 动效不能是唯一状态语义。
- 所有动效必须有静态文本 fallback。
- 用户或环境要求 reduced motion 时，spinner/progress animation 必须关闭或降级。

## 连接
- [[command-tui-motion-is-lifecycle-feedback]] — 支撑动效只作为生命周期反馈。
- [[tui-aesthetics-are-tokenized-constraints]] — 支撑 motion token 必须可降级。

