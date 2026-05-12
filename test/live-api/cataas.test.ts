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

type CataasCatResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  cat: { id: string; url: string }
}

type CataasTagsResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  total: number
  tags: string[]
}

type CataasCatsResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  count: number
  cats: unknown[]
  storage: StorageMeta
}

test('Cataas live e2e covers every operation', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async t => {
  await t.test('cataas.cat json and text', async () => {
    const json = await runJson<CataasCatResult>(['apis', 'run', 'cataas.cat', '--format', 'json'])
    assert.equal(json.kind, 'cataas.cat')
    assert.equal(json.api.provider, 'cataas')
    assert.equal(json.api.authentication, 'none')
    assert.equal(json.api.usesBrowserClickstream, false)
    assert.equal(typeof json.cat.id, 'string')
    assert.match(json.cat.url, /^https:\/\/cataas\.com\/cat\//u)

    const text = await runCli(['apis', 'run', 'cataas.cat', '--format', 'text'])
    assert.match(text.stdout, /Cataas Cat/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })

  await t.test('cataas.tags json and text', async () => {
    const json = await runJson<CataasTagsResult>(['apis', 'run', 'cataas.tags', '--format', 'json'])
    assert.equal(json.kind, 'cataas.tags')
    assert.equal(json.api.provider, 'cataas')
    assert.equal(json.api.authentication, 'none')
    assert.equal(json.api.usesBrowserClickstream, false)
    assert.ok(Array.isArray(json.tags))
    assert.ok(json.total >= json.tags.length)

    const text = await runCli(['apis', 'run', 'cataas.tags', '--format', 'text'])
    assert.match(text.stdout, /Cataas Tags/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })

  await t.test('cataas.cats json, text, and offline replay', async () => {
    const json = await runJson<CataasCatsResult>(['apis', 'run', 'cataas.cats', '--format', 'json', '--', '--limit', '2'])
    assert.equal(json.kind, 'cataas.cats')
    assert.equal(json.api.provider, 'cataas')
    assert.equal(json.api.authentication, 'none')
    assert.equal(json.api.usesBrowserClickstream, false)
    assert.ok(Array.isArray(json.cats))
    assert.ok(json.cats.length > 0)

    const text = await runCli(['apis', 'run', 'cataas.cats', '--format', 'text', '--', '--limit', '2'])
    assert.match(text.stdout, /Cataas Cats/)
    assert.match(text.stdout, /open REST API only · no auth/)

    await withPublicApisHome(async publicApisHome => {
      const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
      const online = await runJson<CataasCatsResult>(['apis', 'run', 'cataas.cats', '--online', '--persist', '--format', 'json', '--', '--limit', '2'], env)
      assert.equal(online.storage.persisted, true)
      const offline = await runJson<CataasCatsResult>(['apis', 'run', 'cataas.cats', '--offline', '--format', 'json', '--', '--limit', '2'], env)
      assert.equal(offline.storage.mode, 'offline')
      assert.deepEqual(offline.cats, online.cats)
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
