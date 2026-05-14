---
title: WCAG 色彩与动态约束证据卡
created: 2026-05-02
author: W3C WAI
year: 2023
source: "https://www.w3.org/WAI/WCAG22/"
evidence-id: "evidence_61bc189da47e4282b474162c42c9d6ba"
archive-evidence-id: "evidence_468d7adc2af642988929528a42837530"
archive-artifact-id: "artifact_344c2da7e3f54bf89f448c3cd8a8ef81"
archive-status: archived
archive-backend: node
dag-node: "node_ed9ca338c90e41e1a9403ed39721b509"
trust-level: 5
retrieved: 2026-05-02
tags:
  - raw-source
  - accessibility
  - design-tokens
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[tui-aesthetics-are-tokenized-constraints]]"
  - "[[tui-ux-patterns-are-interaction-contracts]]"
---

# WCAG 色彩与动态约束证据卡

## 离线摘要
WCAG 2.2 的 Use of Color、Contrast Minimum、Focus Appearance、Pause Stop Hide 等条款共同约束颜色、对比、焦点和动态内容。对 TUI 来说，这些条款要求颜色不能是唯一语义，焦点必须可辨认，持续运动/闪烁要能停止或降级。

## 原文短摘录
> “Color is not used as the only visual means”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_468d7adc2af642988929528a42837530` (`archived`, backend `node`)
- web archive artifact: `artifact_344c2da7e3f54bf89f448c3cd8a8ef81` (155,349 chars)
- DAG: `node_ed9ca338c90e41e1a9403ed39721b509` <= supports = `evidence_468d7adc2af642988929528a42837530`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_344c2da7e3f54bf89f448c3cd8a8ef81") | .body'`

## 原文离线释义
WCAG 1.4.1 的核心要求是：颜色不能是传达信息、指示动作、提示响应或区分元素的唯一视觉手段。规范文件引用时，应把 TUI 的 error、warning、success、selection、focus 都定义为“文本/符号/形状 + 颜色增强”，而不是纯颜色语义。

## 可支撑的规范条款
- status、error、selection、focus 不能只靠颜色表达。
- spinner、blink、scrolling text 必须有静态文本 fallback。
- 实际终端主题不可控，因此规范需要 no-color 和 high-contrast profile。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[tui-aesthetics-are-tokenized-constraints]] — 支撑 color/motion/focus token 的可访问性约束。
- [[tui-ux-patterns-are-interaction-contracts]] — 支撑状态文本冗余与键盘可达。
