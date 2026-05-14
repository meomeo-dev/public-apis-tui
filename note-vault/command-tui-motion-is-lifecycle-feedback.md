---
title: 命令 TUI 动效是生命周期反馈
created: 2026-05-02
updated: 2026-05-02
aliases:
  - TUI 状态动效
  - command TUI motion
tags:
  - permanent-note
note-type: "[[permanent-note]]"
status: evergreen
maturity: evergreen
links:
  - "[[command-mode-tui-components-are-projections]]"
  - "[[command-tui-layout-is-block-contract]]"
  - "[[command-mode-tui-preserves-cli-contracts]]"
  - "[[tui-aesthetics-are-tokenized-constraints]]"
  - "[[raw/w3c-2023-animation-from-interactions]]"
  - "[[raw/w3c-2023-three-flashes]]"
  - "[[raw/carbon-2026-motion-overview]]"
  - "[[raw/carbon-2026-inline-loading]]"
  - "[[raw/rich-2026-console-status]]"
  - "[[raw/rich-2026-progress]]"
  - "[[raw/charmbracelet-2026-spinner]]"
  - "[[modern-tui-motion-is-event-loop-driven]]"
  - "[[raw/ora-2026-spinner]]"
  - "[[raw/cli-spinners-2026-frame-catalog]]"
graph-label: Concept
graph-relations:
  - target: "[[modern-tui-motion-is-event-loop-driven]]"
    relation: TO
    why: "现代 TUI 动效机制需要收敛为 command-mode 生命周期反馈"
  - target: "[[command-mode-tui-components-are-projections]]"
    relation: TO
    why: "动效作用于 lifecycle component，而不是 stdout result component"
  - target: "[[command-tui-layout-is-block-contract]]"
    relation: TO
    why: "motion 必须落在 stderr progress/error/prompt block 中"
  - target: "[[command-mode-tui-preserves-cli-contracts]]"
    relation: TO
    why: "动效不能污染 JSON stdout 或破坏脚本化路径"
  - target: "[[tui-aesthetics-are-tokenized-constraints]]"
    relation: TO
    why: "motion 是可降级的设计 token"
  - target: "[[raw/w3c-2023-animation-from-interactions]]"
    relation: OF
    why: "提供动效可关闭与 reduced-motion 依据"
  - target: "[[raw/w3c-2023-three-flashes]]"
    relation: OF
    why: "提供避免闪烁和高频注意力动效依据"
  - target: "[[raw/carbon-2026-motion-overview]]"
    relation: OF
    why: "提供 motion 应有目的且可访问的设计系统依据"
  - target: "[[raw/carbon-2026-inline-loading]]"
    relation: OF
    why: "提供 loading active/success/error/inactive 状态模型"
  - target: "[[raw/rich-2026-console-status]]"
    relation: OF
    why: "提供终端 status spinner 临时反馈证据"
  - target: "[[raw/charmbracelet-2026-spinner]]"
    relation: OF
    why: "提供 spinner 帧和 FPS 的组件证据"
  - target: "[[raw/ora-2026-spinner]]"
    relation: OF
    why: "提供 CLI spinner enable/silent 策略证据"
  - target: "[[raw/cli-spinners-2026-frame-catalog]]"
    relation: OF
    why: "提供 spinner frame/interval token 证据"
---

# 命令 TUI 动效是生命周期反馈

## 主张
CLI command-mode TUI 的动效只能表达临时生命周期反馈，不能成为状态语义的唯一来源。

## 论证
动效适合告诉用户“命令还在运行”：浏览器正在启动、等待登录、等待 selector、导入导出 session、重试请求或正在停止实例。但命令最终意义必须落到稳定文本状态：success、warning、error、empty、partial、cancelled、timeout 都应静态呈现，并包含原因、影响和下一步。[[modern-tui-motion-is-event-loop-driven]] 说明 full-screen TUI 可以依赖 event loop、tick 和 render loop；command-mode TUI 只能把这些机制转译为短生命周期的 stderr motion token。spinner/progress 应只出现在 TTY stderr，必须限频、避免闪烁、在结束时清理，并在 `--format json`、pipe、CI、非 TTY、reduced-motion 或 no-animation 场景降级为离散 stderr log 或关闭。

## 状态映射

```yaml
motion_state_catalog:
  transient:
    starting: spinner_or_discrete_log
    loading: spinner_or_progress
    waiting: spinner_or_status_line
    running: progress_if_total_known_else_spinner
    retrying: bounded_discrete_attempt_logs
    stopping: spinner_or_discrete_log
    importing_exporting: progress_if_count_known_else_spinner
  final:
    success: static_status
    warning: static_status_with_remediation
    error: static_error_block
    empty: static_empty_state
    partial: static_partial_with_reason
    cancelled: static_cancelled_state
    timeout: static_timeout_with_retry_hint
  suppression:
    - format_json
    - stdout_not_tty
    - stderr_not_tty
    - ci
    - pipe
    - no_animation
    - reduced_motion
```

## 连接
- [[command-mode-tui-components-are-projections]] — 动效只作用于 lifecycle component。
- [[command-tui-layout-is-block-contract]] — 动效只进入 stderr lifecycle block。
- [[command-mode-tui-preserves-cli-contracts]] — 动效不能破坏 stdout/stderr/JSON 契约。
- [[tui-aesthetics-are-tokenized-constraints]] — motion token 必须可降级。
- [[raw/w3c-2023-animation-from-interactions]]、[[raw/w3c-2023-three-flashes]] — 可访问性硬约束。
- [[raw/carbon-2026-inline-loading]]、[[raw/rich-2026-console-status]]、[[raw/charmbracelet-2026-spinner]] — 状态与终端组件证据。
- [[modern-tui-motion-is-event-loop-driven]] — 说明 full-screen event-loop 动效为什么只能转译为 command-mode motion token。
- [[raw/ora-2026-spinner]] 与 [[raw/cli-spinners-2026-frame-catalog]] — 补充 CLI spinner enable/silent 与 frame interval 证据。
