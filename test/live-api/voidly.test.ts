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

type IncidentsResult = Record<string, unknown> & {
  kind: 'voidly.incidents'
  api: PublicApiMeta
  incidents: Array<{ id: string; country?: string | undefined }>
  storage: StorageMeta
}

test('Voidly live e2e covers incidents and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const incidents = await runJson<IncidentsResult>(['apis', 'run', 'voidly.incidents', '--online', '--persist', '--format', 'json', '--', '--country', 'IR', '--limit', '2', '--offset', '0'], env)
    assert.equal(incidents.kind, 'voidly.incidents')
    assert.equal(incidents.api.provider, 'voidly')
    assert.equal(incidents.api.authentication, 'none')
    assert.equal(incidents.api.usesBrowserClickstream, false)
    assert.ok(incidents.incidents.every(incident => incident.country === 'IR'))
    assert.equal(incidents.storage.persisted, true)

    const incidentsOffline = await runJson<IncidentsResult>(['apis', 'run', 'voidly.incidents', '--offline', '--format', 'json', '--', '--country', 'IR', '--limit', '2', '--offset', '0'], env)
    assert.equal(incidentsOffline.storage.mode, 'offline')
    assert.deepEqual(incidentsOffline.incidents, incidents.incidents)

    const text = await runCli(['apis', 'run', 'voidly.incidents', '--offline', '--format', 'text', '--', '--country', 'IR', '--limit', '2', '--offset', '0'], env)
    assert.match(text.stdout, /Voidly Censorship Incidents/)
    assert.match(text.stdout, /open REST API only · no auth/)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-voidly-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
