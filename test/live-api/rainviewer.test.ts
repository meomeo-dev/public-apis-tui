import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type RainViewerResult = {
  kind: 'rainviewer.maps'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  maps: { radarPast: Array<Record<string, unknown>> }
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('RainViewer live e2e covers maps text and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const args = ['--limit', '13']
    const online = await runJson<RainViewerResult>(['apis', 'run', 'rainviewer.maps', '--online', '--persist', '--format', 'json', '--', ...args], env)
    assert.equal(online.kind, 'rainviewer.maps')
    assert.equal(online.api.provider, 'rainviewer')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage.persisted, true)
    assert.ok(online.maps.radarPast.length > 0)

    const offline = await runJson<RainViewerResult>(['apis', 'run', 'rainviewer.maps', '--offline', '--format', 'json', '--', ...args], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.maps, online.maps)

    const text = await runCli(['apis', 'run', 'rainviewer.maps', '--offline', '--format', 'text', '--', ...args], env)
    assert.match(text.stdout, /RainViewer/)
    assert.match(text.stdout, /open REST API only/)
    assert.match(text.stdout, /no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
  })
})

async function runJson<T>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-rainviewer-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
