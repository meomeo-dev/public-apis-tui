import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Disify live email verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<DisifyEmailLiveResult>(['apis', 'run', 'disify.email', '--format', 'json', '--', '--email', 'test@example.com'])
  assert.equal(json.kind, 'disify.email')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.email, 'test@example.com')
  assert.equal(typeof json.validation.disposable, 'boolean')
  assert.equal(typeof json.validation.dns, 'boolean')

  const text = await runCli(['apis', 'run', 'disify.email', '--format', 'text', '--', '--email', 'test@example.com'])
  assert.match(text, /Disify Email/)
  assert.match(text, /open REST API only · no auth/)
  assert.match(text, /no Chrome clickstream/)
  assert.match(text, /test@example\.com/)

  const tempHome = await mkdtemp(join(tmpdir(), 'public-apis-tui-disify-email-'))
  try {
    const env = { PUBLIC_APIS_TUI_HOME: tempHome }
    const online = await runJson<DisifyEmailLiveResult>(['apis', 'run', 'disify.email', '--online', '--persist', '--format', 'json', '--', '--email', 'test@example.com'], env)
    assert.equal(online.storage?.persisted, true)
    const offline = await runJson<DisifyEmailLiveResult>(['apis', 'run', 'disify.email', '--offline', '--format', 'json', '--', '--email', 'test@example.com'], env)
    assert.equal(offline.storage?.mode, 'offline')
    assert.equal(offline.query.email, online.query.email)
    assert.equal(offline.validation.domain, online.validation.domain)
  } finally {
    await rm(tempHome, { recursive: true, force: true })
  }
})

test('Disify live domain verifies JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<DisifyDomainLiveResult>(['apis', 'run', 'disify.domain', '--format', 'json', '--', '--domain', 'gmail.com'])
  assert.equal(json.kind, 'disify.domain')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.domain, 'gmail.com')
  assert.equal(typeof json.validation.disposable, 'boolean')
  assert.equal(typeof json.validation.free, 'boolean')

  const text = await runCli(['apis', 'run', 'disify.domain', '--format', 'text', '--', '--domain', 'gmail.com'])
  assert.match(text, /Disify Domain/)
  assert.match(text, /open REST API only · no auth/)
  assert.match(text, /no Chrome clickstream/)
  assert.match(text, /gmail\.com/)

  const tempHome = await mkdtemp(join(tmpdir(), 'public-apis-tui-disify-domain-'))
  try {
    const env = { PUBLIC_APIS_TUI_HOME: tempHome }
    const online = await runJson<DisifyDomainLiveResult>(['apis', 'run', 'disify.domain', '--online', '--persist', '--format', 'json', '--', '--domain', 'gmail.com'], env)
    assert.equal(online.storage?.persisted, true)
    const offline = await runJson<DisifyDomainLiveResult>(['apis', 'run', 'disify.domain', '--offline', '--format', 'json', '--', '--domain', 'gmail.com'], env)
    assert.equal(offline.storage?.mode, 'offline')
    assert.equal(offline.query.domain, online.query.domain)
    assert.equal(offline.validation.domain, online.validation.domain)
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

type DisifyEmailLiveResult = {
  kind: 'disify.email'
  api: { authentication: string; usesBrowserClickstream: boolean }
  query: { email: string }
  validation: { domain: string; disposable: boolean; dns: boolean }
  storage?: { mode: string; persisted?: boolean }
}

type DisifyDomainLiveResult = {
  kind: 'disify.domain'
  api: { authentication: string; usesBrowserClickstream: boolean }
  query: { domain: string }
  validation: { domain: string; disposable: boolean; free?: boolean | undefined }
  storage?: { mode: string; persisted?: boolean }
}
