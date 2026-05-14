---
title: TUI 美学是可降级的语义 token
created: 2026-05-02
updated: 2026-05-02
aliases:
  - TUI 美学 token
  - terminal aesthetics tokens
tags:
  - permanent-note
note-type: "[[permanent-note]]"
status: evergreen
maturity: evergreen
links:
  - "[[tui-design-systems-are-layered-constraints]]"
  - "[[tui-ux-patterns-are-interaction-contracts]]"
  - "[[raw/w3c-2025-design-tokens]]"
  - "[[raw/w3c-2023-wcag-color-motion]]"
  - "[[raw/rich-2025-console-api]]"
  - "[[command-tui-motion-is-lifecycle-feedback]]"
  - "[[raw/carbon-2026-motion-overview]]"
  - "[[raw/w3c-2023-animation-from-interactions]]"
  - "[[raw/xterm-2025-control-sequences]]"
graph-label: Concept
graph-relations:
  - target: "[[tui-design-systems-are-layered-constraints]]"
    relation: TO
    why: "美学层是三层设计系统的第三层"
  - target: "[[tui-ux-patterns-are-interaction-contracts]]"
    relation: TO
    why: "美学 token 必须服务交互契约"
  - target: "[[raw/w3c-2025-design-tokens]]"
    relation: OF
    why: "提供设计 token 格式和分组依据"
  - target: "[[raw/w3c-2023-wcag-color-motion]]"
    relation: OF
    why: "提供颜色、焦点、动态内容的可访问性约束"
  - target: "[[raw/rich-2025-console-api]]"
    relation: OF
    why: "提供终端样式 fallback 和 plain output 证据"
  - target: "[[raw/xterm-2025-control-sequences]]"
    relation: OF
    why: "提供 SGR 颜色与终端样式能力依据"
---

# TUI 美学是可降级的语义 token

## 主张
TUI 美学应表达为可降级的语义 token，而不是终端装饰效果的堆叠。

## 论证
终端里的颜色、边框、Unicode 符号和动画都不可靠：颜色受主题和色深影响，边框消耗列宽，符号可能宽度不一致，动画可能闪烁或影响可访问性。因此美学层不能把信息唯一地放在颜色、图标、位置或动效中。它应把 type、space、color、border、symbol、motion、theme 和 density 定义为语义 token，并为 no-color、ASCII、plain/log output、小视口和 reduced motion 提供 fallback。好的 TUI 美学来自层级稳定、密度可控、状态文案清楚和 fallback 一致，而不是高装饰度。

## 连接
- [[tui-design-systems-are-layered-constraints]] — 美学层必须放在基本原理与 UX/UI 之后。
- [[tui-ux-patterns-are-interaction-contracts]] — 美学表达不能削弱交互契约。
- [[raw/w3c-2025-design-tokens]] — token 化格式证据。
- [[raw/w3c-2023-wcag-color-motion]] — 色彩/焦点/动态约束证据。
- [[raw/rich-2025-console-api]] — 终端样式 fallback 证据。
