---
title: Rich Console Status 证据卡
created: 2026-05-02
author: Textualize
year: 2026
source: "https://rich.readthedocs.io/en/latest/console.html"
evidence-id: "evidence_bf71c86f760945b385ed34fff7cd65e2"
archive-evidence-id: "evidence_bf71c86f760945b385ed34fff7cd65e2"
archive-artifact-id: "artifact_18fca3a5b87d45a3a8c7bf2f923c6917"
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
  - "[[raw/rich-2026-progress]]"
---

# Rich Console Status 证据卡

## 离线摘要
Rich Console status 提供在长任务执行期间显示临时 status 和 spinner 的终端组件证据。它支撑 command-mode TUI 中“状态动效属于 lifecycle feedback”的定位：运行中显示，结束后清理，并输出静态最终结果。

## 原文短摘录
> “For long running tasks, you can use the `status` method.”

> “The status display will show a 'spinner' animation.”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_bf71c86f760945b385ed34fff7cd65e2` (`archived`, backend `node`)
- web archive artifact: `artifact_18fca3a5b87d45a3a8c7bf2f923c6917` (19,815 chars)
- DAG: `node_8547332a847442ed9500f35edfe28d50` <= supports = `evidence_bf71c86f760945b385ed34fff7cd65e2`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_18fca3a5b87d45a3a8c7bf2f923c6917") | .body'`

## 原文离线释义
status spinner 适合浏览器启动、等待登录、等待 selector、导入导出 session 等命令生命周期事件。它不适合写入 stdout，也不适合出现在 JSON output 中。

## 可支撑的规范条款
- spinner/status 只在 TTY stderr 中显示。
- transient line 必须在最终结果前清理。
- 长任务结束后必须输出静态 final state。

## 连接
- [[command-tui-motion-is-lifecycle-feedback]] — 支撑 status spinner 作为生命周期反馈。
- [[raw/rich-2026-progress]] — 进度组件证据。

