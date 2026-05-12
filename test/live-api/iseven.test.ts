import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type IsEvenResult = Record<string, unknown> & {
  kind: string
  api: {
    provider: string
    authentication: string
    usesBrowserClickstream: boolean
    transport: string
  }
  query: { number: number }
  result: { number: number; isEven: boolean; parity: string }
  upstream: { ad?: string }
  storage: { mode?: string; persisted?: boolean }
}

test('isEven live e2e covers check json, text, and offline replay', {
  skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs',
}, async () => {
  const json = await runJson<IsEvenResult>([
    'apis',
    'run',
    'iseven.check',
    '--format',
    'json',
    '--',
    '--number',
    '6',
  ])
  assert.equal(json.kind, 'iseven.check')
  assert.equal(json.api.provider, 'iseven')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.api.transport, 'HTTPS JSON REST')
  assert.equal(json.query.number, 6)
  assert.equal(json.result.isEven, true)
  assert.equal(json.result.parity, 'even')
  assert.equal(typeof json.upstream.ad, 'string')

  const text = await runCli([
    'apis',
    'run',
    'iseven.check',
    '--format',
    'text',
    '--',
    '--number',
    '7',
  ])
  assert.match(text.stdout, /isEven Parity Check/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /no Chrome clickstream/)
  assert.match(text.stdout, /7 is odd/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<IsEvenResult>([
      'apis',
      'run',
      'iseven.check',
      '--online',
      '--persist',
      '--format',
      'json',
      '--',
      '--number',
      '6',
    ], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<IsEvenResult>([
      'apis',
      'run',
      'iseven.check',
      '--offline',
      '--format',
      'json',
      '--',
      '--number',
      '6',
    ], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.result, online.result)
    assert.deepEqual(offline.upstream, online.upstream)
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
  const publicApisHome = await mkdtemp(join(tmpdir(), 'public-apis-iseven-'))
  try {
    await callback(publicApisHome)
  } finally {
    await rm(publicApisHome, { recursive: true, force: true })
  }
}
