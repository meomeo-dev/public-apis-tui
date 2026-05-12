import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type ApisGuruResult = Record<string, unknown> & {
  kind: string
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: Record<string, unknown>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('APIs.guru live e2e covers providers json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<ApisGuruResult & { providers: string[] }>(['apis', 'run', 'apisguru.providers', '--format', 'json', '--', '--query', 'google', '--limit', '5'])
  assert.equal(json.kind, 'apisguru.providers')
  assert.equal(json.api.provider, 'apisguru')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.query, 'google')
  assert.ok(json.providers.length > 0)

  const text = await runCli(['apis', 'run', 'apisguru.providers', '--format', 'text', '--', '--query', 'google', '--limit', '5'])
  assert.match(text.stdout, /APIs\.guru Providers/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<ApisGuruResult & { providers: string[] }>(['apis', 'run', 'apisguru.providers', '--online', '--persist', '--format', 'json', '--', '--query', 'google', '--limit', '5'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<ApisGuruResult & { providers: string[] }>(['apis', 'run', 'apisguru.providers', '--offline', '--format', 'json', '--', '--query', 'google', '--limit', '5'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.providers, online.providers)
  })
})

test('APIs.guru live e2e covers search and metrics operations', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const search = await runJson<ApisGuruResult & { apis: unknown[] }>(['apis', 'run', 'apisguru.search', '--format', 'json', '--', '--query', 'openapi', '--limit', '5'])
  assert.equal(search.kind, 'apisguru.search')
  assert.equal(search.api.authentication, 'none')
  assert.equal(search.api.usesBrowserClickstream, false)
  assert.ok(search.apis.length > 0)

  const searchText = await runCli(['apis', 'run', 'apisguru.search', '--format', 'text', '--', '--query', 'openapi', '--limit', '5'])
  assert.match(searchText.stdout, /APIs\.guru Search/)
  assert.match(searchText.stdout, /open REST API only · no auth/)

  const metrics = await runJson<ApisGuruResult & { metrics: { numAPIs: number; numSpecs: number; numEndpoints: number } }>(['apis', 'run', 'apisguru.metrics', '--format', 'json'])
  assert.equal(metrics.kind, 'apisguru.metrics')
  assert.equal(metrics.api.authentication, 'none')
  assert.equal(metrics.api.usesBrowserClickstream, false)
  assert.ok(metrics.metrics.numAPIs > 0)
  assert.ok(metrics.metrics.numSpecs > 0)
  assert.ok(metrics.metrics.numEndpoints > 0)

  const metricsText = await runCli(['apis', 'run', 'apisguru.metrics', '--format', 'text'])
  assert.match(metricsText.stdout, /APIs\.guru Metrics/)
  assert.match(metricsText.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const onlineSearch = await runJson<ApisGuruResult & { apis: unknown[] }>(['apis', 'run', 'apisguru.search', '--online', '--persist', '--format', 'json', '--', '--query', 'openapi', '--limit', '5'], env)
    assert.equal(onlineSearch.storage.persisted, true)
    const offlineSearch = await runJson<ApisGuruResult & { apis: unknown[] }>(['apis', 'run', 'apisguru.search', '--offline', '--format', 'json', '--', '--query', 'openapi', '--limit', '5'], env)
    assert.equal(offlineSearch.storage.mode, 'offline')
    assert.deepEqual(offlineSearch.apis, onlineSearch.apis)

    const onlineMetrics = await runJson<ApisGuruResult & { metrics: { numAPIs: number; numSpecs: number; numEndpoints: number } }>(['apis', 'run', 'apisguru.metrics', '--online', '--persist', '--format', 'json'], env)
    assert.equal(onlineMetrics.storage.persisted, true)
    const offlineMetrics = await runJson<ApisGuruResult & { metrics: { numAPIs: number; numSpecs: number; numEndpoints: number } }>(['apis', 'run', 'apisguru.metrics', '--offline', '--format', 'json'], env)
    assert.equal(offlineMetrics.storage.mode, 'offline')
    assert.deepEqual(offlineMetrics.metrics, onlineMetrics.metrics)
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
    maxBuffer: 8 * 1024 * 1024,
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
