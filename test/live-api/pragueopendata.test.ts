import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'
const defaultDatasetIri = 'https://api.lkod.cz/lod/03bdf7d6-a255-4e22-83f9-4b17b6822602/catalog/1ee7ff0b-3aec-42f6-bd22-b04b3115f0fd'

type PublicApiMeta = { provider: string; authentication: string; usesBrowserClickstream: boolean }
type StorageMeta = { mode?: string | undefined; persisted?: boolean | undefined }

type DatasetsResult = Record<string, unknown> & {
  kind: 'pragueopendata.datasets'
  api: PublicApiMeta
  datasets: Array<{ iri: string; title?: string | undefined }>
  storage: StorageMeta
}

type DatasetResult = Record<string, unknown> & {
  kind: 'pragueopendata.dataset'
  api: PublicApiMeta
  dataset: { iri: string; distributions: Array<Record<string, unknown>> }
  storage: StorageMeta
}

test('Prague Open Data live e2e covers datasets, dataset detail, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const datasets = await runJson<DatasetsResult>(['apis', 'run', 'pragueopendata.datasets', '--online', '--persist', '--format', 'json', '--', '--query', 'doprava', '--limit', '20'], env)
    assert.equal(datasets.kind, 'pragueopendata.datasets')
    assert.equal(datasets.api.provider, 'pragueopendata')
    assert.equal(datasets.api.authentication, 'none')
    assert.equal(datasets.api.usesBrowserClickstream, false)
    assert.ok(datasets.datasets.length > 0)
    assert.equal(datasets.storage.persisted, true)

    const datasetsOffline = await runJson<DatasetsResult>(['apis', 'run', 'pragueopendata.datasets', '--offline', '--format', 'json', '--', '--query', 'doprava', '--limit', '20'], env)
    assert.equal(datasetsOffline.storage.mode, 'offline')
    assert.deepEqual(datasetsOffline.datasets, datasets.datasets)

    const dataset = await runJson<DatasetResult>(['apis', 'run', 'pragueopendata.dataset', '--online', '--persist', '--format', 'json', '--', '--dataset-iri', defaultDatasetIri], env)
    assert.equal(dataset.kind, 'pragueopendata.dataset')
    assert.equal(dataset.api.authentication, 'none')
    assert.equal(dataset.api.usesBrowserClickstream, false)
    assert.equal(dataset.dataset.iri, defaultDatasetIri)
    assert.ok(dataset.dataset.distributions.length > 0)
    assert.equal(dataset.storage.persisted, true)

    const datasetOffline = await runJson<DatasetResult>(['apis', 'run', 'pragueopendata.dataset', '--offline', '--format', 'json', '--', '--dataset-iri', defaultDatasetIri], env)
    assert.equal(datasetOffline.storage.mode, 'offline')
    assert.deepEqual(datasetOffline.dataset, dataset.dataset)

    const text = await runCli(['apis', 'run', 'pragueopendata.dataset', '--offline', '--format', 'text', '--', '--dataset-iri', defaultDatasetIri], env)
    assert.match(text.stdout, /Prague Open Data Dataset Detail/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 64 * 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-pragueopendata-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
