import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('Energi Data Service live right-now verifies JSON and offline text replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const tempHome = await mkdtemp(join(tmpdir(), 'public-apis-tui-energi-rightnow-'))
  try {
    const env = { PUBLIC_APIS_TUI_HOME: tempHome }
    const online = await runJson<EnergiRightNowLiveResult>(['apis', 'run', 'energidataservice.rightnow', '--online', '--persist', '--format', 'json', '--', '--start', 'now-PT15M', '--limit', '5'], env)
    assert.equal(online.kind, 'energidataservice.rightnow')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage?.persisted, true)
    assert.equal(online.query.start, 'now-PT15M')
    assert.equal(online.pagination.returned > 0, true)
    assert.equal(typeof online.records[0]?.CO2Emission, 'number')

    const offline = await runJson<EnergiRightNowLiveResult>(['apis', 'run', 'energidataservice.rightnow', '--offline', '--format', 'json', '--', '--start', 'now-PT15M', '--limit', '5'], env)
    assert.equal(offline.storage?.mode, 'offline')
    assert.equal(offline.records[0]?.Minutes1UTC, online.records[0]?.Minutes1UTC)

    const text = await runCli(['apis', 'run', 'energidataservice.rightnow', '--offline', '--format', 'text', '--', '--start', 'now-PT15M', '--limit', '5'], env)
    assert.match(text, /Energi Data Service Right Now/)
    assert.match(text, /open REST API only · no auth/)
    assert.match(text, /no Chrome clickstream/)
  } finally {
    await rm(tempHome, { recursive: true, force: true })
  }
})

test('Energi Data Service live elspot prices verifies JSON and offline text replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const tempHome = await mkdtemp(join(tmpdir(), 'public-apis-tui-energi-elspot-'))
  try {
    const env = { PUBLIC_APIS_TUI_HOME: tempHome }
    const online = await runJson<EnergiElspotLiveResult>(['apis', 'run', 'energidataservice.elspotprices', '--online', '--persist', '--format', 'json', '--', '--price-area', 'DK1', '--limit', '5'], env)
    assert.equal(online.kind, 'energidataservice.elspotprices')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage?.persisted, true)
    assert.equal(online.query.priceArea, 'DK1')
    assert.equal(online.pagination.returned > 0, true)
    assert.equal(typeof online.records[0]?.SpotPriceEUR, 'number')

    const offline = await runJson<EnergiElspotLiveResult>(['apis', 'run', 'energidataservice.elspotprices', '--offline', '--format', 'json', '--', '--price-area', 'DK1', '--limit', '5'], env)
    assert.equal(offline.storage?.mode, 'offline')
    assert.equal(offline.records[0]?.HourUTC, online.records[0]?.HourUTC)

    const text = await runCli(['apis', 'run', 'energidataservice.elspotprices', '--offline', '--format', 'text', '--', '--price-area', 'DK1', '--limit', '5'], env)
    assert.match(text, /Energi Data Service Elspot Prices/)
    assert.match(text, /open REST API only · no auth/)
    assert.match(text, /no Chrome clickstream/)
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

type EnergiRightNowLiveResult = {
  kind: 'energidataservice.rightnow'
  api: { authentication: string; usesBrowserClickstream: boolean }
  query: { start: string; limit: number }
  pagination: { returned: number }
  records: Array<{ Minutes1UTC?: string; CO2Emission?: number }>
  storage?: { mode: string; persisted?: boolean }
}

type EnergiElspotLiveResult = {
  kind: 'energidataservice.elspotprices'
  api: { authentication: string; usesBrowserClickstream: boolean }
  query: { priceArea: string; limit: number }
  pagination: { returned: number }
  records: Array<{ HourUTC?: string; SpotPriceEUR?: number }>
  storage?: { mode: string; persisted?: boolean }
}
