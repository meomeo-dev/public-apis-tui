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

type FakerPersonsLiveResult = Record<string, unknown> & {
  kind: 'fakerapi.persons'
  api: PublicApiMeta
  query: { quantity: number; locale?: string | undefined; seed?: number | undefined }
  pagination: { returned: number; total: number; limit: number }
  persons: Array<Record<string, unknown>>
  storage: StorageMeta
}

type FakerCompaniesLiveResult = Record<string, unknown> & {
  kind: 'fakerapi.companies'
  api: PublicApiMeta
  query: { quantity: number; locale?: string | undefined; seed?: number | undefined }
  pagination: { returned: number; total: number; limit: number }
  companies: Array<Record<string, unknown>>
  storage: StorageMeta
}

test('FakerAPI live persons verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<FakerPersonsLiveResult>(['apis', 'run', 'fakerapi.persons', '--online', '--persist', '--format', 'json', '--', '--quantity', '2', '--locale', 'en_US', '--seed', '12345'], env)
    assert.equal(online.kind, 'fakerapi.persons')
    assert.equal(online.api.provider, 'fakerapi')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.quantity, 2)
    assert.equal(online.query.locale, 'en_US')
    assert.equal(online.query.seed, 12345)
    assert.equal(online.pagination.returned, 2)
    assert.equal(online.persons.length, 2)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<FakerPersonsLiveResult>(['apis', 'run', 'fakerapi.persons', '--offline', '--format', 'json', '--', '--quantity', '2', '--locale', 'en_US', '--seed', '12345'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.persons, online.persons)

    const text = await runCli(['apis', 'run', 'fakerapi.persons', '--offline', '--format', 'text', '--', '--quantity', '2', '--locale', 'en_US', '--seed', '12345'], env)
    assert.match(text.stdout, /FakerAPI Persons/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })
})

test('FakerAPI live companies verifies JSON and offline text replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<FakerCompaniesLiveResult>(['apis', 'run', 'fakerapi.companies', '--online', '--persist', '--format', 'json', '--', '--quantity', '2', '--locale', 'en_US', '--seed', '12345'], env)
    assert.equal(online.kind, 'fakerapi.companies')
    assert.equal(online.api.provider, 'fakerapi')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.pagination.returned, 2)
    assert.equal(online.companies.length, 2)
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<FakerCompaniesLiveResult>(['apis', 'run', 'fakerapi.companies', '--offline', '--format', 'json', '--', '--quantity', '2', '--locale', 'en_US', '--seed', '12345'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.companies, online.companies)

    const text = await runCli(['apis', 'run', 'fakerapi.companies', '--offline', '--format', 'text', '--', '--quantity', '2', '--locale', 'en_US', '--seed', '12345'], env)
    assert.match(text.stdout, /FakerAPI Companies/)
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
