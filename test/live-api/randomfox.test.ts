import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const liveEnabled = process.env.PUBLIC_APIS_LIVE_E2E === '1'

type PublicApiMeta = {
  provider: string
  authentication: string
  usesBrowserClickstream: boolean
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type RandomFoxFloofResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  fox: { image: string; link: string }
  storage: StorageMeta
}

test('RandomFox live e2e covers every operation', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<RandomFoxFloofResult>(['apis', 'run', 'randomfox.floof', '--format', 'json'])
  assert.equal(json.kind, 'randomfox.floof')
  assert.equal(json.api.provider, 'random-fox')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.match(json.fox.image, /^https:\/\/randomfox\.ca\/images\/\d+\.jpg$/u)
  assert.match(json.fox.link, /^https:\/\/randomfox\.ca\/\?i=\d+$/u)

  const text = await runCli(['apis', 'run', 'randomfox.floof', '--format', 'text'])
  assert.match(text.stdout, /RandomFox Floof/)
  assert.match(text.stdout, /open REST API only · no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<RandomFoxFloofResult>(['apis', 'run', 'randomfox.floof', '--online', '--persist', '--format', 'json'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<RandomFoxFloofResult>(['apis', 'run', 'randomfox.floof', '--offline', '--format', 'json'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.fox, online.fox)
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
    maxBuffer: 1024 * 1024,
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
