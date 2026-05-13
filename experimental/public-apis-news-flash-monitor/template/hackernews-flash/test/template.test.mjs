import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { chmod, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { providerConfig } from '../provider-config.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixture = JSON.parse(
  readFileSync(join(root, 'test/fixtures/provider-result.json'), 'utf8'),
)

test('provider config normalizes fixture records', () => {
  const items = providerConfig.normalize(fixture)
  assert.ok(items.length >= 1)
  for (const item of items) {
    assert.equal(typeof item.title, 'string')
    assert.equal(typeof item.source, 'string')
    assert.equal(typeof item.url, 'string')
    assert.ok(item.title.length > 0)
    assert.ok(item.source.length > 0)
    assert.ok(item.url.length > 0)
  }
  assert.equal(providerConfig.operation, fixture.kind)
})

test('provider config creates CLI options and query without secrets', () => {
  const env = {
    HACKERNEWS_LIMIT: '2',
    HACKERNEWS_LIST: 'best',
  }
  const options = providerConfig.cliOptions(env)
  const query = providerConfig.query(env)
  assert.ok(Array.isArray(options))
  assert.equal(typeof query, 'object')
  assert.equal(options.includes('test-key'), false)
})

test('renderer writes readable TXT from valid flash JSON', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'news-flash-render-'))
  const jsonPath = join(dir, 'news-flash.json')
  const txtPath = join(dir, 'news-flash.txt')
  await mkdir(dir, { recursive: true })
  await writeFile(jsonPath, JSON.stringify({
    generated_at: '2026-05-09T00:00:00.000Z',
    input: 'fixture.jsonl',
    flash: {
      status: 'complete',
      headline: `${providerConfig.displayName} fixture briefing`,
      briefing_time: '2026-05-09T00:00:00.000Z',
      source_operation: providerConfig.operation,
      items: providerConfig.normalize(fixture).slice(0, 2).map(item => ({
        title: item.title,
        source: item.source,
        published_at: item.publishedAt ?? 'unknown',
        summary: item.summary ?? item.title,
        why_it_matters: 'Fixture item validates the renderer.',
        url: item.url,
      })),
      watchlist: ['fixture follow-up'],
      next_action: 'Run the next monitoring cycle.',
    },
  }, null, 2))
  execFileSync(
    'node',
    [join(root, 'render-news-flash-txt.mjs'), jsonPath, txtPath],
    { encoding: 'utf8' },
  )
  const text = readFileSync(txtPath, 'utf8')
  const escapedDisplayName = providerConfig.displayName.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  )
  assert.match(text, new RegExp(escapedDisplayName))
  assert.match(text, /## 要点/)
  assert.match(text, /## 下一步/)
})

test('summarizer sanitizes agent runner error diagnostics', () => {
  const source = readFileSync(
    join(root, 'summarize-news-flash-with-claude.mjs'),
    'utf8',
  )
  assert.match(source, /Claude returned an error: \$\{errorTail\(/)
  assert.match(source, /Claude result was not JSON: \$\{errorTail\(raw\)\}/)
  assert.match(source, /Claude result was invalid JSON/)
  assert.match(source, /Claude exited \$\{code\}: \$\{errorTail\(/)
  assert.match(source, /Claude stream-json parse failed: /)
  assert.match(source, /runCodex/)
  assert.match(source, /--profile/)
  assert.match(source, /CODEX_PROFILE/)
  assert.match(source, /Agent runner did not produce valid news flash/)
  assert.match(source, /sanitizeErrorText/)
  assert.match(source, /preparePromptInput/)
  assert.match(source, /All candidate items are preserved/)
  assert.match(source, /catch \(error\) \{\n {4}lastError = sanitizeErrorText/)
  assert.match(source, /只保留重要、/)
  assert.match(source, /最值得提醒的条目/)
  assert.match(source, /完整候选池/)
  assert.doesNotMatch(
    source,
    /3-5|3–5|FLASH_MIN_ITEMS|minItems|complete status requires/,
  )
  assert.doesNotMatch(source, /Claude returned an error: \$\{errorEvent\.result/)
  assert.doesNotMatch(source, /Claude result was not JSON: \$\{raw\}/)
})

test('summarizer preserves all large-batch candidates before Claude prompt', () => {
  const source = readFileSync(
    join(root, 'summarize-news-flash-with-claude.mjs'),
    'utf8',
  )
  const compactFunction = source.match(
    /function preparePromptInput\(text\) \{[\s\S]*?\n\}/u,
  )?.[0] ?? ''

  assert.match(source, /item_count: compactRecords\.reduce/)
  assert.match(source, /items: readItems\(record\)\.map\(compactNewsItem\)/)
  assert.doesNotMatch(compactFunction, /\.slice\(/u)
  assert.doesNotMatch(source, /HACKERNEWS_LIMIT.*30/u)
})

test('summarizer retries bad JSON and keeps 100 candidates', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'news-flash-summarize-'))
  const inputPath = join(dir, 'latest-news.jsonl')
  const outPath = join(dir, 'news-flash.json')
  const mockClaudePath = join(dir, 'mock-claude.mjs')
  const tracePath = join(dir, 'mock-trace.jsonl')
  const statePath = join(dir, 'mock-state.txt')
  const items = Array.from({ length: 100 }, (_, index) => ({
    id: `item-${index}`,
    title: `News item ${index}`,
    source: 'Fixture Wire',
    publishedAt: '2026-05-09T00:00:00Z',
    url: `https://example.com/news/${index}`,
    summary: `Summary for fixture news item ${index}.`,
    authors: [],
    tags: ['en'],
    metrics: {},
  }))
  await writeFile(inputPath, `${JSON.stringify({
    collected_at: '2026-05-09T00:00:00.000Z',
    provider: providerConfig.id,
    operation: providerConfig.operation,
    query: {},
    ok: true,
    item_count: items.length,
    pagination: { returned: items.length },
    error: null,
    items,
  })}\n`)
  await writeFile(mockClaudePath, `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'

const input = readFileSync(0, 'utf8').trim()
const event = JSON.parse(input)
const prompt = event.message.content[0].text
const rawPayload = prompt.match(/输入 JSON\\/JSONL：\\n([\\s\\S]*)$/u)?.[1]
const payload = JSON.parse(rawPayload)
const attempt = Number(readFileSync(
  process.env.NEWS_FLASH_MOCK_STATE,
  'utf8',
) || '0') + 1
writeFileSync(process.env.NEWS_FLASH_MOCK_STATE, String(attempt))
appendFileSync(process.env.NEWS_FLASH_MOCK_TRACE, JSON.stringify({
  attempt,
  itemCount: payload.item_count,
  recordItems: payload.records[0].items.length,
  firstIndex: payload.records[0].items[0].index,
  lastIndex: payload.records[0].items.at(-1).index,
}) + '\\n')

const flash = {
  status: 'complete',
  headline: 'Fixture briefing',
  briefing_time: '2026-05-09T00:00:00.000Z',
  source_operation: 'fixture.operation',
  items: [{
    title: 'News item 99',
    source: 'Fixture Wire',
    published_at: '2026-05-09T00:00:00Z',
    summary: 'Fixture summary.',
    why_it_matters: 'Fixture impact.',
    url: 'https://example.com/news/99',
  }],
  watchlist: ['fixture follow-up'],
  next_action: 'Run the next monitoring cycle.',
}
const result = attempt === 1
  ? '{"status":"complete","headline":"bad"'
  : JSON.stringify(flash)
console.log(JSON.stringify({ type: 'result', result }))
`)
  await writeFile(statePath, '0')
  await chmod(mockClaudePath, 0o755)

  execFileSync(
    'node',
    [join(root, 'summarize-news-flash-with-claude.mjs'), inputPath, outPath],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        CLAUDE_BIN: mockClaudePath,
        CLAUDE_MAX_ATTEMPTS: '2',
        NEWS_FLASH_MOCK_STATE: statePath,
        NEWS_FLASH_MOCK_TRACE: tracePath,
      },
    },
  )

  const traces = readFileSync(tracePath, 'utf8')
    .trim()
    .split(/\r?\n/u)
    .map(line => JSON.parse(line))
  assert.deepEqual(traces.map(trace => trace.itemCount), [100, 100])
  assert.deepEqual(traces.map(trace => trace.recordItems), [100, 100])
  assert.deepEqual(traces.map(trace => trace.firstIndex), [0, 0])
  assert.deepEqual(traces.map(trace => trace.lastIndex), [99, 99])

  const output = JSON.parse(readFileSync(outPath, 'utf8'))
  assert.equal(output.flash.status, 'complete')
  assert.equal(output.flash.items[0].title, 'News item 99')
})

test('summarizer can use Codex runner with profile', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'news-flash-codex-runner-'))
  const inputPath = join(dir, 'latest-news.jsonl')
  const outPath = join(dir, 'news-flash.json')
  const mockCodexPath = join(dir, 'mock-codex.mjs')
  const tracePath = join(dir, 'mock-codex-trace.json')
  await writeFile(inputPath, `${JSON.stringify({
    collected_at: '2026-05-09T00:00:00.000Z',
    provider: providerConfig.id,
    operation: providerConfig.operation,
    query: {},
    ok: true,
    item_count: 1,
    pagination: { returned: 1 },
    error: null,
    items: [{
      id: 'item-1',
      title: 'Codex runner item',
      source: 'Fixture Wire',
      publishedAt: '2026-05-09T00:00:00Z',
      url: 'https://example.com/news/codex',
      summary: 'Summary for Codex runner fixture.',
      authors: [],
      tags: ['en'],
      metrics: {},
    }],
  })}\n`)
  await writeFile(mockCodexPath, `#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const outputFlagIndex = args.indexOf('--output-last-message')
const outputPath = args[outputFlagIndex + 1]
const profileIndex = args.indexOf('--profile')
const prompt = readFileSync(0, 'utf8')
writeFileSync(process.env.NEWS_FLASH_MOCK_TRACE, JSON.stringify({
  hasExec: args.includes('exec'),
  hasJson: args.includes('--json'),
  hasSkipGitCheck: args.includes('--skip-git-repo-check'),
  profile: profileIndex === -1 ? null : args[profileIndex + 1],
  promptHasFixture: prompt.includes('Codex runner item'),
}))

const flash = {
  status: 'complete',
  headline: 'Codex fixture briefing',
  briefing_time: '2026-05-09T00:00:00.000Z',
  source_operation: 'fixture.operation',
  items: [{
    title: 'Codex runner item',
    source: 'Fixture Wire',
    published_at: '2026-05-09T00:00:00Z',
    summary: 'Fixture summary.',
    why_it_matters: 'Fixture impact.',
    url: 'https://example.com/news/codex',
  }],
  watchlist: ['fixture follow-up'],
  next_action: 'Run the next monitoring cycle.',
}
writeFileSync(outputPath, JSON.stringify(flash))
`)
  await chmod(mockCodexPath, 0o755)

  execFileSync(
    'node',
    [join(root, 'summarize-news-flash-with-claude.mjs'), inputPath, outPath],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        AGENT_CLI_RUNNER: 'codex',
        CODEX_BIN: mockCodexPath,
        CODEX_PROFILE: 'news-flash',
        CLAUDE_MAX_ATTEMPTS: '1',
        NEWS_FLASH_MOCK_TRACE: tracePath,
      },
    },
  )

  const trace = JSON.parse(readFileSync(tracePath, 'utf8'))
  assert.equal(trace.hasExec, true)
  assert.equal(trace.hasJson, true)
  assert.equal(trace.hasSkipGitCheck, true)
  assert.equal(trace.profile, 'news-flash')
  assert.equal(trace.promptHasFixture, true)

  const output = JSON.parse(readFileSync(outPath, 'utf8'))
  assert.equal(output.flash.headline, 'Codex fixture briefing')
  assert.equal(output.flash.items[0].title, 'Codex runner item')
})

test('scripts pass syntax checks', () => {
  execFileSync('node', ['--check', join(root, 'collect-news-once.mjs')])
  execFileSync('node', ['--check', join(root, 'summarize-news-flash-with-claude.mjs')])
  execFileSync('node', ['--check', join(root, 'render-news-flash-txt.mjs')])
  const notifySource = readFileSync(join(root, 'notify-news-flash-macos.sh'), 'utf8')
  assert.match(notifySource, /-execute "\$open_command"/)
  assert.match(notifySource, /\/usr\/bin\/open/)
  assert.match(notifySource, /provider_slug="\$\(basename "\$ROOT"\)"/)
  assert.match(
    notifySource,
    /notification_group="public-apis-news-flash-\$provider_slug"/,
  )
  assert.match(notifySource, /-title "\$provider_name 快讯"/)
  assert.match(notifySource, /-group "\$notification_group"/)
  assert.doesNotMatch(notifySource, /-open "\$open_uri"/)
  assert.doesNotMatch(notifySource, /-group "public-apis-news-flash"/)
  const shellFiles = [
    'agent-env.sh',
    'claude-env.sh',
    'notify-news-flash-macos.sh',
    'run-news-flash-cycle.sh',
    'run-news-flash-cycle-notify.sh',
  ]
  for (const file of shellFiles) {
    execFileSync('bash', ['-n', join(root, file)])
  }
})
