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

type DogCeoBreedsResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  totalBreeds: number
  breeds: unknown[]
  storage: StorageMeta
}

type DogCeoImagesResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  count: number
  imageUrls: string[]
  storage: StorageMeta
}

type DogCeoSubBreedsResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  count: number
  subBreeds: string[]
  storage: StorageMeta
}

test('Dog CEO live e2e covers every operation', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async t => {
  await t.test('dogceo.breeds json, text, and offline replay', async () => {
    const json = await runJson<DogCeoBreedsResult>(['apis', 'run', 'dogceo.breeds', '--format', 'json'])
    assert.equal(json.kind, 'dogceo.breeds')
    assert.equal(json.api.provider, 'dog-ceo')
    assert.equal(json.api.authentication, 'none')
    assert.equal(json.api.usesBrowserClickstream, false)
    assert.ok(json.totalBreeds > 0)
    assert.ok(json.breeds.length > 0)

    const text = await runCli(['apis', 'run', 'dogceo.breeds', '--format', 'text'])
    assert.match(text.stdout, /Dog CEO Breeds/)
    assert.match(text.stdout, /open REST API only · no auth/)

    await withPublicApisHome(async publicApisHome => {
      const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
      const online = await runJson<DogCeoBreedsResult>(['apis', 'run', 'dogceo.breeds', '--online', '--persist', '--format', 'json'], env)
      assert.equal(online.storage.persisted, true)
      const offline = await runJson<DogCeoBreedsResult>(['apis', 'run', 'dogceo.breeds', '--offline', '--format', 'json'], env)
      assert.equal(offline.storage.mode, 'offline')
      assert.deepEqual(offline.breeds, online.breeds)
    })
  })

  await t.test('dogceo.images json, text, and offline replay', async () => {
    const json = await runJson<DogCeoImagesResult>(['apis', 'run', 'dogceo.images', '--format', 'json', '--', '--breed', 'hound', '--count', '2'])
    assert.equal(json.kind, 'dogceo.images')
    assert.equal(json.api.provider, 'dog-ceo')
    assert.equal(json.api.authentication, 'none')
    assert.equal(json.api.usesBrowserClickstream, false)
    assert.equal(json.count, 2)
    assert.equal(json.imageUrls.length, 2)
    assert.match(json.imageUrls[0] ?? '', /^https:\/\/images\.dog\.ceo\//u)

    const text = await runCli(['apis', 'run', 'dogceo.images', '--format', 'text', '--', '--breed', 'hound', '--count', '2'])
    assert.match(text.stdout, /Dog CEO Images/)
    assert.match(text.stdout, /open REST API only · no auth/)

    await withPublicApisHome(async publicApisHome => {
      const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
      const online = await runJson<DogCeoImagesResult>(['apis', 'run', 'dogceo.images', '--online', '--persist', '--format', 'json', '--', '--breed', 'hound', '--count', '2'], env)
      assert.equal(online.storage.persisted, true)
      const offline = await runJson<DogCeoImagesResult>(['apis', 'run', 'dogceo.images', '--offline', '--format', 'json', '--', '--breed', 'hound', '--count', '2'], env)
      assert.equal(offline.storage.mode, 'offline')
      assert.deepEqual(offline.imageUrls, online.imageUrls)
    })
  })

  await t.test('dogceo.subbreeds json, text, and offline replay', async () => {
    const json = await runJson<DogCeoSubBreedsResult>(['apis', 'run', 'dogceo.subbreeds', '--format', 'json', '--', '--breed', 'hound'])
    assert.equal(json.kind, 'dogceo.subbreeds')
    assert.equal(json.api.provider, 'dog-ceo')
    assert.equal(json.api.authentication, 'none')
    assert.equal(json.api.usesBrowserClickstream, false)
    assert.ok(json.count > 0)
    assert.ok(json.subBreeds.includes('afghan'))

    const text = await runCli(['apis', 'run', 'dogceo.subbreeds', '--format', 'text', '--', '--breed', 'hound'])
    assert.match(text.stdout, /Dog CEO Sub-Breeds/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /afghan/)

    await withPublicApisHome(async publicApisHome => {
      const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
      const online = await runJson<DogCeoSubBreedsResult>(['apis', 'run', 'dogceo.subbreeds', '--online', '--persist', '--format', 'json', '--', '--breed', 'hound'], env)
      assert.equal(online.storage.persisted, true)
      const offline = await runJson<DogCeoSubBreedsResult>(['apis', 'run', 'dogceo.subbreeds', '--offline', '--format', 'json', '--', '--breed', 'hound'], env)
      assert.equal(offline.storage.mode, 'offline')
      assert.deepEqual(offline.subBreeds, online.subBreeds)
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
