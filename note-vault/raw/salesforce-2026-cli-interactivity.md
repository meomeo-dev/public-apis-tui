---
title: Salesforce CLI 交互与 JSON 输出证据卡
created: 2026-05-02
author: Salesforce
year: 2026
source: "https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/interactivity.html"
evidence-id: "evidence_5b5e9424032944d2bafb69ccd476a0e7"
archive-evidence-id: "evidence_8c4e75bb9764479bae1367fcc65b4ffc"
archive-artifact-id: "artifact_9a359224426542639cc503de4bdcd03c"
archive-status: archived
archive-backend: crawl4ai
dag-node: "node_72e52d90b8ac4248bd74ffd8329646f2"
degraded-archive-evidence-id: "evidence_e4cc41fe466947faa6462f2453683d18"
trust-level: 5
retrieved: 2026-05-02
tags:
  - raw-source
  - cli
  - command-mode-tui
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[command-mode-tui-preserves-cli-contracts]]"
---

# Salesforce CLI 交互与 JSON 输出证据卡

## 离线摘要
Salesforce CLI 文档说明 prompt 可以改善体验，但在 JSON 输出或脚本化场景中必须保持 stdout 可解析，并通过 flags 提供 prompt 输入的非交互替代。

## 原文短摘录
> “ask as few questions as possible”

> “the JSON output in stdout must be parsable”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_8c4e75bb9764479bae1367fcc65b4ffc` (`archived`, backend `crawl4ai`)
- web archive artifact: `artifact_9a359224426542639cc503de4bdcd03c` (1,615 chars)
- DAG: `node_72e52d90b8ac4248bd74ffd8329646f2` <= supports = `evidence_8c4e75bb9764479bae1367fcc65b4ffc`
- 降级记录: `evidence_e4cc41fe466947faa6462f2453683d18` 是 `node` backend 403，在 DAG 中只以 `annotates` 记录归档失败，不作为支撑边使用。
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_9a359224426542639cc503de4bdcd03c") | .body'`

## 原文离线释义
Salesforce 文档把交互问题数、用户疲劳和 JSON 可解析性放在一起讨论。若命令支持 `--json`，prompt 混入 stdout 会破坏解析。规范文件引用时，应把它作为 “prompt suppression under `--json`” 和 “每个 prompt 必须有 flag 替代” 的证据。

## 可支撑的规范条款
- `--json` 或机器可读输出模式必须关闭交互 prompt 和装饰性输出。
- 每个 prompt 字段都要有 flag、配置、环境变量或 stdin 替代。
- command-mode TUI 的交互层不能破坏自动化输出契约。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[command-mode-tui-preserves-cli-contracts]] — 支撑 JSON/scriptable mode 与 prompt suppression。
