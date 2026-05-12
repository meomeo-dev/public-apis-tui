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
  cliSurahLimitCap?: number | undefined
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type QuranCloudAyahResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { reference: string; edition: string }
  ayah: { number: number; numberInSurah: number; text: string; surah?: { englishName?: string | undefined } | undefined }
  storage: StorageMeta
}

type QuranCloudSurahResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { surah: number; edition: string; limit: number }
  surah: { number: number; englishName: string; numberOfAyahs?: number | undefined }
  count: number
  ayahs: Array<{ numberInSurah: number; text: string }>
  storage: StorageMeta
}

test('Quran Cloud live e2e covers ayah json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<QuranCloudAyahResult>(['apis', 'run', 'qurancloud.ayah', '--format', 'json', '--', '--reference', '2:255', '--edition', 'en.asad'])
  assert.equal(json.kind, 'qurancloud.ayah')
  assert.equal(json.api.provider, 'qurancloud')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.reference, '2:255')
  assert.equal(json.ayah.numberInSurah, 255)
  assert.match(json.ayah.text, /deity|God|GOD/u)

  const text = await runCli(['apis', 'run', 'qurancloud.ayah', '--format', 'text', '--', '--reference', '2:255', '--edition', 'en.asad'])
  assert.match(text.stdout, /Quran Cloud Ayah/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<QuranCloudAyahResult>(['apis', 'run', 'qurancloud.ayah', '--online', '--persist', '--format', 'json', '--', '--reference', '2:255', '--edition', 'en.asad'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<QuranCloudAyahResult>(['apis', 'run', 'qurancloud.ayah', '--offline', '--format', 'json', '--', '--reference', '2:255', '--edition', 'en.asad'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.ayah, online.ayah)
  })
})

test('Quran Cloud live e2e covers surah json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<QuranCloudSurahResult>(['apis', 'run', 'qurancloud.surah', '--format', 'json', '--', '--surah', '1', '--edition', 'en.asad', '--limit', '7'])
  assert.equal(json.kind, 'qurancloud.surah')
  assert.equal(json.api.provider, 'qurancloud')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.cliSurahLimitCap, 286)
  assert.equal(json.surah.number, 1)
  assert.equal(json.count, 7)
  assert.equal(json.ayahs[0]?.numberInSurah, 1)

  const text = await runCli(['apis', 'run', 'qurancloud.surah', '--format', 'text', '--', '--surah', '1', '--edition', 'en.asad', '--limit', '7'])
  assert.match(text.stdout, /Quran Cloud Surah/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<QuranCloudSurahResult>(['apis', 'run', 'qurancloud.surah', '--online', '--persist', '--format', 'json', '--', '--surah', '1', '--edition', 'en.asad', '--limit', '7'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<QuranCloudSurahResult>(['apis', 'run', 'qurancloud.surah', '--offline', '--format', 'json', '--', '--surah', '1', '--edition', 'en.asad', '--limit', '7'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.ayahs, online.ayahs)
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
    maxBuffer: 4 * 1024 * 1024,
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
