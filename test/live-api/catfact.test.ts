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

type CatFactResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  fact: { fact: string }
  storage: StorageMeta
}

type CatFactsResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  facts: unknown[]
  storage: StorageMeta
}

type CatBreedsResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  breeds: unknown[]
  storage: StorageMeta
}

test('CatFact Ninja live e2e covers every operation', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async t => {
  await t.test('catfact.fact json, text, and offline replay', async () => {
    const json = await runJson<CatFactResult>(['apis', 'run', 'catfact.fact', '--format', 'json', '--', '--max-length', '140'])
    assert.equal(json.kind, 'catfact.fact')
    assert.equal(json.api.provider, 'catfact-ninja')
    assert.equal(json.api.authentication, 'none')
    assert.equal(json.api.usesBrowserClickstream, false)
    assert.equal(typeof json.fact.fact, 'string')
    assert.ok(json.fact.fact.length > 0)

    const text = await runCli(['apis', 'run', 'catfact.fact', '--format', 'text', '--', '--max-length', '140'])
    assert.match(text.stdout, /CatFact Ninja/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /Fact/)

    await withPublicApisHome(async publicApisHome => {
      const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
      const online = await runJson<CatFactResult>(['apis', 'run', 'catfact.fact', '--online', '--persist', '--format', 'json', '--', '--max-length', '140'], env)
      assert.equal(online.storage.persisted, true)
      const offline = await runJson<CatFactResult>(['apis', 'run', 'catfact.fact', '--offline', '--format', 'json', '--', '--max-length', '140'], env)
      assert.equal(offline.storage.mode, 'offline')
      assert.deepEqual(offline.fact, online.fact)
    })
  })

  await t.test('catfact.facts json, text, and offline replay', async () => {
    const json = await runJson<CatFactsResult>(['apis', 'run', 'catfact.facts', '--format', 'json', '--', '--limit', '2'])
    assert.equal(json.kind, 'catfact.facts')
    assert.equal(json.api.provider, 'catfact-ninja')
    assert.equal(json.api.authentication, 'none')
    assert.equal(json.api.usesBrowserClickstream, false)
    assert.ok(Array.isArray(json.facts))
    assert.ok(json.facts.length > 0)

    const text = await runCli(['apis', 'run', 'catfact.facts', '--format', 'text', '--', '--limit', '2'])
    assert.match(text.stdout, /CatFact Ninja Facts/)
    assert.match(text.stdout, /open REST API only · no auth/)

    await withPublicApisHome(async publicApisHome => {
      const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
      const online = await runJson<CatFactsResult>(['apis', 'run', 'catfact.facts', '--online', '--persist', '--format', 'json', '--', '--limit', '2'], env)
      assert.equal(online.storage.persisted, true)
      const offline = await runJson<CatFactsResult>(['apis', 'run', 'catfact.facts', '--offline', '--format', 'json', '--', '--limit', '2'], env)
      assert.equal(offline.storage.mode, 'offline')
      assert.deepEqual(offline.facts, online.facts)
    })
  })

  await t.test('catfact.breeds json, text, and offline replay', async () => {
    const json = await runJson<CatBreedsResult>(['apis', 'run', 'catfact.breeds', '--format', 'json', '--', '--limit', '2'])
    assert.equal(json.kind, 'catfact.breeds')
    assert.equal(json.api.provider, 'catfact-ninja')
    assert.equal(json.api.authentication, 'none')
    assert.equal(json.api.usesBrowserClickstream, false)
    assert.ok(Array.isArray(json.breeds))
    assert.ok(json.breeds.length > 0)

    const text = await runCli(['apis', 'run', 'catfact.breeds', '--format', 'text', '--', '--limit', '2'])
    assert.match(text.stdout, /CatFact Ninja Breeds/)
    assert.match(text.stdout, /open REST API only · no auth/)

    await withPublicApisHome(async publicApisHome => {
      const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
      const online = await runJson<CatBreedsResult>(['apis', 'run', 'catfact.breeds', '--online', '--persist', '--format', 'json', '--', '--limit', '2'], env)
      assert.equal(online.storage.persisted, true)
      const offline = await runJson<CatBreedsResult>(['apis', 'run', 'catfact.breeds', '--offline', '--format', 'json', '--', '--limit', '2'], env)
      assert.equal(offline.storage.mode, 'offline')
      assert.deepEqual(offline.breeds, online.breeds)
    })
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
