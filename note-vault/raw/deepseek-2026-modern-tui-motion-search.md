---
title: DeepSeek Modern TUI Motion Search 证据卡
created: 2026-05-02
author: DeepSeek
year: 2026
source: "deepseek-session://6778e278-bb17-457b-9849-8f6f68de38c6"
evidence-id: "evidence_85c50a6fc18f412691daddb410ece782"
archive-evidence-id: "evidence_85c50a6fc18f412691daddb410ece782"
archive-artifact-id: "artifact_0110a79de23043c2a315e8634831e7be"
archive-status: research_note
archive-backend: deepseek
dag-node: "node_0ea96b1aa378490ead37836afac00fc1"
trust-level: 2
retrieved: 2026-05-02
tags:
  - raw-source
  - deepseek
  - research-audit
  - motion
note-type: "[[raw-source]]"
links:
  - "[[modern-tui-motion-is-event-loop-driven]]"
  - "[[raw/deep-research-2026-tui-web-archive-index]]"
---

# DeepSeek Modern TUI Motion Search 证据卡

## 离线摘要
这是一次实际执行 `deepseek reply --search on --deep-think on` 的联网搜索结果，用于审计“现代 TUI 动效”来源发现过程。它列出了 Textual、Rich、Bubbles、Ratatui、Ink、reduced-motion 等候选来源。该卡只作为候选来源路线图和研究审计，不替代官方文档证据。

## 本地归档
- deepseek session: `6778e278-bb17-457b-9849-8f6f68de38c6`
- deep-research evidence: `evidence_85c50a6fc18f412691daddb410ece782`
- transcript artifact: `artifact_0110a79de23043c2a315e8634831e7be` (20,591 chars)
- DAG: `node_0ea96b1aa378490ead37836afac00fc1` <= annotates = `evidence_85c50a6fc18f412691daddb410ece782`
- 查看全文: `deep-research artifact_list --project . --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b --format json | jq -r '.data[] | select(.id=="artifact_0110a79de23043c2a315e8634831e7be") | .body'`

## 审计判断
DeepSeek 搜索有价值的是来源发现和交叉检查，不直接作为高可信结论来源。最终笔记中的事实判断应优先引用已归档的官方来源卡片。

## 连接
- [[modern-tui-motion-is-event-loop-driven]] — 本搜索为该笔记提供候选来源路线。
- [[raw/deep-research-2026-tui-web-archive-index]] — 与其他 deep-research 归档统一索引。

