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

type RandomDogWoofResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  file: { url: string; fileSizeBytes: number; mediaType: string }
}

type RandomDogFilesResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { limit: number; mediaType?: string | undefined }
  count: number
  files: Array<{ name: string; url: string; mediaType: string }>
  storage: StorageMeta
}

test('RandomDog live e2e covers every operation', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async t => {
  await t.test('randomdog.woof json and text', async () => {
    const json = await runJson<RandomDogWoofResult>(['apis', 'run', 'randomdog.woof', '--format', 'json'])
    assert.equal(json.kind, 'randomdog.woof')
    assert.equal(json.api.provider, 'random-dog')
    assert.equal(json.api.authentication, 'none')
    assert.equal(json.api.usesBrowserClickstream, false)
    assert.match(json.file.url, /^https:\/\/random\.dog\//u)
    assert.ok(json.file.fileSizeBytes > 0)

    const text = await runCli(['apis', 'run', 'randomdog.woof', '--format', 'text'])
    assert.match(text.stdout, /RandomDog Woof/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })

  await t.test('randomdog.files json, text, and offline replay', async () => {
    const json = await runJson<RandomDogFilesResult>(['apis', 'run', 'randomdog.files', '--format', 'json', '--', '--limit', '3', '--media-type', 'image'])
    assert.equal(json.kind, 'randomdog.files')
    assert.equal(json.api.provider, 'random-dog')
    assert.equal(json.api.authentication, 'none')
    assert.equal(json.api.usesBrowserClickstream, false)
    assert.equal(json.query.limit, 3)
    assert.equal(json.query.mediaType, 'image')
    assert.equal(json.count, 3)
    assert.ok(json.files.every(file => file.mediaType === 'image'))

    const text = await runCli(['apis', 'run', 'randomdog.files', '--format', 'text', '--', '--limit', '3', '--media-type', 'image'])
    assert.match(text.stdout, /RandomDog Files/)
    assert.match(text.stdout, /open REST API only · no auth/)

    await withPublicApisHome(async publicApisHome => {
      const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
      const online = await runJson<RandomDogFilesResult>(['apis', 'run', 'randomdog.files', '--online', '--persist', '--format', 'json', '--', '--limit', '3', '--media-type', 'image'], env)
      assert.equal(online.storage.persisted, true)
      const offline = await runJson<RandomDogFilesResult>(['apis', 'run', 'randomdog.files', '--offline', '--format', 'json', '--', '--limit', '3', '--media-type', 'image'], env)
      assert.equal(offline.storage.mode, 'offline')
      assert.deepEqual(offline.files, online.files)
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
