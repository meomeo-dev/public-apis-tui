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
  kind: 'coloradodata.datasets'
  api: PublicApiMeta
  datasets: Array<{ id: string; name: string }>
  storage: StorageMeta
}

type EntitiesResult = Record<string, unknown> & {
  kind: 'coloradodata.businessEntities'
  api: PublicApiMeta
  entities: Array<{ entityId: string; entityStatus?: string | undefined }>
  storage: StorageMeta
}

test('Colorado Information Marketplace live e2e covers datasets, business entities, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const datasets = await runJson<DatasetsResult>(['apis', 'run', 'coloradodata.datasets', '--online', '--persist', '--format', 'json', '--', '--query', 'business', '--limit', '100'], env)
    assert.equal(datasets.kind, 'coloradodata.datasets')
    assert.equal(datasets.api.provider, 'coloradodata')
    assert.equal(datasets.api.authentication, 'none')
    assert.equal(datasets.api.usesBrowserClickstream, false)
    assert.ok(datasets.datasets.some(dataset => dataset.id === '4ykn-tg5h'))
    assert.equal(datasets.storage.persisted, true)

    const datasetsOffline = await runJson<DatasetsResult>(['apis', 'run', 'coloradodata.datasets', '--offline', '--format', 'json', '--', '--query', 'business', '--limit', '100'], env)
    assert.equal(datasetsOffline.storage.mode, 'offline')
    assert.deepEqual(datasetsOffline.datasets, datasets.datasets)

    const entities = await runJson<EntitiesResult>(['apis', 'run', 'coloradodata.businessEntities', '--online', '--persist', '--format', 'json', '--', '--status', 'Good Standing', '--limit', '1000'], env)
    assert.equal(entities.kind, 'coloradodata.businessEntities')
    assert.equal(entities.api.authentication, 'none')
    assert.equal(entities.api.usesBrowserClickstream, false)
    assert.ok(entities.entities.length > 0)
    assert.equal(entities.storage.persisted, true)

    const entitiesOffline = await runJson<EntitiesResult>(['apis', 'run', 'coloradodata.businessEntities', '--offline', '--format', 'json', '--', '--status', 'Good Standing', '--limit', '1000'], env)
    assert.equal(entitiesOffline.storage.mode, 'offline')
    assert.deepEqual(entitiesOffline.entities, entities.entities)

    const text = await runCli(['apis', 'run', 'coloradodata.businessEntities', '--offline', '--format', 'text', '--', '--status', 'Good Standing', '--limit', '1000'], env)
    assert.match(text.stdout, /Colorado Business Entities/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-coloradodata-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
