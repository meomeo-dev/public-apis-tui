---
title: TUI 设计系统是分层约束栈
created: 2026-05-02
updated: 2026-05-02
aliases:
  - TUI 分层设计系统
  - TUI layered design system
tags:
  - permanent-note
note-type: "[[permanent-note]]"
status: evergreen
maturity: evergreen
links:
  - "[[terminal-substrate-determines-tui-primitives]]"
  - "[[tui-ux-patterns-are-interaction-contracts]]"
  - "[[tui-aesthetics-are-tokenized-constraints]]"
graph-label: Concept
graph-relations:
  - target: "[[terminal-substrate-determines-tui-primitives]]"
    relation: TO
    why: "基本原理层提供 TUI 设计系统的可行性边界"
  - target: "[[tui-ux-patterns-are-interaction-contracts]]"
    relation: TO
    why: "UX/UI 层把媒介约束转化为可操作的交互契约"
  - target: "[[tui-aesthetics-are-tokenized-constraints]]"
    relation: TO
    why: "美学层在不破坏交互契约的前提下提供一致表达"
---

# TUI 设计系统是分层约束栈

## 主张
TUI 设计系统应按“基本原理 → UX/UI → 设计美学”三层推进，而不是先从组件或视觉风格开始。

## 论证
终端不是像素画布，而是字符网格、控制序列、能力协商、输入模式和渲染状态共同构成的受限媒介。因此设计系统的第一层必须先回答“这个终端环境能稳定表达什么”。在这个地基上，UX/UI 层再定义 screen、navigation、binding、form、collection、feedback、recovery 等交互契约，确保每个模式有发现路径、恢复路径和 fallback。最后，美学层才能把 type、space、color、border、symbol、motion、theme 和 density token 化。这个顺序不能倒置：美学必须服从 UX contract，UX contract 必须服从终端能力。否则 TUI 会看起来丰富，却在小窗口、无颜色、无鼠标、脚本化输出或终端异常退出时失效。

## 连接
- [[terminal-substrate-determines-tui-primitives]] — 说明第一层为什么必须从终端媒介限制开始。
- [[tui-ux-patterns-are-interaction-contracts]] — 说明第二层如何把媒介限制变成用户可操作的界面行为。
- [[tui-aesthetics-are-tokenized-constraints]] — 说明第三层为什么只能是可降级的语义 token，而不是装饰。
