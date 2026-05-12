import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('UK Carbon Intensity live current intensity verifies JSON and offline text replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const tempHome = await mkdtemp(join(tmpdir(), 'public-apis-tui-uk-carbon-intensity-'))
  try {
    const env = { PUBLIC_APIS_TUI_HOME: tempHome }
    const online = await runJson<UkCarbonIntensityLiveResult>(['apis', 'run', 'ukcarbonintensity.intensity', '--online', '--persist', '--format', 'json'], env)
    assert.equal(online.kind, 'ukcarbonintensity.intensity')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage?.persisted, true)
    assert.equal(typeof online.reading.from, 'string')
    assert.equal(typeof online.reading.to, 'string')
    assert.equal(typeof online.reading.forecast, 'number')

    const offline = await runJson<UkCarbonIntensityLiveResult>(['apis', 'run', 'ukcarbonintensity.intensity', '--offline', '--format', 'json'], env)
    assert.equal(offline.storage?.mode, 'offline')
    assert.equal(offline.reading.from, online.reading.from)

    const text = await runCli(['apis', 'run', 'ukcarbonintensity.intensity', '--offline', '--format', 'text'], env)
    assert.match(text, /UK Carbon Intensity/)
    assert.match(text, /open REST API only · no auth/)
    assert.match(text, /no Chrome clickstream/)
  } finally {
    await rm(tempHome, { recursive: true, force: true })
  }
})

test('UK Carbon Intensity live generation verifies JSON and offline text replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const tempHome = await mkdtemp(join(tmpdir(), 'public-apis-tui-uk-carbon-generation-'))
  try {
    const env = { PUBLIC_APIS_TUI_HOME: tempHome }
    const online = await runJson<UkCarbonGenerationLiveResult>(['apis', 'run', 'ukcarbonintensity.generation', '--online', '--persist', '--format', 'json'], env)
    assert.equal(online.kind, 'ukcarbonintensity.generation')
    assert.equal(online.api.authentication, 'none')
    assert.equal(online.api.usesBrowserClickstream, false)
    assert.equal(online.storage?.persisted, true)
    assert.equal(online.generationMix.length > 0, true)
    assert.equal(typeof online.generationMix[0]?.fuel, 'string')
    assert.equal(typeof online.generationMix[0]?.percentage, 'number')

    const offline = await runJson<UkCarbonGenerationLiveResult>(['apis', 'run', 'ukcarbonintensity.generation', '--offline', '--format', 'json'], env)
    assert.equal(offline.storage?.mode, 'offline')
    assert.deepEqual(offline.generationMix, online.generationMix)

    const text = await runCli(['apis', 'run', 'ukcarbonintensity.generation', '--offline', '--format', 'text'], env)
    assert.match(text, /UK Carbon Generation Mix/)
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

type UkCarbonIntensityLiveResult = {
  kind: 'ukcarbonintensity.intensity'
  api: { authentication: string; usesBrowserClickstream: boolean }
  reading: { from: string; to: string; forecast?: number }
  storage?: { mode: string; persisted?: boolean }
}

type UkCarbonGenerationLiveResult = {
  kind: 'ukcarbonintensity.generation'
  api: { authentication: string; usesBrowserClickstream: boolean }
  generationMix: Array<{ fuel: string; percentage: number }>
  storage?: { mode: string; persisted?: boolean }
}
