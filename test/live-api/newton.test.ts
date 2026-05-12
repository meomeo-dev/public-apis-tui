import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type NewtonResult = Record<string, unknown> & {
  kind: string
  api: {
    provider: string
    authentication: string
    usesBrowserClickstream: boolean
    transport: string
  }
  calculation: {
    operation: string
    expression: string
    resultText: string
  }
  storage: { mode?: string; persisted?: boolean }
}

test('Newton live e2e covers JSON, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const args = [
    'apis',
    'run',
    'newton.compute',
    '--format',
    'json',
    '--',
    '--operation',
    'simplify',
    '--expression',
    '2^2+2(2)',
  ]
  const result = await runJson<NewtonResult>(args)
  assert.equal(result.kind, 'newton.compute')
  assert.equal(result.api.provider, 'newton')
  assert.equal(result.api.authentication, 'none')
  assert.equal(result.api.usesBrowserClickstream, false)
  assert.equal(result.api.transport, 'HTTPS JSON REST')
  assert.equal(result.calculation.resultText, '8')

  const text = await runCli([
    'apis',
    'run',
    'newton.compute',
    '--format',
    'text',
    '--',
    '--operation',
    'zeroes',
    '--expression',
    'x^2+2x',
  ])
  assert.match(text.stdout, /Newton Math Calculation/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)
  assert.match(text.stdout, /Fixed documented math operations/)
  assert.match(text.stdout, /-2, 0/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<NewtonResult>([
      'apis',
      'run',
      'newton.compute',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--operation',
      'derive',
      '--expression',
      'x^2',
    ], env)
    assert.equal(online.storage.persisted, true)
    assert.equal(online.calculation.resultText, '2 x')

    const offline = await runJson<NewtonResult>([
      'apis',
      'run',
      'newton.compute',
      '--offline',
      '--format',
      'json',
      '--',
      '--operation',
      'derive',
      '--expression',
      'x^2',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.calculation, online.calculation)
  })
})

async function runJson<T extends Record<string, unknown>>(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<T> {
  const result = await runCli(args, env)
  return JSON.parse(result.stdout) as T
}

async function runCli(
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<{ stdout: string; stderr: string }> {
  const result = await execFileAsync('npx', ['tsx', 'src/cli.ts', ...args], {
    cwd: process.cwd(),
    env,
    maxBuffer: 1024 * 1024 * 8,
  })
  return result
}

async function withPublicApisHome(
  callback: (publicApisHome: string) => Promise<void>,
): Promise<void> {
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-newton-'))
  try {
    await callback(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}
