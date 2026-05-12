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

type LookupResult = Record<string, unknown> & {
  kind: 'postalpincode.pincode' | 'postalpincode.postOffice'
  api: PublicApiMeta
  postOffices: Array<{ name: string; pincode?: string | undefined }>
  storage: StorageMeta
}

test('PostalPinCode live e2e covers JSON, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const pincode = await runJson<LookupResult>(['apis', 'run', 'postalpincode.pincode', '--online', '--persist', '--format', 'json', '--', '--pincode', '110001', '--limit', '5'], env)
    assert.equal(pincode.kind, 'postalpincode.pincode')
    assert.equal(pincode.api.provider, 'postalpincode')
    assert.equal(pincode.api.authentication, 'none')
    assert.equal(pincode.api.usesBrowserClickstream, false)
    assert.ok(pincode.postOffices.length > 0)
    assert.equal(pincode.storage.persisted, true)

    const offline = await runJson<LookupResult>(['apis', 'run', 'postalpincode.pincode', '--offline', '--format', 'json', '--', '--pincode', '110001', '--limit', '5'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.postOffices, pincode.postOffices)

    const text = await runCli(['apis', 'run', 'postalpincode.pincode', '--offline', '--format', 'text', '--', '--pincode', '110001', '--limit', '5'], env)
    assert.match(text.stdout, /PostalPinCode PIN Code Lookup/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /no Chrome clickstream/)
    assert.match(text.stdout, /not scraped/)

    const postOffice = await runJson<LookupResult>(['apis', 'run', 'postalpincode.postOffice', '--online', '--persist', '--format', 'json', '--', '--name', 'Connaught Place', '--limit', '5'], env)
    assert.equal(postOffice.kind, 'postalpincode.postOffice')
    assert.ok(postOffice.postOffices.some(entry => entry.pincode === '110001'))

    const postOfficeOffline = await runJson<LookupResult>(['apis', 'run', 'postalpincode.postOffice', '--offline', '--format', 'json', '--', '--name', 'Connaught Place', '--limit', '5'], env)
    assert.equal(postOfficeOffline.storage.mode, 'offline')
    assert.deepEqual(postOfficeOffline.postOffices, postOffice.postOffices)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], { cwd: process.cwd(), env, maxBuffer: 4 * 1024 * 1024 })
  return { stdout: stripAnsi(result.stdout), stderr: stripAnsi(result.stderr) }
}

async function withPublicApisHome(run: (publicApisHome: string) => Promise<void>): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-postalpincode-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
