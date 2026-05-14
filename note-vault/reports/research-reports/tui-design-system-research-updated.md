# TUI Design System Research

- Research ID: research_d20a7e0ec2774bfd8904fd1736c72d1b
- Question: 如何从设计系统视角系统研究 TUI（Terminal User Interface）设计：先厘清基本原理，再进入 UX/UI 模式，最后进入设计美学，并在每个阶段审计通过后再推进？
- Lifecycle: completed
- Maturity: substantiated
- Branch: main
- Artifact Count: 11
- Evidence Count: 40

## Readable Artifacts
### TUI design system final report
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

## Nodes
- [question] TUI design system can be decomposed into constrained layers | workflow=resolved | epistemic=supported
- [hypothesis] Terminal substrate constraints determine TUI design primitives | workflow=ready | epistemic=supported
- [gap] Basic TUI primitives need primary-source validation | workflow=ready | epistemic=supported
- [task] Audit basic-principles layer before UX UI research | workflow=resolved | epistemic=supported
- [hypothesis] TUI UX patterns must be capability-aware interaction contracts | workflow=ready | epistemic=supported
- [gap] TUI UX UI patterns need evidence beyond terminal mechanics | workflow=ready | epistemic=supported
- [task] Audit UX UI layer before aesthetic research | workflow=resolved | epistemic=supported
- [hypothesis] TUI aesthetics should be tokenized constraints not decoration | workflow=ready | epistemic=supported
- [gap] TUI aesthetic principles need design-system and accessibility evidence | workflow=ready | epistemic=supported
- [task] Audit aesthetic layer before final synthesis | workflow=resolved | epistemic=supported
- [question] Command-mode TUI differs from interactive full-screen TUI | workflow=resolved | epistemic=supported
- [hypothesis] Command-mode TUI should preserve CLI contracts while adding optional interaction | workflow=ready | epistemic=supported
- [gap] Need evidence separating command CLIs from persistent TUI apps | workflow=ready | epistemic=supported

## Evidence
- gcloud CLI trees for command discovery | trust=5 | source=https://cloud.google.com/sdk/gcloud/reference/beta/topic/cli-trees | archive=none
- gcloud beta interactive shell | trust=5 | source=https://cloud.google.com/sdk/gcloud/reference/beta/interactive | archive=none
- PatternFly CLI interactive mode guidance | trust=5 | source=https://www.patternfly.org/developer-resources/cli-handbook/writing-guidelines/ | archive=none
- Heroku CLI style guide command output and prompting | trust=5 | source=https://devcenter.heroku.com/articles/cli-style-guide | archive=none
- Salesforce CLI interactivity and JSON scripting guidance | trust=5 | source=https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/interactivity.html | archive=none
- Fuchsia CLI user vs programmatic interaction guidance | trust=5 | source=https://fuchsia.dev/fuchsia-src/development/api/cli | archive=none
- CLIG command composability and interactivity boundaries | trust=4 | source=https://clig.dev/ | archive=none
- Lip Gloss terminal style primitives | trust=4 | source=https://github.com/charmbracelet/lipgloss | archive=none
- Textual themes and terminal design variables | trust=4 | source=https://textual.textualize.io/guide/design/ | archive=none
- Rich Console API terminal styling and fallback | trust=4 | source=https://rich.readthedocs.io/en/latest/console.html | archive=none
- USWDS color token overview | trust=5 | source=https://designsystem.digital.gov/design-tokens/color/overview/ | archive=none
- Carbon motion overview | trust=5 | source=https://carbondesignsystem.com/elements/motion/overview/ | archive=none
- Carbon color tokens | trust=5 | source=https://carbondesignsystem.com/elements/color/tokens/ | archive=none
- Carbon spacing tokens | trust=5 | source=https://carbondesignsystem.com/elements/spacing/overview/ | archive=none
- Carbon typography type sets | trust=5 | source=https://carbondesignsystem.com/elements/typography/type-sets/ | archive=none
- WCAG 2.2 Understanding Pause Stop Hide | trust=5 | source=https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html | archive=none
- WCAG 2.2 Understanding Focus Appearance | trust=5 | source=https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html | archive=none
- WCAG 2.2 Contrast Minimum | trust=5 | source=https://www.w3.org/TR/wcag/#contrast-minimum | archive=none
- WCAG 2.2 Understanding Use of Color | trust=5 | source=https://www.w3.org/WAI/WCAG22/Understanding/use-of-color | archive=none
- Design Tokens Format Module 2025.10 | trust=5 | source=https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/ | archive=none
- Bubble Tea README and tutorial | trust=4 | source=https://github.com/charmbracelet/bubbletea | archive=none
- Textual ProgressBar widget | trust=4 | source=https://textual.textualize.io/widgets/progress_bar/ | archive=none
- Textual DataTable widget | trust=4 | source=https://textual.textualize.io/widgets/data_table/ | archive=none
- Textual input widget | trust=4 | source=https://textual.textualize.io/widgets/input/ | archive=none
- Textual input and bindings guide | trust=4 | source=https://textual.textualize.io/guide/input/ | archive=none
- Textual screens guide | trust=4 | source=https://textual.textualize.io/guide/screens/ | archive=none
- Nielsen Norman Group ten usability heuristics | trust=4 | source=https://www.nngroup.com/articles/ten-usability-heuristics/ | archive=none
- WAI-ARIA APG keyboard interface practice | trust=5 | source=https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/ | archive=none
- PatternFly command-line interface handbook | trust=5 | source=https://www.patternfly.org/developer-resources/cli-handbook/ | archive=none
- Microsoft System.CommandLine design guidance | trust=5 | source=https://learn.microsoft.com/en-us/dotnet/standard/commandline/design-guidance | archive=none
- Command Line Interface Guidelines | trust=4 | source=https://clig.dev/ | archive=none
- Microsoft Console accessibility APIs and events | trust=4 | source=https://learn.microsoft.com/en-us/previous-versions/windows/desktop/dnacc/console-accessibility | archive=none
- Ratatui Terminal abstraction | trust=4 | source=https://docs.rs/ratatui/latest/ratatui/struct.Terminal.html | archive=none
- Windows Console virtual terminal sequences | trust=5 | source=https://learn.microsoft.com/en-us/windows/console/console-virtual-terminal-sequences | archive=none
- Unicode UAX #11 East Asian Width | trust=5 | source=https://www.unicode.org/reports/tr11/ | archive=none
- Linux TIOCGWINSZ window size manual | trust=4 | source=https://man7.org/linux/man-pages/man2/TIOCSWINSZ.2const.html | archive=none
- Linux termios manual | trust=4 | source=https://www.man7.org/linux/man-pages/man3/termios.3.html | archive=none
- ncurses terminfo manual | trust=5 | source=https://invisible-island.net/ncurses/man/terminfo.5.html | archive=none
- XTerm control sequences reference | trust=5 | source=https://invisible-island.net/xterm/ctlseqs/ctlseqs.html | archive=none
- ECMA-48 control functions for coded character sets | trust=5 | source=https://ecma-international.org/publications-and-standards/standards/ecma-48/ | archive=none

## Evidence Links
- node_b8590c2f02c045799b8ee813cb1f32f8 <=(supports)= ECMA-48 control functions for coded character sets
- node_b8590c2f02c045799b8ee813cb1f32f8 <=(supports)= XTerm control sequences reference
- node_b8590c2f02c045799b8ee813cb1f32f8 <=(supports)= ncurses terminfo manual
- node_b8590c2f02c045799b8ee813cb1f32f8 <=(supports)= Linux termios manual
- node_b8590c2f02c045799b8ee813cb1f32f8 <=(supports)= Linux TIOCGWINSZ window size manual
- node_afb00ac95df648a3909be9ac317a8e64 <=(supports)= Unicode UAX #11 East Asian Width
- node_b8590c2f02c045799b8ee813cb1f32f8 <=(supports)= Windows Console virtual terminal sequences
- node_afb00ac95df648a3909be9ac317a8e64 <=(supports)= Ratatui Terminal abstraction
- node_afb00ac95df648a3909be9ac317a8e64 <=(supports)= Microsoft Console accessibility APIs and events
- node_d8b21f20c21a4a3384cb44835c3e1917 <=(supports)= Command Line Interface Guidelines
- node_d8b21f20c21a4a3384cb44835c3e1917 <=(supports)= Microsoft System.CommandLine design guidance
- node_d8b21f20c21a4a3384cb44835c3e1917 <=(supports)= PatternFly command-line interface handbook
- node_48789ff1fdb44c3086fce3444bef12be <=(supports)= WAI-ARIA APG keyboard interface practice
- node_48789ff1fdb44c3086fce3444bef12be <=(supports)= Nielsen Norman Group ten usability heuristics
- node_d8b21f20c21a4a3384cb44835c3e1917 <=(supports)= Textual screens guide
- node_d8b21f20c21a4a3384cb44835c3e1917 <=(supports)= Textual input and bindings guide
- node_d8b21f20c21a4a3384cb44835c3e1917 <=(supports)= Textual input widget
- node_d8b21f20c21a4a3384cb44835c3e1917 <=(supports)= Textual DataTable widget
- node_d8b21f20c21a4a3384cb44835c3e1917 <=(supports)= Textual ProgressBar widget
- node_d8b21f20c21a4a3384cb44835c3e1917 <=(supports)= Bubble Tea README and tutorial
- node_ed9ca338c90e41e1a9403ed39721b509 <=(supports)= Design Tokens Format Module 2025.10
- node_ed9ca338c90e41e1a9403ed39721b509 <=(supports)= WCAG 2.2 Understanding Use of Color
- node_64b2e95585de45fb8bf0c9959f960fd8 <=(supports)= WCAG 2.2 Contrast Minimum
- node_ed9ca338c90e41e1a9403ed39721b509 <=(supports)= WCAG 2.2 Understanding Focus Appearance
- node_ed9ca338c90e41e1a9403ed39721b509 <=(supports)= WCAG 2.2 Understanding Pause Stop Hide
- node_ed9ca338c90e41e1a9403ed39721b509 <=(supports)= Carbon typography type sets
- node_ed9ca338c90e41e1a9403ed39721b509 <=(supports)= Carbon spacing tokens
- node_ed9ca338c90e41e1a9403ed39721b509 <=(supports)= Carbon color tokens
- node_ed9ca338c90e41e1a9403ed39721b509 <=(supports)= Carbon motion overview
- node_64b2e95585de45fb8bf0c9959f960fd8 <=(supports)= USWDS color token overview
- node_ed9ca338c90e41e1a9403ed39721b509 <=(supports)= Rich Console API terminal styling and fallback
- node_ed9ca338c90e41e1a9403ed39721b509 <=(supports)= Textual themes and terminal design variables
- node_ed9ca338c90e41e1a9403ed39721b509 <=(supports)= Lip Gloss terminal style primitives
- node_72e52d90b8ac4248bd74ffd8329646f2 <=(supports)= CLIG command composability and interactivity boundaries
- node_72e52d90b8ac4248bd74ffd8329646f2 <=(supports)= Fuchsia CLI user vs programmatic interaction guidance
- node_72e52d90b8ac4248bd74ffd8329646f2 <=(supports)= Salesforce CLI interactivity and JSON scripting guidance
- node_72e52d90b8ac4248bd74ffd8329646f2 <=(supports)= Heroku CLI style guide command output and prompting
- node_b03fedc310d24091ac3ecd124817d006 <=(supports)= PatternFly CLI interactive mode guidance
- node_72e52d90b8ac4248bd74ffd8329646f2 <=(supports)= gcloud beta interactive shell
- node_b03fedc310d24091ac3ecd124817d006 <=(supports)= gcloud CLI trees for command discovery
