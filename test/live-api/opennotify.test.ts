import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type PublicApiMeta = { provider: string; authentication: string; usesBrowserClickstream: boolean; security?: string | undefined }
type StorageMeta = { mode?: string | undefined; persisted?: boolean | undefined }

type AstrosResult = Record<string, unknown> & {
  kind: 'opennotify.astros'
  api: PublicApiMeta
  people: Array<{ name: string; craft: string }>
  storage: StorageMeta
}

type IssNowResult = Record<string, unknown> & {
  kind: 'opennotify.issNow'
  api: PublicApiMeta
  position: { latitude: number; longitude: number }
  storage: StorageMeta
}

test('Open Notify live e2e covers astronauts, ISS now, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const astros = await runJson<AstrosResult>(['apis', 'run', 'opennotify.astros', '--online', '--persist', '--format', 'json'], env)
    assert.equal(astros.kind, 'opennotify.astros')
    assert.equal(astros.api.provider, 'opennotify')
    assert.equal(astros.api.authentication, 'none')
    assert.equal(astros.api.usesBrowserClickstream, false)
    assert.equal(astros.api.security, 'http-only')
    assert.ok(astros.people.length > 0)
    assert.equal(astros.storage.persisted, true)

    const astrosOffline = await runJson<AstrosResult>(['apis', 'run', 'opennotify.astros', '--offline', '--format', 'json'], env)
    assert.equal(astrosOffline.storage.mode, 'offline')
    assert.deepEqual(astrosOffline.people, astros.people)

    const issNow = await runJson<IssNowResult>(['apis', 'run', 'opennotify.issNow', '--online', '--persist', '--format', 'json'], env)
    assert.equal(issNow.kind, 'opennotify.issNow')
    assert.equal(issNow.api.authentication, 'none')
    assert.equal(issNow.api.usesBrowserClickstream, false)
    assert.equal(issNow.api.security, 'http-only')
    assert.equal(typeof issNow.position.latitude, 'number')
    assert.equal(issNow.storage.persisted, true)

    const issNowOffline = await runJson<IssNowResult>(['apis', 'run', 'opennotify.issNow', '--offline', '--format', 'json'], env)
    assert.equal(issNowOffline.storage.mode, 'offline')
    assert.deepEqual(issNowOffline.position, issNow.position)

    const text = await runCli(['apis', 'run', 'opennotify.astros', '--offline', '--format', 'text'], env)
    assert.match(text.stdout, /Open Notify People in Space/)
    assert.match(text.stdout, /HTTP-only/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-opennotify-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
