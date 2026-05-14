---
title: Unicode East Asian Width 证据卡
created: 2026-05-02
author: Unicode Consortium
year: 2025
source: "https://www.unicode.org/reports/tr11/"
evidence-id: "evidence_16a67acd16a447dfa051900d16df5af4"
archive-evidence-id: "evidence_2254291258c142fd93dc9438517a4bb7"
archive-artifact-id: "artifact_cd2fa8e999c841fb956f2cd73a742110"
archive-status: archived
archive-backend: node
dag-node: "node_b8590c2f02c045799b8ee813cb1f32f8"
trust-level: 5
retrieved: 2026-05-02
tags:
  - raw-source
  - tui
  - unicode
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[terminal-substrate-determines-tui-primitives]]"
---

# Unicode East Asian Width 证据卡

## 离线摘要
Unicode UAX #11 定义 East_Asian_Width 属性，用于固定宽度文本处理中判断字符宽度。但该属性本身也提醒：现代终端实际显示宽度可能受上下文、字体和实现影响。

## 原文短摘录
> “not intended for use by modern terminal emulators”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_2254291258c142fd93dc9438517a4bb7` (`archived`, backend `node`)
- web archive artifact: `artifact_cd2fa8e999c841fb956f2cd73a742110` (28,474 chars)
- DAG: `node_b8590c2f02c045799b8ee813cb1f32f8` <= supports = `evidence_2254291258c142fd93dc9438517a4bb7`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_cd2fa8e999c841fb956f2cd73a742110") | .body'`

## 原文离线释义
UAX #11 明确提醒 East_Asian_Width 不能被现代终端模拟器直接当作开箱即用的宽度规则。规范文件引用时，应把它作为 display width 风险依据，而不是唯一算法依据。TUI 规范需要单独定义 ambiguous width、emoji、combining marks 和字体差异的处理策略。

## 可支撑的规范条款
- TUI 布局不能用字节数或字符数代替 display width。
- 表格、截断、对齐、边框和高亮需要 display-width 策略。
- ambiguous width 必须作为国际化风险处理，而不是假设全局一致。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[terminal-substrate-determines-tui-primitives]] — Unicode 宽度是字符网格布局的关键风险。
