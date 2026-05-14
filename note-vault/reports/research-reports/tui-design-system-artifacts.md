# Artifact Export

## TUI design system final report
- Kind: final_report
- Node: (none)
# TUI 设计系统研究报告

## 研究问题
如何从设计系统视角系统研究 TUI（Terminal User Interface）设计：先厘清基本原理，再进入 UX/UI 模式，最后进入设计美学，并在每个阶段审计通过后再推进？

## 总结论
TUI 设计系统应被构建为三层约束栈：

1. 基本原理层决定“什么可行”：字符网格、控制序列、终端能力、输入模式、渲染状态、Unicode 宽度和可访问性边界。
2. UX/UI 层决定“用户如何操作”：screen、navigation、binding、form、collection、feedback、recovery 和 accessibility contract。
3. 美学层决定“如何一致表达”：type、space、color、border、symbol、motion、theme 和 density token。

这三层不能倒置。美学必须服从 UX contract；UX contract 必须服从终端能力与媒介限制。

## 基本原理层

### 关键发现
终端不是像素画布，而是状态化字符网格。TUI 程序通过输入字节/事件流更新内部状态，再把完整或差异化 frame 写到终端。控制序列、terminfo、VT flags、window size、Unicode display width 共同决定设计系统可假设的能力范围。

### 设计系统产物
- `cell`: row/column、display width、truncate、wrap、small viewport。
- `capability`: no-color、16-color、256-color、truecolor、mouse、paste、alt-screen、Windows VT。
- `input`: canonical/raw、key sequence、mouse mode、paste mode、timeout。
- `render`: full-frame、diff-flush、resize-redraw、cursor、restore。
- `fallback`: no-color、no-mouse、plain/log output、safe exit。

## UX/UI 层

### 关键发现
TUI UX/UI 是 capability-aware interaction contracts，不是 GUI 组件的文本版。每个交互模式都要定义状态、输入、输出、发现路径和恢复路径，并具备 no-color、keyboard-only、small viewport 与非交互 fallback。

### 设计系统产物
- `screen`: title、purpose、entry、exit、back、state restore。
- `navigation`: focus order、region switch、cursor、selection、activation。
- `command-discovery`: footer hints、context help、command palette、examples。
- `binding`: scope、priority、conflict、visibility、alternative path。
- `form`: label、hint、validation、submit、cancel、non-interactive fallback。
- `collection`: cursor、selection、filter、sort、pagination、empty/error/loading。
- `feedback`: busy、progress、success、warning、error、cancel/retry、log path。
- `recovery`: confirmation、dry-run、undo、rollback、safe terminal restore。

## 设计美学层

### 关键发现
TUI 美学不应追求装饰复杂度，而应把极少视觉变量 token 化：文本角色、cell-based spacing、语义色、分隔/边框、符号、motion 与主题。颜色、边框和动效只能增强语义，不能成为唯一信息载体。

### 设计系统产物
- `type`: heading、section、label、body、metadata、hint、code、error-text。
- `space`: inline/block/padding compact-default-relaxed，按 cell 计。
- `color`: semantic roles、color-depth mapping、no-color fallback。
- `border`: none、subtle、focus、divider、table、ASCII fallback。
- `symbol`: success、warning、error、info、loading、selected、expanded，带 ASCII/text fallback。
- `motion`: none、spinner、progress、reduced、static-log。
- `theme`: light、dark、unknown-terminal、accent、muted、disabled、selected。
- `density`: compact、default、relaxed，按 viewport threshold 切换。

## 分阶段审计结果

### 基本原理审计
通过。证据覆盖终端字符网格、控制序列、能力协商、输入模式、颜色能力、Unicode 宽度、屏幕状态与部分可访问性边界。遗留风险：跨平台现代 TUI 与 screen reader 证据不足，需要产品级测试。

### UX/UI 审计
通过。证据覆盖 CLI UX、screen stack、key bindings、focus、forms、tables/lists、progress、errors、accessibility fallback。遗留风险：full-screen TUI 的语义可访问性仍需目标终端实测。

### 美学审计
通过。证据覆盖 design token 模型、type/spacing/color/motion token、WCAG use-of-color/contrast/focus/motion、terminal style fallback。遗留风险：实际颜色对比部分由终端 emulator/theme 控制，需要 runtime/设置级验证。

## 最终原则

1. 先定义能力矩阵，再定义组件。
2. 每个交互模式都必须有发现路径和恢复路径。
3. focus、selection、active screen 必须分离。
4. color、border、icon、motion 永远只是增强，不是唯一语义。
5. 所有状态必须有文本表达。
6. full-screen TUI 必须提供 safe exit、terminal restore 和 plain/log output。
7. token 名称应表达语义角色，不表达具体装饰。
8. 小 viewport 是默认约束，不是边缘情况。
9. 鼠标是增强，键盘是主路径。
10. 美学一致性来自语义一致和 fallback 一致，而不是高装饰度。

## 证据状态
研究 ID：research_d20a7e0ec2774bfd8904fd1736c72d1b
已验证证据：33 项
阶段审计：基本原理、UX/UI、设计美学均通过

## TUI aesthetics layer audit
- Kind: phase_audit
- Node: (none)
# TUI 设计美学层审计

## 审计范围
只审计美学层是否能作为最终设计系统拼图的一部分。不评价具体品牌风格或视觉方案。

## 门禁检查

### 文本、空间、线条、颜色、符号建立层级
- 通过：已将 type、space、border、color、symbol token 化，并限制为语义角色。
- 证据：DTCG、Carbon typography/spacing/color、USWDS color、Textual themes、Lip Gloss。

### 密度、节奏、可读性
- 通过：密度以 cell-based spacing 和 compact/default/relaxed 模式表达；可读性由角色、对比、层级和 fallback 保证。
- 证据：Carbon spacing/type sets、WCAG contrast、Rich overflow/plain output。

### 色彩、边框、动效作为增强
- 通过：WCAG use of color、focus appearance、pause/stop/hide 已约束颜色和 motion；边框有 ASCII/no-border fallback。
- 证据：WCAG 1.4.1、WCAG contrast、WCAG focus appearance、WCAG pause/stop/hide、Lip Gloss profiles。

### 美学 token 落到设计系统
- 通过：DTCG 提供 token 格式与组合模型；TUI 映射为能力相关 token 和 fallback，而非随意装饰。
- 证据：Design Tokens Format Module、Carbon/USWDS token docs、Textual/Rich/Lip Gloss terminal style docs。

## 审计结论
美学层通过。三层拼图完整：基本原理 → UX/UI → 设计美学。

## 最终综合约束
- 基本原理决定可行性：cell grid、control sequences、capability、input、render、Unicode width、accessibility caveats。
- UX/UI 决定行为：screen、navigation、binding、form、collection、feedback、recovery、accessibility。
- 美学决定表达：type、space、color、border、symbol、motion、theme、density。
- 美学永远不得覆盖 UX contract；UX contract 永远不得假设不存在的终端能力。

## Continue / Stop / Degrade
- continue：生成最终设计系统研究报告与永久笔记。
- stop：研究目标已达到，可停在报告与知识库归档。
- degrade：若用于具体产品，需补实机可访问性测试和目标终端矩阵。

## TUI aesthetics synthesis
- Kind: phase_synthesis
- Node: (none)
# TUI 设计美学层综合

## 阶段边界
本阶段研究美学如何被 token 化并受约束地服务 UX。它不做品牌定稿，也不允许颜色、边框、动效或密度破坏 no-color、keyboard-only、small viewport、plain/log output。

## 核心判断
TUI 美学不是“让终端更花”，而是在字符网格里用极少视觉变量建立稳定层级。最佳表达方式不是一次性风格稿，而是 design tokens：密度、层级、spacing、语义色、边框、符号、motion、主题与 fallback 的可组合约束。

## 美学拼图

### Token 化先于风格化
W3C Design Tokens Format Module 提供了名称、类型、值、分组、引用和复合 token 的交换模型。TUI 美学应先定义 token 类型与语义，再映射到终端能力：no-color / ANSI 16 / 256-color / truecolor / plain output。

设计系统含义：不要定义“好看的蓝色边框”，而要定义 `border.focus`, `text.muted`, `status.error`, `space.panel.x`, `motion.spinner.interval` 等语义 token，并提供能力映射。

### 文本层级依赖角色，不依赖字体自由度
Carbon 的 typography docs 用 heading、body、label、helper、code 等角色组织 type sets。TUI 中通常没有字体族、字号、行高自由度，因此层级要转译为：标题前缀、大小写/粗体、缩进、空行、分隔线、语义标签、位置稳定性。

设计系统含义：至少定义 `heading`, `section`, `label`, `body`, `metadata`, `code`, `hint`, `error-text`。每个角色必须有 plain fallback，例如标题退化为 `## Title`，错误退化为 `ERROR: message`。

### 密度与留白以 cell 为单位
Carbon spacing 把 spacing 视为 negative area，并用 token 管理节奏与密度。TUI 的留白成本更高，因为每个空格都是字符单元。留白不能照搬 Web 8px 网格，而应转为 0/1/2/4 rows/cols 的紧凑尺度。

设计系统含义：定义 `space.inline.0/1/2`, `space.block.0/1/2`, `padding.panel.compact/default/relaxed`。小 viewport 时自动收缩 block spacing，优先保留信息层级和可操作提示。

### 颜色只能增强语义，不能承载唯一语义
WCAG 1.4.1 明确颜色不能作为唯一信息手段；Carbon 和 USWDS 都用角色/状态 token 管理颜色，而非直接使用色值。终端颜色还受 emulator theme 和 color depth 影响，真实对比不可完全由应用控制。

设计系统含义：所有 status color 都要绑定文本/符号：`[ERROR]`, `!`, `✗`, `invalid`。颜色 token 应分层：`fg.default`, `fg.muted`, `fg.accent`, `status.success/warning/error`, `border.focus`, `selection.bg`。no-color 时保持同等语义。

### 边框与分隔用于结构，不用于装饰
Lip Gloss 和 Textual 都能表达 border、padding、alignment、theme variables；但终端边框消耗列宽，也可能因 Unicode 宽度、字体、fallback 变得不稳定。边框应是 grouping token，而不是审美目的。

设计系统含义：定义 `border.none`, `border.subtle`, `border.focus`, `divider.section`, `divider.table`，并为 ASCII fallback 定义 `-`, `|`, `+`。小 viewport 默认减少外框，保留内部分隔与标题。

### 符号要有 ASCII 与文本 fallback
符号能快速提高扫描效率，但 Unicode glyph、emoji、nerd fonts 在不同终端不可控。符号必须可替换为 ASCII 和文本标签。

设计系统含义：`icon.success` 可映射为 `✓` / `+` / `SUCCESS`；`icon.error` 映射为 `✗` / `!` / `ERROR`。不要把唯一信息放在图标形状里。

### Motion 是状态反馈，不是装饰
Carbon motion 区分 productive 和 expressive motion；WCAG pause/stop/hide 约束长时间运动内容。Rich 提供 status spinner，但也支持 no-color/plain 输出。终端 motion 更容易造成闪烁与不可读，因此只能作为忙碌/等待提示增强。

设计系统含义：定义 `motion.none`, `motion.spinner`, `motion.progress`, `motion.blink.prohibited`。长任务必须有静态文本状态和日志输出；spinner 不能替代进度/可取消/错误恢复。

### 品牌一致性来自语义一致，不是高装饰度
Textual theme variables 与 Carbon/USWDS 的 token layering 说明，品牌应通过语义角色、命名和一致映射表达。TUI 的品牌不应依赖复杂图形，而应来自语气、术语、状态文案、少量 accent 和稳定结构。

设计系统含义：品牌 token 应限制在 `accent`, `tone.copy`, `logo.ascii`, `welcome.pattern`, `empty-state.voice`。核心操作与错误状态优先保持通用可理解。

## 美学层产物

TUI 美学 token 至少包含：
- `type`: heading、section、label、body、metadata、hint、code、error-text。
- `space`: inline/block/padding compact-default-relaxed，cell-based。
- `color`: semantic roles + color-depth mappings + no-color fallback。
- `border`: none/subtle/focus/divider/table + ASCII fallback。
- `symbol`: success/warning/error/info/loading/selected/expanded + ASCII/text fallback。
- `motion`: none/spinner/progress/reduced/static-log。
- `theme`: light/dark/unknown-terminal, accent, muted, disabled, selected。
- `density`: compact/default/relaxed with viewport thresholds。

## 美学阶段结论
美学层足以通过审计：TUI 美学应作为 tokenized constraints，服务基本原理与 UX/UI contract。进入最终综合时，三层关系应明确为：基本原理决定可行性，UX/UI 决定行为，美学决定一致且可降级的表达。

## TUI aesthetics stage brief
- Kind: phase_brief
- Node: (none)
# TUI 设计美学阶段研究简报

## 阶段目标
在基本原理与 UX/UI contract 已通过审计的基础上，研究 TUI 的设计美学：文本密度、层级、留白、色彩、边框、图标/符号、动效节奏、品牌一致性与 token 化表达。

## 阶段边界
- 研究美学原则与设计系统 token，不做具体品牌定稿。
- 不允许美学覆盖交互和可访问性约束。
- 每个美学建议必须有 no-color、small viewport、keyboard-only、plain/log mode fallback。

## 审计门槛
必须回答：
1. TUI 如何用文本、空间、线条、颜色与符号建立层级？
2. 低保真媒介中如何控制密度、节奏和可读性？
3. 色彩、边框、动效如何只作为增强而不是唯一信息载体？
4. 美学 token 如何落到设计系统，而不变成随意装饰？

## TUI UX UI layer audit
- Kind: phase_audit
- Node: (none)
# TUI UX/UI 模式层审计

## 审计范围
只审计 UX/UI 模式层是否足以进入设计美学研究。不评价颜色美感、品牌风格、边框审美或动效。

## 门禁检查

### 信息架构
- 通过：已建立命令树 + screen stack 双层模型。
- 证据：clig.dev、Microsoft System.CommandLine、PatternFly CLI、Textual screens。

### 导航与焦点
- 通过：focus / selection / active screen 已分离；焦点顺序、可见焦点、组合控件导航有 WAI-ARIA 迁移依据。
- 证据：WAI-ARIA APG keyboard interface、Textual input/bindings、Bubble Tea。

### 命令发现与快捷键
- 通过：help、examples、footer bindings、context help、command palette 分层可成立；快捷键作用域与冲突处理有依据。
- 证据：clig.dev、PatternFly CLI、Textual input/bindings、Microsoft guidance。

### 表单、列表、表格
- 通过：input states、validation、cursor、selection、scroll-to-cursor、empty/error/loading 状态有框架证据。
- 证据：Textual Input、Textual DataTable、Bubble Tea list model。

### 反馈与错误恢复
- 通过：system status、progress、indeterminate progress、warnings/errors、recovery next steps、confirm/dry-run/undo 方向已覆盖。
- 证据：NN/g heuristics、Textual ProgressBar、clig.dev、PatternFly CLI。

### 可访问性语义
- 条件通过：keyboard-only、no-color、text redundancy、focus visibility、plain/log output 可作为保守 contract；但 full-screen TUI 与 screen reader 的跨平台实现仍需产品级测试验证。
- 处理：美学阶段不得以颜色、边框、位置、动画作为唯一信息载体。

## 审计结论
UX/UI 模式层通过，允许进入“设计美学层”研究。

## 进入下一阶段的约束
- 美学只能在基本原理与 UX/UI contract 内表达。
- 所有颜色/边框/动效/密度建议必须附 fallback，不可削弱 no-color、keyboard-only、small viewport 与可复制输出。
- 不做品牌定稿，只研究美学原则与 token 化方向。

## Continue / Stop / Degrade
- continue：进入设计美学层研究。
- stop：若只需要交互模式，可在此停止。
- degrade：若美学证据缺少 TUI-specific 来源，则用通用视觉设计原则 + TUI 案例观察，并明确确定度降低。

## TUI UX UI patterns synthesis
- Kind: phase_synthesis
- Node: (none)
# TUI UX/UI 模式层综合

## 阶段边界
本阶段只研究交互结构与界面模式：信息架构、导航、命令发现、快捷键、焦点、输入、列表/表格、反馈、错误恢复、可访问性语义。暂不讨论视觉美学、品牌风格、边框审美、颜色搭配或动效美感。

## 核心判断
TUI 的 UX/UI 不是 GUI 的低保真移植，也不是 CLI 的“全屏化”。它应被设计为一组 capability-aware interaction contracts：每个界面模式都必须明确状态、输入、输出、发现路径、恢复路径，以及无颜色、无鼠标、小窗口、脚本化/非交互场景下的 fallback。

## UX/UI 拼图

### 信息架构：命令树与屏幕栈并存
CLI 指南强调 subcommands、arguments、flags、help、stdout/stderr 与脚本化兼容；Textual 提供 screen stack：只有顶部 screen 可见并接收输入，可 push/switch/pop，modal screen 也属于栈管理。TUI 设计系统因此需要双层 IA：命令/任务层级负责“用户要做什么”，screen/panel/modal 层级负责“当前在哪里处理”。

设计系统含义：每个 screen 都要有任务名、返回路径、退出路径、可恢复状态和对应命令入口。全屏 TUI 不能切断 CLI 的 help、dry-run、non-interactive 和 machine-readable 输出路径。

### 导航：焦点、选择、页面是三个不同状态
WAI-ARIA APG 明确区分 focus 与 selection，并强调持久可见焦点与可预测焦点移动；Textual 和 Bubble Tea 都把 key event / model state / view render 串成显式状态变化。TUI 里“当前聚焦控件”“当前选中项”“当前页面/模式”必须分离，否则用户会迷路。

设计系统含义：定义 focus ring/cursor、selection marker、active screen 三套状态 token；Tab/Shift+Tab 或区域切换负责 focus，方向键负责集合内游标，Enter/Space 负责选择或激活。鼠标只能增强，不应成为主导航。

### 命令发现：help 是导航层，不只是文档
clig.dev 强调 discoverable CLI 应有 help、examples、错误时建议下一步；PatternFly CLI handbook 也强调描述性 prompt/feedback、help flags 与非交互模式。Textual 的 bindings 可显示在 footer，命令面板也是现代 TUI 的发现路径。

设计系统含义：TUI 至少需要三层发现：常驻轻提示（如底部快捷键）、上下文帮助（当前 screen/panel 的可用动作）、完整 help/command palette。帮助文案要包含 “what / why / next step”，而不是只列按键。

### 快捷键：上下文优先级必须可解释
Textual 的绑定沿焦点 widget 到 DOM 的路径解析，并支持 priority bindings 与 footer-visible bindings；WAI-ARIA 提醒快捷键可能与浏览器、辅助技术、操作系统冲突。终端里还存在 Tab 与 Ctrl+I 等不可区分输入。

设计系统含义：快捷键规范要定义作用域：global、screen、panel、widget。冲突处理要可见；关键动作必须有命令路径或菜单路径；危险动作不能只靠单个快捷键直接触发。

### 输入与表单：验证是交互流的一部分
Textual Input 包含 placeholder、type、restrict、max_length、validation、submitted/changed/blurred 等状态；CLI 指南强调交互 prompt 要能与非交互/脚本化路径共存。TUI 表单必须同时支持即时反馈与最终提交验证。

设计系统含义：表单字段需要 label、hint、placeholder、value、valid/invalid、error text、disabled/readonly、dirty/submitted 状态。每个 interactive flow 都要有非交互参数/配置 fallback，避免只在 TUI 中才能完成任务。

### 列表与表格：cursor、selection、viewport、empty state 分离
Textual DataTable 将 cursor movement、selection、scroll-to-cursor、row/column update 分开；Bubble Tea 教程中的 list model 分离 choices、cursor、selected。表格不是“画线”，而是集合操作：移动、选择、过滤、排序、分页、详情展开。

设计系统含义：列表/表格组件需要明确 cursor、selected、hover、filtered、sorted、loading、empty、error、truncated、details-open 状态。小 viewport 下必须有摘要/分页/搜索 fallback，不能只依赖横向滚动。

### 反馈：进度、忙碌、完成和日志是不同通道
NN/g 的 visibility of system status 与 clig.dev 的 “saying enough” 都要求用户知道系统在做什么。Textual ProgressBar 区分 indeterminate、in-progress、completed；Bubble Tea 因为 TUI 占用 stdout，建议日志写入文件。这说明全屏 TUI 需要把状态反馈与可审计日志分离。

设计系统含义：反馈 token 至少包含 idle、busy、indeterminate、progress(value/total)、success、warning、error、cancelled、retrying。长任务必须提供取消/后台/查看日志路径；无动画 fallback 用文本状态与计数。

### 错误恢复：错误是下一步引导
clig.dev 要求错误解释发生了什么、如何修复，并给出下一步；NN/g 强调错误预防、识别而非回忆、诊断和恢复。TUI 错误不能只是红色文本或弹窗，它应把用户带回可恢复状态。

设计系统含义：错误组件需要 cause、impact、next action、retry、copy details、open log、undo/rollback、safe exit。危险操作需要 preview/dry-run、confirm、undo 或 checkpoint。不可恢复错误也必须恢复终端状态。

### 可访问性语义：文本冗余与模式退出优先
PatternFly CLI handbook 明确不应只依赖颜色，并需要描述性反馈；WAI-ARIA APG 的键盘和焦点原则可迁移为 TUI 的语义约束。第一阶段留下的跨平台终端 a11y 缺口在这里转化为设计要求：不要依赖宿主能理解你的布局。

设计系统含义：状态必须有文本标签；焦点/选择不能只靠颜色；所有动作键盘可达；支持 no-color；输出可复制；提供 plain/log mode；modal 必须有清晰退出；动态区域要有可读的稳定文本总结。

## UX/UI 层产物

TUI 设计系统的 UX/UI contract 至少包含：
- `screen`: title、purpose、entry、exit、back、mode、state restore。
- `navigation`: focus order、region switch、cursor move、selection activation。
- `command-discovery`: footer hints、context help、command palette、examples。
- `binding`: scope、priority、conflict、visibility、alternative path。
- `form`: label、hint、validation、submit、cancel、non-interactive fallback。
- `collection`: cursor、selection、filter、sort、pagination、empty/error/loading。
- `feedback`: progress、busy、success/error/warning、log path、cancel/retry。
- `recovery`: confirmation、dry-run、undo、rollback、safe terminal restore。
- `accessibility`: no-color, keyboard-only, text redundancy, plain output mode。

## UX/UI 阶段结论
UX/UI 层可以通过审计并进入美学阶段，但美学阶段必须服从本阶段 contract：任何颜色、边框、动效、排版密度都不能破坏可发现性、焦点可见性、错误恢复和 fallback。

## TUI UX UI stage brief
- Kind: phase_brief
- Node: (none)
# TUI UX/UI 阶段研究简报

## 阶段目标
在已通过审计的基本原理层之上，研究 TUI 的 UX/UI 模式：信息架构、导航、反馈、错误恢复、快捷键、表单、列表、渐进披露与可访问性语义。

## 阶段边界
- 允许研究交互与界面结构。
- 不进入视觉美学、品牌感、色彩风格、边框风格、动效美学。
- 每个模式必须继承基本原理层约束：能力矩阵、keyboard-only、no-color、small viewport、no-mouse fallback。

## 审计门槛
UX/UI 研究通过前，必须回答：
1. TUI 信息架构如何表达页面、命令、面板、焦点和状态？
2. 用户如何发现命令、快捷键和当前位置？
3. 输入、表单、列表、表格、搜索、过滤、选择如何设计 fallback？
4. 长任务、错误、撤销、确认、危险操作如何反馈与恢复？
5. 可访问性语义如何不依赖颜色、位置、边框和动画？

## TUI basic principles audit
- Kind: phase_audit
- Node: (none)
# TUI 基本原理层审计

## 审计范围
只审计“基本原理层”是否完整到足以作为后续 UX/UI 研究的地基。不评价组件模式、视觉美学或具体产品方案。

## 门禁检查

### 终端环境限制
- 通过：字符网格、动态行列尺寸、窗口变化、screen buffer、render diff 均有一手或官方来源支撑。
- 证据：TIOCGWINSZ、Ratatui Terminal/Buffer、xterm ctlseqs、Windows VT sequences。

### 输入模型限制
- 通过：canonical/noncanonical/raw mode 与 VT 输入 flag 已验证；特殊键和鼠标编码的碎片化由 xterm/Windows VT 支撑。
- 证据：termios、xterm ctlseqs、Windows VT sequences。

### 输出与控制协议限制
- 通过：ECMA-48 提供标准控制函数底座；xterm 说明现实扩展层，能解释标准与事实兼容之间的分层。
- 证据：ECMA-48、xterm ctlseqs。

### 能力协商限制
- 通过：terminfo 能力模型和 Windows VT flag 共同说明不能硬编码能力，必须设计 fallback。
- 证据：ncurses terminfo、Windows VT sequences。

### 颜色与样式限制
- 通过：SGR、8/16/256/truecolor 层级已定位到 xterm 与 Windows VT 参考。
- 证据：xterm ctlseqs、Windows VT sequences。

### Unicode 宽度限制
- 通过但需谨慎：UAX #11 能解释 East Asian Width 与固定宽度文本处理，但它自身警告不直接等同现代终端实现。
- 证据：Unicode UAX #11。

### 可访问性限制
- 条件通过：已有 Windows Console accessibility 证据可证明“辅助技术依赖宿主暴露 buffer/state”，但跨平台现代终端与 screen reader 证据不足。
- 处理：不阻塞进入 UX/UI，但必须作为下一阶段风险项继续补证。

## 审计结论
基本原理层通过，允许进入下一阶段“UX/UI 模式研究”。

## 进入下一阶段的约束
- UX/UI 研究必须继承能力矩阵，不得假设理想终端。
- 每个 UX pattern 必须说明 keyboard-only、no-color、small viewport、no-mouse fallback。
- 可访问性语义必须在 UX/UI 阶段并行补证，不得推迟到美学阶段。
- 不进入美学阶段，直到 UX/UI 模式被单独审计通过。

## Continue / Stop / Degrade
- continue：进入 UX/UI 模式研究。
- stop：如果用户只需要基本原理，可以在此停止。
- degrade：若后续无法取得足够 UX/UI 官方证据，则改为“设计假设 + 案例观察”，并降低确定度。

## TUI basic principles synthesis
- Kind: phase_synthesis
- Node: (none)
# TUI 基本原理层综合

## 阶段边界
本阶段只回答“终端是什么媒介、它给设计系统施加哪些不可绕过的约束”。暂不讨论导航模式、组件库、视觉风格或品牌表达。

## 核心判断
TUI 设计系统的底座不是“把 GUI 组件画成字符”，而是一个受终端媒介约束的状态机：应用读取字节/事件流，依据终端能力与尺寸，把期望 UI 写入字符单元网格，再通过控制序列与缓冲区状态把差异同步到终端。

## 基本原理拼图

### 字符单元是最小布局单位
终端 UI 的布局基础是行列网格，而不是像素画布。窗口行列数是运行时状态，不是静态规格：Linux 侧可通过窗口尺寸 ioctl 获得 `ws_row` 与 `ws_col`，窗口变化会触发 `SIGWINCH`。现代 TUI 框架也把渲染抽象成 `Buffer`，其内容长度与 `width * height` 对齐，每个 cell 持有 grapheme、前景色与背景色。

设计系统含义：spacing、sizing、breakpoint、dense/comfortable 模式都应以 cells/columns/rows 表达，而不是 px/rem。任何布局都必须定义窄宽度、低高度与 resize 行为。

### 控制序列是输出协议，不是装饰语法
ECMA-48 定义了字符编码数据中的控制函数；xterm 文档体现了现实中的 ECMA-48、DEC、xterm 与 aixterm 扩展混合。光标移动、清屏、SGR 样式、备用屏幕、鼠标追踪、括号粘贴都不是 UI 组件本身，而是终端协议能力。

设计系统含义：所有视觉 token 和交互能力必须声明协议依赖级别，例如 baseline ECMA-48、xterm-compatible、Windows VT-enabled、256-color、truecolor、mouse-enabled。

### 能力协商优先于硬编码
terminfo 的核心模型是用 boolean、numeric、string capabilities 描述终端具有的特性、操作方法和初始化序列。Windows Console 的 VT 行为还需要显式启用 `ENABLE_VIRTUAL_TERMINAL_PROCESSING` / `ENABLE_VIRTUAL_TERMINAL_INPUT`，失败时应降级。

设计系统含义：TUI 设计系统需要能力矩阵，而不是单套“理想终端”规范。每个 token/组件都应有 fallback：无色、8 色、256 色、truecolor；无鼠标、鼠标；无备用屏幕、备用屏幕。

### 输入不是 DOM 事件，而是模式化字节流
POSIX 终端默认 canonical mode 以行为单位交付输入；noncanonical/raw mode 才提供即时输入并关闭行编辑/回显等处理。特殊键、鼠标、粘贴与修饰键在现实终端中通过多种转义序列表达；Windows VT 输入也只有在相应 flag 开启时才进入输入流。

设计系统含义：交互设计不能默认“每个物理键都有稳定事件”。需要定义键盘优先、可发现快捷键、冲突处理、粘贴与鼠标的可选增强，以及无鼠标/无修饰键 fallback。

### Unicode 宽度是布局风险源
Unicode UAX #11 给出 East_Asian_Width 规范属性，但也明确提示它不是现代终端模拟器的开箱即用答案；ambiguous width 需要上下文裁剪。终端固定网格中，一个字符串占多少列不是字节数，也不等于 Unicode scalar 数。

设计系统含义：文本 token 必须区分 character count、grapheme count、display width。表格、边框、对齐、截断、搜索高亮和国际化都必须使用 display width 计算并定义 ambiguous width 策略。

### 屏幕状态需要进入设计系统约束
xterm 与 Windows Console 都支持 main/alternate screen buffer，备用屏幕通常用于全屏应用，尺寸等同显示区域且没有 scrollback。现代框架通过 current/previous buffer diff 来避免冗余输出，并要求每帧完整渲染，否则终端状态会不一致。

设计系统含义：全屏 TUI 与 inline TUI 是两种不同产品形态。设计系统必须声明启动/退出恢复、光标显示、异常退出恢复、scrollback 保留与 redraw 策略。

### 可访问性需要平台能力与语义补偿
Windows Console accessibility 资料说明，辅助技术依赖 console APIs/events 读取 buffer/state 和追踪更新；这证明终端可访问性更多依赖宿主平台暴露的状态，而不是像 Web 一样拥有统一语义树。本阶段还缺少跨平台现代终端可访问性的一手证据。

设计系统含义：不能把颜色、位置、边框或动画作为唯一信息载体。需要文本冗余、状态文案、可复制输出、日志模式与简化模式。跨平台可访问性仍是下一轮需补证据的缺口。

## 基本原理层产物

TUI 设计系统的底层 token 应至少包含：
- `cell`: 行列、最小宽高、显示宽度、截断策略。
- `capability`: color depth、truecolor、mouse、paste、alternate screen、unicode width、Windows VT mode。
- `input`: canonical/raw、key sequence、mouse mode、paste mode、timeout。
- `render`: full frame、diff flush、resize redraw、cursor state、recovery。
- `fallback`: no-color、low-color、no-mouse、small viewport、plain log mode。

## 第一阶段结论
基本原理层已足以支撑下一阶段 UX/UI 研究，但有一个条件：进入 UX/UI 时必须把“可访问性语义与跨平台 assistive tech”作为并行风险项继续补证，不应等到美学阶段才处理。

## TUI design system staged research charter
- Kind: research_charter
- Node: (none)
# TUI Design System Research — 研究章程

## 研究目标
从设计系统视角研究 TUI（Terminal User Interface）设计，不先追求完整答案，而是按层推进：基本原理 → UX/UI → 设计美学。每一层先形成可审计判断，审计通过后才进入下一层。

## 范围边界
- 对象：现代终端应用、CLI/TUI 混合应用、文本界面框架与终端渲染环境。
- 不做：具体库选型排名、品牌视觉规范定稿、单一产品 UI 评审。
- 证据优先级：终端标准/规范与权威文档 > 成熟框架文档 > 经典 TUI/CLI 设计指南 > 案例观察。

## 分阶段门禁
### 基本原理门禁
必须回答：终端环境的输入、输出、布局、颜色、状态、可访问性限制分别是什么；这些限制如何转化为设计 token 与组件约束。

### UX/UI 门禁
必须回答：信息架构、导航、反馈、错误恢复、快捷键、表单、列表、渐进披露如何在终端里表达。

### 设计美学门禁
必须回答：文本密度、层级、留白、色彩、边框、动效、品牌感如何在低保真媒介中形成一致美学。

## 当前阶段
只研究「基本原理」。不进入 UX/UI 模式和美学模式，除非基本原理审计通过。
