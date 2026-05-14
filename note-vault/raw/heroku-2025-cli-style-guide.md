---
title: Heroku CLI 风格指南证据卡
created: 2026-05-02
author: Heroku
year: 2025
source: "https://devcenter.heroku.com/articles/cli-style-guide"
evidence-id: "evidence_08addcacd127460ea3028a5b8dd32b73"
archive-evidence-id: "evidence_2ee7a7a90818401abe6d0db3893fde4c"
archive-artifact-id: "artifact_493d28ec298f4a9fbdbb8d3c292ac217"
archive-status: archived
archive-backend: node
dag-node: "node_72e52d90b8ac4248bd74ffd8329646f2"
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

# Heroku CLI 风格指南证据卡

## 离线摘要
Heroku CLI 风格指南区分 output commands 与 action commands，要求进度和 out-of-band 信息走 stderr，脚本场景提供 JSON/terse 输出，prompt 要能通过参数或 flags 绕过，非 TTY 时禁用颜色。

## 原文短摘录
> “Actions are displayed on stderr because they are out-of-band information on a running task.”

> “offer a `--json` and/or a `--terse` flag”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_2ee7a7a90818401abe6d0db3893fde4c` (`archived`, backend `node`)
- web archive artifact: `artifact_493d28ec298f4a9fbdbb8d3c292ac217` (16,102 chars)
- DAG: `node_72e52d90b8ac4248bd74ffd8329646f2` <= supports = `evidence_2ee7a7a90818401abe6d0db3893fde4c`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_493d28ec298f4a9fbdbb8d3c292ac217") | .body'`

## 原文离线释义
Heroku 指南把 action 信息、spinner、警告、错误等运行中信息归为 out-of-band，并放到 stderr；同时建议在需要机器解析时提供 `--json` 或 `--terse`。规范文件引用时，应把它作为 stdout/stderr 分流和 TTY-only progress 的证据。

## 可支撑的规范条款
- 命令结果和交互状态必须分通道：stdout 结果，stderr 进度/提示/诊断。
- prompt 与确认必须可绕过，才能支持 CI 和脚本。
- command-mode TUI 的 loading/progress 只应在 TTY surface 显示。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[command-mode-tui-preserves-cli-contracts]] — 支撑 action/output command 差异。
