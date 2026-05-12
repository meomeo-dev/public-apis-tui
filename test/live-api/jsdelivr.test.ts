import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('jsDelivr live metadata verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<JsdelivrMetadataLiveResult>(['apis', 'run', 'jsdelivr.metadata', '--format', 'json', '--', '--package', 'jquery', '--version-limit', '2'])
  assert.equal(json.kind, 'jsdelivr.metadata')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.package.name, 'jquery')
  assert.ok(json.package.versionCount >= 2)
  assert.equal(json.package.versions.length, 2)

  const text = await runCli(['apis', 'run', 'jsdelivr.metadata', '--format', 'text', '--', '--package', 'jquery', '--version-limit', '2'])
  assert.match(text.stdout, /jsDelivr npm Package Metadata/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<JsdelivrMetadataLiveResult>(['apis', 'run', 'jsdelivr.metadata', '--online', '--persist', '--format', 'json', '--', '--package', 'jquery', '--version-limit', '2'], env)
    const offline = await runJson<JsdelivrMetadataLiveResult>(['apis', 'run', 'jsdelivr.metadata', '--offline', '--format', 'json', '--', '--package', 'jquery', '--version-limit', '2'], env)
    assert.equal(online.storage.persisted, true)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.package, online.package)
  })
})

test('jsDelivr live stats verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<JsdelivrStatsLiveResult>(['apis', 'run', 'jsdelivr.stats', '--format', 'json', '--', '--package', 'jquery', '--period', 'month', '--date-limit', '2'])
  assert.equal(json.kind, 'jsdelivr.stats')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.period, 'month')
  assert.ok(json.stats.hits.total > 0)
  assert.equal(json.stats.hits.dates.length, 2)

  const text = await runCli(['apis', 'run', 'jsdelivr.stats', '--format', 'text', '--', '--package', 'jquery', '--period', 'month', '--date-limit', '2'])
  assert.match(text.stdout, /jsDelivr npm Package Stats/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<JsdelivrStatsLiveResult>(['apis', 'run', 'jsdelivr.stats', '--online', '--persist', '--format', 'json', '--', '--package', 'jquery', '--period', 'month', '--date-limit', '2'], env)
    const offline = await runJson<JsdelivrStatsLiveResult>(['apis', 'run', 'jsdelivr.stats', '--offline', '--format', 'json', '--', '--package', 'jquery', '--period', 'month', '--date-limit', '2'], env)
    assert.equal(online.storage.persisted, true)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.stats, online.stats)
  })
})

type JsdelivrMetadataLiveResult = {
  kind: 'jsdelivr.metadata'
  api: {
    authentication: 'none'
    usesBrowserClickstream: false
  }
  package: {
    name: string
    versionCount: number
    versions: unknown[]
  }
  storage: {
    mode: 'online' | 'offline'
    persisted: boolean
  }
}

type JsdelivrStatsLiveResult = {
  kind: 'jsdelivr.stats'
  api: {
    authentication: 'none'
    usesBrowserClickstream: false
  }
  query: {
    period: string
  }
  stats: {
    hits: {
      total: number
      dates: unknown[]
    }
  }
  storage: {
    mode: 'online' | 'offline'
    persisted: boolean
  }
}

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
