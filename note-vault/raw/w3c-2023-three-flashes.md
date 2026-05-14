---
title: WCAG Three Flashes 证据卡
created: 2026-05-02
author: W3C WAI
year: 2023
source: "https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html"
evidence-id: "evidence_474b854a1a2849e9bd7431b5c3b8d64c"
archive-evidence-id: "evidence_474b854a1a2849e9bd7431b5c3b8d64c"
archive-artifact-id: "artifact_30fd1bf6f5c5473a8a3776dbcfab0e32"
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
---

# WCAG Three Flashes 证据卡

## 离线摘要
WCAG Three Flashes 约束闪烁内容，避免触发癫痫或身体反应风险。对终端动效而言，这意味着不要使用高频闪烁、强对比闪烁、快速反色或持续注意力闪烁来表达 warning/error/loading。

## 原文短摘录
> “Web pages do not contain anything that flashes more than three times in any one second period.”

> “or the flash is below the general flash and red flash thresholds.”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_474b854a1a2849e9bd7431b5c3b8d64c` (`archived`, backend `node`)
- web archive artifact: `artifact_30fd1bf6f5c5473a8a3776dbcfab0e32` (20,227 chars)
- DAG: `node_8547332a847442ed9500f35edfe28d50` <= supports = `evidence_474b854a1a2849e9bd7431b5c3b8d64c`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_30fd1bf6f5c5473a8a3776dbcfab0e32") | .body'`

## 原文离线释义
终端 spinner 不应通过闪烁、快速反色或高频刷新吸引注意。即使终端动效通常只是字符帧，也应限制频率和对比变化，并在结束时清理 transient line。

## 可支撑的规范条款
- 禁止闪烁型 warning/error 动效。
- spinner/progress 必须限频，不能高频刷屏。
- 终态必须静态化，不得持续循环强调。

## 连接
- [[command-tui-motion-is-lifecycle-feedback]] — 支撑 no-flash 与静态终态规则。

