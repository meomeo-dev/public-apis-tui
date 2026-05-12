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

type SourcesResult = Record<string, unknown> & { kind: 'econdb.sources'; api: PublicApiMeta; sources: unknown[]; storage: StorageMeta }
type DatasetsResult = Record<string, unknown> & { kind: 'econdb.datasets'; api: PublicApiMeta; datasets: unknown[]; storage: StorageMeta }

test('Econdb live e2e covers sources, datasets, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const sources = await runJson<SourcesResult>(['apis', 'run', 'econdb.sources', '--online', '--persist', '--format', 'json', '--', '--page', '1', '--limit', '100'], env)
    assert.equal(sources.kind, 'econdb.sources')
    assert.equal(sources.api.provider, 'econdb')
    assert.equal(sources.api.authentication, 'none')
    assert.equal(sources.api.usesBrowserClickstream, false)
    assert.ok(sources.sources.length > 0)
    assert.equal(sources.storage.persisted, true)
    const sourcesOffline = await runJson<SourcesResult>(['apis', 'run', 'econdb.sources', '--offline', '--format', 'json', '--', '--page', '1', '--limit', '100'], env)
    assert.deepEqual(sourcesOffline.sources, sources.sources)

    const datasets = await runJson<DatasetsResult>(['apis', 'run', 'econdb.datasets', '--online', '--persist', '--format', 'json', '--', '--page', '1', '--limit', '100'], env)
    assert.equal(datasets.kind, 'econdb.datasets')
    assert.ok(datasets.datasets.length > 0)
    const datasetsOffline = await runJson<DatasetsResult>(['apis', 'run', 'econdb.datasets', '--offline', '--format', 'json', '--', '--page', '1', '--limit', '100'], env)
    assert.deepEqual(datasetsOffline.datasets, datasets.datasets)

    const text = await runCli(['apis', 'run', 'econdb.datasets', '--offline', '--format', 'text', '--', '--page', '1', '--limit', '100'], env)
    assert.match(text.stdout, /Econdb Datasets/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
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
