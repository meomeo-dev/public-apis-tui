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
  rateLimit: string
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type MetMuseumSearchResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { query: string; limit: number; detailLimit: number }
  total: number
  count: number
  objectIds: number[]
  objects: Array<{ objectId: number; title: string; objectUrl: string }>
  storage: StorageMeta
}

type MetMuseumObjectResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  object: { objectId: number; title: string; objectUrl: string }
}

type MetMuseumDepartmentsResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  departments: Array<{ departmentId: number; displayName: string }>
}

test('Met Museum live e2e covers search/object/departments json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const search = await runJson<MetMuseumSearchResult>(['apis', 'run', 'metmuseum.search', '--format', 'json', '--', '--query', 'cat', '--has-images', 'true', '--limit', '3', '--detail-limit', '1'])
  assert.equal(search.kind, 'metmuseum.search')
  assert.equal(search.api.provider, 'metmuseum')
  assert.equal(search.api.authentication, 'none')
  assert.equal(search.api.usesBrowserClickstream, false)
  assert.equal(search.api.rateLimit, '80 requests/second')
  assert.equal(search.query.query, 'cat')
  assert.equal(search.query.limit, 3)
  assert.equal(search.query.detailLimit, 1)
  assert.ok(search.total > 0)
  assert.equal(search.objectIds.length, 3)
  assert.equal(search.objects.length, 1)

  const text = await runCli(['apis', 'run', 'metmuseum.search', '--format', 'text', '--', '--query', 'cat', '--has-images', 'true', '--limit', '3', '--detail-limit', '1'])
  assert.match(text.stdout, /Met Museum Search/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /80 requests\/second/)

  const object = await runJson<MetMuseumObjectResult>(['apis', 'run', 'metmuseum.object', '--format', 'json', '--', '--object-id', String(search.objectIds[0])])
  assert.equal(object.kind, 'metmuseum.object')
  assert.equal(object.api.authentication, 'none')
  assert.equal(object.object.objectId, search.objectIds[0])
  assert.ok(object.object.objectUrl.startsWith('https://www.metmuseum.org/art/collection/search/'))

  const departments = await runJson<MetMuseumDepartmentsResult>(['apis', 'run', 'metmuseum.departments', '--format', 'json', '--', '--limit', '30'])
  assert.equal(departments.kind, 'metmuseum.departments')
  assert.ok(departments.departments.some(department => department.displayName === 'European Paintings'))

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<MetMuseumSearchResult>(['apis', 'run', 'metmuseum.search', '--online', '--persist', '--format', 'json', '--', '--query', 'cat', '--has-images', 'true', '--limit', '3', '--detail-limit', '1'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<MetMuseumSearchResult>(['apis', 'run', 'metmuseum.search', '--offline', '--format', 'json', '--', '--query', 'cat', '--has-images', 'true', '--limit', '3', '--detail-limit', '1'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.objectIds, online.objectIds)
    assert.deepEqual(offline.objects, online.objects)
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
