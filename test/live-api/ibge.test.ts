import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('IBGE live Localidades operations verify JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome, NO_COLOR: '1' }
    const states = await runJson<IbgeStatesLive>(['apis', 'run', 'ibge.states', '--online', '--persist', '--format', 'json', '--', '--limit', '27'], env)
    assert.equal(states.kind, 'ibge.states')
    assert.equal(states.api.authentication, 'none')
    assert.equal(states.api.usesBrowserClickstream, false)
    assert.equal(states.query.limit, 27)
    assert.equal(states.totalReturned, 27)
    assert.ok(states.states.some(state => state.acronym === 'SP'))
    assert.equal(states.storage.persisted, true)

    const municipalities = await runJson<IbgeMunicipalitiesLive>(['apis', 'run', 'ibge.municipalities', '--online', '--persist', '--format', 'json', '--', '--state', 'SP', '--limit', '5'], env)
    assert.equal(municipalities.kind, 'ibge.municipalities')
    assert.equal(municipalities.api.authentication, 'none')
    assert.equal(municipalities.api.usesBrowserClickstream, false)
    assert.equal(municipalities.query.state, 'SP')
    assert.ok(municipalities.totalReturned > 5)
    assert.equal(municipalities.municipalities[0]?.state?.acronym, 'SP')
    assert.match(String(municipalities.municipalities[0]?.name ?? ''), /Adamantina|Adolfo/u)

    const offline = await runJson<IbgeMunicipalitiesLive>(['apis', 'run', 'ibge.municipalities', '--offline', '--format', 'json', '--', '--state', 'SP', '--limit', '5'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.municipalities, municipalities.municipalities)

    const text = await runCli(['apis', 'run', 'ibge.municipalities', '--offline', '--format', 'text', '--', '--state', 'SP', '--limit', '5'], env)
    assert.match(text.stdout, /IBGE Municipalities/)
    assert.match(text.stdout, /open REST API only · no auth/)
    assert.match(text.stdout, /Adamantina|Adolfo/)
  })
})

type IbgeStatesLive = {
  kind: 'ibge.states'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  query: { limit: number }
  totalReturned: number
  states: Array<{ acronym: string; name: string }>
  storage: { mode: 'online' | 'offline'; persisted: boolean }
}

type IbgeMunicipalitiesLive = {
  kind: 'ibge.municipalities'
  api: { authentication: 'none'; usesBrowserClickstream: false }
  query: { state: string; limit: number }
  totalReturned: number
  municipalities: Array<{ name: string; state?: { acronym?: string | undefined } | undefined }>
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-live-ibge-'))
  try {
    await run(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}

function stripAnsi(value: string): string {
  return value.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'gu'), '')
}
