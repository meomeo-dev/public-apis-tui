---
title: ECMA-48 控制函数标准证据卡
created: 2026-05-02
author: ECMA International
year: 1991
source: "https://ecma-international.org/publications-and-standards/standards/ecma-48/"
evidence-id: "evidence_5c7ba7f8ed9746baba4883a9c709cef0"
archive-evidence-id: "evidence_c35b8caba26148d3b8bfa78753ec308a"
archive-artifact-id: "artifact_10796643df2f43cdadea5d2b7d96497a"
archive-status: archived
archive-backend: node
dag-node: "node_b8590c2f02c045799b8ee813cb1f32f8"
trust-level: 5
retrieved: 2026-05-02
tags:
  - raw-source
  - tui
  - terminal
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[terminal-substrate-determines-tui-primitives]]"
---

# ECMA-48 控制函数标准证据卡

## 离线摘要
ECMA-48 是字符编码数据中控制函数的标准来源，覆盖 7-bit 与 8-bit 控制函数。对 TUI 设计系统来说，它提供了控制序列、光标控制、擦除、样式等终端输出协议的标准底座。

## 原文短摘录
> “Control functions for coded character sets”

> “5th edition, June 1991”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_c35b8caba26148d3b8bfa78753ec308a` (`archived`, backend `node`)
- web archive artifact: `artifact_10796643df2f43cdadea5d2b7d96497a` (4,123 chars)
- DAG: `node_b8590c2f02c045799b8ee813cb1f32f8` <= supports = `evidence_c35b8caba26148d3b8bfa78753ec308a`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_10796643df2f43cdadea5d2b7d96497a") | .body'`

## 原文离线释义
ECMA 页面把 ECMA-48 定位为 coded character sets 的控制函数标准，并说明该标准面向 7-bit、extended 7-bit、8-bit、extended 8-bit code 的控制函数及其编码表示。规范文件引用时，应把 ECMA-48 放在“标准控制函数”层，而不是现实终端扩展层。

## 可支撑的规范条款
- TUI 输出能力必须区分标准控制函数与终端私有扩展。
- 设计系统中的 `render`、`cursor`、`screen-control` token 不能被描述为视觉装饰，而应标明协议依赖。
- 若目标终端只声明基础控制函数，复杂鼠标、alternate screen、truecolor 等能力不能默认可用。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[terminal-substrate-determines-tui-primitives]] — ECMA-48 是终端控制协议底座之一。
