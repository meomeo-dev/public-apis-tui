---
title: 命令 TUI layout 是稳定 block 契约
created: 2026-05-02
updated: 2026-05-02
aliases:
  - command TUI layout
  - TUI block layout
tags:
  - permanent-note
note-type: "[[permanent-note]]"
status: evergreen
maturity: evergreen
links:
  - "[[command-mode-tui-components-are-projections]]"
  - "[[command-mode-tui-preserves-cli-contracts]]"
  - "[[tui-aesthetics-are-tokenized-constraints]]"
  - "[[raw/patternfly-2025-cli-handbook]]"
  - "[[raw/clig-2025-command-line-guidelines]]"
  - "[[raw/ubuntu-2020-empty-states]]"
  - "[[raw/rich-2026-tables]]"
  - "[[command-tui-motion-is-lifecycle-feedback]]"
graph-label: Concept
graph-relations:
  - target: "[[command-mode-tui-components-are-projections]]"
    relation: TO
    why: "layout block 是组件投影的组织方式"
  - target: "[[command-mode-tui-preserves-cli-contracts]]"
    relation: TO
    why: "layout 必须保留 stdout/stderr 和 JSON 契约"
  - target: "[[tui-aesthetics-are-tokenized-constraints]]"
    relation: TO
    why: "layout 的视觉层级需要 token 与 fallback"
  - target: "[[raw/patternfly-2025-cli-handbook]]"
    relation: OF
    why: "提供 CLI prompt、error、help 与非交互证据"
  - target: "[[raw/clig-2025-command-line-guidelines]]"
    relation: OF
    why: "提供 stdout/stderr、pipe 和 prompt 边界证据"
  - target: "[[raw/ubuntu-2020-empty-states]]"
    relation: OF
    why: "提供 empty state 与格式保持依据"
  - target: "[[raw/rich-2026-tables]]"
    relation: OF
    why: "提供 details block 中表格布局证据"
---

# 命令 TUI layout 是稳定 block 契约

## 主张
每次 CLI 命令的 readable TUI layout 应是一组稳定 block slot，而不是每个命令随意组织的文本。

## 论证
用户运行命令时需要快速回答同一组问题：这是什么命令、是否成功、影响哪个 site/profile/session、关键结果是什么、证据在哪里、下一步做什么。稳定 layout block 能把这些判断变成肌肉记忆，同时允许每个命令把自己的数据投影到对应 block。常驻的是通道规则、block 顺序、header/context/status/summary/evidence/next steps 这些槽位与 fallback；变化的是命令标题、字段 label、表格列、列表 item schema、证据字段、空状态文案、next command 和站点 / API 专属内容。这样既保持设计系统一致性，又不会把不同网站的 UX 行为硬塞进通用模板。

## YAML 结构

```yaml
command_output_layout:
  profile: command-interaction
  stdout:
    role: selected_format_result
    persistent_blocks:
      - header
      - context
      - status
      - summary
      - details
      - evidence
      - diagnostics
      - next_steps
    command_variable_blocks:
      - command_title
      - context_fields
      - status_labels
      - summary_fields
      - detail_schema
      - evidence_fields
      - remediation_commands
      - site_api_specific_projection
  stderr:
    role: lifecycle_diagnostics
    persistent_blocks:
      - progress
      - error
      - prompt
    command_variable_blocks:
      - progress_events
      - error_code_mapping
      - confirmation_copy
      - retry_hint
  excluded_from_command_mode_defaults:
    - persistent_footer
    - tabs
    - tree_navigation
    - modal_overlay
    - viewport_pane
    - command_palette
```

## 连接
- [[command-mode-tui-components-are-projections]] — 解释 block 内组件的性质。
- [[command-mode-tui-preserves-cli-contracts]] — 解释 layout 为什么必须按通道拆分。
- [[tui-aesthetics-are-tokenized-constraints]] — 解释 layout 的视觉表达为什么必须可降级。
- [[raw/patternfly-2025-cli-handbook]] 与 [[raw/clig-2025-command-line-guidelines]] — CLI 输出、错误和交互边界证据。

