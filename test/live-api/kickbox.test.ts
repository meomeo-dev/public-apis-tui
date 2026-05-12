import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Kickbox live disposable check verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<KickboxLiveResult>(['apis', 'run', 'kickbox.disposable', '--format', 'json', '--', '--target', 'gmail.com'])
  assert.equal(json.kind, 'kickbox.disposable')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.target, 'gmail.com')
  assert.equal(json.result.disposable, false)

  const text = await runCli(['apis', 'run', 'kickbox.disposable', '--format', 'text', '--', '--target', 'gmail.com'])
  assert.match(text, /Kickbox Disposable/)
  assert.match(text, /open REST API only · no auth/)
  assert.match(text, /no Chrome clickstream/)
  assert.match(text, /gmail\.com/)

  const tempHome = await mkdtemp(join(tmpdir(), 'public-apis-tui-kickbox-'))
  try {
    const env = { PUBLIC_APIS_TUI_HOME: tempHome }
    const online = await runJson<KickboxLiveResult>(['apis', 'run', 'kickbox.disposable', '--online', '--persist', '--format', 'json', '--', '--target', 'gmail.com'], env)
    assert.equal(online.storage?.persisted, true)
    const offline = await runJson<KickboxLiveResult>(['apis', 'run', 'kickbox.disposable', '--offline', '--format', 'json', '--', '--target', 'gmail.com'], env)
    assert.equal(offline.storage?.mode, 'offline')
    assert.equal(offline.query.target, online.query.target)
    assert.equal(offline.result.disposable, online.result.disposable)
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

type KickboxLiveResult = {
  kind: 'kickbox.disposable'
  api: { authentication: string; usesBrowserClickstream: boolean }
  query: { target: string }
  result: { disposable: boolean }
  storage?: { mode: string; persisted?: boolean }
}
