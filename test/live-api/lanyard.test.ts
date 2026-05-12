import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type LanyardPresenceResult = {
  kind: 'lanyard.presence'
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: { userId: string }
  presence: { discordUser: { id: string; username: string }; discordStatus: string }
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('Lanyard live e2e covers presence text and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env: NodeJS.ProcessEnv = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const queryArgs = ['--user-id', '94490510688792576']
    const online = await runJson<LanyardPresenceResult>(['apis', 'run', 'lanyard.presence', '--online', '--persist', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(online.kind, 'lanyard.presence')
    assert.equal(online.api.provider, 'lanyard')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.query.userId, '94490510688792576')
    assert.equal(online.presence.discordUser.id, '94490510688792576')
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<LanyardPresenceResult>(['apis', 'run', 'lanyard.presence', '--offline', '--format', 'json', '--', ...queryArgs], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.presence, online.presence)

    const text = await runCli(['apis', 'run', 'lanyard.presence', '--offline', '--format', 'text', '--', ...queryArgs], env)
    assert.match(text.stdout, /Lanyard Discord Presence/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-lanyard-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
