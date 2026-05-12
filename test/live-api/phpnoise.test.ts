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

type PhpNoiseGenerateResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { hex?: string | undefined; tiles: number; tileSize: number; borderWidth: number; mode: string; multi: string; steps: number }
  image: { dataUrl: string; mimeType: string; base64Bytes: number; dimensions: { width: number; height: number } }
  storage: StorageMeta
}

test('PHP-Noise live e2e covers generate json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const json = await runJson<PhpNoiseGenerateResult>(['apis', 'run', 'phpnoise.generate', '--format', 'json', '--', '--hex', '336699', '--tiles', '3', '--tile-size', '5', '--border-width', '1'])
  assert.equal(json.kind, 'phpnoise.generate')
  assert.equal(json.api.provider, 'php-noise')
  assert.equal(json.api.authentication, 'none')
  assert.equal(json.api.usesBrowserClickstream, false)
  assert.equal(json.query.hex, '336699')
  assert.equal(json.query.tiles, 3)
  assert.equal(json.image.mimeType, 'image/png')
  assert.ok(json.image.dataUrl.startsWith('data:image/png;base64,'))
  assert.ok(json.image.base64Bytes > 0)

  const text = await runCli(['apis', 'run', 'phpnoise.generate', '--format', 'text', '--', '--hex', '336699', '--tiles', '3', '--tile-size', '5', '--border-width', '1'])
  assert.match(text.stdout, /PHP-Noise Generate/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /image\/png/)
  assert.match(text.stdout, /PNG data URL omitted from text output/)
  assert.doesNotMatch(text.stdout, /data:image\/png;base64/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<PhpNoiseGenerateResult>(['apis', 'run', 'phpnoise.generate', '--online', '--persist', '--format', 'json', '--', '--hex', '336699', '--tiles', '3', '--tile-size', '5', '--border-width', '1'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<PhpNoiseGenerateResult>(['apis', 'run', 'phpnoise.generate', '--offline', '--format', 'json', '--', '--hex', '336699', '--tiles', '3', '--tile-size', '5', '--border-width', '1'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.image, online.image)
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
    maxBuffer: 4 * 1024 * 1024,
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
