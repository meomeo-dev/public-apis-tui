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

type ProductResult = Record<string, unknown> & {
  kind: 'openfoodfacts.product'
  api: PublicApiMeta
  query: { barcode: string }
  found: boolean
  product?: Record<string, unknown> | undefined
  storage: StorageMeta
}

type SearchResult = Record<string, unknown> & {
  kind: 'openfoodfacts.search'
  api: PublicApiMeta
  query: { query: string; pageSize: number; page: number }
  pagination: { returned: number; pageSize: number; page: number }
  products: Array<Record<string, unknown>>
  storage: StorageMeta
}

test('Open Food Facts live product verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<ProductResult>(['apis', 'run', 'openfoodfacts.product', '--online', '--persist', '--format', 'json', '--', '--barcode', '737628064502'], env)
    assert.equal(online.kind, 'openfoodfacts.product')
    assert.equal(online.api.provider, 'openfoodfacts')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.barcode, '737628064502')
    assert.equal(online.found, true)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<ProductResult>(['apis', 'run', 'openfoodfacts.product', '--offline', '--format', 'json', '--', '--barcode', '737628064502'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.product, online.product)

    const text = await runCli(['apis', 'run', 'openfoodfacts.product', '--offline', '--format', 'text', '--', '--barcode', '737628064502'], env)
    assert.match(text.stdout, /Open Food Facts Product/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })
})

test('Open Food Facts live search is skipped because upstream intermittently returns HTML 503 to direct API clients', { skip: 'e2e-skip: direct no-auth search endpoint intermittently returns HTML 503; documented in plan/catalog' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<SearchResult>(['apis', 'run', 'openfoodfacts.search', '--online', '--persist', '--format', 'json', '--', '--query', 'nutella', '--page-size', '2'], env)
    assert.equal(online.kind, 'openfoodfacts.search')
    assert.equal(online.api.provider, 'openfoodfacts')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.query, 'nutella')
    assert.equal(online.pagination.pageSize, 2)
    assert.ok(online.products.length > 0)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<SearchResult>(['apis', 'run', 'openfoodfacts.search', '--offline', '--format', 'json', '--', '--query', 'nutella', '--page-size', '2'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.products, online.products)

    const text = await runCli(['apis', 'run', 'openfoodfacts.search', '--offline', '--format', 'text', '--', '--query', 'nutella', '--page-size', '2'], env)
    assert.match(text.stdout, /Open Food Facts Search/)
    assert.match(text.stdout, /open REST API only · no auth/)
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
    maxBuffer: 1024 * 1024,
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
