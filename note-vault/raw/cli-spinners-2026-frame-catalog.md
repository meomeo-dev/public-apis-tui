---
title: cli-spinners Frame Catalog 证据卡
created: 2026-05-02
author: Sindre Sorhus
year: 2026
source: "https://github.com/sindresorhus/cli-spinners"
evidence-id: "evidence_0c16b87dd4ca425287219fe744886cf5"
archive-evidence-id: "evidence_0c16b87dd4ca425287219fe744886cf5"
archive-artifact-id: "artifact_88b828c529dc4dfb899371398bb37cdb"
archive-status: archived
archive-backend: node
dag-node: "node_6b0c8f36567846fe8fbdf26b1cffb445"
trust-level: 4
retrieved: 2026-05-02
tags:
  - raw-source
  - cli
  - spinner
  - motion
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[modern-tui-motion-is-event-loop-driven]]"
  - "[[command-tui-motion-is-lifecycle-feedback]]"
---

# cli-spinners Frame Catalog 证据卡

## 离线摘要
cli-spinners 将 spinner 定义为 frame 序列与 interval。它说明现代 CLI 动效可以被抽象成 token：帧集合、刷新间隔、符号宽度、终端兼容性和 fallback。

## 原文短摘录
> “Spinners for use in the terminal.”

> “The list of spinners is just a JSON file.”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_0c16b87dd4ca425287219fe744886cf5` (`archived`, backend `node`)
- web archive artifact: `artifact_88b828c529dc4dfb899371398bb37cdb` (5,603 chars)
- DAG: `node_6b0c8f36567846fe8fbdf26b1cffb445` <= supports = `evidence_0c16b87dd4ca425287219fe744886cf5`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_88b828c529dc4dfb899371398bb37cdb") | .body'`

## 原文离线释义
Spinner token 不只是图案，也包含 interval。规范不能只说“显示 spinner”，还要约束频率、符号集、宽度、no-color/reduced-motion fallback 和结束清理。

## 可支撑的规范条款
- Spinner 应作为 motion token，而不是任意选择动画。
- Spinner token 至少包含 frames、interval、fallback。
- 高频或闪烁型 spinner 不适合默认 command-mode TUI。

## 连接
- [[modern-tui-motion-is-event-loop-driven]] — 支撑 frame/interval 模型。
- [[command-tui-motion-is-lifecycle-feedback]] — 支撑 spinner fallback 与 suppression。

