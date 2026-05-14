---
title: PatternFly CLI Handbook 证据卡
created: 2026-05-02
author: PatternFly
year: 2025
source: "https://www.patternfly.org/developer-resources/cli-handbook/"
evidence-id: "evidence_fcbd4f7d737c442897dce53a8aa1efa1"
archive-evidence-id: "evidence_c63a2e241e274532b81ad371822a2e1f"
archive-artifact-id: "artifact_33f97614f83a43ad98ccc23a412add3e"
archive-status: archived
archive-backend: node
dag-node: "node_d8b21f20c21a4a3384cb44835c3e1917"
trust-level: 5
retrieved: 2026-05-02
tags:
  - raw-source
  - cli
  - accessibility
note-type: "[[raw-source]]"
links:
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
  - "[[tui-ux-patterns-are-interaction-contracts]]"
  - "[[command-mode-tui-preserves-cli-contracts]]"
---

# PatternFly CLI Handbook 证据卡

## 离线摘要
PatternFly CLI Handbook 从设计系统角度整理 CLI 命令结构、文本、反馈、可访问性、非交互模式、结构化输出和颜色使用。它强调不要只用颜色传递信息，prompt 和反馈要清晰，交互模式不能阻断自动化。

## 原文短摘录
> “Do not use interactive mode for”

> “Automated commands, such as in CI/CD pipelines.”

> “prioritize flags for essential inputs”

## 本地原文归档
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- archive evidence: `evidence_c63a2e241e274532b81ad371822a2e1f` (`archived`, backend `node`)
- web archive artifact: `artifact_33f97614f83a43ad98ccc23a412add3e` (9,950 chars)
- DAG: `node_d8b21f20c21a4a3384cb44835c3e1917` <= supports = `evidence_c63a2e241e274532b81ad371822a2e1f`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_33f97614f83a43ad98ccc23a412add3e") | .body'`

## 原文离线释义
PatternFly 的 CLI handbook 明确区分何时适合 interactive mode：setup、初始化、可选配置、profile/environment selection；不适合简单一次性任务、重复任务、CI/CD 自动化和可由 flags 传入的 essential inputs。规范文件引用时，应把它作为 guided mode 范围和 prompt 适用边界的证据。

## 可支撑的规范条款
- CLI/TUI 的状态必须有文本冗余，不能仅依赖颜色或符号。
- 交互模式适合 setup、配置、选择等场景，不适合 CI 和重复任务。
- 规范应包含 `--guided`、`--non-interactive`、`--yes` 等模式边界。

## 连接
- [[raw/deep-research-2026-tui-web-archive-index]] — 本卡原文归档的总索引。
- [[tui-ux-patterns-are-interaction-contracts]] — 支撑交互发现、反馈和可访问性。
- [[command-mode-tui-preserves-cli-contracts]] — 支撑 command-interaction-profile。
