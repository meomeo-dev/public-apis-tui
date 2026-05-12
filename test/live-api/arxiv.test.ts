import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type PublicApiMeta = {
  provider: string
  authentication: string
  usesBrowserClickstream: boolean
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type ArxivSearchResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { searchQuery: string; maxResults: number }
  count: number
  papers: Array<{ arxivId: string; title: string; absUrl?: string }>
  storage: StorageMeta
}

type ArxivPaperResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  found: boolean
  paper?: { arxivId: string; title: string } | undefined
  storage: StorageMeta
}

test('arXiv live e2e covers search json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const args = [
    'apis',
    'run',
    'arxiv.search',
    '--format',
    'json',
    '--',
    '--query',
    'all:electron',
    '--max-results',
    '2',
    '--summary-length',
    '120',
  ]
  const json = await runJson<ArxivSearchResult>(args)
  assert.equal(json.kind, 'arxiv.search')
  assert.equal(json.api.provider, 'arxiv')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.searchQuery, 'all:electron')
  assert.equal(json.query.maxResults, 2)
  assert.ok(json.count > 0)
  assert.ok(json.papers[0]?.absUrl?.startsWith('https://arxiv.org/abs/'))

  await sleep(3_200)
  const text = await runCli([
    'apis',
    'run',
    'arxiv.search',
    '--format',
    'text',
    '--',
    '--query',
    'all:electron',
    '--max-results',
    '2',
    '--summary-length',
    '120',
  ])
  assert.match(text.stdout, /arXiv Search/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /HTTPS Atom XML projected to JSON/)

  await sleep(3_200)
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<ArxivSearchResult>([
      'apis',
      'run',
      'arxiv.search',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--query',
      'all:electron',
      '--max-results',
      '2',
      '--summary-length',
      '120',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<ArxivSearchResult>([
      'apis',
      'run',
      'arxiv.search',
      '--offline',
      '--format',
      'json',
      '--',
      '--query',
      'all:electron',
      '--max-results',
      '2',
      '--summary-length',
      '120',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.papers, online.papers)
  })
})

test('arXiv live e2e covers paper json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<ArxivPaperResult>([
    'apis',
    'run',
    'arxiv.paper',
    '--format',
    'json',
    '--',
    '--id',
    '2101.00001',
    '--summary-length',
    '120',
  ])
  assert.equal(json.kind, 'arxiv.paper')
  assert.equal(json.api.provider, 'arxiv')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.found, true)
  assert.match(json.paper?.arxivId ?? '', /^2101\.00001/u)

  await sleep(3_200)
  const text = await runCli([
    'apis',
    'run',
    'arxiv.paper',
    '--format',
    'text',
    '--',
    '--id',
    '2101.00001',
    '--summary-length',
    '120',
  ])
  assert.match(text.stdout, /arXiv Paper/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /2101\.00001/)

  await sleep(3_200)
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<ArxivPaperResult>([
      'apis',
      'run',
      'arxiv.paper',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--id',
      '2101.00001',
      '--summary-length',
      '120',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<ArxivPaperResult>([
      'apis',
      'run',
      'arxiv.paper',
      '--offline',
      '--format',
      'json',
      '--',
      '--id',
      '2101.00001',
      '--summary-length',
      '120',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.paper, online.paper)
  })
})

async function runJson<T extends Record<string, unknown>>(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 1024 * 1024,
  })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(
  run: (publicApisHome: string) => Promise<void>,
): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
