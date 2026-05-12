import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type DigitalOceanStatusResult = Record<string, unknown> & {
  kind: string
  api: { provider: string; authentication: string; usesBrowserClickstream: boolean }
  query: Record<string, unknown>
  storage: { mode?: string | undefined; persisted?: boolean | undefined }
}

test('DigitalOcean Status live e2e covers summary json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<DigitalOceanStatusResult & { status: { indicator: string }; components: unknown[] }>(['apis', 'run', 'digitaloceanstatus.summary', '--format', 'json', '--', '--component-query', 'API', '--component-limit', '5'])
  assert.equal(json.kind, 'digitaloceanstatus.summary')
  assert.equal(json.api.provider, 'digitalocean-status')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(typeof json.status.indicator, 'string')

  const text = await runCli(['apis', 'run', 'digitaloceanstatus.summary', '--format', 'text', '--', '--component-query', 'API', '--component-limit', '5'])
  assert.match(text.stdout, /DigitalOcean Status Summary/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<DigitalOceanStatusResult & { status: unknown; components: unknown[] }>(['apis', 'run', 'digitaloceanstatus.summary', '--online', '--persist', '--format', 'json', '--', '--component-query', 'API', '--component-limit', '5'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<DigitalOceanStatusResult & { status: unknown; components: unknown[] }>(['apis', 'run', 'digitaloceanstatus.summary', '--offline', '--format', 'json', '--', '--component-query', 'API', '--component-limit', '5'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.status, online.status)
    assert.deepEqual(offline.components, online.components)
  })
})

test('DigitalOcean Status live e2e covers incidents and maintenances with offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const incidents = await runJson<DigitalOceanStatusResult & { events: unknown[] }>(['apis', 'run', 'digitaloceanstatus.incidents', '--format', 'json', '--', '--scope', 'unresolved', '--limit', '5'])
  assert.equal(incidents.kind, 'digitaloceanstatus.incidents')
  assert.equal(incidents.api.authentication, 'none')
  assert.equal(incidents.api.usesBrowserClickstream, false)

  const incidentsText = await runCli(['apis', 'run', 'digitaloceanstatus.incidents', '--format', 'text', '--', '--scope', 'unresolved', '--limit', '5'])
  assert.match(incidentsText.stdout, /DigitalOcean Incidents/)
  assert.match(incidentsText.stdout, /open REST API only · no auth/)

  const maintenances = await runJson<DigitalOceanStatusResult & { events: unknown[] }>(['apis', 'run', 'digitaloceanstatus.maintenances', '--format', 'json', '--', '--scope', 'upcoming', '--limit', '5'])
  assert.equal(maintenances.kind, 'digitaloceanstatus.maintenances')
  assert.equal(maintenances.api.authentication, 'none')
  assert.equal(maintenances.api.usesBrowserClickstream, false)

  const maintenancesText = await runCli(['apis', 'run', 'digitaloceanstatus.maintenances', '--format', 'text', '--', '--scope', 'upcoming', '--limit', '5'])
  assert.match(maintenancesText.stdout, /DigitalOcean Scheduled Maintenances/)
  assert.match(maintenancesText.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const onlineIncidents = await runJson<DigitalOceanStatusResult & { events: unknown[] }>(['apis', 'run', 'digitaloceanstatus.incidents', '--online', '--persist', '--format', 'json', '--', '--scope', 'unresolved', '--limit', '5'], env)
    assert.equal(onlineIncidents.storage.persisted, true)
    const offlineIncidents = await runJson<DigitalOceanStatusResult & { events: unknown[] }>(['apis', 'run', 'digitaloceanstatus.incidents', '--offline', '--format', 'json', '--', '--scope', 'unresolved', '--limit', '5'], env)
    assert.equal(offlineIncidents.storage.mode, 'offline')
    assert.deepEqual(offlineIncidents.events, onlineIncidents.events)

    const onlineMaintenances = await runJson<DigitalOceanStatusResult & { events: unknown[] }>(['apis', 'run', 'digitaloceanstatus.maintenances', '--online', '--persist', '--format', 'json', '--', '--scope', 'upcoming', '--limit', '5'], env)
    assert.equal(onlineMaintenances.storage.persisted, true)
    const offlineMaintenances = await runJson<DigitalOceanStatusResult & { events: unknown[] }>(['apis', 'run', 'digitaloceanstatus.maintenances', '--offline', '--format', 'json', '--', '--scope', 'upcoming', '--limit', '5'], env)
    assert.equal(offlineMaintenances.storage.mode, 'offline')
    assert.deepEqual(offlineMaintenances.events, onlineMaintenances.events)
  })
})

async function runJson<T extends Record<string, unknown>>(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 8 * 1024 * 1024,
  })
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
