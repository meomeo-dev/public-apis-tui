---
title: Charmbracelet Spinner 证据卡
created: 2026-05-02
author: Charmbracelet
year: 2026
source: "https://pkg.go.dev/github.com/charmbracelet/bubbles/spinner"
evidence-id: "evidence_569c4cf58d0d41dfa37096db5c130614"
archive-evidence-id: "evidence_569c4cf58d0d41dfa37096db5c130614"
archive-artifact-id: "artifact_76684656a30848d3be768f18b3dce11c"
archive-status: archived
archive-backend: node
dag-node: "node_8547332a847442ed9500f35edfe28d50"
trust-level: 4
retrieved: 2026-05-02
tags:
  - raw-source
  - tui
  - spinner
  - motion
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[command-tui-motion-is-lifecycle-feedback]]"
  - "[[raw/charmbracelet-2026-bubbles]]"
---

# Charmbracelet Spinner 证据卡

## 离线摘要
Bubbles spinner 文档展示 spinner 是由 frames 与 FPS 组成的动画组件。它说明 spinner 不是语义本身，而是“某操作正在发生”的临时提示。对 command-mode TUI，spinner 必须限频、可关闭、可替换为离散日志。

## 原文短摘录
> “Package spinner provides a spinner component for Bubble Tea applications.”

> “Spinner is a set of frames used in animating the spinner.”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_569c4cf58d0d41dfa37096db5c130614` (`archived`, backend `node`)
- web archive artifact: `artifact_76684656a30848d3be768f18b3dce11c` (7,453 chars)
- DAG: `node_8547332a847442ed9500f35edfe28d50` <= supports = `evidence_569c4cf58d0d41dfa37096db5c130614`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_76684656a30848d3be768f18b3dce11c") | .body'`

## 原文离线释义
spinner 是帧动画，因此天然有刷新频率、终端能力和可访问性风险。规范应优先使用低频、低对比、短生命周期 spinner；在 unknown duration 场景用 spinner，在 known total 场景用 determinate progress。

## 可支撑的规范条款
- spinner 只表达 indeterminate running。
- spinner 必须有 FPS / 刷新频率上限。
- spinner 必须被 discrete stderr log fallback 替代。

## 连接
- [[command-tui-motion-is-lifecycle-feedback]] — 支撑 spinner 动效边界。
- [[raw/charmbracelet-2026-bubbles]] — 组件目录证据。

