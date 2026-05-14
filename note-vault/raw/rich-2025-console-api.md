---
title: Rich Console API 证据卡
created: 2026-05-02
author: Textualize
year: 2025
source: "https://rich.readthedocs.io/en/latest/console.html"
evidence-id: "evidence_7a7cb99fbc6544eaa8be9fcff230f51f"
archive-evidence-id: "evidence_83f8e2e4e73842a49c418556470e080f"
archive-artifact-id: "artifact_c481c3ffad5e437f985d9b42c0f610a3"
archive-status: archived
archive-backend: node
dag-node: "node_ed9ca338c90e41e1a9403ed39721b509"
trust-level: 4
retrieved: 2026-05-02
tags:
  - raw-source
  - tui
  - terminal
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[tui-aesthetics-are-tokenized-constraints]]"
  - "[[command-mode-tui-preserves-cli-contracts]]"
---

# Rich Console API 证据卡

## 离线摘要
Rich Console API 体现现代终端输出库如何处理 color system、no-color、truecolor、Windows、非终端输出、overflow/cropping、status spinner 和 alternate screen。这是把设计系统 token 映射到真实终端能力的实现层证据。

## 原文短摘录
> “auto-detect the capabilities of the terminal”

> “strip control codes from the output”

> “remove animations such as progress bars”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_83f8e2e4e73842a49c418556470e080f` (`archived`, backend `node`)
- web archive artifact: `artifact_c481c3ffad5e437f985d9b42c0f610a3` (19,815 chars)
- DAG: `node_ed9ca338c90e41e1a9403ed39721b509` <= supports = `evidence_83f8e2e4e73842a49c418556470e080f`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_c481c3ffad5e437f985d9b42c0f610a3") | .body'`

## 原文离线释义
Rich 文档说明 Console 会检测终端能力、转换颜色；在非终端输出时去除控制码；非交互输出时移除 progress/status 等动画。规范文件引用时，应把 Rich 作为 TTY-aware rendering、plain output、no-color、progress fallback 的实现参考。

## 可支撑的规范条款
- 输出库应检测终端能力，并提供 no-color/plain fallback。
- status/spinner 属于 TTY 增强，不能污染机器可读输出。
- overflow、crop、wrap 是命令输出规范的一部分。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[tui-aesthetics-are-tokenized-constraints]] — 支撑能力映射与 fallback。
- [[command-mode-tui-preserves-cli-contracts]] — 支撑 TTY-only progress 和 plain output。
