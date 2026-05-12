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
  documentedMaximumRows: number
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type CrossrefWorksResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { query: string; rows: number; offset: number; order: string }
  count: number
  works: Array<{ doi: string; title: string; url?: string | undefined }>
  storage: StorageMeta
}

type CrossrefWorkResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { doi: string }
  work: { doi: string; title: string; url?: string | undefined }
  storage: StorageMeta
}

test('Crossref live e2e covers works json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<CrossrefWorksResult>(['apis', 'run', 'crossref.works', '--format', 'json', '--', '--query', 'public api metadata', '--rows', '2'])
  assert.equal(json.kind, 'crossref.works')
  assert.equal(json.api.provider, 'crossref')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.documentedMaximumRows, 1000)
  assert.equal(json.query.rows, 2)
  assert.ok(json.works.length > 0)
  assert.ok(json.works.every(work => work.doi.length > 0 && work.title.length > 0))

  const text = await runCli(['apis', 'run', 'crossref.works', '--format', 'text', '--', '--query', 'public api metadata', '--rows', '2'])
  assert.match(text.stdout, /Crossref Works/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /open first.*crossref\.work.*--doi/u)
  assert.match(text.stdout, /more.*crossref\.works.*--query "public api metadata" --rows 2 --offset 2/u)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<CrossrefWorksResult>(['apis', 'run', 'crossref.works', '--online', '--persist', '--format', 'json', '--', '--query', 'public api metadata', '--rows', '2'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<CrossrefWorksResult>(['apis', 'run', 'crossref.works', '--offline', '--format', 'json', '--', '--query', 'public api metadata', '--rows', '2'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.works, online.works)
  })
})

test('Crossref live e2e covers work json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const doi = '10.1037/0003-066X.59.1.29'
  const json = await runJson<CrossrefWorkResult>(['apis', 'run', 'crossref.work', '--format', 'json', '--', '--doi', doi])
  assert.equal(json.kind, 'crossref.work')
  assert.equal(json.api.provider, 'crossref')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.doi, doi)
  assert.equal(json.work.doi.toLowerCase(), doi.toLowerCase())
  assert.ok(json.work.title.length > 0)

  const text = await runCli(['apis', 'run', 'crossref.work', '--format', 'text', '--', '--doi', doi])
  assert.match(text.stdout, /Crossref Work/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /related search.*crossref\.works.*--query/u)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<CrossrefWorkResult>(['apis', 'run', 'crossref.work', '--online', '--persist', '--format', 'json', '--', '--doi', doi], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<CrossrefWorkResult>(['apis', 'run', 'crossref.work', '--offline', '--format', 'json', '--', '--doi', doi], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.work, online.work)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 4 * 1024 * 1024,
  })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
