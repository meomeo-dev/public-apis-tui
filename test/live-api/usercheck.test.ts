import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('UserCheck live email verifies JSON and offline text replay with one online request', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const tempHome = await mkdtemp(join(tmpdir(), 'public-apis-tui-usercheck-'))
  try {
    const env = { PUBLIC_APIS_TUI_HOME: tempHome }
    const online = await runJson<UserCheckLiveResult>(['apis', 'run', 'usercheck.email', '--online', '--persist', '--format', 'json', '--', '--email', 'test@example.com'], env)
    assert.equal(online.kind, 'usercheck.email')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage?.persisted, true)
    assert.equal(online.query.email, 'test@example.com')
    assert.equal(online.validation.email, 'test@example.com')
    assert.equal(typeof online.validation.disposable, 'boolean')
    assert.equal(typeof online.validation.mx, 'boolean')

    const offline = await runJson<UserCheckLiveResult>(['apis', 'run', 'usercheck.email', '--offline', '--format', 'json', '--', '--email', 'test@example.com'], env)
    assert.equal(offline.storage?.mode, 'offline')
    assert.equal(offline.query.email, online.query.email)
    assert.equal(offline.validation.domain, online.validation.domain)

    const text = await runCli(['apis', 'run', 'usercheck.email', '--offline', '--format', 'text', '--', '--email', 'test@example.com'], env)
    assert.match(text, /UserCheck Email/)
    assert.match(text, /open REST API only · no auth/)
    assert.match(text, /no Chrome clickstream/)
    assert.match(text, /test@example\.com/)
  } finally {
    await rm(tempHome, { recursive: true, force: true })
  }
})

async function runJson<T>(args: string[], extraEnv: Record<string, string> = {}): Promise<T> {
  const output = await runCli(args, extraEnv)
  return JSON.parse(output) as T
}

async function runCli(args: string[], extraEnv: Record<string, string> = {}): Promise<string> {
  const { stdout } = await execFileAsync('node', ['--import', 'tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env: { ...process.env, ...extraEnv, NO_COLOR: '1' },
    maxBuffer: 1024 * 1024,
  })
  return stdout
}

type UserCheckLiveResult = {
  kind: 'usercheck.email'
  api: { authentication: string; usesBrowserClickstream: boolean }
  query: { email: string }
  validation: { email: string; domain: string; disposable: boolean; mx: boolean }
  storage?: { mode: string; persisted?: boolean }
}
