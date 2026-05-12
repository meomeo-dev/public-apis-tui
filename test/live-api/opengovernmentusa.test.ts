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

type SearchResult = Record<string, unknown> & {
  kind: 'opengovernmentusa.search'
  api: PublicApiMeta
  datasets: Array<{ identifier: string; title?: string | undefined }>
  storage: StorageMeta
}

type OrganizationsResult = Record<string, unknown> & {
  kind: 'opengovernmentusa.organizations'
  api: PublicApiMeta
  organizations: Array<{ id: string; slug?: string | undefined }>
  storage: StorageMeta
}

type KeywordsResult = Record<string, unknown> & {
  kind: 'opengovernmentusa.keywords'
  api: PublicApiMeta
  keywords: Array<{ keyword: string; count: number }>
  storage: StorageMeta
}

test('Open Government USA live e2e covers search, organizations, keywords, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const search = await runJson<SearchResult>(['apis', 'run', 'opengovernmentusa.search', '--online', '--persist', '--format', 'json', '--', '--query', 'business', '--limit', '1000'], env)
    assert.equal(search.kind, 'opengovernmentusa.search')
    assert.equal(search.api.provider, 'opengovernmentusa')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.ok(search.datasets.length > 0)
    assert.equal(search.storage.persisted, true)

    const searchOffline = await runJson<SearchResult>(['apis', 'run', 'opengovernmentusa.search', '--offline', '--format', 'json', '--', '--query', 'business', '--limit', '1000'], env)
    assert.equal(searchOffline.storage.mode, 'offline')
    assert.deepEqual(searchOffline.datasets, search.datasets)

    const organizations = await runJson<OrganizationsResult>(['apis', 'run', 'opengovernmentusa.organizations', '--online', '--persist', '--format', 'json', '--', '--limit', '120'], env)
    assert.equal(organizations.kind, 'opengovernmentusa.organizations')
    assert.equal(organizations.api.authentication, 'none')
    assert.equal(organizations.api.usesBrowserClickstream, false)
    assert.ok(organizations.organizations.length > 0)
    assert.equal(organizations.storage.persisted, true)

    const organizationsOffline = await runJson<OrganizationsResult>(['apis', 'run', 'opengovernmentusa.organizations', '--offline', '--format', 'json', '--', '--limit', '120'], env)
    assert.equal(organizationsOffline.storage.mode, 'offline')
    assert.deepEqual(organizationsOffline.organizations, organizations.organizations)

    const keywords = await runJson<KeywordsResult>(['apis', 'run', 'opengovernmentusa.keywords', '--online', '--persist', '--format', 'json', '--', '--size', '1000', '--min-count', '1'], env)
    assert.equal(keywords.kind, 'opengovernmentusa.keywords')
    assert.equal(keywords.api.authentication, 'none')
    assert.equal(keywords.api.usesBrowserClickstream, false)
    assert.ok(keywords.keywords.length > 0)
    assert.equal(keywords.storage.persisted, true)

    const keywordsOffline = await runJson<KeywordsResult>(['apis', 'run', 'opengovernmentusa.keywords', '--offline', '--format', 'json', '--', '--size', '1000', '--min-count', '1'], env)
    assert.equal(keywordsOffline.storage.mode, 'offline')
    assert.deepEqual(keywordsOffline.keywords, keywords.keywords)

    const text = await runCli(['apis', 'run', 'opengovernmentusa.keywords', '--offline', '--format', 'text', '--', '--size', '1000', '--min-count', '1'], env)
    assert.match(text.stdout, /Open Government USA Keywords/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-opengovernmentusa-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
