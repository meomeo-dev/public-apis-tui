import { access, mkdir, stat, unlink, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'
import { readPublicApiProviderConfig } from '../../infrastructure/persistence/publicApiConfig.js'

export const NEWS_FLASH_PROVIDERS = ['spaceflightnews', 'hackernews', 'hashnode', 'newsapi', 'gnews'] as const

export type NewsFlashProvider = typeof NEWS_FLASH_PROVIDERS[number]

export type InstallNewsFlashOptions = {
  provider: NewsFlashProvider
  repoRoot: string
  intervalMinutes: number
  providerEnv?: Record<string, string> | undefined
  label?: string | undefined
  shellPath?: string | undefined
  dryRun?: boolean | undefined
  skipLoad?: boolean | undefined
  runTimeoutMs?: number | undefined
}

export type NewsFlashProviderInfo = {
  provider: NewsFlashProvider
  templateDir: string
  operation: string
  description: string
  requiredEnv: string[]
  parameters: NewsFlashProviderParameter[]
}

export type ListNewsFlashProvidersResult = {
  kind: 'experimental.newsFlash.providers'
  providers: NewsFlashProviderInfo[]
}

export type DoctorNewsFlashOptions = {
  provider: NewsFlashProvider
  repoRoot: string
  intervalMinutes: number
  providerEnv?: Record<string, string> | undefined
  shellPath?: string | undefined
}

export type DoctorNewsFlashResult = {
  kind: 'experimental.newsFlash.doctor'
  provider: NewsFlashProvider
  templateDir: string
  shellPath: string
  providerEnv: Record<string, string>
  checks: NewsFlashCheckResult[]
  ok: boolean
  nextSteps: string[]
}

export type RunNewsFlashOnceOptions = DoctorNewsFlashOptions & {
  runTimeoutMs?: number | undefined
}

export type RunNewsFlashOnceResult = {
  kind: 'experimental.newsFlash.runOnce'
  provider: NewsFlashProvider
  templateDir: string
  shellPath: string
  providerEnv: Record<string, string>
  checks: NewsFlashCheckResult[]
  smokeRun: NewsFlashSmokeRunResult
  ok: boolean
  nextSteps: string[]
}

export type InstallNewsFlashResult = {
  kind: 'experimental.newsFlash.install'
  provider: NewsFlashProvider
  templateDir: string
  label: string
  plistPath: string
  intervalSeconds: number
  shellPath: string
  providerEnv: Record<string, string>
  checks: NewsFlashCheckResult[]
  smokeRun: NewsFlashSmokeRunResult
  installed: boolean
  loaded: boolean
  dryRun: boolean
  nextSteps: string[]
}

export type NewsFlashStatusOptions = {
  repoRoot: string
  provider?: NewsFlashProvider | undefined
  label?: string | undefined
}

export type NewsFlashMonitorStatus = {
  provider: NewsFlashProvider
  label: string
  templateDir: string
  plistPath: string
  installed: boolean
  loaded: boolean
  latestSummaryPath: string
  latestSummaryExists: boolean
  latestSummaryModifiedAt?: string | undefined
}

export type NewsFlashStatusResult = {
  kind: 'experimental.newsFlash.status'
  monitors: NewsFlashMonitorStatus[]
  nextSteps: string[]
}

export type UninstallNewsFlashOptions = {
  provider: NewsFlashProvider
  repoRoot: string
  label?: string | undefined
  skipUnload?: boolean | undefined
}

export type UninstallNewsFlashResult = {
  kind: 'experimental.newsFlash.uninstall'
  provider: NewsFlashProvider
  label: string
  plistPath: string
  removed: boolean
  unloaded: boolean
  nextSteps: string[]
}

export type NewsFlashCheckResult = {
  name: string
  ok: boolean
  detail: string
}

export type NewsFlashSmokeRunResult = {
  ok: boolean
  command: string[]
  exitCode: number | null
  durationMs: number
  stdoutTail: string
  stderrTail: string
}

type CommandCheck = {
  name: string
  command: string
  verifyCommand: string
}

export type NewsFlashProviderParameter = {
  option: string
  env: string
  description: string
  providers: NewsFlashProvider[]
  choices?: string[] | undefined
  defaultValue?: string | undefined
  valueType?: 'integer' | 'string' | undefined
}

type LaunchCommandInput = {
  templateDir: string
  repoRoot: string
  shell: ShellRuntime
  providerEnv?: Record<string, string> | undefined
  provider?: NewsFlashProvider | undefined
  smoke?: boolean | undefined
}

type LaunchAgentPlistInput = Omit<LaunchCommandInput, 'shell'> & {
  label: string
  intervalSeconds: number
  shellPath: string
  launchCommand?: string | undefined
}

type ShellFamily = 'zsh' | 'bash' | 'sh' | 'ksh'

type ShellRuntime = {
  path: string
  name: string
  family?: ShellFamily | undefined
}

const publicApisCliRepoEnv = 'PUBLIC_APIS_CLI_REPO'
const publicApisTuiRepoEnv = 'PUBLIC_APIS_TUI_REPO'
const publicApisCliShellEnv = 'PUBLIC_APIS_CLI_NEWS_FLASH_SHELL'
const publicApisTuiShellEnv = 'PUBLIC_APIS_TUI_NEWS_FLASH_SHELL'

const providerTemplateDirs: Record<NewsFlashProvider, string> = {
  spaceflightnews: 'spaceflightnews-flash',
  hackernews: 'hackernews-flash',
  hashnode: 'hashnode-flash',
  newsapi: 'newsapi-flash',
  gnews: 'gnews-flash',
}

const providerOperations: Record<NewsFlashProvider, string> = {
  spaceflightnews: 'spaceflightnews.articles',
  hackernews: 'hackernews.stories',
  hashnode: 'hashnode.posts',
  newsapi: 'newsapi.headlines',
  gnews: 'gnews.headlines',
}

const providerDescriptions: Record<NewsFlashProvider, string> = {
  spaceflightnews: 'Space and aerospace headlines; no API key required.',
  hackernews: 'Hacker News story feed; no API key required.',
  hashnode: 'Public Hashnode publication posts; no API key required.',
  newsapi: 'NewsAPI top headlines; requires NEWSAPI_API_KEY.',
  gnews: 'GNews top headlines; requires GNEWS_API_KEY.',
}

const keyedProviderEnv: Partial<Record<NewsFlashProvider, string>> = {
  newsapi: 'NEWSAPI_API_KEY',
  gnews: 'GNEWS_API_KEY',
}

export const NEWS_FLASH_PROVIDER_PARAMETERS: NewsFlashProviderParameter[] = [
  { option: '--spaceflightnews-limit <count>', env: 'SPACEFLIGHTNEWS_LIMIT', description: 'Spaceflight News article limit, integer from 1 to 500.', providers: ['spaceflightnews'], valueType: 'integer', defaultValue: '500' },
  { option: '--spaceflightnews-search <text>', env: 'SPACEFLIGHTNEWS_SEARCH', description: 'Spaceflight News text search.', providers: ['spaceflightnews'], valueType: 'string' },
  { option: '--spaceflightnews-site <site>', env: 'SPACEFLIGHTNEWS_SITE', description: 'Spaceflight News site filter.', providers: ['spaceflightnews'], valueType: 'string' },
  { option: '--hackernews-list <top|new|best|ask|show|job>', env: 'HACKERNEWS_LIST', description: 'Hacker News story list.', providers: ['hackernews'], choices: ['top', 'new', 'best', 'ask', 'show', 'job'], defaultValue: 'top' },
  { option: '--hackernews-limit <count>', env: 'HACKERNEWS_LIMIT', description: 'Hacker News story details to fetch, integer from 1 to 30.', providers: ['hackernews'], valueType: 'integer', defaultValue: '10' },
  { option: '--hashnode-first <count>', env: 'HASHNODE_FIRST', description: 'Hashnode posts to return, integer from 1 to 20.', providers: ['hashnode'], valueType: 'integer', defaultValue: '20' },
  { option: '--hashnode-host <host>', env: 'HASHNODE_HOST', description: 'Hashnode publication host.', providers: ['hashnode'], valueType: 'string', defaultValue: 'blog.developerdao.com' },
  { option: '--hashnode-after <cursor>', env: 'HASHNODE_AFTER', description: 'Opaque Hashnode endCursor from a previous response.', providers: ['hashnode'], valueType: 'string' },
  { option: '--newsapi-page-size <count>', env: 'NEWSAPI_PAGE_SIZE', description: 'NewsAPI page size, integer from 1 to 100.', providers: ['newsapi'], valueType: 'integer', defaultValue: '100' },
  { option: '--newsapi-country <code>', env: 'NEWSAPI_COUNTRY', description: 'NewsAPI 2-letter country code.', providers: ['newsapi'], valueType: 'string', defaultValue: 'us' },
  { option: '--newsapi-category <category>', env: 'NEWSAPI_CATEGORY', description: 'NewsAPI headline category.', providers: ['newsapi'], valueType: 'string', choices: ['business', 'entertainment', 'general', 'health', 'science', 'sports', 'technology'] },
  { option: '--newsapi-query <text>', env: 'NEWSAPI_QUERY', description: 'NewsAPI query text.', providers: ['newsapi'], valueType: 'string' },
  { option: '--newsapi-sources <ids>', env: 'NEWSAPI_SOURCES', description: 'NewsAPI comma-separated source ids.', providers: ['newsapi'], valueType: 'string' },
  { option: '--newsapi-page <number>', env: 'NEWSAPI_PAGE', description: 'NewsAPI page number, integer from 1 to 100.', providers: ['newsapi'], valueType: 'integer', defaultValue: '1' },
  { option: '--gnews-max <count>', env: 'GNEWS_MAX', description: 'GNews articles per page, integer from 1 to 100.', providers: ['gnews'], valueType: 'integer', defaultValue: '100' },
  { option: '--gnews-category <category>', env: 'GNEWS_CATEGORY', description: 'GNews headline category.', providers: ['gnews'], valueType: 'string', defaultValue: 'general', choices: ['general', 'world', 'nation', 'business', 'technology', 'entertainment', 'sports', 'science', 'health'] },
  { option: '--gnews-query <text>', env: 'GNEWS_QUERY', description: 'GNews query text.', providers: ['gnews'], valueType: 'string' },
  { option: '--gnews-language <code>', env: 'GNEWS_LANGUAGE', description: 'GNews language code.', providers: ['gnews'], valueType: 'string' },
  { option: '--gnews-country <code>', env: 'GNEWS_COUNTRY', description: 'GNews country code.', providers: ['gnews'], valueType: 'string' },
  { option: '--gnews-from <iso8601>', env: 'GNEWS_FROM', description: 'GNews start datetime filter.', providers: ['gnews'], valueType: 'string' },
  { option: '--gnews-to <iso8601>', env: 'GNEWS_TO', description: 'GNews end datetime filter.', providers: ['gnews'], valueType: 'string' },
  { option: '--gnews-page <number>', env: 'GNEWS_PAGE', description: 'GNews page number within the 1000-article window.', providers: ['gnews'], valueType: 'integer', defaultValue: '1' },
]

const providerParameterEnvNames = NEWS_FLASH_PROVIDER_PARAMETERS.map(parameter => parameter.env)

const bridgedZshEnvNames = Array.from(new Set([
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_BASE_URL',
  'LITELLM_MASTER_KEY',
  'LITELLM_API_KEY',
  'LITELLM_BASE_URL',
  'LITELLM_API_BASE',
  'CLAUDE_BIN',
  'CLAUDE_TIMEOUT_MS',
  'CLAUDE_MAX_ATTEMPTS',
  'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
  'CLAUDE_CODE_ENABLE_TELEMETRY',
  'DISABLE_TELEMETRY',
  'DISABLE_AUTOUPDATER',
  'CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL',
  'ENABLE_EXPERIMENTAL_MCP_CLI',
  'NEWSAPI_API_KEY',
  'GNEWS_API_KEY',
  'CYCLES',
  'INTERVAL_SECONDS',
  ...providerParameterEnvNames,
]))

export function listNewsFlashProviders(repoRoot: string): ListNewsFlashProvidersResult {
  return {
    kind: 'experimental.newsFlash.providers',
    providers: NEWS_FLASH_PROVIDERS.map(provider => ({
      provider,
      templateDir: resolveProviderTemplateDir(repoRoot, provider),
      operation: providerOperations[provider],
      description: providerDescriptions[provider],
      requiredEnv: keyedProviderEnv[provider] === undefined ? [] : [keyedProviderEnv[provider]],
      parameters: NEWS_FLASH_PROVIDER_PARAMETERS.filter(parameter => parameter.providers.includes(provider)),
    })),
  }
}

export async function doctorNewsFlashMonitor(options: DoctorNewsFlashOptions): Promise<DoctorNewsFlashResult> {
  const templateDir = resolveProviderTemplateDir(options.repoRoot, options.provider)
  const shell = resolveShellRuntime(options.shellPath)
  const providerEnv = normalizeProviderEnv(options.providerEnv, options.provider)
  const checks = await runPreflightChecks({ ...options, providerEnv, templateDir, intervalSeconds: options.intervalMinutes * 60, shell })
  const ok = checks.every(check => check.ok)
  return {
    kind: 'experimental.newsFlash.doctor',
    provider: options.provider,
    templateDir,
    shellPath: shell.path,
    providerEnv,
    checks,
    ok,
    nextSteps: ok
      ? [
          `Run once: public-apis experimental news-flash run-once --provider ${options.provider}`,
          `Install schedule: public-apis experimental news-flash install --provider ${options.provider}`,
        ]
      : ['Fix failed checks, then rerun doctor.'],
  }
}

export async function runNewsFlashOnce(options: RunNewsFlashOnceOptions): Promise<RunNewsFlashOnceResult> {
  const doctor = await doctorNewsFlashMonitor(options)
  if (!doctor.ok) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Cannot run ${options.provider} news flash monitor because preflight checks failed.`, { provider: options.provider, checks: doctor.checks })
  }
  const shell = requireSupportedShell(resolveShellRuntime(options.shellPath))
  const providerEnv = normalizeProviderEnv(options.providerEnv, options.provider)
  const smokeRun = await runSmokeTest(doctor.templateDir, options.repoRoot, shell, options.runTimeoutMs ?? 240_000, providerEnv, options.provider)
  if (!smokeRun.ok) {
    throw new RuntimeFailure('OPEN_API_FAILED', `News flash run-once failed for ${options.provider}.`, { provider: options.provider, smokeRun })
  }
  return {
    kind: 'experimental.newsFlash.runOnce',
    provider: options.provider,
    templateDir: doctor.templateDir,
    shellPath: shell.path,
    providerEnv,
    checks: doctor.checks,
    smokeRun,
    ok: true,
    nextSteps: [
      `View latest briefing: open ${resolve(doctor.templateDir, 'summary/news-flash.txt')}`,
      `Install schedule: public-apis experimental news-flash install --provider ${options.provider}`,
    ],
  }
}

export async function installNewsFlashMonitor(options: InstallNewsFlashOptions): Promise<InstallNewsFlashResult> {
  const templateDir = resolveProviderTemplateDir(options.repoRoot, options.provider)
  const label = normalizeLabel(options.label, options.provider)
  const plistPath = resolve(homedir(), 'Library/LaunchAgents', `${label}.plist`)
  const intervalSeconds = options.intervalMinutes * 60
  const shell = resolveShellRuntime(options.shellPath)
  const providerEnv = normalizeProviderEnv(options.providerEnv, options.provider)
  const checks = await runPreflightChecks({ ...options, providerEnv, templateDir, intervalSeconds, shell })
  const failed = checks.filter(check => !check.ok)
  if (failed.length > 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Cannot install ${options.provider} news flash monitor because preflight checks failed.`, { provider: options.provider, checks: failed })
  }
  const supportedShell = requireSupportedShell(shell)

  const smokeRun = await runSmokeTest(templateDir, options.repoRoot, supportedShell, options.runTimeoutMs ?? 240_000, providerEnv, options.provider)
  if (!smokeRun.ok) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Cannot install ${options.provider} news flash monitor because the required smoke run failed.`, { provider: options.provider, smokeRun })
  }

  const launchCommand = createLaunchShellCommand({ templateDir, repoRoot: options.repoRoot, shell: supportedShell, providerEnv, provider: options.provider })
  if (!options.dryRun) {
    await mkdir(resolve(templateDir, 'logs'), { recursive: true })
    await mkdir(dirname(plistPath), { recursive: true })
    await writeFile(plistPath, createLaunchAgentPlist({
      label,
      templateDir,
      intervalSeconds,
      repoRoot: options.repoRoot,
      shellPath: supportedShell.path,
      providerEnv,
      provider: options.provider,
      launchCommand,
    }), 'utf8')
  }

  let loaded = false
  if (!options.dryRun && !options.skipLoad) {
    const bootstrap = await runProcess('launchctl', ['bootstrap', `gui/${process.getuid?.() ?? 501}`, plistPath], { cwd: templateDir, timeoutMs: 30_000 })
    if (bootstrap.exitCode !== 0) {
      const bootout = await runProcess('launchctl', ['bootout', `gui/${process.getuid?.() ?? 501}`, plistPath], { cwd: templateDir, timeoutMs: 30_000 })
      const retry = await runProcess('launchctl', ['bootstrap', `gui/${process.getuid?.() ?? 501}`, plistPath], { cwd: templateDir, timeoutMs: 30_000 })
      loaded = retry.exitCode === 0
      if (!loaded) {
        throw new RuntimeFailure('OPEN_API_FAILED', `LaunchAgent plist was written but launchctl bootstrap failed for ${label}.`, { provider: options.provider, bootstrap, bootout, retry, plistPath })
      }
    } else {
      loaded = true
    }
  }

  return {
    kind: 'experimental.newsFlash.install',
    provider: options.provider,
    templateDir,
    label,
    plistPath,
    intervalSeconds,
    shellPath: supportedShell.path,
    providerEnv,
    checks,
    smokeRun,
    installed: !options.dryRun,
    loaded,
    dryRun: options.dryRun === true,
    nextSteps: [
      `View latest briefing: open ${resolve(templateDir, 'summary/news-flash.txt')}`,
      `Run manually: cd ${templateDir} && ./run-news-flash-cycle-notify.sh`,
      `Check schedule: public-apis experimental news-flash status --provider ${options.provider}`,
      `Uninstall schedule: public-apis experimental news-flash uninstall --provider ${options.provider}`,
    ],
  }
}

export async function getNewsFlashStatus(options: NewsFlashStatusOptions): Promise<NewsFlashStatusResult> {
  const providers = options.provider === undefined ? [...NEWS_FLASH_PROVIDERS] : [options.provider]
  return {
    kind: 'experimental.newsFlash.status',
    monitors: await Promise.all(providers.map(async provider => {
      const templateDir = resolveProviderTemplateDir(options.repoRoot, provider)
      const label = normalizeLabel(options.label, provider)
      const plistPath = resolveLaunchAgentPath(label)
      const latestSummaryPath = resolve(templateDir, 'summary/news-flash.txt')
      const latestSummaryStat = await readOptionalStat(latestSummaryPath)
      return {
        provider,
        label,
        templateDir,
        plistPath,
        installed: await canAccess(plistPath, constants.R_OK),
        loaded: await isLaunchAgentLoaded(label),
        latestSummaryPath,
        latestSummaryExists: latestSummaryStat !== undefined,
        latestSummaryModifiedAt: latestSummaryStat?.mtime.toISOString(),
      }
    })),
    nextSteps: [
      options.provider === undefined
        ? 'Install a provider: public-apis experimental news-flash install --provider <provider>'
        : `Install schedule: public-apis experimental news-flash install --provider ${options.provider}`,
      options.provider === undefined
        ? 'Uninstall a provider: public-apis experimental news-flash uninstall --provider <provider>'
        : `Uninstall schedule: public-apis experimental news-flash uninstall --provider ${options.provider}`,
    ],
  }
}

export async function uninstallNewsFlashMonitor(options: UninstallNewsFlashOptions): Promise<UninstallNewsFlashResult> {
  const label = normalizeLabel(options.label, options.provider)
  const plistPath = resolveLaunchAgentPath(label)
  let unloaded = false
  if (!options.skipUnload) {
    const bootout = await runProcess('launchctl', ['bootout', `gui/${process.getuid?.() ?? 501}`, plistPath], { cwd: options.repoRoot, timeoutMs: 30_000 })
    unloaded = bootout.exitCode === 0
  }
  const removed = await unlinkIfExists(plistPath)
  return {
    kind: 'experimental.newsFlash.uninstall',
    provider: options.provider,
    label,
    plistPath,
    removed,
    unloaded,
    nextSteps: [
      `Check status: public-apis experimental news-flash status --provider ${options.provider}`,
      `Reinstall: public-apis experimental news-flash install --provider ${options.provider}`,
    ],
  }
}

export function parseNewsFlashProvider(value: string): NewsFlashProvider {
  if ((NEWS_FLASH_PROVIDERS as readonly string[]).includes(value)) return value as NewsFlashProvider
  throw new RuntimeFailure('INVALID_ARGUMENT', `Unsupported news flash provider: ${value}`, { supported: NEWS_FLASH_PROVIDERS })
}

export function parseOptionalNewsFlashProvider(value: string | undefined): NewsFlashProvider | undefined {
  return value === undefined ? undefined : parseNewsFlashProvider(value)
}

export function createLaunchAgentPlist(input: LaunchAgentPlistInput): string {
  const logDir = resolve(input.templateDir, 'logs')
  const stdoutPath = resolve(logDir, 'launchagent.out.log')
  const stderrPath = resolve(logDir, 'launchagent.err.log')
  const shell = requireSupportedShell(resolveShellRuntime(input.shellPath))
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${escapePlist(input.label)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapePlist(shell.path)}</string>
    <string>-c</string>
    <string>${escapePlist(input.launchCommand ?? createLaunchShellCommand({ templateDir: input.templateDir, repoRoot: input.repoRoot, shell, providerEnv: input.providerEnv, provider: input.provider }))}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${escapePlist(input.templateDir)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PUBLIC_APIS_CLI_REPO</key>
    <string>${escapePlist(input.repoRoot)}</string>
    <key>PUBLIC_APIS_TUI_REPO</key>
    <string>${escapePlist(input.repoRoot)}</string>
  </dict>
  <key>StartInterval</key>
  <integer>${input.intervalSeconds}</integer>
  <key>RunAtLoad</key>
  <false/>
  <key>StandardOutPath</key>
  <string>${escapePlist(stdoutPath)}</string>
  <key>StandardErrorPath</key>
  <string>${escapePlist(stderrPath)}</string>
</dict>
</plist>
`
}

async function runPreflightChecks(options: InstallNewsFlashOptions & { templateDir: string; intervalSeconds: number; shell: ShellRuntime }): Promise<NewsFlashCheckResult[]> {
  const checks: NewsFlashCheckResult[] = []
  checks.push(await checkPath('template directory', options.templateDir, constants.R_OK))
  checks.push(await checkPath('runner script', resolve(options.templateDir, 'run-news-flash-cycle-notify.sh'), constants.R_OK | constants.X_OK))
  checks.push(await checkPath('package.json', resolve(options.repoRoot, 'package.json'), constants.R_OK))
  checks.push(checkPlatform())
  checks.push(checkPositiveInterval(options.intervalMinutes))
  checks.push(await checkShell(options.shell))

  for (const check of commandChecks()) {
    checks.push(await checkCommand(check, options.shell))
  }

  checks.push(await checkAnyEnvVar('Claude credentials', ['ANTHROPIC_API_KEY', 'LITELLM_MASTER_KEY', 'LITELLM_API_KEY'], options.shell))
  const keyedEnv = keyedProviderEnv[options.provider]
  if (keyedEnv !== undefined) checks.push(await checkProviderSecret(options.provider, keyedEnv, options.shell))

  return checks
}

async function checkPath(name: string, path: string, mode: number): Promise<NewsFlashCheckResult> {
  try {
    await access(path, mode)
    return { name, ok: true, detail: path }
  } catch {
    return { name, ok: false, detail: `Missing or inaccessible: ${path}` }
  }
}

function checkPlatform(): NewsFlashCheckResult {
  return {
    name: 'macOS LaunchAgent',
    ok: process.platform === 'darwin',
    detail: process.platform === 'darwin' ? 'darwin' : `Unsupported platform: ${process.platform}`,
  }
}

function checkPositiveInterval(value: number): NewsFlashCheckResult {
  return {
    name: 'schedule interval',
    ok: Number.isInteger(value) && value > 0,
    detail: `${value} minute(s)`,
  }
}

async function checkShell(shell: ShellRuntime): Promise<NewsFlashCheckResult> {
  if (shell.family === undefined) {
    return {
      name: 'user shell',
      ok: false,
      detail: [
        `Unsupported shell: ${shell.path}.`,
        `Use zsh, bash, sh, or ksh via --shell or ${publicApisCliShellEnv}.`,
        `${publicApisTuiShellEnv} is still accepted as a legacy fallback.`,
      ].join(' '),
    }
  }
  const pathCheck = await checkPath('user shell', shell.path, constants.R_OK | constants.X_OK)
  if (!pathCheck.ok) return pathCheck
  const result = await runUserShell('echo shell-ok', [], shell, { cwd: process.cwd(), timeoutMs: 15_000, loadStartup: false })
  return {
    name: 'user shell',
    ok: result.exitCode === 0,
    detail: result.exitCode === 0 ? `${shell.name} (${shell.path})` : tail(`${result.stderr}\n${result.stdout}`, 300),
  }
}

async function checkProviderSecret(provider: NewsFlashProvider, name: string, shell: ShellRuntime): Promise<NewsFlashCheckResult> {
  if (await hasShellEnv(name, shell)) {
    return { name, ok: true, detail: `${name} set in ${shell.name} environment` }
  }

  const configured = await readConfiguredProviderSecret(provider, name)
  return {
    name,
    ok: configured !== undefined,
    detail: configured !== undefined
      ? `${name} set in public-apis local provider config`
      : `${name} must be set in ${shell.name} startup files, exported, or stored with: public-apis apis config ${provider} --set-secret ${name}=value`,
  }
}

async function readConfiguredProviderSecret(provider: NewsFlashProvider, name: string): Promise<string | undefined> {
  const config = await readPublicApiProviderConfig(provider)
  const value = config.secrets?.[name]
  if (value === undefined || value.trim() === '') return undefined
  return value.trim()
}

async function checkAnyEnvVar(name: string, envNames: string[], shell: ShellRuntime): Promise<NewsFlashCheckResult> {
  const result = await runUserShell([
    'for name in "$@"; do',
    '  eval "value=\\${$name-}"',
    '  if [ -n "$value" ]; then echo "$name"; exit 0; fi',
    'done',
    'exit 1',
  ].join('\n'), envNames, shell, { cwd: process.cwd(), timeoutMs: 15_000 })
  return {
    name,
    ok: result.exitCode === 0,
    detail: result.exitCode === 0 ? `${lastNonEmptyLine(result.stdout)} set in ${shell.name} environment` : `${envNames.join(', ')} must be set in ${shell.name} startup files or exported`,
  }
}

async function checkCommand(check: CommandCheck, shell: ShellRuntime): Promise<NewsFlashCheckResult> {
  const result = await runUserShell(check.verifyCommand, [], shell, { cwd: process.cwd(), timeoutMs: 15_000 })
  return {
    name: check.name,
    ok: result.exitCode === 0,
    detail: result.exitCode === 0 ? basename(check.command) : tail(`${result.stderr}\n${result.stdout}`, 300),
  }
}

function commandChecks(): CommandCheck[] {
  return [
    { name: 'node', command: 'node', verifyCommand: 'node --version' },
    { name: 'npm', command: 'npm', verifyCommand: 'npm --version' },
    { name: 'claude', command: process.env.CLAUDE_BIN ?? 'claude', verifyCommand: `${shellQuote(process.env.CLAUDE_BIN ?? 'claude')} --version` },
    { name: 'terminal-notifier', command: 'terminal-notifier', verifyCommand: 'terminal-notifier -version' },
    { name: 'launchctl', command: 'launchctl', verifyCommand: 'launchctl help' },
  ]
}

async function runSmokeTest(templateDir: string, repoRoot: string, shell: ShellRuntime, timeoutMs: number, providerEnv: Record<string, string> = {}, provider?: NewsFlashProvider | undefined): Promise<NewsFlashSmokeRunResult> {
  const started = Date.now()
  const launchCommand = createLaunchShellCommand({ templateDir, repoRoot, shell, smoke: true, providerEnv, provider })
  const command = shell.path
  const args = ['-c', launchCommand]
  const result = await runProcess(command, args, {
    cwd: templateDir,
    timeoutMs,
  })
  return {
    ok: result.exitCode === 0,
    command: [command, ...args],
    exitCode: result.exitCode,
    durationMs: Date.now() - started,
    stdoutTail: tail(result.stdout, 2000),
    stderrTail: tail(result.stderr, 2000),
  }
}

async function runProcess(command: string, args: string[], options: { cwd: string; timeoutMs: number; env?: NodeJS.ProcessEnv | undefined }): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return await new Promise(resolvePromise => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += String(chunk) })
    child.stderr.on('data', chunk => { stderr += String(chunk) })
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
    }, options.timeoutMs)
    child.on('error', error => {
      clearTimeout(timer)
      resolvePromise({ exitCode: 127, stdout, stderr: `${stderr}\n${String(error)}` })
    })
    child.on('close', code => {
      clearTimeout(timer)
      resolvePromise({ exitCode: code, stdout, stderr })
    })
  })
}

async function runUserShell(command: string, args: string[], shell: ShellRuntime, options: { cwd: string; timeoutMs: number; loadStartup?: boolean | undefined }): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  const supportedShell = requireSupportedShell(shell)
  const script = options.loadStartup === false ? command : createUserShellScript(command, supportedShell)
  return await runProcess(
    supportedShell.path,
    ['-c', script, 'public-apis-cli-preflight', ...args],
    options,
  )
}

function createLaunchShellCommand(input: LaunchCommandInput): string {
  const shell = requireSupportedShell(input.shell)
  const assignments = [
    `${publicApisCliRepoEnv}=${shellQuote(input.repoRoot)}`,
    `${publicApisTuiRepoEnv}=${shellQuote(input.repoRoot)}`,
  ]
  if (input.smoke === true) {
    assignments.push('CYCLES=1')
    assignments.push('INTERVAL_SECONDS=1')
    for (const [name, value] of Object.entries({ ...createSmokeProviderEnv(input.provider), ...(input.providerEnv ?? {}) })) {
      assignments.push(`${name}=${shellQuote(value)}`)
    }
  } else {
    for (const [name, value] of Object.entries(input.providerEnv ?? {}).sort(([left], [right]) => left.localeCompare(right))) {
      assignments.push(`${name}=${shellQuote(value)}`)
    }
  }
  return createUserShellScript([
    `cd ${shellQuote(input.templateDir)}`,
    ...(input.provider === undefined ? [] : [createProviderSecretExportCommand(input.provider)]),
    `${assignments.join(' ')} ./run-news-flash-cycle-notify.sh`,
  ].join(' && '), shell)
}

function createProviderSecretExportCommand(provider: NewsFlashProvider): string {
  const keyedEnv = keyedProviderEnv[provider]
  if (keyedEnv === undefined) return ':'
  return [
    `if [ -z "\${${keyedEnv}-}" ]; then`,
    `  configured_secret="$(node -e ${shellQuote(createProviderSecretNodeSnippet(provider, keyedEnv))})"`,
    '  if [ -n "$configured_secret" ]; then',
    `    export ${keyedEnv}="$configured_secret"`,
    '  fi',
    'fi',
  ].join('\n')
}

function createProviderSecretNodeSnippet(provider: NewsFlashProvider, name: string): string {
  const cleanProvider = 'provider.replace(/[^a-zA-Z0-9._-]/g, "-")' +
    '.replace(/^[^a-zA-Z0-9]+/, "").replace(/[^a-zA-Z0-9]+$/, "")'
  return [
    'const fs = require("node:fs");',
    'const path = require("node:path");',
    `const provider = ${JSON.stringify(provider)};`,
    `const name = ${JSON.stringify(name)};`,
    'const home = process.env.HOME || process.env.USERPROFILE || process.cwd();',
    'const currentHome = path.join(home, ".cdp-cli", "public-apis-cli");',
    'const legacyHome = path.join(home, ".cdp-cli", "public-apis-tui");',
    'const rootBase = process.env.SITE_CDP_HOME_DIR || currentHome;',
    'const root = process.env.PUBLIC_APIS_HOME_DIR || ' +
      'path.join(rootBase, "public-apis");',
    'const fallbackRoot = path.join(legacyHome, "public-apis");',
    `const segment = ${cleanProvider} || "site-cdp";`,
    'const file = path.join(root, segment, "config.json");',
    'const fallbackFile = path.join(fallbackRoot, segment, "config.json");',
    'try {',
    '  const pathToRead = fs.existsSync(file) ? file : fallbackFile;',
    '  const value = JSON.parse(fs.readFileSync(pathToRead, "utf8"))?.secrets?.[name];',
    '  if (typeof value === "string" && value.trim()) process.stdout.write(value.trim());',
    '} catch {}',
  ].join(' ')
}

function createSmokeProviderEnv(provider: NewsFlashProvider | undefined): Record<string, string> {
  if (provider === 'spaceflightnews') return { SPACEFLIGHTNEWS_LIMIT: '3' }
  if (provider === 'hackernews') return { HACKERNEWS_LIMIT: '3' }
  if (provider === 'hashnode') return { HASHNODE_FIRST: '3' }
  if (provider === 'newsapi') return { NEWSAPI_PAGE_SIZE: '3' }
  if (provider === 'gnews') return { GNEWS_MAX: '3' }
  return {}
}

function createUserShellScript(command: string, shell: ShellRuntime & { family: ShellFamily }): string {
  return [
    createShellStartupCommand(shell),
    createEnvBridgeCommand(bridgedZshEnvNames),
    command,
  ].filter(Boolean).join('\n')
}

function normalizeLabel(label: string | undefined, provider: NewsFlashProvider): string {
  const value = label ?? `com.public-apis-cli.experimental.news-flash.${provider}`
  if (!/^[A-Za-z0-9_.-]+$/u.test(value)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--label may contain only letters, numbers, dot, underscore, and dash.')
  }
  return value
}

function resolveProviderTemplateDir(repoRoot: string, provider: NewsFlashProvider): string {
  return resolve(repoRoot, 'experimental/public-apis-news-flash-monitor/template', providerTemplateDirs[provider])
}

function resolveLaunchAgentPath(label: string): string {
  return resolve(homedir(), 'Library/LaunchAgents', `${label}.plist`)
}

async function canAccess(path: string, mode: number): Promise<boolean> {
  try {
    await access(path, mode)
    return true
  } catch {
    return false
  }
}

async function readOptionalStat(path: string): Promise<Awaited<ReturnType<typeof stat>> | undefined> {
  try {
    return await stat(path)
  } catch {
    return undefined
  }
}

async function unlinkIfExists(path: string): Promise<boolean> {
  try {
    await unlink(path)
    return true
  } catch {
    return false
  }
}

async function isLaunchAgentLoaded(label: string): Promise<boolean> {
  const result = await runProcess('launchctl', ['print', `gui/${process.getuid?.() ?? 501}/${label}`], { cwd: process.cwd(), timeoutMs: 30_000 })
  return result.exitCode === 0
}

async function hasShellEnv(name: string, shell: ShellRuntime): Promise<boolean> {
  const result = await runUserShell('eval "value=\\${$1-}"; [ -n "$value" ]', [name], shell, { cwd: process.cwd(), timeoutMs: 15_000 })
  return result.exitCode === 0
}

function resolveShellRuntime(
  shellPath: string | undefined =
    process.env[publicApisCliShellEnv] ??
    process.env[publicApisTuiShellEnv] ??
    process.env.SHELL ??
    '/bin/sh',
): ShellRuntime {
  const path = resolve(shellPath)
  const name = basename(path)
  return { path, name, family: readShellFamily(name) }
}

function requireSupportedShell(shell: ShellRuntime): ShellRuntime & { family: ShellFamily } {
  if (shell.family === undefined) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Unsupported shell for news flash monitor: ${shell.path}`, {
      supported: ['zsh', 'bash', 'sh', 'ksh'],
    })
  }
  return shell as ShellRuntime & { family: ShellFamily }
}

function readShellFamily(name: string): ShellFamily | undefined {
  if (name.includes('zsh')) return 'zsh'
  if (name.includes('bash')) return 'bash'
  if (name === 'sh' || name.includes('dash')) return 'sh'
  if (name.includes('ksh')) return 'ksh'
  return undefined
}

function createShellStartupCommand(shell: ShellRuntime & { family: ShellFamily }): string {
  if (shell.family === 'zsh') {
    return [
      '[ -r "$HOME/.zprofile" ] && . "$HOME/.zprofile" >/dev/null 2>&1 || true',
      '[ -r "$HOME/.zshrc" ] && . "$HOME/.zshrc" >/dev/null 2>&1 || true',
    ].join('\n')
  }
  if (shell.family === 'bash') {
    return [
      'if [ -r "$HOME/.bash_profile" ]; then . "$HOME/.bash_profile" >/dev/null 2>&1 || true; elif [ -r "$HOME/.bash_login" ]; then . "$HOME/.bash_login" >/dev/null 2>&1 || true; elif [ -r "$HOME/.profile" ]; then . "$HOME/.profile" >/dev/null 2>&1 || true; fi',
      '[ -r "$HOME/.bashrc" ] && . "$HOME/.bashrc" >/dev/null 2>&1 || true',
    ].join('\n')
  }
  if (shell.family === 'ksh') {
    return [
      '[ -r "$HOME/.profile" ] && . "$HOME/.profile" >/dev/null 2>&1 || true',
      '[ -r "$HOME/.kshrc" ] && . "$HOME/.kshrc" >/dev/null 2>&1 || true',
    ].join('\n')
  }
  return '[ -r "$HOME/.profile" ] && . "$HOME/.profile" >/dev/null 2>&1 || true'
}

function createEnvBridgeCommand(names: string[]): string {
  return [
    `for name in ${names.map(shellQuote).join(' ')}; do`,
    '  eval "value=\\${$name-}"',
    '  if [ -n "$value" ]; then export "$name=$value"; fi',
    'done',
  ].join('\n')
}

function escapePlist(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}

function normalizeProviderEnv(providerEnv: Record<string, string> | undefined, provider: NewsFlashProvider): Record<string, string> {
  if (providerEnv === undefined) return {}
  const normalized: Record<string, string> = {}
  const supported = new Set(NEWS_FLASH_PROVIDER_PARAMETERS.filter(parameter => parameter.providers.includes(provider)).map(parameter => parameter.env))
  for (const [name, value] of Object.entries(providerEnv)) {
    if (!/^[A-Z][A-Z0-9_]*$/u.test(name)) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `Invalid news flash provider parameter name: ${name}`, {
        remediation: 'Use uppercase provider-specific names, e.g. HACKERNEWS_LIST or NEWSAPI_COUNTRY.',
      })
    }
    if (!supported.has(name)) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `Unsupported news flash parameter for ${provider}: ${name}`, {
        supported: [...supported].sort(),
      })
    }
    normalized[name] = value
  }
  return normalized
}

function tail(value: string, max: number): string {
  return value.length <= max ? value : value.slice(value.length - max)
}

function lastNonEmptyLine(value: string): string {
  const lines = value.split(/\r?\n/u).map(line => line.trim()).filter(Boolean)
  return lines.at(-1) ?? ''
}
