import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { clearTimeout, setTimeout } from 'node:timers'

const inputPath = resolve(
  process.argv[2] ?? join(process.cwd(), 'data/latest-news.json'),
)
const outPath = resolve(
  process.argv[3] ?? join(process.cwd(), 'summary/news-flash.json'),
)
const claudeBin = process.env.CLAUDE_BIN ?? 'claude'
const timeoutMs = Number(process.env.CLAUDE_TIMEOUT_MS ?? 180_000)
const maxAttempts = Number(process.env.CLAUDE_MAX_ATTEMPTS ?? 3)
const maxFieldChars = Number(process.env.NEWS_FLASH_INPUT_FIELD_CHARS ?? 700)
const claudeEnv = createClaudeEnv()
const secretAssignmentPattern = new RegExp(
  [
    String.raw`\b(`,
    [
      'ANTHROPIC_API_KEY',
      'ANTHROPIC_BASE_URL',
      'LITELLM_MASTER_KEY',
      'LITELLM_API_KEY',
      'LITELLM_BASE_URL',
      'LITELLM_API_BASE',
      'NEWSAPI_API_KEY',
      'GNEWS_API_KEY',
      String.raw`api[_-]?key`,
      'token',
      'authorization',
    ].join('|'),
    String.raw`)\s*[:=]\s*[^,;\s]+`,
  ].join(''),
  'giu',
)

if (!existsSync(inputPath)) throw new Error(`Input not found: ${inputPath}`)
await mkdir(dirname(outPath), { recursive: true })
const inputText = await readFile(inputPath, 'utf8')
const promptInput = preparePromptInput(inputText)

const schema = {
  type: 'object',
  required: [
    'status',
    'headline',
    'briefing_time',
    'source_operation',
    'items',
    'watchlist',
    'next_action',
  ],
  properties: {
    status: { enum: ['complete', 'insufficient_data', 'needs_more_cycles'] },
    headline: { type: 'string' },
    briefing_time: { type: 'string' },
    source_operation: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'title',
          'source',
          'published_at',
          'summary',
          'why_it_matters',
          'url',
        ],
        properties: {
          title: { type: 'string' },
          source: { type: 'string' },
          published_at: { type: 'string' },
          summary: { type: 'string' },
          why_it_matters: { type: 'string' },
          url: { type: 'string' },
        },
      },
    },
    watchlist: { type: 'array', items: { type: 'string' } },
    next_action: { type: 'string' },
  },
}

function parseJsonFromClaude(events) {
  const errorEvent = events.find(
    event => event.error === 'authentication_failed' || event.is_error === true,
  )
  if (errorEvent) {
    const errorText = errorEvent.result ??
      errorEvent.error ??
      JSON.stringify(errorEvent)
    throw new Error(`Claude returned an error: ${errorTail(errorText)}`)
  }
  const resultEvent = events.find(
    event => event.type === 'result' && typeof event.result === 'string',
  )
  if (!resultEvent) throw new Error('Claude did not return a result event')
  const raw = resultEvent.result
    .trim()
    .replace(/^```(?:json)?\s*/iu, '')
    .replace(/\s*```$/u, '')
    .trim()
  try {
    return JSON.parse(raw)
  } catch (firstError) {
    const match = /\{[\s\S]*\}/u.exec(raw)
    if (!match) {
      throw new Error(`Claude result was not JSON: ${errorTail(raw)}`)
    }
    try {
      return JSON.parse(match[0])
    } catch (secondError) {
      const firstMessage = formatErrorMessage(firstError)
      const secondMessage = formatErrorMessage(secondError)
      throw new Error(
        [
          `Claude result was invalid JSON: ${firstMessage};`,
          `extracted object also failed: ${secondMessage};`,
          `tail: ${errorTail(raw)}`,
        ].join(' '),
      )
    }
  }
}

function validateFlash(value) {
  const errors = []
  if (!['complete', 'insufficient_data', 'needs_more_cycles'].includes(value.status)) {
    errors.push('invalid status')
  }
  for (const field of [
    'headline',
    'briefing_time',
    'source_operation',
    'next_action',
  ]) {
    if (typeof value[field] !== 'string' || value[field].trim() === '') {
      errors.push(`${field} must be non-empty string`)
    }
  }
  if (!Array.isArray(value.items)) errors.push('items must be array')
  else {
    for (const [index, item] of value.items.entries()) {
      for (const field of [
        'title',
        'source',
        'published_at',
        'summary',
        'why_it_matters',
        'url',
      ]) {
        if (typeof item?.[field] !== 'string' || item[field].trim() === '') {
          errors.push(`items[${index}].${field} must be non-empty string`)
        }
      }
    }
  }
  if (
    !Array.isArray(value.watchlist) ||
    value.watchlist.some(item => typeof item !== 'string')
  ) {
    errors.push('watchlist must be string array')
  }
  return errors
}

function preparePromptInput(text) {
  const records = parseInputRecords(text)
  if (records.length === 0) return text
  const compactRecords = records.map(record => ({
    collected_at: readString(record.collected_at),
    provider: readString(record.provider),
    operation: readString(record.operation),
    query: isRecord(record.query) ? record.query : null,
    ok: record.ok === true,
    item_count: typeof record.item_count === 'number' ? record.item_count : 0,
    pagination: isRecord(record.pagination) ? record.pagination : null,
    error: readString(record.error),
    items: readItems(record).map(compactNewsItem),
  }))
  return JSON.stringify({
    note: [
      'All candidate items are preserved. Fields are compacted only to keep',
      'the prompt stable for large provider limits such as 100.',
    ].join(' '),
    record_count: compactRecords.length,
    item_count: compactRecords.reduce(
      (sum, record) => sum + record.items.length,
      0,
    ),
    records: compactRecords,
  })
}

function parseInputRecords(text) {
  const records = []
  for (const line of text.split(/\r?\n/u)) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    try {
      const value = JSON.parse(trimmed)
      if (isRecord(value)) records.push(value)
    } catch {
      return []
    }
  }
  return records
}

function compactNewsItem(item, index) {
  return {
    index,
    id: compactString(item.id),
    title: compactString(item.title),
    source: compactString(item.source),
    publishedAt: compactString(item.publishedAt),
    updatedAt: compactString(item.updatedAt),
    url: compactString(item.url, 1000),
    summary: compactString(item.summary),
    authors: readStringArray(item.authors),
    tags: readStringArray(item.tags),
    metrics: isRecord(item.metrics) ? item.metrics : {},
  }
}

function readItems(record) {
  return Array.isArray(record.items) ? record.items.filter(isRecord) : []
}

function readStringArray(value) {
  return Array.isArray(value)
    ? value
        .filter(item => typeof item === 'string')
        .map(item => compactString(item))
    : []
}

function compactString(value, maxLength = maxFieldChars) {
  if (typeof value !== 'string') return undefined
  const trimmed = value.replace(/\s+/gu, ' ').trim()
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, Math.max(0, maxLength - 1))}…`
}

function readString(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function formatErrorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function parseStreamJson(stdout) {
  return stdout
    .trim()
    .split(/\r?\n/u)
    .filter(Boolean)
    .map(line => JSON.parse(line))
}

function createClaudeEnv() {
  const env = { ...process.env }
  if (!env.ANTHROPIC_API_KEY) {
    if (env.LITELLM_MASTER_KEY) env.ANTHROPIC_API_KEY = env.LITELLM_MASTER_KEY
    else if (env.LITELLM_API_KEY) env.ANTHROPIC_API_KEY = env.LITELLM_API_KEY
  }
  if (!env.ANTHROPIC_BASE_URL) {
    if (env.LITELLM_BASE_URL) env.ANTHROPIC_BASE_URL = env.LITELLM_BASE_URL
    else if (env.LITELLM_API_BASE) env.ANTHROPIC_BASE_URL = env.LITELLM_API_BASE
  }
  env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC ??= '1'
  env.DISABLE_TELEMETRY ??= '1'
  env.CLAUDE_CODE_ENABLE_TELEMETRY ??= '0'
  env.DISABLE_AUTOUPDATER ??= '1'
  env.CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL ??= 'true'
  env.ENABLE_EXPERIMENTAL_MCP_CLI ??= 'true'
  return env
}

function describeClaudeAuth(events) {
  const initEvent = events.find(
    event => event.type === 'system' && event.subtype === 'init',
  )
  const apiKeySource = initEvent?.apiKeySource ?? 'unknown'
  const hasAnthropicKey = claudeEnv.ANTHROPIC_API_KEY ? 'set' : 'unset'
  const hasBaseUrl = claudeEnv.ANTHROPIC_BASE_URL ? 'set' : 'unset'
  return [
    `apiKeySource=${apiKeySource}`,
    `ANTHROPIC_API_KEY=${hasAnthropicKey}`,
    `ANTHROPIC_BASE_URL=${hasBaseUrl}`,
  ].join(', ')
}

function sanitizeErrorText(value) {
  const knownValues = [
    claudeEnv.ANTHROPIC_API_KEY,
    claudeEnv.ANTHROPIC_BASE_URL,
    claudeEnv.LITELLM_MASTER_KEY,
    claudeEnv.LITELLM_API_KEY,
    claudeEnv.LITELLM_BASE_URL,
    claudeEnv.LITELLM_API_BASE,
    claudeEnv.NEWSAPI_API_KEY,
    claudeEnv.GNEWS_API_KEY,
  ].filter(Boolean)
  let sanitized = String(value)
  for (const knownValue of knownValues) {
    sanitized = sanitized.split(knownValue).join('<redacted>')
  }
  return sanitized
    .replace(/\b(sk-[A-Za-z0-9_-]{8,})\b/gu, '<redacted>')
    .replace(/\b(Bearer)\s+[A-Za-z0-9._~+/-]+=*/giu, '$1 <redacted>')
    .replace(secretAssignmentPattern, '$1=<redacted>')
    .replace(/https?:\/\/[^/\s:@]+:[^/\s@]+@/gu, 'https://<redacted>@')
}

function errorTail(value, max = 1200) {
  const sanitized = sanitizeErrorText(value).trim()
  return sanitized.length <= max ? sanitized : sanitized.slice(sanitized.length - max)
}

async function runClaude(prompt) {
  return await new Promise((resolvePromise, reject) => {
    const child = spawn(claudeBin, [
      '-p',
      '--input-format', 'stream-json',
      '--output-format', 'stream-json',
      '--verbose',
      '--max-turns', '3',
      '--permission-mode', 'dontAsk',
    ], { stdio: ['pipe', 'pipe', 'pipe'], env: claudeEnv })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += String(chunk) })
    child.stderr.on('data', chunk => { stderr += String(chunk) })
    child.stdin.end(JSON.stringify({
      type: 'user',
      message: { role: 'user', content: [{ type: 'text', text: prompt }] },
    }) + '\n')
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`Claude timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    child.on('error', error => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', code => {
      clearTimeout(timer)
      let events = []
      try {
        events = parseStreamJson(stdout)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        reject(
          new Error(
            `Claude stream-json parse failed: ${message}\n${errorTail(stderr)}`,
          ),
        )
        return
      }
      if (code !== 0) {
        const resultEvent = events.find(event => event.type === 'result')
        const resultText = resultEvent?.result ?? stderr ?? 'no error text'
        reject(
          new Error(
            [
              `Claude exited ${code}: ${errorTail(resultText)}`,
              `(${describeClaudeAuth(events)})`,
            ].join(' '),
          ),
        )
        return
      }
      resolvePromise(events)
    })
  })
}

let lastError = null
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  const prompt = [
    '你是快讯编辑，输入是定时 API 监控拉取的 JSONL。',
    [
      '目标：输出中文快讯 JSON，只基于输入内容，不要编造，',
      '不要调用工具，',
      '不要 Markdown。',
    ].join(''),
    [
      '输入保留全部候选新闻条目；必须从完整候选池',
      '判断新闻价值，',
      '不要只看前几条。',
    ].join(''),
    [
      '只输出一个合法 JSON object。字符串内部双引号必须转义，',
      '不要输出尾随逗号。',
    ].join(''),
    [
      '如果 items 数量足够，status="complete"，',
      '输出 items 只保留重要、',
      '最值得提醒的条目；数量由新闻价值决定，',
      '不要为了凑数保留低价值内容。',
    ].join(''),
    [
      '如果缺数据，status="insufficient_data"；',
      '如果需要更多监控周期才能',
      '判断趋势，status="needs_more_cycles"。',
    ].join(''),
    [
      '每条 items.summary 用 1 句概括事实；',
      'why_it_matters 用 1 句说明影响。',
    ].join(''),
    `Required JSON schema: ${JSON.stringify(schema)}`,
    attempt > 1
      ? `上一次输出不合格：${lastError}。请严格修正为 schema 要求。`
      : '',
    '输入 JSON/JSONL：',
    promptInput,
  ].filter(Boolean).join('\n')

  let flash
  try {
    const events = await runClaude(prompt)
    flash = parseJsonFromClaude(events)
  } catch (error) {
    lastError = sanitizeErrorText(formatErrorMessage(error))
    continue
  }
  const errors = validateFlash(flash)
  if (errors.length === 0) {
    await writeFile(
      outPath,
      JSON.stringify({
        generated_at: new Date().toISOString(),
        input: inputPath,
        flash,
      }, null, 2) + '\n',
    )
    console.log(JSON.stringify({ ok: true, attempt, outPath, flash }, null, 2))
    process.exit(0)
  }
  lastError = errors.join('; ')
}
throw new Error(
  `Claude did not produce valid news flash after ${maxAttempts} attempts: ${lastError}`,
)
