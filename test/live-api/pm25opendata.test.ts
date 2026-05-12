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

type FeedResult = Record<string, unknown> & { api: PublicApiMeta; feeds: unknown[]; storage: StorageMeta }

test('PM2.5 Open Data live e2e covers AirBox, LASS, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const airbox = await runJson<FeedResult>(['apis', 'run', 'pm25opendata.airbox', '--online', '--persist', '--format', 'json', '--', '--limit', '506'], env)
    assert.equal(airbox.api.provider, 'pm25opendata')
    assert.equal(airbox.api.authentication, 'none')
    assert.equal(airbox.api.usesBrowserClickstream, false)
    assert.ok(airbox.feeds.length > 0)
    assert.equal(airbox.storage.persisted, true)
    const airboxOffline = await runJson<FeedResult>(['apis', 'run', 'pm25opendata.airbox', '--offline', '--format', 'json', '--', '--limit', '506'], env)
    assert.deepEqual(airboxOffline.feeds, airbox.feeds)

    const lass = await runJson<FeedResult>(['apis', 'run', 'pm25opendata.lass', '--online', '--persist', '--format', 'json', '--', '--limit', '10'], env)
    assert.equal(lass.api.provider, 'pm25opendata')
    assert.ok(lass.feeds.length > 0)
    const lassOffline = await runJson<FeedResult>(['apis', 'run', 'pm25opendata.lass', '--offline', '--format', 'json', '--', '--limit', '10'], env)
    assert.deepEqual(lassOffline.feeds, lass.feeds)

    const text = await runCli(['apis', 'run', 'pm25opendata.airbox', '--offline', '--format', 'text', '--', '--limit', '506'], env)
    assert.match(text.stdout, /PM2\.5 Open Data AirBox/)
    assert.match(text.stdout, /open REST API only · no auth/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
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
