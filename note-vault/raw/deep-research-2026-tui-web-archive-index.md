---
title: Deep Research TUI 原文归档索引
created: 2026-05-02
author: deep-research
year: 2026
source: "local deep-research evidence_archive artifacts"
research-id: "research_d20a7e0ec2774bfd8904fd1736c72d1b"
tags:
  - raw-source
  - web-archive
  - research-audit
note-type: "[[raw-source]]"
links:
  - "[[tui-design-system-moc]]"
  - "[[raw/clig-2025-command-line-guidelines]]"
  - "[[raw/ecma-1991-control-functions]]"
  - "[[raw/xterm-2025-control-sequences]]"
  - "[[raw/ncurses-2026-terminfo]]"
  - "[[raw/unicode-2025-east-asian-width]]"
  - "[[raw/ratatui-2026-terminal-abstraction]]"
  - "[[raw/fuchsia-2025-cli-guidance]]"
  - "[[raw/salesforce-2026-cli-interactivity]]"
  - "[[raw/heroku-2025-cli-style-guide]]"
  - "[[raw/patternfly-2025-cli-handbook]]"
  - "[[raw/w3c-2026-aria-keyboard]]"
  - "[[raw/rich-2025-console-api]]"
  - "[[raw/w3c-2025-design-tokens]]"
  - "[[raw/w3c-2023-wcag-color-motion]]"
  - "[[raw/rich-2026-tables]]"
  - "[[raw/rich-2026-progress]]"
  - "[[raw/charmbracelet-2026-bubbles]]"
  - "[[raw/ubuntu-2020-empty-states]]"
  - "[[raw/ratatui-2026-widgets]]"
  - "[[raw/textual-2026-widget-gallery]]"
  - "[[raw/w3c-2023-animation-from-interactions]]"
  - "[[raw/w3c-2023-three-flashes]]"
  - "[[raw/carbon-2026-motion-overview]]"
  - "[[raw/carbon-2026-inline-loading]]"
  - "[[raw/rich-2026-console-status]]"
  - "[[raw/charmbracelet-2026-spinner]]"
  - "[[raw/textual-2026-animation]]"
  - "[[raw/textual-2026-loading-progress]]"
  - "[[raw/bubbletea-2026-tick-loop]]"
  - "[[raw/ratatui-2026-render-event-loop]]"
  - "[[raw/ora-2026-spinner]]"
  - "[[raw/cli-spinners-2026-frame-catalog]]"
  - "[[raw/deepseek-2026-modern-tui-motion-search]]"
---

# Deep Research TUI 原文归档索引

## 用途
这是 TUI 设计系统研究的本地原文归档清单。原网页全文没有平铺复制到每张 raw 卡片里，而是通过 `deep-research evidence_archive` 存入 `.deep-research/deep-research.sqlite` 的 `web_archive` artifact；各 raw 卡片保存短摘录、释义、DAG 入口和全文查看命令。

## 连接
- [[tui-design-system-moc]] — 本索引服务于 TUI 设计系统研究地图。
- [[raw/clig-2025-command-line-guidelines]]、[[raw/fuchsia-2025-cli-guidance]]、[[raw/salesforce-2026-cli-interactivity]]、[[raw/heroku-2025-cli-style-guide]]、[[raw/patternfly-2025-cli-handbook]] — 命令模式 TUI 与 CLI 契约证据。
- [[raw/ecma-1991-control-functions]]、[[raw/xterm-2025-control-sequences]]、[[raw/ncurses-2026-terminfo]]、[[raw/unicode-2025-east-asian-width]]、[[raw/ratatui-2026-terminal-abstraction]] — 终端媒介与渲染机制证据。
- [[raw/w3c-2026-aria-keyboard]]、[[raw/rich-2025-console-api]]、[[raw/w3c-2025-design-tokens]]、[[raw/w3c-2023-wcag-color-motion]] — UX、可访问性与设计 token 证据。
- [[raw/rich-2026-tables]]、[[raw/rich-2026-progress]]、[[raw/charmbracelet-2026-bubbles]]、[[raw/ubuntu-2020-empty-states]] — command-mode TUI 组件证据。
- [[raw/ratatui-2026-widgets]]、[[raw/textual-2026-widget-gallery]] — full-screen widget taxonomy 与边界证据。
- [[raw/w3c-2023-animation-from-interactions]]、[[raw/w3c-2023-three-flashes]]、[[raw/carbon-2026-motion-overview]]、[[raw/carbon-2026-inline-loading]] — TUI 状态动效与可访问性证据。
- [[raw/rich-2026-console-status]]、[[raw/charmbracelet-2026-spinner]] — 终端 status/spinner 动效证据。
- [[raw/textual-2026-animation]]、[[raw/textual-2026-loading-progress]]、[[raw/bubbletea-2026-tick-loop]]、[[raw/ratatui-2026-render-event-loop]] — 现代 full-screen TUI event-loop 动效证据。
- [[raw/ora-2026-spinner]]、[[raw/cli-spinners-2026-frame-catalog]] — 现代 CLI spinner enable/silent 与 frame interval 证据。
- [[raw/deepseek-2026-modern-tui-motion-search]] — deepseek 联网搜索审计记录。

## 统一查看命令
```bash
deep-research artifact_list --project . \
  --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b \
  --format json \
  | jq -r '.data[] | select(.artifactKind=="web_archive") | [.id, .evidenceId, .title] | @tsv'
```

查看单个全文时，把 `<artifact-id>` 替换为下表中的 artifact：

```bash
deep-research artifact_list --project . \
  --research-id research_d20a7e0ec2774bfd8904fd1736c72d1b \
  --format json \
  | jq -r '.data[] | select(.id=="<artifact-id>") | .body'
```

## 归档清单
| Raw 卡片 | Archive Evidence | Web Archive Artifact | Backend | Chars | DAG 支撑节点 |
|---|---|---|---|---:|---|
| [[raw/clig-2025-command-line-guidelines]] | `evidence_90c49bc877e64efc905c08cd746a5848` | `artifact_6e867270be69477b9ebe24fa103bf23d` | node | 64,912 | `node_72e52d90b8ac4248bd74ffd8329646f2` |
| [[raw/ecma-1991-control-functions]] | `evidence_c35b8caba26148d3b8bfa78753ec308a` | `artifact_10796643df2f43cdadea5d2b7d96497a` | node | 4,123 | `node_b8590c2f02c045799b8ee813cb1f32f8` |
| [[raw/xterm-2025-control-sequences]] | `evidence_60a92d49fcd34111be9f4875e75b5623` | `artifact_9a554c5db35a4a89a8fd9cf927bdf1f1` | node | 138,966 | `node_b8590c2f02c045799b8ee813cb1f32f8` |
| [[raw/ncurses-2026-terminfo]] | `evidence_dec2865125744c478314cdf8058d2570` | `artifact_5c6e8c52d6ec429ea7ca9a5eebaabebb` | node | 98,449 | `node_b8590c2f02c045799b8ee813cb1f32f8` |
| [[raw/unicode-2025-east-asian-width]] | `evidence_2254291258c142fd93dc9438517a4bb7` | `artifact_cd2fa8e999c841fb956f2cd73a742110` | node | 28,474 | `node_b8590c2f02c045799b8ee813cb1f32f8` |
| [[raw/ratatui-2026-terminal-abstraction]] | `evidence_5def0d2bf3df493d8b5ea886be37b0ca` | `artifact_c42d6a74b43a476e92d6148e147055b2` | node | 24,632 | `node_b8590c2f02c045799b8ee813cb1f32f8` |
| [[raw/fuchsia-2025-cli-guidance]] | `evidence_88a8513fad914c20b3d21026dea43c55` | `artifact_a752ccf3430b42ac842eee90d0e47802` | node | 48,262 | `node_72e52d90b8ac4248bd74ffd8329646f2` |
| [[raw/salesforce-2026-cli-interactivity]] | `evidence_8c4e75bb9764479bae1367fcc65b4ffc` | `artifact_9a359224426542639cc503de4bdcd03c` | crawl4ai | 1,615 | `node_72e52d90b8ac4248bd74ffd8329646f2` |
| [[raw/heroku-2025-cli-style-guide]] | `evidence_2ee7a7a90818401abe6d0db3893fde4c` | `artifact_493d28ec298f4a9fbdbb8d3c292ac217` | node | 16,102 | `node_72e52d90b8ac4248bd74ffd8329646f2` |
| [[raw/patternfly-2025-cli-handbook]] | `evidence_c63a2e241e274532b81ad371822a2e1f` | `artifact_33f97614f83a43ad98ccc23a412add3e` | node | 9,950 | `node_d8b21f20c21a4a3384cb44835c3e1917` |
| [[raw/w3c-2026-aria-keyboard]] | `evidence_bf1f7b283e00495282a9943e6657b4bc` | `artifact_f7f3966d5f314540ab731bdbdafbebd3` | node | 35,593 | `node_d8b21f20c21a4a3384cb44835c3e1917` |
| [[raw/rich-2025-console-api]] | `evidence_83f8e2e4e73842a49c418556470e080f` | `artifact_c481c3ffad5e437f985d9b42c0f610a3` | node | 19,815 | `node_ed9ca338c90e41e1a9403ed39721b509` |
| [[raw/w3c-2025-design-tokens]] | `evidence_ac6a93e4855a4fa7bc3994b2aac6073f` | `artifact_93231eb892f64ac4b2e36d944f7909cb` | node | 84,656 | `node_ed9ca338c90e41e1a9403ed39721b509` |
| [[raw/w3c-2023-wcag-color-motion]] | `evidence_468d7adc2af642988929528a42837530` | `artifact_344c2da7e3f54bf89f448c3cd8a8ef81` | node | 155,349 | `node_ed9ca338c90e41e1a9403ed39721b509` |
| [[raw/rich-2026-tables]] | `evidence_df4bbec2108e4afeb9b630e47bbdb270` | `artifact_682b24bd6f7a41519618f51e8b17e50c` | node | 7,937 | `node_8df617a443cf47faacab0c2cd2b4e7ab` |
| [[raw/rich-2026-progress]] | `evidence_e0cb25a71a7842c0bda80b904957682a` | `artifact_952a968bec054ca89f9e3204656dafc3` | node | 13,646 | `node_8df617a443cf47faacab0c2cd2b4e7ab` |
| [[raw/charmbracelet-2026-bubbles]] | `evidence_8476197b473044c38507fdbf81e56186` | `artifact_aee36d3523194670ae3a032b0078de64` | node | 10,371 | `node_8df617a443cf47faacab0c2cd2b4e7ab` |
| [[raw/ubuntu-2020-empty-states]] | `evidence_3abba727828149d494c990c14cbfd199` | `artifact_11407e2970664e37b378db0a8f910000` | node | 1,969 | `node_8df617a443cf47faacab0c2cd2b4e7ab` |
| [[raw/ratatui-2026-widgets]] | `evidence_f768a80e7dc44cee8c331918888c1830` | `artifact_f406f019745c4d10bd67b55495c41cde` | node | 3,743 | `node_8df617a443cf47faacab0c2cd2b4e7ab` |
| [[raw/textual-2026-widget-gallery]] | `evidence_46b575a6905344639696ec0910385186` | `artifact_9bb0bdc8d0f140d297bb7ea12210aeab` | node | 29,597 | `node_8df617a443cf47faacab0c2cd2b4e7ab` |
| [[raw/w3c-2023-animation-from-interactions]] | `evidence_111dc9bf9b594a9eb88173134164cc24` | `artifact_85bc082257a14c578ddf7d933f5c0710` | node | 7,149 | `node_8547332a847442ed9500f35edfe28d50` |
| [[raw/w3c-2023-three-flashes]] | `evidence_474b854a1a2849e9bd7431b5c3b8d64c` | `artifact_30fd1bf6f5c5473a8a3776dbcfab0e32` | node | 20,227 | `node_8547332a847442ed9500f35edfe28d50` |
| [[raw/carbon-2026-motion-overview]] | `evidence_2da86de2ab6843b39447771f3a41de66` | `artifact_cbd18b80677143739642b7ccddb9d5d9` | node | 9,768 | `node_8547332a847442ed9500f35edfe28d50` |
| [[raw/carbon-2026-inline-loading]] | `evidence_0409ca21b9f1421c9665b28f45ebfea0` | `artifact_9628bccfc02f4288b43221e842ae61c3` | node | 5,136 | `node_8547332a847442ed9500f35edfe28d50` |
| [[raw/rich-2026-console-status]] | `evidence_bf71c86f760945b385ed34fff7cd65e2` | `artifact_18fca3a5b87d45a3a8c7bf2f923c6917` | node | 19,815 | `node_8547332a847442ed9500f35edfe28d50` |
| [[raw/charmbracelet-2026-spinner]] | `evidence_569c4cf58d0d41dfa37096db5c130614` | `artifact_76684656a30848d3be768f18b3dce11c` | node | 7,453 | `node_8547332a847442ed9500f35edfe28d50` |
| [[raw/textual-2026-animation]] | `evidence_c90b92764e5d4eb7a01150627f16c305` | `artifact_30907759fa5f43b38be2fe8c05bba39e` | node | 9,226 | `node_6b0c8f36567846fe8fbdf26b1cffb445` |
| [[raw/textual-2026-loading-progress]] | `evidence_26928d3d91cb4c3296aa273ac3aba75d`, `evidence_28b98b48146b426f957d8662283862bf` | `artifact_29866cdaad254fb89effa351f5cdb3ce`, `artifact_9d8d0ff8932944cbbfa877a3ef84ae93` | node | 20,520 | `node_6b0c8f36567846fe8fbdf26b1cffb445` |
| [[raw/bubbletea-2026-tick-loop]] | `evidence_41f717897d074ae5b5178303cecc6a49` | `artifact_6695bc3859a34be0a0838d4f9b30d6db` | node | 54,995 | `node_6b0c8f36567846fe8fbdf26b1cffb445` |
| [[raw/ratatui-2026-render-event-loop]] | `evidence_70fd3df144d64cdeadb1ec65296f4712`, `evidence_e63de6ad1cd4415db785d4735e2b59a2` | `artifact_bc4207ffb9604065aa4b6b315e44b8dd`, `artifact_6e9d4da5bda0476f83aaafc2c95a5e81` | node | 10,877 | `node_6b0c8f36567846fe8fbdf26b1cffb445` |
| [[raw/ora-2026-spinner]] | `evidence_ae11b600cc85473da66c4f12bd37e0e0` | `artifact_00c58b504f144bdb849d4c1518212526` | node | 14,354 | `node_6b0c8f36567846fe8fbdf26b1cffb445` |
| [[raw/cli-spinners-2026-frame-catalog]] | `evidence_0c16b87dd4ca425287219fe744886cf5` | `artifact_88b828c529dc4dfb899371398bb37cdb` | node | 5,603 | `node_6b0c8f36567846fe8fbdf26b1cffb445` |
| [[raw/deepseek-2026-modern-tui-motion-search]] | `evidence_85c50a6fc18f412691daddb410ece782` | `artifact_0110a79de23043c2a315e8634831e7be` | deepseek | 20,591 | `node_0ea96b1aa378490ead37836afac00fc1` |

## 降级记录
- `evidence_e4cc41fe466947faa6462f2453683d18` 是 Salesforce 页面用 `node` backend 归档时返回 403 的降级记录；已改用 `crawl4ai` 成功归档为 `evidence_8c4e75bb9764479bae1367fcc65b4ffc`。降级记录在 DAG 中只以 `annotates` 记录归档失败，不作为 `supports` 支撑边。
