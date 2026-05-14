---
title: Log
created: 2026-05-02
tags:
  - system
  - log
---

# Log

## [2026-05-02] init | Vault 初始化
- 新建了: index.md, log.md, daily/, raw/, templates/, slides/, assets/
- Daily: [[daily/2026-05-02]]
- 模板: daily.TEMPLATE.md, literature.TEMPLATE.md, permanent.TEMPLATE.md, moc.TEMPLATE.md
- lint: obsidian-md-lint 0 issue, vault-naming-lint 0 issue

## [2026-05-02] research | TUI 设计系统
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- raw: [[raw/deepseek-2026-tui-basic-source-map]], [[raw/deepseek-2026-tui-ux-source-map]], [[raw/deepseek-2026-tui-aesthetic-source-map]]
- 新建了: [[tui-design-system-moc]], [[tui-design-systems-are-layered-constraints]], [[terminal-substrate-determines-tui-primitives]], [[tui-ux-patterns-are-interaction-contracts]], [[tui-aesthetics-are-tokenized-constraints]]
- 审计: 基本原理、UX/UI、设计美学均通过

## [2026-05-02] research | 命令模式 TUI 差异
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`
- 新建了: [[command-mode-tui-preserves-cli-contracts]]
- 更新了: [[tui-ux-patterns-are-interaction-contracts]], [[tui-design-system-moc]], [[index]]
- 结论: CLI command TUI 应默认采用 `command-interaction-profile`，保留 args/flags/stdin/stdout/stderr/exit code 和非交互路径。

## [2026-05-02] evidence | TUI 关键证据离线卡
- 新建 raw: [[raw/ecma-1991-control-functions]], [[raw/xterm-2025-control-sequences]], [[raw/ncurses-2026-terminfo]], [[raw/unicode-2025-east-asian-width]], [[raw/ratatui-2026-terminal-abstraction]]
- 新建 raw: [[raw/clig-2025-command-line-guidelines]], [[raw/fuchsia-2025-cli-guidance]], [[raw/salesforce-2026-cli-interactivity]], [[raw/heroku-2025-cli-style-guide]], [[raw/patternfly-2025-cli-handbook]]
- 新建 raw: [[raw/w3c-2026-aria-keyboard]], [[raw/w3c-2025-design-tokens]], [[raw/w3c-2023-wcag-color-motion]], [[raw/rich-2025-console-api]]
- 更新了: [[tui-design-system-moc]], [[terminal-substrate-determines-tui-primitives]], [[tui-ux-patterns-are-interaction-contracts]], [[command-mode-tui-preserves-cli-contracts]], [[tui-aesthetics-are-tokenized-constraints]]

## [2026-05-02] evidence | deep-research 原文归档
- 使用 `deep-research evidence_archive` 为 14 个关键来源生成 `web_archive` 原文工件，并链接进 DAG 支撑节点。
- 新建 raw: [[raw/deep-research-2026-tui-web-archive-index]]
- 更新 raw: 为每张证据卡补充 `archive-evidence-id`、`archive-artifact-id`、DAG 支撑边和全文查看命令。
- 备注: Salesforce 页面 `node` backend 403，已改用 `crawl4ai` 成功归档；降级记录只作为 `annotates` 审计边，不作为支撑边。

## [2026-05-02] research | TUI UI components 与命令 layout
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`, snapshot `version_9f4c3703f62d4bb59688c9c36769c155`
- deepseek: 使用 `--search on` 生成组件来源路线图，并由 deep-research 归档/验证关键来源。
- 新建了: [[command-mode-tui-components-are-projections]], [[command-tui-layout-is-block-contract]]
- 新建 raw: [[raw/deepseek-2026-tui-components-source-map]], [[raw/rich-2026-tables]], [[raw/rich-2026-progress]], [[raw/charmbracelet-2026-bubbles]], [[raw/ubuntu-2020-empty-states]], [[raw/ratatui-2026-widgets]], [[raw/textual-2026-widget-gallery]]
- 更新了: [[tui-design-system-moc]], [[index]], [[raw/deep-research-2026-tui-web-archive-index]]
- 结论: command-mode TUI components 是 JSON result / stderr lifecycle 的投影；每次命令 layout 应用 YAML block contract 区分常驻与命令变化部分。

## [2026-05-02] research | TUI UI components 状态动效
- deep-research: `research_d20a7e0ec2774bfd8904fd1736c72d1b`, snapshot `version_6fe254b57ac64347b9d487b665899ae2`
- deepseek: 使用 `--search on` 收集状态动效候选来源，并由 deep-research 归档/验证关键来源。
- 新建了: [[command-tui-motion-is-lifecycle-feedback]]
- 新建 raw: [[raw/deepseek-2026-tui-motion-source-map]], [[raw/w3c-2023-animation-from-interactions]], [[raw/w3c-2023-three-flashes]], [[raw/carbon-2026-motion-overview]], [[raw/carbon-2026-inline-loading]], [[raw/rich-2026-console-status]], [[raw/charmbracelet-2026-spinner]]
- 更新了: [[tui-design-system-moc]], [[index]], [[raw/deep-research-2026-tui-web-archive-index]], [[command-mode-tui-components-are-projections]], [[command-tui-layout-is-block-contract]], [[tui-aesthetics-are-tokenized-constraints]]
- 结论: running/loading/retrying 等 transient 状态可动；success/warning/error/empty/partial/cancelled/timeout 等 final 状态必须静态化，所有动效走 stderr 且支持 reduced-motion/CI/pipe/json 降级。

## [2026-05-02] audit | TUI 动效笔记影响面审计
- 审计范围: [[command-tui-motion-is-lifecycle-feedback]], [[modern-tui-motion-is-event-loop-driven]], [[tui-design-system-moc]], [[index]], [[raw/deep-research-2026-tui-web-archive-index]]。
- 新建了: [[modern-tui-motion-is-event-loop-driven]]
- 新建 raw: [[raw/textual-2026-animation]], [[raw/textual-2026-loading-progress]], [[raw/bubbletea-2026-tick-loop]], [[raw/ratatui-2026-render-event-loop]], [[raw/ora-2026-spinner]], [[raw/cli-spinners-2026-frame-catalog]], [[raw/deepseek-2026-modern-tui-motion-search]]
- 修复: 将 DeepSeek 联网搜索明确降级为候选来源审计，不作为最终支撑证据；补齐现代 full-screen TUI 与 command-mode 动效的区分。
- 清理: 保持 final state 静态化结论不变，新增 event-loop/tick/render-loop 证据作为上游机制说明。

## [2026-05-09] archive | research-reports 归档
- 移动: `research-reports/*.md` → `note-vault/reports/research-reports/`
- 归档文件: `public-apis-host-t-com-blocked-2026-05-08.md`, `public-apis-http2-pro-blocked-2026-05-08.md`, `tui-design-system-artifacts.md`, `tui-design-system-research.md`, `tui-design-system-research-updated.md`
- 清理: 删除空目录 `research-reports/`
