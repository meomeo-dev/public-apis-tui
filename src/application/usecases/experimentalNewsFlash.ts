import { access, mkdir, stat, unlink, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { homedir } from 'node:os'
import { basename, dirname, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'
import {
  readPublicApiProviderConfig,
} from '../../infrastructure/persistence/publicApiConfig.js'

export const NEWS_FLASH_PROVIDERS = [
  'spaceflightnews',
  'hackernews',
  'hashnode',
  'newsapi',
  'gnews',
  'chroniclingamerica',
  'currents',
  'guardian',
  'marketaux',
  'mediastack',
  'newsdata',
  'nytimes',
  'thenews',
] as const

export type NewsFlashProvider = typeof NEWS_FLASH_PROVIDERS[number]
export const NEWS_FLASH_AGENT_CLI_RUNNERS = ['claude_code', 'codex'] as const

export type NewsFlashAgentCliRunner = typeof NEWS_FLASH_AGENT_CLI_RUNNERS[number]

export type NewsFlashAgentOptions = {
  runner?: NewsFlashAgentCliRunner | undefined
  env?: Record<string, string> | undefined
  envFile?: string | undefined
  codexProfile?: string | undefined
}

export type InstallNewsFlashOptions = {
  provider: NewsFlashProvider
  repoRoot: string
  intervalMinutes: number
  providerEnv?: Record<string, string> | undefined
  agent?: NewsFlashAgentOptions | undefined
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
  agent?: NewsFlashAgentOptions | undefined
  shellPath?: string | undefined
}

export type DoctorNewsFlashResult = {
  kind: 'experimental.newsFlash.doctor'
  provider: NewsFlashProvider
  templateDir: string
  shellPath: string
  providerEnv: Record<string, string>
  agent: NormalizedNewsFlashAgentOptions
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
  agent: NormalizedNewsFlashAgentOptions
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
  agent: NormalizedNewsFlashAgentOptions
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

export type NormalizedNewsFlashAgentOptions = {
  runner: NewsFlashAgentCliRunner
  env: Record<string, string>
  envFile?: string | undefined
  codexProfile?: string | undefined
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
  agent?: NormalizedNewsFlashAgentOptions | undefined
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
const defaultAgentCliRunner: NewsFlashAgentCliRunner = 'claude_code'

const providerTemplateDirs: Record<NewsFlashProvider, string> = {
  spaceflightnews: 'spaceflightnews-flash',
  hackernews: 'hackernews-flash',
  hashnode: 'hashnode-flash',
  newsapi: 'newsapi-flash',
  gnews: 'gnews-flash',
  chroniclingamerica: 'chroniclingamerica-flash',
  currents: 'currents-flash',
  guardian: 'guardian-flash',
  marketaux: 'marketaux-flash',
  mediastack: 'mediastack-flash',
  newsdata: 'newsdata-flash',
  nytimes: 'nytimes-flash',
  thenews: 'thenews-flash',
}

const providerOperations: Record<NewsFlashProvider, string> = {
  spaceflightnews: 'spaceflightnews.articles',
  hackernews: 'hackernews.stories',
  hashnode: 'hashnode.posts',
  newsapi: 'newsapi.headlines',
  gnews: 'gnews.headlines',
  chroniclingamerica: 'chroniclingamerica.search',
  currents: 'currents.news',
  guardian: 'guardian.search',
  marketaux: 'marketaux.news',
  mediastack: 'mediastack.news',
  newsdata: 'newsdata.latest',
  nytimes: 'nytimes.topStories',
  thenews: 'thenews.all',
}

const providerDescriptions: Record<NewsFlashProvider, string> = {
  spaceflightnews: 'Space and aerospace headlines; no API key required.',
  hackernews: 'Hacker News story feed; no API key required.',
  hashnode: 'Public Hashnode publication posts; no API key required.',
  newsapi: 'NewsAPI top headlines; requires NEWSAPI_API_KEY.',
  gnews: 'GNews top headlines; requires GNEWS_API_KEY.',
  chroniclingamerica: 'Library of Congress newspaper pages; no API key required.',
  currents: 'Currents latest news; requires CURRENTS_API_KEY.',
  guardian: 'Guardian content search; requires GUARDIAN_API_KEY.',
  marketaux: 'MarketAux financial news; requires MARKETAUX_API_KEY.',
  mediastack: 'Mediastack live news; requires MEDIASTACK_API_KEY.',
  newsdata: 'NewsData.io latest news; requires NEWSDATAIO_API_KEY.',
  nytimes: 'New York Times top stories; requires NYTIMES_API_KEY.',
  thenews: 'TheNewsAPI all-news search; requires THENEWSAPI_API_KEY.',
}

const keyedProviderEnv: Partial<Record<NewsFlashProvider, string>> = {
  newsapi: 'NEWSAPI_API_KEY',
  gnews: 'GNEWS_API_KEY',
  currents: 'CURRENTS_API_KEY',
  guardian: 'GUARDIAN_API_KEY',
  marketaux: 'MARKETAUX_API_KEY',
  mediastack: 'MEDIASTACK_API_KEY',
  newsdata: 'NEWSDATAIO_API_KEY',
  nytimes: 'NYTIMES_API_KEY',
  thenews: 'THENEWSAPI_API_KEY',
}

export const NEWS_FLASH_PROVIDER_PARAMETERS: NewsFlashProviderParameter[] = [
  {
    option: '--spaceflightnews-limit <count>',
    env: 'SPACEFLIGHTNEWS_LIMIT',
    description: 'Spaceflight News article limit, integer from 1 to 500.',
    providers: ['spaceflightnews'],
    valueType: 'integer',
    defaultValue: '500',
  },
  {
    option: '--spaceflightnews-search <text>',
    env: 'SPACEFLIGHTNEWS_SEARCH',
    description: 'Spaceflight News text search.',
    providers: ['spaceflightnews'],
    valueType: 'string',
  },
  {
    option: '--spaceflightnews-site <site>',
    env: 'SPACEFLIGHTNEWS_SITE',
    description: 'Spaceflight News site filter.',
    providers: ['spaceflightnews'],
    valueType: 'string',
  },
  {
    option: '--hackernews-list <top|new|best|ask|show|job>',
    env: 'HACKERNEWS_LIST',
    description: 'Hacker News story list.',
    providers: ['hackernews'],
    choices: ['top', 'new', 'best', 'ask', 'show', 'job'],
    defaultValue: 'top',
  },
  {
    option: '--hackernews-limit <count>',
    env: 'HACKERNEWS_LIMIT',
    description: 'Hacker News story details to fetch, integer from 1 to 30.',
    providers: ['hackernews'],
    valueType: 'integer',
    defaultValue: '10',
  },
  {
    option: '--hashnode-first <count>',
    env: 'HASHNODE_FIRST',
    description: 'Hashnode posts to return, integer from 1 to 20.',
    providers: ['hashnode'],
    valueType: 'integer',
    defaultValue: '20',
  },
  {
    option: '--hashnode-host <host>',
    env: 'HASHNODE_HOST',
    description: 'Hashnode publication host.',
    providers: ['hashnode'],
    valueType: 'string',
    defaultValue: 'blog.developerdao.com',
  },
  {
    option: '--hashnode-after <cursor>',
    env: 'HASHNODE_AFTER',
    description: 'Opaque Hashnode endCursor from a previous response.',
    providers: ['hashnode'],
    valueType: 'string',
  },
  {
    option: '--newsapi-page-size <count>',
    env: 'NEWSAPI_PAGE_SIZE',
    description: 'NewsAPI page size, integer from 1 to 100.',
    providers: ['newsapi'],
    valueType: 'integer',
    defaultValue: '100',
  },
  {
    option: '--newsapi-country <code>',
    env: 'NEWSAPI_COUNTRY',
    description: 'NewsAPI 2-letter country code.',
    providers: ['newsapi'],
    valueType: 'string',
    defaultValue: 'us',
  },
  {
    option: '--newsapi-category <category>',
    env: 'NEWSAPI_CATEGORY',
    description: 'NewsAPI headline category.',
    providers: ['newsapi'],
    valueType: 'string',
    choices: [
      'business',
      'entertainment',
      'general',
      'health',
      'science',
      'sports',
      'technology',
    ],
  },
  {
    option: '--newsapi-query <text>',
    env: 'NEWSAPI_QUERY',
    description: 'NewsAPI query text.',
    providers: ['newsapi'],
    valueType: 'string',
  },
  {
    option: '--newsapi-sources <ids>',
    env: 'NEWSAPI_SOURCES',
    description: 'NewsAPI comma-separated source ids.',
    providers: ['newsapi'],
    valueType: 'string',
  },
  {
    option: '--newsapi-page <number>',
    env: 'NEWSAPI_PAGE',
    description: 'NewsAPI page number, integer from 1 to 100.',
    providers: ['newsapi'],
    valueType: 'integer',
    defaultValue: '1',
  },
  {
    option: '--gnews-max <count>',
    env: 'GNEWS_MAX',
    description: 'GNews articles per page, integer from 1 to 100.',
    providers: ['gnews'],
    valueType: 'integer',
    defaultValue: '100',
  },
  {
    option: '--gnews-category <category>',
    env: 'GNEWS_CATEGORY',
    description: 'GNews headline category.',
    providers: ['gnews'],
    valueType: 'string',
    defaultValue: 'general',
    choices: [
      'general',
      'world',
      'nation',
      'business',
      'technology',
      'entertainment',
      'sports',
      'science',
      'health',
    ],
  },
  {
    option: '--gnews-query <text>',
    env: 'GNEWS_QUERY',
    description: 'GNews query text.',
    providers: ['gnews'],
    valueType: 'string',
  },
  {
    option: '--gnews-language <code>',
    env: 'GNEWS_LANGUAGE',
    description: 'GNews language code.',
    providers: ['gnews'],
    valueType: 'string',
  },
  {
    option: '--gnews-country <code>',
    env: 'GNEWS_COUNTRY',
    description: 'GNews country code.',
    providers: ['gnews'],
    valueType: 'string',
  },
  {
    option: '--gnews-from <iso8601>',
    env: 'GNEWS_FROM',
    description: 'GNews start datetime filter.',
    providers: ['gnews'],
    valueType: 'string',
  },
  {
    option: '--gnews-to <iso8601>',
    env: 'GNEWS_TO',
    description: 'GNews end datetime filter.',
    providers: ['gnews'],
    valueType: 'string',
  },
  {
    option: '--gnews-page <number>',
    env: 'GNEWS_PAGE',
    description: 'GNews page number within the 1000-article window.',
    providers: ['gnews'],
    valueType: 'integer',
    defaultValue: '1',
  },
  {
    option: '--chroniclingamerica-query <text>',
    env: 'CHRONICLINGAMERICA_QUERY',
    description: 'Chronicling America search text.',
    providers: ['chroniclingamerica'],
    valueType: 'string',
    defaultValue: 'news',
  },
  {
    option: '--chroniclingamerica-count <count>',
    env: 'CHRONICLINGAMERICA_COUNT',
    description: 'Chronicling America result count, integer from 1 to 1000.',
    providers: ['chroniclingamerica'],
    valueType: 'integer',
    defaultValue: '5',
  },
  {
    option: '--chroniclingamerica-page <number>',
    env: 'CHRONICLINGAMERICA_PAGE',
    description: 'Chronicling America page number.',
    providers: ['chroniclingamerica'],
    valueType: 'integer',
    defaultValue: '1',
  },
  {
    option: '--chroniclingamerica-dates <range>',
    env: 'CHRONICLINGAMERICA_DATES',
    description: 'Chronicling America LOC date facet, for example 1860/1865.',
    providers: ['chroniclingamerica'],
    valueType: 'string',
  },
  {
    option: '--currents-keywords <text>',
    env: 'CURRENTS_KEYWORDS',
    description: 'Currents search keywords.',
    providers: ['currents'],
    valueType: 'string',
  },
  {
    option: '--currents-language <code>',
    env: 'CURRENTS_LANGUAGE',
    description: 'Currents two-letter language code.',
    providers: ['currents'],
    valueType: 'string',
    defaultValue: 'en',
  },
  {
    option: '--currents-country <code>',
    env: 'CURRENTS_COUNTRY',
    description: 'Currents two-letter country code filter.',
    providers: ['currents'],
    valueType: 'string',
  },
  {
    option: '--currents-category <name>',
    env: 'CURRENTS_CATEGORY',
    description: 'Currents category filter.',
    providers: ['currents'],
    valueType: 'string',
  },
  {
    option: '--currents-page-size <count>',
    env: 'CURRENTS_PAGE_SIZE',
    description: 'Currents articles per page, integer from 1 to 300.',
    providers: ['currents'],
    valueType: 'integer',
    defaultValue: '10',
  },
  {
    option: '--currents-page <number>',
    env: 'CURRENTS_PAGE',
    description: 'Currents page number.',
    providers: ['currents'],
    valueType: 'integer',
    defaultValue: '1',
  },
  {
    option: '--guardian-query <text>',
    env: 'GUARDIAN_QUERY',
    description: 'Guardian content search query.',
    providers: ['guardian'],
    valueType: 'string',
    defaultValue: 'public api',
  },
  {
    option: '--guardian-section <slug>',
    env: 'GUARDIAN_SECTION',
    description: 'Guardian section slug.',
    providers: ['guardian'],
    valueType: 'string',
  },
  {
    option: '--guardian-tag <path>',
    env: 'GUARDIAN_TAG',
    description: 'Guardian tag path.',
    providers: ['guardian'],
    valueType: 'string',
  },
  {
    option: '--guardian-from-date <YYYY-MM-DD>',
    env: 'GUARDIAN_FROM_DATE',
    description: 'Guardian start publication date.',
    providers: ['guardian'],
    valueType: 'string',
  },
  {
    option: '--guardian-to-date <YYYY-MM-DD>',
    env: 'GUARDIAN_TO_DATE',
    description: 'Guardian end publication date.',
    providers: ['guardian'],
    valueType: 'string',
  },
  {
    option: '--guardian-order-by <newest|oldest|relevance>',
    env: 'GUARDIAN_ORDER_BY',
    description: 'Guardian sort order.',
    providers: ['guardian'],
    choices: ['newest', 'oldest', 'relevance'],
  },
  {
    option: '--guardian-show-fields <fields>',
    env: 'GUARDIAN_SHOW_FIELDS',
    description: 'Guardian displayed fields subset.',
    providers: ['guardian'],
    valueType: 'string',
  },
  {
    option: '--guardian-page-size <count>',
    env: 'GUARDIAN_PAGE_SIZE',
    description: 'Guardian page size, integer from 1 to 50.',
    providers: ['guardian'],
    valueType: 'integer',
    defaultValue: '10',
  },
  {
    option: '--guardian-page <number>',
    env: 'GUARDIAN_PAGE',
    description: 'Guardian page number.',
    providers: ['guardian'],
    valueType: 'integer',
    defaultValue: '1',
  },
  {
    option: '--marketaux-search <text>',
    env: 'MARKETAUX_SEARCH',
    description: 'MarketAux dynamic article search text.',
    providers: ['marketaux'],
    valueType: 'string',
  },
  {
    option: '--marketaux-symbols <csv>',
    env: 'MARKETAUX_SYMBOLS',
    description: 'MarketAux entity symbols, for example TSLA,AMZN.',
    providers: ['marketaux'],
    valueType: 'string',
  },
  {
    option: '--marketaux-countries <csv>',
    env: 'MARKETAUX_COUNTRIES',
    description: 'MarketAux country filters.',
    providers: ['marketaux'],
    valueType: 'string',
  },
  {
    option: '--marketaux-industries <csv>',
    env: 'MARKETAUX_INDUSTRIES',
    description: 'MarketAux industry filters.',
    providers: ['marketaux'],
    valueType: 'string',
  },
  {
    option: '--marketaux-language <code>',
    env: 'MARKETAUX_LANGUAGE',
    description: 'MarketAux article language code.',
    providers: ['marketaux'],
    valueType: 'string',
  },
  {
    option: '--marketaux-sentiment-min <score>',
    env: 'MARKETAUX_SENTIMENT_MIN',
    description: 'MarketAux minimum entity sentiment score from -1 to 1.',
    providers: ['marketaux'],
    valueType: 'string',
  },
  {
    option: '--marketaux-sentiment-max <score>',
    env: 'MARKETAUX_SENTIMENT_MAX',
    description: 'MarketAux maximum entity sentiment score from -1 to 1.',
    providers: ['marketaux'],
    valueType: 'string',
  },
  {
    option: '--marketaux-published-after <date>',
    env: 'MARKETAUX_PUBLISHED_AFTER',
    description: 'MarketAux published-after date or datetime.',
    providers: ['marketaux'],
    valueType: 'string',
  },
  {
    option: '--marketaux-published-before <date>',
    env: 'MARKETAUX_PUBLISHED_BEFORE',
    description: 'MarketAux published-before date or datetime.',
    providers: ['marketaux'],
    valueType: 'string',
  },
  {
    option: '--marketaux-limit <count>',
    env: 'MARKETAUX_LIMIT',
    description: 'MarketAux requested articles per page.',
    providers: ['marketaux'],
    valueType: 'integer',
    defaultValue: '10',
  },
  {
    option: '--marketaux-page <number>',
    env: 'MARKETAUX_PAGE',
    description: 'MarketAux page number.',
    providers: ['marketaux'],
    valueType: 'integer',
    defaultValue: '1',
  },
  {
    option: '--mediastack-keywords <text>',
    env: 'MEDIASTACK_KEYWORDS',
    description: 'Mediastack search keywords.',
    providers: ['mediastack'],
    valueType: 'string',
  },
  {
    option: '--mediastack-sources <ids>',
    env: 'MEDIASTACK_SOURCES',
    description: 'Mediastack comma-separated source ids.',
    providers: ['mediastack'],
    valueType: 'string',
  },
  {
    option: '--mediastack-categories <ids>',
    env: 'MEDIASTACK_CATEGORIES',
    description: 'Mediastack comma-separated categories.',
    providers: ['mediastack'],
    valueType: 'string',
  },
  {
    option: '--mediastack-countries <codes>',
    env: 'MEDIASTACK_COUNTRIES',
    description: 'Mediastack comma-separated country codes.',
    providers: ['mediastack'],
    valueType: 'string',
  },
  {
    option: '--mediastack-languages <codes>',
    env: 'MEDIASTACK_LANGUAGES',
    description: 'Mediastack comma-separated language codes.',
    providers: ['mediastack'],
    valueType: 'string',
  },
  {
    option: '--mediastack-date <date>',
    env: 'MEDIASTACK_DATE',
    description: 'Mediastack date filter.',
    providers: ['mediastack'],
    valueType: 'string',
  },
  {
    option: '--mediastack-sort <published_desc|published_asc|popularity>',
    env: 'MEDIASTACK_SORT',
    description: 'Mediastack sort order.',
    providers: ['mediastack'],
    choices: ['published_desc', 'published_asc', 'popularity'],
  },
  {
    option: '--mediastack-limit <count>',
    env: 'MEDIASTACK_LIMIT',
    description: 'Mediastack article limit, integer from 1 to 100.',
    providers: ['mediastack'],
    valueType: 'integer',
    defaultValue: '10',
  },
  {
    option: '--mediastack-offset <count>',
    env: 'MEDIASTACK_OFFSET',
    description: 'Mediastack pagination offset.',
    providers: ['mediastack'],
    valueType: 'integer',
  },
  {
    option: '--newsdata-query <text>',
    env: 'NEWSDATA_QUERY',
    description: 'NewsData.io keyword search query.',
    providers: ['newsdata'],
    valueType: 'string',
  },
  {
    option: '--newsdata-search-in <all|title|meta>',
    env: 'NEWSDATA_SEARCH_IN',
    description: 'NewsData.io query scope.',
    providers: ['newsdata'],
    choices: ['all', 'title', 'meta'],
    defaultValue: 'all',
  },
  {
    option: '--newsdata-language <codes>',
    env: 'NEWSDATA_LANGUAGE',
    description: 'NewsData.io comma-separated languages.',
    providers: ['newsdata'],
    valueType: 'string',
    defaultValue: 'en',
  },
  {
    option: '--newsdata-country <codes>',
    env: 'NEWSDATA_COUNTRY',
    description: 'NewsData.io comma-separated countries.',
    providers: ['newsdata'],
    valueType: 'string',
  },
  {
    option: '--newsdata-category <names>',
    env: 'NEWSDATA_CATEGORY',
    description: 'NewsData.io comma-separated categories.',
    providers: ['newsdata'],
    valueType: 'string',
  },
  {
    option: '--newsdata-domain <names>',
    env: 'NEWSDATA_DOMAIN',
    description: 'NewsData.io comma-separated source domains.',
    providers: ['newsdata'],
    valueType: 'string',
  },
  {
    option: '--newsdata-sort <pubdateasc|relevancy|source|fetched_at>',
    env: 'NEWSDATA_SORT',
    description: 'NewsData.io sort order.',
    providers: ['newsdata'],
    choices: ['pubdateasc', 'relevancy', 'source', 'fetched_at'],
  },
  {
    option: '--newsdata-dedupe <true|false>',
    env: 'NEWSDATA_DEDUPE',
    description: 'Ask NewsData.io to remove duplicate articles.',
    providers: ['newsdata'],
    choices: ['true', 'false'],
  },
  {
    option: '--newsdata-size <count>',
    env: 'NEWSDATA_SIZE',
    description: 'NewsData.io articles per request, integer from 1 to 10.',
    providers: ['newsdata'],
    valueType: 'integer',
    defaultValue: '10',
  },
  {
    option: '--newsdata-page <nextPage>',
    env: 'NEWSDATA_PAGE',
    description: 'NewsData.io opaque nextPage token.',
    providers: ['newsdata'],
    valueType: 'string',
  },
  {
    option: '--nytimes-section <slug>',
    env: 'NYTIMES_SECTION',
    description: 'NYTimes Top Stories section.',
    providers: ['nytimes'],
    valueType: 'string',
    defaultValue: 'home',
  },
  {
    option: '--nytimes-limit <count>',
    env: 'NYTIMES_LIMIT',
    description: 'NYTimes local story limit.',
    providers: ['nytimes'],
    valueType: 'integer',
    defaultValue: '10',
  },
  {
    option: '--thenews-search <text>',
    env: 'THENEWS_SEARCH',
    description: 'TheNewsAPI search query.',
    providers: ['thenews'],
    valueType: 'string',
    defaultValue: 'public api',
  },
  {
    option: '--thenews-language <codes>',
    env: 'THENEWS_LANGUAGE',
    description: 'TheNewsAPI comma-separated languages.',
    providers: ['thenews'],
    valueType: 'string',
    defaultValue: 'en',
  },
  {
    option: '--thenews-locale <codes>',
    env: 'THENEWS_LOCALE',
    description: 'TheNewsAPI comma-separated source locales.',
    providers: ['thenews'],
    valueType: 'string',
  },
  {
    option: '--thenews-categories <names>',
    env: 'THENEWS_CATEGORIES',
    description: 'TheNewsAPI comma-separated categories.',
    providers: ['thenews'],
    valueType: 'string',
  },
  {
    option: '--thenews-domains <names>',
    env: 'THENEWS_DOMAINS',
    description: 'TheNewsAPI comma-separated domains.',
    providers: ['thenews'],
    valueType: 'string',
  },
  {
    option: '--thenews-published-after <date>',
    env: 'THENEWS_PUBLISHED_AFTER',
    description: 'TheNewsAPI published-after date or datetime.',
    providers: ['thenews'],
    valueType: 'string',
  },
  {
    option: '--thenews-published-before <date>',
    env: 'THENEWS_PUBLISHED_BEFORE',
    description: 'TheNewsAPI published-before date or datetime.',
    providers: ['thenews'],
    valueType: 'string',
  },
  {
    option: '--thenews-published-on <YYYY-MM-DD>',
    env: 'THENEWS_PUBLISHED_ON',
    description: 'TheNewsAPI exact publication date.',
    providers: ['thenews'],
    valueType: 'string',
  },
  {
    option: '--thenews-sort <published_at|published_on|relevance_score>',
    env: 'THENEWS_SORT',
    description: 'TheNewsAPI sort order.',
    providers: ['thenews'],
    choices: ['published_at', 'published_on', 'relevance_score'],
  },
  {
    option: '--thenews-limit <count>',
    env: 'THENEWS_LIMIT',
    description: 'TheNewsAPI requested article count.',
    providers: ['thenews'],
    valueType: 'integer',
    defaultValue: '10',
  },
  {
    option: '--thenews-page <number>',
    env: 'THENEWS_PAGE',
    description: 'TheNewsAPI page number.',
    providers: ['thenews'],
    valueType: 'integer',
    defaultValue: '1',
  },
]

const providerParameterEnvNames = NEWS_FLASH_PROVIDER_PARAMETERS.map(
  parameter => parameter.env,
)
const keyedProviderEnvNames = Object.values(keyedProviderEnv)

const bridgedZshEnvNames = Array.from(new Set([
  'AGENT_CLI_RUNNER',
  'AGENT_ENV_FILE',
  'AGENT_CLI_RUNNER_ENV_FILE',
  'AGENT_TIMEOUT_MS',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_CUSTOM_MODEL_OPTION',
  'ANTHROPIC_CUSTOM_MODEL_OPTION_NAME',
  'ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION',
  'LITELLM_MASTER_KEY',
  'LITELLM_API_KEY',
  'LITELLM_BASE_URL',
  'LITELLM_API_BASE',
  'CLAUDE_BIN',
  'CLAUDE_TIMEOUT_MS',
  'CLAUDE_MAX_ATTEMPTS',
  'CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC',
  'CLAUDE_CODE_ENABLE_TELEMETRY',
  'CLAUDE_CODE_SUBAGENT_MODEL',
  'DISABLE_TELEMETRY',
  'DISABLE_AUTOUPDATER',
  'CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL',
  'ENABLE_EXPERIMENTAL_MCP_CLI',
  'CODEX_BIN',
  'CODEX_CONFIG_FILE',
  'CODEX_HOME',
  'CODEX_PROFILE',
  'CODEX_TIMEOUT_MS',
  ...keyedProviderEnvNames,
  'CYCLES',
  'INTERVAL_SECONDS',
  ...providerParameterEnvNames,
]))

export function listNewsFlashProviders(repoRoot: string): ListNewsFlashProvidersResult {
  return {
    kind: 'experimental.newsFlash.providers',
    providers: NEWS_FLASH_PROVIDERS.map(provider => {
      const requiredEnv = keyedProviderEnv[provider]
      return {
        provider,
        templateDir: resolveProviderTemplateDir(repoRoot, provider),
        operation: providerOperations[provider],
        description: providerDescriptions[provider],
        requiredEnv: requiredEnv === undefined ? [] : [requiredEnv],
        parameters: NEWS_FLASH_PROVIDER_PARAMETERS.filter(
          parameter => parameter.providers.includes(provider),
        ),
      }
    }),
  }
}

export async function doctorNewsFlashMonitor(options: DoctorNewsFlashOptions): Promise<DoctorNewsFlashResult> {
  const templateDir = resolveProviderTemplateDir(options.repoRoot, options.provider)
  const shell = resolveShellRuntime(options.shellPath)
  const providerEnv = normalizeProviderEnv(options.providerEnv, options.provider)
  const agent = normalizeAgentOptions(options.agent)
  const checks = await runPreflightChecks({
    ...options,
    providerEnv,
    agent,
    templateDir,
    intervalSeconds: options.intervalMinutes * 60,
    shell,
  })
  const ok = checks.every(check => check.ok)
  return {
    kind: 'experimental.newsFlash.doctor',
    provider: options.provider,
    templateDir,
    shellPath: shell.path,
    providerEnv,
    agent,
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
  const agent = normalizeAgentOptions(options.agent)
  const smokeRun = await runSmokeTest(
    doctor.templateDir,
    options.repoRoot,
    shell,
    options.runTimeoutMs ?? 240_000,
    providerEnv,
    options.provider,
    agent,
  )
  if (!smokeRun.ok) {
    throw new RuntimeFailure('OPEN_API_FAILED', `News flash run-once failed for ${options.provider}.`, { provider: options.provider, smokeRun })
  }
  return {
    kind: 'experimental.newsFlash.runOnce',
    provider: options.provider,
    templateDir: doctor.templateDir,
    shellPath: shell.path,
    providerEnv,
    agent,
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
  const agent = normalizeAgentOptions(options.agent)
  const checks = await runPreflightChecks({
    ...options,
    providerEnv,
    agent,
    templateDir,
    intervalSeconds,
    shell,
  })
  const failed = checks.filter(check => !check.ok)
  if (failed.length > 0) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Cannot install ${options.provider} news flash monitor because preflight checks failed.`, { provider: options.provider, checks: failed })
  }
  const supportedShell = requireSupportedShell(shell)

  const smokeRun = await runSmokeTest(
    templateDir,
    options.repoRoot,
    supportedShell,
    options.runTimeoutMs ?? 240_000,
    providerEnv,
    options.provider,
    agent,
  )
  if (!smokeRun.ok) {
    throw new RuntimeFailure('OPEN_API_FAILED', `Cannot install ${options.provider} news flash monitor because the required smoke run failed.`, { provider: options.provider, smokeRun })
  }

  const launchCommand = createLaunchShellCommand({
    templateDir,
    repoRoot: options.repoRoot,
    shell: supportedShell,
    providerEnv,
    agent,
    provider: options.provider,
  })
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
      agent,
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
    agent,
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

export function parseNewsFlashAgentCliRunner(value: string): NewsFlashAgentCliRunner {
  if ((NEWS_FLASH_AGENT_CLI_RUNNERS as readonly string[]).includes(value)) {
    return value as NewsFlashAgentCliRunner
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', `Unsupported agent CLI runner: ${value}`, {
    supported: NEWS_FLASH_AGENT_CLI_RUNNERS,
  })
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
    <string>${escapePlist(input.launchCommand ?? createLaunchShellCommand({
      templateDir: input.templateDir,
      repoRoot: input.repoRoot,
      shell,
      providerEnv: input.providerEnv,
      agent: input.agent,
      provider: input.provider,
    }))}</string>
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

  const agent = normalizeAgentOptions(options.agent)
  checks.push(await checkAgentEnvFile(agent))
  checks.push(await checkAgentEnvAssignments(agent))
  checks.push(await checkAgentCommand(agent, options.shell))
  if (agent.runner === 'claude_code') {
    checks.push(await checkAnyEnvVar(
      'Claude credentials',
      ['ANTHROPIC_API_KEY', 'LITELLM_MASTER_KEY', 'LITELLM_API_KEY'],
      options.shell,
      agent,
    ))
  } else {
    checks.push(checkCodexProfile(agent))
    if (agent.codexProfile !== undefined) {
      checks.push(await checkCodexProviderEnvKey(agent, options.shell))
    }
  }
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

async function checkAnyEnvVar(
  name: string,
  envNames: string[],
  shell: ShellRuntime,
  agent?: NormalizedNewsFlashAgentOptions | undefined,
): Promise<NewsFlashCheckResult> {
  for (const envName of envNames) {
    if (agent?.env[envName] !== undefined) {
      return { name, ok: true, detail: `${envName} set by --agent-env` }
    }
  }
  const result = await runUserShell([
    'for name in "$@"; do',
    '  eval "value=\\${$name-}"',
    '  if [ -n "$value" ]; then echo "$name"; exit 0; fi',
    'done',
    'exit 1',
  ].join('\n'), envNames, shell, {
    cwd: process.cwd(),
    timeoutMs: 15_000,
    agent,
  })
  return {
    name,
    ok: result.exitCode === 0,
    detail: result.exitCode === 0
      ? `${lastNonEmptyLine(result.stdout)} set in runner environment`
      : `${envNames.join(', ')} must be set in shell startup files, --agent-env, or --agent-env-file`,
  }
}

async function checkCommand(
  check: CommandCheck,
  shell: ShellRuntime,
  agent?: NormalizedNewsFlashAgentOptions | undefined,
): Promise<NewsFlashCheckResult> {
  const result = await runUserShell(check.verifyCommand, [], shell, {
    cwd: process.cwd(),
    timeoutMs: 15_000,
    agent,
    loadStartup: false,
  })
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
    { name: 'terminal-notifier', command: 'terminal-notifier', verifyCommand: 'terminal-notifier -version' },
    { name: 'launchctl', command: 'launchctl', verifyCommand: 'launchctl help' },
  ]
}

async function checkAgentCommand(
  agent: NormalizedNewsFlashAgentOptions,
  shell: ShellRuntime,
): Promise<NewsFlashCheckResult> {
  const commandName = agent.runner === 'codex' ? 'codex' : 'claude'
  const binaryEnvName = agent.runner === 'codex' ? 'CODEX_BIN' : 'CLAUDE_BIN'
  const defaultCommand = agent.runner === 'codex' ? 'codex' : 'claude'
  const result = await runUserShell([
    `${binaryEnvName}="\${${binaryEnvName}:-${defaultCommand}}"`,
    `"$${binaryEnvName}" --version`,
  ].join('\n'), [], shell, {
    cwd: process.cwd(),
    timeoutMs: 15_000,
    agent,
    loadStartup: false,
  })
  const configuredCommand = agent.env[binaryEnvName] ?? process.env[binaryEnvName]
  return {
    name: commandName,
    ok: result.exitCode === 0,
    detail: result.exitCode === 0
      ? basename(configuredCommand ?? defaultCommand)
      : tail(`${result.stderr}\n${result.stdout}`, 300),
  }
}

async function checkAgentEnvFile(agent: NormalizedNewsFlashAgentOptions): Promise<NewsFlashCheckResult> {
  if (agent.envFile === undefined) {
    return { name: 'agent env file', ok: true, detail: 'not configured' }
  }
  const result = await checkPath('agent env file', agent.envFile, constants.R_OK)
  return result.ok ? result : {
    ...result,
    detail: `Missing or inaccessible --agent-env-file: ${agent.envFile}`,
  }
}

function checkAgentEnvAssignments(agent: NormalizedNewsFlashAgentOptions): NewsFlashCheckResult {
  const names = Object.keys(agent.env).sort()
  return {
    name: 'agent env',
    ok: true,
    detail: names.length === 0 ? 'default' : names.join(', '),
  }
}

function checkCodexProfile(agent: NormalizedNewsFlashAgentOptions): NewsFlashCheckResult {
  return {
    name: 'codex profile',
    ok: agent.codexProfile !== undefined,
    detail: agent.codexProfile === undefined
      ? 'set --codex-profile so Codex selects the intended model profile'
      : `profile ${agent.codexProfile}`,
  }
}

async function checkCodexProviderEnvKey(
  agent: NormalizedNewsFlashAgentOptions,
  shell: ShellRuntime,
): Promise<NewsFlashCheckResult> {
  const result = await runUserShell(
    createCodexEnvKeyCheckCommand(agent.codexProfile ?? ''),
    [],
    shell,
    { cwd: process.cwd(), timeoutMs: 15_000, agent },
  )
  const detail = lastNonEmptyLine(result.stdout) || tail(result.stderr, 300)
  if (result.exitCode === 0) {
    return {
      name: 'codex provider env key',
      ok: true,
      detail: detail === 'NO_ENV_KEY'
        ? 'selected provider does not declare env_key'
        : `${detail} set in runner environment`,
    }
  }
  return {
    name: 'codex provider env key',
    ok: false,
    detail: detail === ''
      ? 'Codex provider env_key is missing or unreadable'
      : `${detail} must be set in shell startup files, --agent-env, or --agent-env-file`,
  }
}

async function runSmokeTest(
  templateDir: string,
  repoRoot: string,
  shell: ShellRuntime,
  timeoutMs: number,
  providerEnv: Record<string, string> = {},
  provider?: NewsFlashProvider | undefined,
  agent: NormalizedNewsFlashAgentOptions = normalizeAgentOptions(),
): Promise<NewsFlashSmokeRunResult> {
  const started = Date.now()
  const launchCommand = createLaunchShellCommand({
    templateDir,
    repoRoot,
    shell,
    smoke: true,
    providerEnv,
    provider,
    agent,
  })
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

async function runUserShell(
  command: string,
  args: string[],
  shell: ShellRuntime,
  options: {
    cwd: string
    timeoutMs: number
    loadStartup?: boolean | undefined
    agent?: NormalizedNewsFlashAgentOptions | undefined
  },
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  const supportedShell = requireSupportedShell(shell)
  const script = createUserShellScript(command, supportedShell, options.agent, {
    loadStartup: options.loadStartup !== false,
  })
  return await runProcess(
    supportedShell.path,
    ['-c', script, 'public-apis-cli-preflight', ...args],
    options,
  )
}

function createLaunchShellCommand(input: LaunchCommandInput): string {
  const shell = requireSupportedShell(input.shell)
  const agent = normalizeAgentOptions(input.agent)
  const assignments = [
    `${publicApisCliRepoEnv}=${shellQuote(input.repoRoot)}`,
    `${publicApisTuiRepoEnv}=${shellQuote(input.repoRoot)}`,
    `AGENT_CLI_RUNNER=${shellQuote(agent.runner)}`,
  ]
  if (agent.envFile !== undefined) {
    assignments.push(`AGENT_ENV_FILE=${shellQuote(agent.envFile)}`)
  }
  if (agent.codexProfile !== undefined) {
    assignments.push(`CODEX_PROFILE=${shellQuote(agent.codexProfile)}`)
  }
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
  for (const [name, value] of Object.entries(agent.env).sort(([left], [right]) => left.localeCompare(right))) {
    assignments.push(`${name}=${shellQuote(value)}`)
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
  if (provider === 'chroniclingamerica') return { CHRONICLINGAMERICA_COUNT: '3' }
  if (provider === 'currents') return { CURRENTS_PAGE_SIZE: '3' }
  if (provider === 'guardian') return { GUARDIAN_PAGE_SIZE: '3' }
  if (provider === 'marketaux') return { MARKETAUX_LIMIT: '3' }
  if (provider === 'mediastack') return { MEDIASTACK_LIMIT: '3' }
  if (provider === 'newsdata') return { NEWSDATA_SIZE: '3' }
  if (provider === 'nytimes') return { NYTIMES_LIMIT: '3' }
  if (provider === 'thenews') return { THENEWS_LIMIT: '3' }
  return {}
}

function createUserShellScript(
  command: string,
  shell: ShellRuntime & { family: ShellFamily },
  agent?: NormalizedNewsFlashAgentOptions | undefined,
  options: { loadStartup?: boolean | undefined } = {},
): string {
  return [
    options.loadStartup === false ? '' : createShellStartupCommand(shell),
    createEnvBridgeCommand(bridgedZshEnvNames),
    agent === undefined ? '' : createAgentShellEnvCommand(agent),
    createCodexEnvKeyBridgeCommand(),
    command,
  ].filter(Boolean).join('\n')
}

function createAgentShellEnvCommand(agent: NormalizedNewsFlashAgentOptions): string {
  const lines = [`export AGENT_CLI_RUNNER=${shellQuote(agent.runner)}`]
  if (agent.envFile !== undefined) {
    lines.push(`export AGENT_ENV_FILE=${shellQuote(agent.envFile)}`)
    lines.push('if [ ! -r "$AGENT_ENV_FILE" ]; then')
    lines.push('  echo "AGENT_ENV_FILE is not readable: $AGENT_ENV_FILE" >&2')
    lines.push('  exit 64')
    lines.push('fi')
    lines.push('set -a')
    lines.push('. "$AGENT_ENV_FILE"')
    lines.push('set +a')
  }
  if (agent.codexProfile !== undefined) {
    lines.push(`export CODEX_PROFILE=${shellQuote(agent.codexProfile)}`)
  }
  for (const [name, value] of Object.entries(agent.env).sort()) {
    lines.push(`export ${name}=${shellQuote(value)}`)
  }
  return lines.join('\n')
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

function createCodexEnvKeyBridgeCommand(): string {
  const envKeyPattern =
    's/^[[:space:]]*env_key[[:space:]]*=[[:space:]]*["' +
    "'" +
    ']?([A-Za-z_][A-Za-z0-9_]*)["' +
    "'" +
    ']?.*$/\\1/p'
  return [
    'codex_config_file="${CODEX_CONFIG_FILE:-}"',
    'if [ -z "$codex_config_file" ]; then',
    '  if [ -n "${CODEX_HOME:-}" ]; then',
    '    codex_config_file="$CODEX_HOME/config.toml"',
    '  else',
    '    codex_config_file="$HOME/.codex/config.toml"',
    '  fi',
    'fi',
    'if [ -r "$codex_config_file" ]; then',
    `  codex_env_keys="$(sed -nE ${shellQuote(envKeyPattern)} ` +
      '"$codex_config_file" | sort -u)"',
    '  while IFS= read -r name; do',
    '    if [ -z "$name" ]; then continue; fi',
    '    eval "value=\\${$name-}"',
    '    if [ -n "$value" ]; then export "$name=$value"; fi',
    '  done <<EOF',
    '$codex_env_keys',
    'EOF',
    'fi',
  ].join('\n')
}

function createCodexEnvKeyCheckCommand(profile: string): string {
  return [
    `codex_profile=${shellQuote(profile)}`,
    `${shellQuote(process.execPath)} - "$codex_profile" <<'NODE'`,
    'const fs = require("node:fs")',
    'const os = require("node:os")',
    'const path = require("node:path")',
    'const profile = process.argv[2] || ""',
    'const home = process.env.CODEX_HOME || path.join(os.homedir(), ".codex")',
    'const configFile = process.env.CODEX_CONFIG_FILE || path.join(home, "config.toml")',
    'const text = fs.existsSync(configFile) ? fs.readFileSync(configFile, "utf8") : ""',
    'const sections = new Map([["", {}]])',
    'let section = ""',
    'for (const rawLine of text.split(/\\r?\\n/u)) {',
    '  const line = rawLine.trim()',
    '  if (line === "" || line.startsWith("#")) continue',
    '  const header = /^\\[([^\\]]+)\\]$/u.exec(line)',
    '  if (header) {',
    '    section = header[1]',
    '    if (!sections.has(section)) sections.set(section, {})',
    '    continue',
    '  }',
    '  const pair = /^([A-Za-z0-9_.-]+)\\s*=\\s*(.+)$/u.exec(line)',
    '  if (!pair) continue',
    '  let value = pair[2].trim().replace(/\\s+#.*$/u, "")',
    '  value = value.replace(/^[\\x22\\x27]|[\\x22\\x27]$/gu, "")',
    '  sections.get(section)[pair[1]] = value',
    '}',
    'const top = sections.get("") || {}',
    'const profileConfig = sections.get(`profiles.${profile}`) || {}',
    'const provider = profileConfig.model_provider || top.model_provider || ""',
    'const providerConfig = sections.get(`model_providers.${provider}`) || {}',
    'const envKey = providerConfig.env_key',
    'if (!envKey) { console.log("NO_ENV_KEY"); process.exit(0) }',
    'if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(envKey)) {',
    '  console.log(envKey)',
    '  process.exit(1)',
    '}',
    'if (process.env[envKey]) { console.log(envKey); process.exit(0) }',
    'console.log(envKey)',
    'process.exit(1)',
    'NODE',
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

function normalizeAgentOptions(
  agent: NewsFlashAgentOptions | NormalizedNewsFlashAgentOptions | undefined = {},
): NormalizedNewsFlashAgentOptions {
  const runner = parseNewsFlashAgentCliRunner(agent.runner ?? defaultAgentCliRunner)
  const env = normalizeAgentEnv(agent.env)
  const envFile = normalizeOptionalPath(agent.envFile, 'agent env file')
  const codexProfile = normalizeOptionalText(agent.codexProfile, 'codex profile')
  if (runner === 'codex' && codexProfile !== undefined) {
    env.CODEX_PROFILE = codexProfile
  }
  return { runner, env, envFile, codexProfile }
}

function normalizeAgentEnv(env: Record<string, string> | undefined): Record<string, string> {
  const normalized: Record<string, string> = {}
  for (const [name, value] of Object.entries(env ?? {})) {
    if (!/^[A-Z][A-Z0-9_]*$/u.test(name)) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `Invalid agent env name: ${name}`, {
        remediation: 'Use NAME=value with an uppercase shell variable name.',
      })
    }
    normalized[name] = value
  }
  return normalized
}

function normalizeOptionalPath(value: string | undefined, label: string): string | undefined {
  const normalized = normalizeOptionalText(value, label)
  return normalized === undefined ? undefined : resolve(normalized)
}

function normalizeOptionalText(value: string | undefined, label: string): string | undefined {
  if (value === undefined) return undefined
  const trimmed = value.trim()
  if (trimmed === '') {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${label} must not be empty.`)
  }
  return trimmed
}

function tail(value: string, max: number): string {
  return value.length <= max ? value : value.slice(value.length - max)
}

function lastNonEmptyLine(value: string): string {
  const lines = value.split(/\r?\n/u).map(line => line.trim()).filter(Boolean)
  return lines.at(-1) ?? ''
}
