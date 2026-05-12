import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type PublicApiMeta = { provider: string; authentication: string; usesBrowserClickstream: boolean }
type StorageMeta = { mode?: string | undefined; persisted?: boolean | undefined }

type DatasetsResult = Record<string, unknown> & {
  kind: 'dcopendata.datasets'
  api: PublicApiMeta
  datasets: Array<{ id: string; title: string }>
  storage: StorageMeta
}

type LicensesResult = Record<string, unknown> & {
  kind: 'dcopendata.businessLicenses'
  api: PublicApiMeta
  licenses: Array<{ objectId: number; licenseStatus?: string | undefined }>
  storage: StorageMeta
}

test('DC Open Data live e2e covers datasets, business licenses, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const datasets = await runJson<DatasetsResult>(['apis', 'run', 'dcopendata.datasets', '--online', '--persist', '--format', 'json', '--', '--query', 'business', '--limit', '100'], env)
    assert.equal(datasets.kind, 'dcopendata.datasets')
    assert.equal(datasets.api.provider, 'dcopendata')
    assert.equal(datasets.api.authentication, 'none')
    assert.equal(datasets.api.usesBrowserClickstream, false)
    assert.ok(datasets.datasets.some(dataset => dataset.title.toLowerCase().includes('business')))
    assert.equal(datasets.storage.persisted, true)

    const datasetsOffline = await runJson<DatasetsResult>(['apis', 'run', 'dcopendata.datasets', '--offline', '--format', 'json', '--', '--query', 'business', '--limit', '100'], env)
    assert.equal(datasetsOffline.storage.mode, 'offline')
    assert.deepEqual(datasetsOffline.datasets, datasets.datasets)

    const licenses = await runJson<LicensesResult>(['apis', 'run', 'dcopendata.businessLicenses', '--online', '--persist', '--format', 'json', '--', '--status', 'Active', '--limit', '1000'], env)
    assert.equal(licenses.kind, 'dcopendata.businessLicenses')
    assert.equal(licenses.api.authentication, 'none')
    assert.equal(licenses.api.usesBrowserClickstream, false)
    assert.ok(licenses.licenses.length > 0)
    assert.equal(licenses.storage.persisted, true)

    const licensesOffline = await runJson<LicensesResult>(['apis', 'run', 'dcopendata.businessLicenses', '--offline', '--format', 'json', '--', '--status', 'Active', '--limit', '1000'], env)
    assert.equal(licensesOffline.storage.mode, 'offline')
    assert.deepEqual(licensesOffline.licenses, licenses.licenses)

    const text = await runCli(['apis', 'run', 'dcopendata.businessLicenses', '--offline', '--format', 'text', '--', '--status', 'Active', '--limit', '1000'], env)
    assert.match(text.stdout, /DC Basic Business Licenses/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-dcopendata-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
