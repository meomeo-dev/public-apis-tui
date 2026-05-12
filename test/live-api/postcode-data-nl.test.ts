import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('PostcodeData.nl live lookup verifies HTTP JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const online = await runJson<PostcodeDataNlLiveResult>(['apis', 'run', 'postcodedata-nl.lookup', '--online', '--persist', '--format', 'json', '--', '--postcode', '1211EP', '--street-number', '60', '--ref', 'public-apis-tui.local'], env)
    assert.equal(online.kind, 'postcodedata-nl.lookup')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.api.httpOnly, true)
    assert.equal(online.addresses[0]?.street, 'Stationsstraat')
    assert.equal(online.addresses[0]?.city, 'Hilversum')
    assert.equal(online.storage.persisted, true)

    const offline = await runJson<PostcodeDataNlLiveResult>(['apis', 'run', 'postcodedata-nl.lookup', '--offline', '--format', 'json', '--', '--postcode', '1211EP', '--street-number', '60', '--ref', 'public-apis-tui.local'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.addresses, online.addresses)

    const text = await runCli(['apis', 'run', 'postcodedata-nl.lookup', '--offline', '--format', 'text', '--', '--postcode', '1211EP', '--street-number', '60', '--ref', 'public-apis-tui.local'], env)
    assert.match(text.stdout, /PostcodeData\.nl Lookup/u)
    assert.match(text.stdout, /HTTP-only/u)
    assert.match(text.stdout, /Stationsstraat/u)
  })
})

type PostcodeDataNlLiveResult = {
  kind: 'postcodedata-nl.lookup'
  api: { authentication: 'none'; usesBrowserClickstream: false; httpOnly: true }
  addresses: Array<{ street: string; city: string }>
  storage: { mode: 'online' | 'offline'; persisted: boolean }
}

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 4 * 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-postcodedata-nl-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
