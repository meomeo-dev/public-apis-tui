---
title: WAI-ARIA 键盘接口实践证据卡
created: 2026-05-02
author: W3C WAI
year: 2026
source: "https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/"
evidence-id: "evidence_1a139b5db172400aa294086c8b33d303"
archive-evidence-id: "evidence_bf1f7b283e00495282a9943e6657b4bc"
archive-artifact-id: "artifact_f7f3966d5f314540ab731bdbdafbebd3"
archive-status: archived
archive-backend: node
dag-node: "node_d8b21f20c21a4a3384cb44835c3e1917"
trust-level: 5
retrieved: 2026-05-02
tags:
  - raw-source
  - accessibility
  - keyboard
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[tui-ux-patterns-are-interaction-contracts]]"
---

# WAI-ARIA 键盘接口实践证据卡

## 离线摘要
WAI-ARIA APG 的键盘接口实践提供焦点顺序、可见焦点、focus 与 selection 区分、组合控件导航、快捷键冲突和可发现性的原则。虽然它源自 Web/ARIA，但这些原则可迁移到 TUI 的键盘优先交互规范。

## 原文短摘录
> “Focus and selection are quite different.”

> “distinguish the keyboard focus indicator”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_bf1f7b283e00495282a9943e6657b4bc` (`archived`, backend `node`)
- web archive artifact: `artifact_f7f3966d5f314540ab731bdbdafbebd3` (35,593 chars)
- DAG: `node_d8b21f20c21a4a3384cb44835c3e1917` <= supports = `evidence_bf1f7b283e00495282a9943e6657b4bc`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_f7f3966d5f314540ab731bdbdafbebd3") | .body'`

## 原文离线释义
WAI-ARIA APG 把 focus 解释为键盘用户导航路径的当前位置，把 selection 解释为控件内可执行的选择操作。规范文件引用时，应将 TUI 中的 focus、selection、active screen、cursor 四种状态分开定义，避免把焦点高亮和选中状态混成一个视觉样式。

## 可支撑的规范条款
- TUI 必须区分 focus、selection、active screen。
- 所有核心动作必须键盘可达，并且焦点状态必须可见。
- 快捷键应有作用域、冲突处理和替代路径。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[tui-ux-patterns-are-interaction-contracts]] — 支撑 focus/selection/navigation contract。
