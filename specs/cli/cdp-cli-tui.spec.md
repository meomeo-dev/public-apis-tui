---
id: cdp-cli-tui
version: 1
status: draft
scope:
  - CLI command readable TUI
  - --format text human output
  - --format json structured output
  - browser execution mode presentation
  - session/profile state presentation
  - command-mode TUI migration plan
---

# Public APIs CLI TUI SPEC

## 0. 文档定位

本规范定义 `public-apis-tui` 的 CLI command TUI 输出设计。这里的 TUI 不是长期驻留的 full-screen terminal app，而是一次命令调用中的 readable terminal surface：它帮助人类快速理解命令结果、状态、下一步动作和风险，同时不破坏 CLI 的脚本化、管道、JSON-RPC 和自动化契约。

本规范约束以下接口：

- `public-apis <command> --format text`：面向人的 readable TUI 输出。
- `public-apis <command> --format json`：面向程序的稳定结构化输出。
- 未显式指定 `--format` 时的产品目标：默认 readable，即等价于 `--format text`。
- 开发实现顺序：先实现并固化 `--format json` 的数据结构，再在数据结构之上实现 `--format text` 的 readable TUI。

本规范不直接修改当前代码；它定义目标行为、演进顺序和验收门禁。当前实现中许多命令默认 `json`，这是实现现状，不是最终 UX 目标。

规范术语：

- MUST：必须满足，否则视为不符合本 SPEC。
- SHOULD：默认应满足，除非有明确项目约束并在实现说明中记录。
- MAY：可选增强，不得破坏 MUST / SHOULD。

## 1. 非目标与边界

本规范采用 `command-interaction-profile`，不采用 `interactive-app-profile`。

非目标：

- 不设计全屏 alternate-screen 应用。
- 不引入长期焦点管理、screen stack、modal overlay 或 persistent widget tree。
- 不让 prompt、spinner、颜色或排版成为唯一功能入口。
- 不让 human-readable 输出成为测试、脚本或 RPC 的事实数据源。
- 不把 `--format text` 当作数据交换格式。

硬边界：

- MUST：`--format json` 的 stdout 始终是可解析 JSON。
- MUST：`--format text` 的 stdout 是 readable terminal output，不保证机器稳定解析。
- MUST：错误、诊断、进度和警告默认走 stderr，不污染 JSON stdout。
- MUST：CI、非 TTY、pipe、`--format json` 场景关闭 prompt、spinner 和装饰性动画。
- MUST：所有 dangerous/destructive action 能通过 flags 或非交互路径表达，不能只靠 prompt 确认。

## 2. 双重视角

本规范刻意区分两种视角，避免把 UX 目标误当作实现顺序。

### 2.1 UI/UX 设计视角

从用户体验看，`public-apis` 是给人探索 public-apis 开放 API、并保留已批准浏览器检查能力的 CLI。默认输出应 readable，用户直接运行命令时不应该先看到大段 JSON。`--format text` 代表默认 readable TUI 形式，它应突出：

- 当前命令做了什么。
- 对哪个 site / profile / session 生效。
- 结果是否成功、是否 ready、是否 observed。
- 关键证据、数量、URL、路径、时间和下一步动作。
- 失败时的原因、可重试方式和安全提示。

### 2.2 工程开发视角

从开发实现看，必须先实现 `--format json`。原因是 readable TUI 不应自己发明数据，它只是 JSON 数据契约的一个投影。

开发顺序必须是：

1. 为命令定义稳定 JSON result schema。
2. 为 JSON schema 写 contract tests。
3. 确定字段命名、枚举、可选字段、错误结构和版本策略。
4. 基于 JSON result schema 编写 text renderer。
5. 为 text renderer 写 snapshot / golden tests。

如果某个命令还没有稳定 JSON schema，不得先实现复杂 text renderer；否则 readable 输出会反过来绑架数据模型。

## 3. 输出模式总契约

`public-apis` 支持两种 command output mode：

| Mode | Flag | Default Target | stdout | stderr | Stability |
|---|---|---|---|---|---|
| readable TUI | `--format text` | human | readable sections, lists, tables | progress, warning, error detail | layout 可演进 |
| structured JSON | `--format json` | program | single JSON document | progress, warning, error detail | schema 需版本化 |

目标 UX 默认：

```text
public-apis describe
# 等价于 public-apis describe --format text
```

机器可读显式模式：

```text
public-apis describe --format json
```

输出通道规则：

- MUST：stdout 只承载所选 format 的主结果。
- MUST：stderr 承载错误摘要、诊断、进度和 warning。
- MUST：`--format json` 下 stdout 不能出现 prompt 文案、spinner 帧、ANSI 控制码或非 JSON 前后缀。
- SHOULD：`--format text` 可使用 ANSI 样式，但必须在 no-color / non-TTY 场景降级为纯文本。
- MUST：exit code 表示命令级成功或失败；JSON result 内的 `status` 表示业务状态，不替代 exit code。

格式选择规则：

- `--format json`：强制 JSON。
- `--format text`：强制 readable TUI。
- 未传 `--format`：目标行为为 `text`；实现迁移期可暂时保留现状，但必须在迁移计划中消除。
- 不支持其他格式；`yaml`、`table`、`pretty` 等都应拒绝并返回 `INVALID_ARGUMENT`。

## 4. JSON 数据契约

JSON 是所有 command result 的底座。每个命令必须先定义 JSON result，再定义 text projection。

### 4.1 顶层形态

每个成功命令输出一个 JSON object；除非命令语义天然是 array，也应包装为具名 object，便于扩展。

推荐顶层字段：

```ts
type CommandResult<TData> = {
  status?: string
  data?: TData
  meta?: {
    command: string
    siteId?: string
    generatedAt?: string
    schemaVersion?: number
  }
}
```

当前代码已经存在多个直接返回 object 的 usecase。迁移期可以保留直接 object，但新增命令和重大重构应向具名 result 靠拢，避免裸数组和匿名 object。

### 4.2 字段命名

- 使用 `camelCase`。
- 时间使用 ISO-8601 字符串，如 `loggedInAt`、`observedOn`。
- 路径字段以 `Path`、`Dir`、`File` 或语义名结尾，如 `stateFile`、`authDir`。
- URL 字段以 `Url` 结尾，如 `finalUrl`、`loginUrl`、`baseUrl`。
- 计数字段使用 number，如 `cookies`、`origins`、`items.length`。
- 状态字段使用稳定枚举，如 `ready`、`cleared`、`cloned`、`observed`、`timeout`。

### 4.3 命令结果族

当前 CLI 命令可按 JSON result family 分组：

| Family | Commands | JSON 主体 |
|---|---|---|
| system registry | `describe`, `sites`, `workflows` | registry、site、workflow、capabilities |
| auth profile | `auth login`, `auth logout`, `profile show`, `profile clone` | profile path、ready state、login/clone timestamps |
| browser session | `browser list`, `browser stop` | session id、cdp url、liveness、stop result |
| generic site command | `inspect-home`, `search`, `inspect-network` | template fallback data; final shape is site / API SPEC-owned |
| endpoint catalog | `endpoints` | endpoint records and evidence status |
| session state | `session-export`, `session-import` | file path、cookie/origin counts |

### 4.3.1 Browser execution mode 字段

涉及浏览器运行的命令 SHOULD 在 JSON result 中显式表达 browser execution mode，避免用户不知道当前命令是在可见 Chrome 中执行，还是在 headless browser 中执行。

推荐字段：

```ts
type BrowserModeMeta = {
  browserMode: 'headed' | 'headless' | 'attached' | 'session'
  modeReason: 'human-login-required' | 'cli-driven-interaction' | 'existing-cdp' | 'managed-session' | 'explicit-option'
  sessionId?: string
  authProfileId?: string
}
```

适用规则：

- `auth login` SHOULD 返回 `browserMode: 'headed'` 和 `modeReason: 'human-login-required'`，因为登录需要委托人类完成。
- generic site commands SHOULD 返回 browser execution mode；默认 headed/headless 策略由站点 / API SPEC 决定。
- 使用 `--cdp-url` 时 SHOULD 返回 `browserMode: 'attached'`。
- 使用 `--session <slug>` 时 SHOULD 返回 `browserMode: 'session'` 和 `sessionId`。

### 4.3.2 Login preflight 字段

对 `auth.mode = 'required'` 或依赖已登录 profile 的命令，JSON result 或错误 details SHOULD 能表达 login preflight。

推荐成功字段：

```ts
type LoginPreflight = {
  required: boolean
  checked: boolean
  ready: boolean
  authProfileId?: string
  stateFile?: string
  loggedInAt?: string
  checkSelector?: string
}
```

推荐失败 details：

```ts
type LoginRequiredFailure = {
  code: 'LOGIN_REQUIRED'
  siteId: string
  authProfileId: string
  stateFile?: string
  remediation: {
    command: string
    reason: 'missing-state-file' | 'expired-session' | 'selector-not-ready' | 'profile-not-found'
  }
}
```

MUST：login preflight 失败时，用户在 readable TUI 中能看到“为什么失败”和“下一条应该运行什么命令”。

### 4.3.3 Profile storage presentation 字段

涉及 auth profile、managed browser session 或 persistent profile 的命令 SHOULD 在 JSON result 中提供足够的 profile storage metadata，供 readable TUI 展示 profile 来源、隔离边界和风险提示。

推荐字段：

```ts
type ProfileStoragePresentation = {
  profileOwner: 'managed' | 'external' | 'session' | 'unknown'
  profileRoot?: string
  profileName?: string
  chromeUserDataDir?: string
  chromeProfileDirectory?: string
  stateFile?: string
  securityStatus?: 'not-checked' | 'ok' | 'warning' | 'error'
  securityNotes?: string[]
}
```

规则：

- MUST：readable TUI 不得声称 profile “安全”或“已加固”，除非 JSON result 明确提供 `securityStatus: 'ok'`。
- SHOULD：当 profile 来自外部目录时，text renderer 显示 `profileOwner: external`，并提示这是外部 profile，不归当前 CLI 生命周期完全管理。
- SHOULD：当 profile 是 CLI managed 时，text renderer 显示 managed root、profile id 和 state file。
- MUST：不得在 text 或 JSON 输出 cookie、localStorage value、token、Authorization header 或其他 session secret。

### 4.4 JSON 不变量

- MUST：JSON contract tests 断言字段存在性、类型和关键枚举。
- MUST：`--format json` 输出单个 JSON document，末尾允许一个 newline。
- MUST：JSON stdout 不包含 ANSI 控制码。
- MUST：JSON stdout 不包含人类解释性标题，如 `Success:`、`error`、`Next steps`。
- MUST：失败时当前实现只向 stderr 输出错误；若未来增加 JSON error mode，必须单独规范，不能破坏现有 exit-code 契约。

### 4.5 JSON 到 Text 的投影示例

JSON result：

```json
{
  "status": "ready",
  "siteId": "example",
  "authProfileId": "default",
  "stateFile": "/tmp/public-apis/auth/example/state.json",
  "loggedInAt": "2026-05-02T06:00:00.000Z"
}
```

Text projection：

```text
Auth profile ready

Site: example
Auth profile: default
State file: /tmp/public-apis/auth/example/state.json
Logged in: 2026-05-02T06:00:00.000Z

Next:
  <site-specific verification command>
```

投影规则：

- Text 字段来自 JSON 字段，不新增隐藏业务状态。
- Text 可以重排、分组、重命名 label，但不能改变 JSON 的事实。
- Text 可以省略低价值字段，但必须保留用户完成下一步判断所需字段。
- 如果 text 需要新增信息，应先进入 JSON result 或 `meta`，再进入 renderer。

## 5. Readable Text TUI 契约

Readable TUI 是 JSON result 的 human projection。它的设计目标不是“漂亮”，而是让用户在终端里快速完成判断：成功了吗、影响了什么、证据在哪里、下一步做什么。

### 5.1 输出结构

每个 `--format text` 输出应按以下顺序组织：

1. Header：一句话说明结果。
2. Summary：关键状态和数量。
3. Details：可扫描的字段、列表或表格。
4. Evidence：URL、selector、endpoint、profile path、session id 等可复核材料。
5. Next steps：必要时给出下一步命令。

不是每个命令都需要五段，但顺序必须一致；缺失段落应是因为没有信息，而不是 renderer 随意省略。

布局结构使用以下 YAML 契约描述。该 YAML 是设计规范，不是新增用户输出格式；CLI 仍只支持 `--format text` 与 `--format json`。

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

常驻结构：

- `stdout.role` 与 `stderr.role` 的通道职责固定。
- block 顺序固定；renderer 可以跳过无数据 block，但不能任意重排。
- `header`、`context`、`status`、`summary`、`details`、`evidence`、`diagnostics`、`next_steps` 是 stdout result 的稳定槽位。
- `progress`、`error`、`prompt` 是 stderr lifecycle / diagnostic 的稳定槽位。
- 降级规则、JSON 投影规则、no-color / non-TTY / CI 规则固定。

随命令变化的结构：

- command title、字段 label、字段顺序、表格列、列表 item schema、empty state 文案、evidence 字段和 next step 命令。
- 站点 / API 派生命令的 `site_api_specific_projection` 由站点 / API SPEC 定义，通用模板不得推断。

示例形态：

```text
Profile ready

Site: example
Auth profile: default
Chrome profile: Default
State file: /path/to/state.json

Next:
  <site-specific verification command>
```

### 5.2 视觉 token

Text TUI 使用语义 token，而不是散落样式。

| Token | 用途 | 彩色 TTY | no-color fallback |
|---|---|---|---|
| `title` | Header / section title | bold | plain text |
| `label` | field label | dim or bold | plain text |
| `success` | successful status | green text or symbol | `OK` text |
| `warning` | warning status | yellow text or symbol | `WARN` text |
| `error` | failure status | red text or symbol | `ERROR` text |
| `muted` | secondary metadata | dim | plain text |
| `path` | file path | plain or underline | plain text |
| `url` | URL | plain or underline | plain text |

颜色不能是唯一语义。所有 success/warning/error/selected/focus 类信息必须有文本或符号冗余。

### 5.3 UI components 目录

Command-mode readable TUI 的组件是 JSON result 或 stderr lifecycle event 的投影，不是长期存在的 widget。

| Component | Channel | Role | Data Source | Fallback |
|---|---|---|---|---|
| `header` | stdout | 一句话说明命令结果 | JSON status/meta | plain title |
| `context` | stdout | 显示 site/profile/session/browser scope | JSON meta/context fields | key-value lines |
| `status` | stdout | 显示 ready/ok/partial/empty 等业务状态 | JSON status/boolean/count | text label `OK/WARN/EMPTY` |
| `summary` | stdout | 关键状态、数量和影响范围 | JSON top-level fields | key-value lines |
| `details` | stdout | 展示列表、表格、字段组 | JSON data payload | list or repeated key-value |
| `table` | stdout | 稳定同构集合 | JSON array with stable item schema | repeated key-value blocks |
| `list` | stdout | 非严格列对齐集合 | JSON array | bullet-like plain lines |
| `empty_state` | stdout | 命令成功但无业务数据 | JSON empty array/count 0 | explicit empty message |
| `evidence` | stdout | 可复核 URL、path、selector、session id | JSON evidence fields | key-value lines |
| `diagnostics` | stdout | 非失败 warning/partial reason | JSON warnings/diagnostics | `WARN` text |
| `next_steps` | stdout | 下一步可执行命令 | JSON remediation/known command | static command lines |
| `progress` | stderr | 长任务状态 | runtime lifecycle events | discrete stderr logs or none |
| `spinner` | stderr | TTY transient waiting indicator | runtime lifecycle events | no animation |
| `error` | stderr | 命令失败摘要与修复 | exception/error code | `ERROR`, `code`, `Try` |
| `prompt` | stderr/stdin | TTY-only confirmation | explicit interactive flow | flag / non-interactive path |

组件适用规则：

- MUST：stdout components 只消费 JSON result，不直接访问 runtime 或业务 usecase。
- MUST：stderr components 不污染 `--format json` stdout。
- MUST：`prompt` 不能成为唯一业务路径；必须有 flag、argument 或 non-interactive 替代路径。
- MUST：`empty_state` 不等于 failure；exit code 和业务 empty 状态必须可区分。
- SHOULD：`help` 在 command-mode 中表现为 `next_steps` 或静态 hint block，不作为 persistent footer。
- SHOULD：`tree`、`tabs`、`viewport`、`modal`、`command_palette`、persistent header/footer 只作为 future interactive/full-screen profile，不进入默认 command-mode output。
- MUST：站点派生命令不得仅根据组件名继承通用模板 UX；是否使用 table/list/tree-like presentation 由站点 / API SPEC 定义。

### 5.4 表格与列表

优先使用列表而非复杂表格。表格只用于架构上稳定的同构集合，如 endpoint records、browser sessions、configured sites、configured workflows。站点派生的结果集合是否适合表格，必须由对应站点 SPEC 决定。

表格规则：

- 必须有 header。
- 列数控制在 3-6 列。
- 宽字段如 URL、path、description 应截断或换行，但不能丢失 JSON 中的原始值。
- 非 TTY 或窄终端下可以降级为 repeated key-value blocks。
- 不使用 box drawing 作为唯一结构；竖线和空格足够。

列表规则：

- 重要字段在前。
- 每个 item 有稳定排序。
- 空列表必须显示 empty state，而不是输出空白。

### 5.5 路径、URL 与敏感信息

- path 和 URL 默认完整显示，除非包含 token、secret 或 query 中的敏感值。
- network observation 只显示 redacted URL，与当前隐私安全模型一致。
- auth profile 路径可显示，因为它是本地操作证据；但不得显示 cookie、localStorage value 或 bearer token。
- session export/import 只显示文件路径和数量，不显示 session 内容。

### 5.6 默认 readable 行为边界

最终 UX 中，下列命令在未显式传入 `--format` 时默认输出 readable TUI：

```text
public-apis describe
public-apis sites
public-apis workflows
public-apis apis list
public-apis apis info
public-apis apis config
public-apis apis run
public-apis apis cache list
public-apis apis cache clear
public-apis auth login
public-apis auth logout
public-apis profile show
public-apis profile clone
public-apis browser list
public-apis browser stop
public-apis endpoints
public-apis inspect-home
public-apis inspect-network
public-apis search
public-apis mediastack news
public-apis session-export
public-apis session-import
```

该清单只规定默认输出模式，不等于本通用 SPEC 已固化所有命令的具体信息架构、交互路径或视觉布局。

架构上明确、跨站点稳定的命令由本 SPEC 定义 command-specific readable renderer：`describe`、`sites`、`workflows`、`auth login`、`auth logout`、`profile show`、`profile clone`、`browser list`、`browser stop`、`endpoints`、`mediastack news`、`session-export`、`session-import`。

公开 API 发现命令 `apis list` 和 `apis info` 是支撑数百个 public APIs 的基础 UX，必须由 provider/operation registry 生成 provider、operation、auth、docs、endpoint 和 next-step 信息，不得在 CLI/RPC/renderer 中为每个 provider 重复硬编码。

公开 API operation 参数必须先经过 UX 暴露决策，不得把上游 API 的完整 query/path/header 参数无差别倾倒进 CLI。每个 operation option MUST 在 registry 中声明：

- `exposure`: `primary`、`advanced` 或 `hidden`。
- `group`: `authentication`、`query`、`filters`、`pagination`、`content`、`presentation`、`transport` 或 `debug`。
- `reason`: 一句说明该参数为何暴露或隐藏。

`public-apis apis run <operation> --help` 和 provider shortcut command MUST 只展示并解析 `primary` 与 `advanced` 参数，并按 `group` 分组。`hidden` 参数不得出现在 CLI help 中；如仍需 RPC/内部使用，必须由 operation schema 明确接收且不得泄露 secret。`public-apis apis info <provider|operation>` MUST 展示 operation 的 CLI 参数数量、暴露数量和可见参数分组，帮助用户在不污染 `apis list` 的情况下发现每个 API 的特定交互参数。

站点派生命令不在本通用 SPEC 中做默认 UX 假设。每个网页或开放 API 的结构不同，搜索、翻页、查看内容、提交表单、下载数据等 UX 行为必须由对应站点 / API SPEC 定义。通用 SPEC 只规定这些命令必须保留 `--format json` 和 `--format text` 的输出契约，不预设具体信息架构。

每个已实现 public API readable renderer MUST 显示 provider/operation 标识、endpoint、REST/open API 边界、auth 边界、`api.usesBrowserClickstream: false` 对应的人类可读说明、query/filter 摘要、核心结果载荷、空状态和下一步命令。分页或限频存在时，renderer MUST 从 JSON result 投影 pagination/count/rate-limit 信息，不得在 text 层重新发明业务数据。

`mediastack news` 是本项目首个已确认开放 API readable renderer：它 MUST 显示 provider、endpoint、open REST API only / no Chrome clickstream 边界、query、pagination 和文章列表；JSON result MUST 包含 `api.usesBrowserClickstream: false`。

如果模板提供 `inspect-home`、`inspect-network`、`search` 等 generic command，它们只能作为 fallback renderer 或示例 renderer；派生项目必须根据站点结构显式确认或覆盖其 readable TUI。

`public-apis rpc` 不参与 readable TUI；它是 JSON-RPC over stdin/stdout，必须保持协议纯净。

## 6. 命令级信息架构

每个 command renderer 必须从 JSON result 中投影，而不是直接调用业务逻辑。

本章只规范跨站点稳定的架构命令。站点派生命令必须在站点 / API SPEC 中定义自己的 JSON contract 和 readable TUI projection。

### 6.1 `describe`

Header：`CDP CLI <version>`

Summary：

- package name / version
- default site
- command count
- RPC method count
- browser capability highlights

Details：

- Sites / workflows / auth profiles 的数量。
- 重要能力：CDP attach、managed session、auth profiles、session import/export、network observation。

Next steps：

- `public-apis sites`
- `public-apis describe --format json`

### 6.2 `sites`

Header：`Configured sites`

表格列：

- `id`
- `name`
- `auth`
- `roles`
- `baseUrl`

每个 site 下可显示 selectors 摘要：

- `ready`
- `searchInput` if present
- `resultItems` if present

空状态：如果 registry 没有 sites，应显示 `No sites configured`，并提示检查 site registry 配置。

### 6.3 `workflows`

Header：`Configured workflows`

每个 workflow：

- name / id
- description
- steps ordered by config order
- step: `id`, `siteId`, `kind`, optional `authProfileId`

如果没有 workflows：显示 `No workflows configured`。

### 6.4 Auth profile commands

`auth login` 成功：

- Header：`Auth profile ready`
- Summary：`siteId`, `authProfileId`, `loggedInAt`
- Browser：MUST 显示 `headed` 或等价说明，因为该命令需要人类在可见浏览器中完成登录。
- Evidence：`loginUrl`, `finalUrl`, `stateFile`, `chromeUserDataDir`, `chromeProfileDirectory`
- Next：SHOULD 显示站点 SPEC 定义的下一条验证命令；若没有站点 SPEC，只提示 profile 已准备完成，不假设后续页面行为。

`auth logout` 成功：

- Header：`Auth profile cleared`
- Summary：`siteId`, `authProfileId`, `removed`
- Evidence：`authDir`, `stateFile`

`profile show`：

- Header：`Managed auth profile`
- Summary：`ready`, `siteId`, `authProfileId`, `profileOwner`
- Evidence：paths and timestamps
- Security：如果 `securityStatus` 不是 `ok`，MUST 显示明确状态；不得把未检查状态描述为安全。
- If not ready：show next command `public-apis auth login --site <siteId>`.

`profile clone`：

- Header：`Auth profile cloned`
- Summary：source -> target
- Evidence：`sourceUserDataDir`, `targetUserDataDir`, copied profile directory
- Security：MUST 标注 target profile 是否由当前 CLI managed；external source 不得被暗示为已加固。

### 6.5 Browser session commands

`browser list`：

- Header：`Managed browser sessions`
- Table columns：`sessionId`, `status/live`, `browserMode`, `cdpUrl`, `createdAt` if available.
- Empty state：`No managed browser sessions registered`.
- Next：对 live session SHOULD 显示 stop 命令形态：`public-apis browser stop <sessionId>`。

`browser stop`：

- Header：`Browser session stopped` or `Browser session not running`
- Summary：`sessionId`, stop status, force flag if relevant.
- Lifecycle：MUST 明确该命令只停止对应 `--session <slug>` 管理的实例，不影响其他 session 或外部 CDP browser。

### 6.6 Generic site command renderer boundary

`inspect-home`、`search`、`inspect-network` 属于模板提供的 generic site commands。它们可以有 fallback readable renderer，但本 SPEC 不规定它们在派生项目中的最终 UX，因为真实网页和开放 API 的结构各不相同。

通用要求：

- MUST：这些命令仍遵守 `--format json` / `--format text` 输出通道契约。
- MUST：JSON contract 先于 text renderer 固化。
- MUST：如果 site 需要登录，readable TUI 显示 login preflight 的 ready / checked 状态。
- SHOULD：browser execution mode 以 JSON 字段提供，并在 text 中显示。
- SHOULD：失败时给出与站点 SPEC 对齐的 remediation，而不是通用猜测。

派生项目要求：

- MUST：为真实交互命令定义站点 / API 专属 SPEC。
- MUST：明确页面结构、数据结构、分页/导航模型、空状态、错误恢复和可见证据。
- MUST：明确 headed/headless 策略；通用模板不得仅根据 `search`、`inspect`、`page`、`content` 等命令名推断浏览器模式。
- MUST：不得仅因为模板存在 `search` 名称就继承模板 UX、数据结构或交互模型。

### 6.7 Endpoint and session-state commands

`endpoints`：

- Header：`Endpoint catalog`
- Table columns：`id`, `method`, `category`, `evidenceStatus`, `urlPattern`
- Optional detail：description, consumedBy, observedOn.

`session-export`：

- Header：`Session exported`
- Summary：`cookies`, `origins`
- Evidence：`outputPath`

`session-import`：

- Header：`Session imported`
- Summary：`cookies`, `origins`
- Evidence：`inputPath`

## 7. 状态、错误与进度

### 7.1 状态语义

状态必须是业务语义，不是颜色语义。

| Status | Text TUI 表达 | JSON 表达 |
|---|---|---|
| success | `OK`, `ready`, `complete`, `cloned`, `cleared` | stable enum or boolean |
| partial | `PARTIAL`, with reason | enum plus diagnostics |
| warning | `WARN`, with remediation | warnings array or diagnostics |
| failure | stderr `ERROR`, exit code non-zero | process exit code; optional future JSON error mode |
| empty | explicit empty state | empty array plus count 0 |

`ready: false` 不一定是 process failure；它可能是检查结果。Renderer 必须区分“命令执行失败”和“命令成功但业务状态未 ready”。

### 7.2 错误输出

当前 CLI 的错误输出走 stderr，包含 message 和 code。目标行为：

```text
ERROR <message>
code <ERROR_CODE>

Try:
  <one actionable command or option>
```

错误输出规则：

- stderr 可以使用颜色，但必须有 `ERROR` 文本。
- 不在 stdout 打印错误解释。
- `--format json` 下也不污染 stdout。
- 对 `INVALID_ARGUMENT` 给出 supported values 或 expected format。
- 对 browser/session/auth 错误给出最小可执行修复命令。
- 对 `LOGIN_REQUIRED`、missing profile、expired session 或 selector-not-ready 错误，MUST 显示 site、auth profile、检查依据和推荐修复命令。

登录态错误示例：

```text
ERROR Login required
code LOGIN_REQUIRED

Site: v2ex-main
Auth profile: default
State file: ~/.cdp-cli/v2ex-cdp-cli/profiles/default/state.json
Reason: missing-state-file

Try:
  public-apis auth login --site v2ex-main
```

### 7.3 进度与长任务

浏览器启动、登录、网络检查和搜索可能耗时。进度属于 stderr。

TTY 场景：

- 可显示 spinner 或短状态行。
- 必须限制频率，避免刷屏。
- 必须在结束时清理 transient spinner。

非 TTY / CI / `--format json`：

- 不显示 spinner 动画。
- 可以输出离散 stderr log，如 `Starting browser...`、`Waiting for selector...`。
- 不输出控制码。

### 7.4 状态动效

动效只能表达临时 lifecycle feedback，不能成为状态语义的唯一来源。所有最终状态必须有静态文本表达。

状态动效目录：

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

动效规则：

- MUST：`success`、`warning`、`error`、`empty`、`partial`、`cancelled`、`timeout` 是 final state，必须静态化，不得持续循环动画。
- MUST：`starting`、`loading`、`waiting`、`running`、`retrying`、`stopping`、`importing_exporting` 才允许临时动效。
- MUST：已知总量时优先 determinate progress；未知总量时才使用 spinner 或 status line。
- MUST：spinner/progress/status line 只出现在 stderr，不进入 stdout result。
- MUST：`--format json`、CI、pipe、非 TTY、no-animation 或 reduced-motion 场景禁用动画。
- MUST：禁止闪烁型 warning/error 动效、快速反色动效或高频刷屏。
- SHOULD：retrying 使用离散 attempt log，如 `Retry 2/3...`，不得无限循环。
- SHOULD：动效结束前清理 transient line，再输出最终静态状态。

### 7.5 Prompt 与确认

默认不引入 prompt。若未来加入确认交互，必须满足：

- 每个 prompt 都有 flag 替代路径。
- `--format json` 禁止 prompt。
- 非 TTY 禁止 prompt。
- destructive action 必须支持 `--yes` 或等价确认 flag。
- prompt 只能帮助确认，不得生成唯一业务数据。

## 8. 可访问性与终端能力降级

Readable TUI 必须假设终端能力不稳定：颜色、宽度、Unicode、TTY、字体和 CI 日志都可能不同。

### 8.1 TTY 检测

Renderer 应至少感知：

- stdout 是否 TTY。
- stderr 是否 TTY。
- `NO_COLOR` / no-color 等环境约束。
- terminal width。
- CI 环境。

### 8.2 降级矩阵

| Capability | Rich TTY | Degraded |
|---|---|---|
| color | semantic color token | text label `OK/WARN/ERROR` |
| spinner | stderr spinner | discrete stderr log or none |
| table | aligned columns | repeated key-value blocks |
| Unicode symbol | `✓`, `⚠`, arrows if safe | ASCII labels |
| wide terminal | table and grouped sections | short fields and wrapped blocks |
| hyperlink styling | underline or OSC8 if supported later | raw URL |

### 8.3 Display width

Do not use string length as display width. Text renderer must eventually use display-width-aware measurement for truncation and alignment. Until implemented, avoid alignment-sensitive layouts for multilingual text and prefer key-value blocks.

### 8.4 Accessibility rules

- Color is never the only carrier of status.
- Status symbols must have text labels.
- Empty, partial and error states must be explicit.
- Any future interactive selection must distinguish focus, selection and active item.
- Motion must be optional and disabled in non-interactive environments.

## 9. 开发顺序与验收门禁

### 9.1 Phase 1：固化 JSON contract

目标：先让 `--format json` 成为稳定数据契约。

任务：

- 为每个 command result family 建立 TypeScript result type 或 schema reference。
- 增加 contract tests：每个 command 至少一个 JSON fixture。
- 确保 `--format json` stdout 可被 `JSON.parse`。
- 确保 `--format json` stdout 无 ANSI 控制码。
- 确保错误只走 stderr，exit code 正确。
- 为 browser execution mode、login preflight、profile storage presentation 增加 JSON fixture。

验收：

```text
public-apis describe --format json | jq .
public-apis sites --format json | jq .
public-apis endpoints --format json | jq .
```

三者必须可解析；关键命令 test fixture 必须覆盖。

### 9.2 Phase 2：建立 text renderer 架构

目标：让 readable TUI 只消费 JSON result，不访问 usecase 或 runtime。

任务：

- 引入 command-specific renderer registry。
- 每个 renderer 输入为 typed result object。
- 建立 shared tokens：title、label、status、muted、path、url。
- 建立 table/list/key-value helper。
- 建立 no-color / non-TTY fallback helper。
- 建立 browser mode、login preflight、session lifecycle、profile storage 的 shared renderer block。

验收：

- `--format text` 和 `--format json` 对同一命令来自同一 result object。
- renderer unit tests 不启动浏览器。
- snapshot tests 覆盖 TTY 与 no-color。
- snapshot tests 覆盖 headed login、session list、login-required failure。
- generic site command 的 snapshot 只验证通道契约和 fallback block；真实 search/page/content UX snapshot 由站点 / API SPEC 提供。

### 9.3 Phase 3：迁移默认 format

目标：产品默认从 JSON 迁移为 readable TUI。

任务：

- 将命令级 `--format` 默认值从 `json` 改为 `text`。
- `parseOutputFormat(undefined)` 目标返回 `text`。
- README 和 examples 同步更新。
- CI / scripting docs 明确使用 `--format json`。

验收：

- `public-apis describe` 输出 readable TUI。
- 第 5.6 节列出的架构稳定命令默认输出 command-specific readable TUI。
- 第 5.6 节列出的站点派生命令默认输出 readable fallback；若存在站点 / API SPEC，则输出该 SPEC 定义的 readable TUI。
- `public-apis describe --format json` 仍输出稳定 JSON。
- `public-apis rpc` 行为不变。

### 9.4 Phase 4：完善 progress/error UX

目标：让长任务可理解，但不污染机器输出。

任务：

- 为 browser launch、auth login 和站点 SPEC 标记的长任务加 stderr progress hooks。
- 加入 error remediation mapping。
- 加入 non-TTY / CI 禁用动画逻辑。

验收：

- `--format json` stdout 仍可被 `JSON.parse`。
- progress 只出现在 stderr。
- no-color snapshot 不含 ANSI。

## 10. 迁移计划

当前实现现状：

- `OutputFormat = 'json' | 'text'` 已存在。
- `printResult` 已能输出 JSON 或简单 text。
- `parseOutputFormat(undefined)` 当前返回 `json`。
- 各命令的 `--format` 默认值当前是 `json`。
- text renderer 当前只是浅层 object key-value，不满足本规范的 command-specific readable TUI。

迁移顺序：

1. 不改默认值，先补 JSON contract tests。
2. 为 browser execution mode、login preflight、profile storage metadata 固化 JSON 字段。
3. 建立 renderer registry，并为低风险命令实现 text renderer：`describe`、`sites`、`workflows`、`endpoints`。
4. 为 auth/profile/session 命令实现 text renderer。
5. 为 generic site commands 实现 fallback renderer，只覆盖通道契约、browser mode、login preflight 和错误修复，不预设具体站点 UX。
6. 为 `browser list/stop` 明确 session 生命周期呈现。
7. 为 login-required / profile-not-ready 错误实现 remediation renderer。
8. 加入 no-color / non-TTY tests。
9. 更新 README，声明 `--format json` 是脚本模式。
10. 切换默认 format 到 text。
11. 保留 `--format json` 的兼容性，不做破坏性字段删除。

派生项目迁移要求：

- 为每个真实网站或开放 API 的交互命令新增站点 / API SPEC。
- 站点 / API SPEC 必须先定义 JSON contract，再定义 readable TUI。
- 未有站点 / API SPEC 的命令只能使用 generic fallback renderer，不得声明最终 UX 已完成。

迁移期间文档必须明确：UI/UX 目标默认 readable；开发实现先 JSON 后 text。

## 11. 参考证据

本 SPEC 基于项目 TUI 设计研究与本地原文归档。公开仓库不包含内部
研究归档路径。

关键依据：

- CLI command TUI 必须保留 stdout/stderr/exit code、TTY、pipe、CI 和 `--json` 等契约。
- Readable TUI 是渐进增强，不是 full-screen app。
- 原始数据契约必须先由 JSON 固化，再投影为 text。
- Command-mode TUI components 是 JSON result 或 stderr lifecycle event 的投影，不是 full-screen widget。
- 单次命令 layout 应使用稳定 block 契约，并区分常驻 block 与命令变化 block。
- 动效只能表达临时 lifecycle feedback；final state 必须静态化且可读。
- 颜色、动画和排版必须能力感知，并有 no-color / non-TTY fallback。
- 交互和 prompt 不能破坏脚本化路径。
