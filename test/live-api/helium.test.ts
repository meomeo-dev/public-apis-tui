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
  documentedPageSize: number
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type HeliumHotspotsResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { subnetwork: string; limit: number; active?: boolean | undefined }
  pagination: { pageSize: number; totalItems: number; totalPages: number; cursor: string | null }
  count: number
  totalFetched: number
  hotspots: Array<{ keyToAssetKey: string; entityKey: string; isActive: boolean; lat?: number | undefined; long?: number | undefined }>
  storage: StorageMeta
}

test('Helium live e2e covers hotspots json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<HeliumHotspotsResult>(['apis', 'run', 'helium.hotspots', '--format', 'json', '--', '--subnetwork', 'iot', '--limit', '2'])
  assert.equal(json.kind, 'helium.hotspots')
  assert.equal(json.api.provider, 'helium')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.documentedPageSize, 10000)
  assert.equal(json.query.subnetwork, 'iot')
  assert.equal(json.query.limit, 2)
  assert.equal(json.pagination.pageSize, 10000)
  assert.ok(json.totalFetched > 0)
  assert.equal(json.hotspots.length, 2)
  assert.ok(json.hotspots.every(hotspot => typeof hotspot.entityKey === 'string' && hotspot.entityKey.length > 0))

  const text = await runCli(['apis', 'run', 'helium.hotspots', '--format', 'text', '--', '--subnetwork', 'iot', '--limit', '2'])
  assert.match(text.stdout, /Helium Hotspots/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /pageSize 10000/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<HeliumHotspotsResult>(['apis', 'run', 'helium.hotspots', '--online', '--persist', '--format', 'json', '--', '--subnetwork', 'iot', '--limit', '2'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<HeliumHotspotsResult>(['apis', 'run', 'helium.hotspots', '--offline', '--format', 'json', '--', '--subnetwork', 'iot', '--limit', '2'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.hotspots, online.hotspots)
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
