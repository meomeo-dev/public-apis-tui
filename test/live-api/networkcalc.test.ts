import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const live = process.env.PUBLIC_APIS_LIVE_E2E === '1'

test('NetworkCalc live subnet and binary verify JSON, text output, and offline replay', { skip: live ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const subnetArgs = ['apis', 'run', 'networkcalc.subnet', '--format', 'json', '--', '--ip', '10.5.1.0', '--cidr', '27', '--binary', 'true']
  const subnetJson = await runJson<NetworkCalcSubnetLiveResult>(subnetArgs)
  assert.equal(subnetJson.kind, 'networkcalc.subnet')
  assert.equal(subnetJson.api.authentication, 'none')
  assert.equal(subnetJson.api.usesBrowserClickstream, false)
  assert.equal(subnetJson.address.network_address, '10.5.1.0')
  assert.equal(subnetJson.address.broadcast_address, '10.5.1.31')

  const subnetText = await runCli(['apis', 'run', 'networkcalc.subnet', '--format', 'text', '--', '--ip', '10.5.1.0', '--cidr', '27'])
  assert.match(subnetText.stdout, /NetworkCalc Subnet/)
  assert.match(subnetText.stdout, /open REST API only · no auth/)

  const binaryArgs = ['apis', 'run', 'networkcalc.binary', '--format', 'json', '--', '--value', '1e7d6d', '--from', '16', '--to', '2']
  const binaryJson = await runJson<NetworkCalcBinaryLiveResult>(binaryArgs)
  assert.equal(binaryJson.kind, 'networkcalc.binary')
  assert.equal(binaryJson.api.authentication, 'none')
  assert.equal(binaryJson.api.usesBrowserClickstream, false)
  assert.equal(binaryJson.conversion.converted, '111100111110101101101')

  const binaryText = await runCli(['apis', 'run', 'networkcalc.binary', '--format', 'text', '--', '--value', 'ff', '--from', '16', '--to', '2'])
  assert.match(binaryText.stdout, /NetworkCalc Binary/)
  assert.match(binaryText.stdout, /base 2 · 11111111/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<NetworkCalcSubnetLiveResult>(['apis', 'run', 'networkcalc.subnet', '--online', '--persist', '--format', 'json', '--', '--ip', '10.5.1.0', '--cidr', '27', '--binary', 'true'], env)
    const offline = await runJson<NetworkCalcSubnetLiveResult>(['apis', 'run', 'networkcalc.subnet', '--offline', '--format', 'json', '--', '--ip', '10.5.1.0', '--cidr', '27', '--binary', 'true'], env)
    assert.equal(online.storage.persisted, true)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.address, online.address)
  })
})

type NetworkCalcSubnetLiveResult = {
  kind: 'networkcalc.subnet'
  api: {
    authentication: 'none'
    usesBrowserClickstream: false
  }
  address: {
    network_address: string
    broadcast_address: string
  }
  storage: {
    mode: 'online' | 'offline'
    persisted: boolean
  }
}

type NetworkCalcBinaryLiveResult = {
  kind: 'networkcalc.binary'
  api: {
    authentication: 'none'
    usesBrowserClickstream: false
  }
  conversion: {
    converted: string
  }
}

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
