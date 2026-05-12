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
  transport: string
}

type StorageMeta = {
  mode?: string | undefined
  persisted?: boolean | undefined
}

type ColormindPaletteResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { model: string }
  count: number
  colors: Array<{ hex: string; rgb: [number, number, number] }>
  storage: StorageMeta
}

type ColormindModelsResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { limit: number }
  count: number
  models: string[]
  storage: StorageMeta
}

test('Colormind live e2e covers palette and models json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const palette = await runJson<ColormindPaletteResult>(['apis', 'run', 'colormind.palette', '--format', 'json', '--', '--model', 'default'])
  assert.equal(palette.kind, 'colormind.palette')
  assert.equal(palette.api.provider, 'colormind')
  assert.equal(palette.api.authentication, 'none')
  assert.equal(palette.api.usesBrowserClickstream, false)
  assert.equal(palette.api.transport, 'http-only')
  assert.equal(palette.query.model, 'default')
  assert.equal(palette.count, 5)
  assert.ok(palette.colors.every(color => /^#[0-9A-F]{6}$/u.test(color.hex)))

  const text = await runCli(['apis', 'run', 'colormind.palette', '--format', 'text', '--', '--model', 'default'])
  assert.match(text.stdout, /Colormind Palette/)
  assert.match(text.stdout, /HTTP-only/)
  assert.match(text.stdout, /no auth/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<ColormindPaletteResult>(['apis', 'run', 'colormind.palette', '--online', '--persist', '--format', 'json', '--', '--model', 'default'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<ColormindPaletteResult>(['apis', 'run', 'colormind.palette', '--offline', '--format', 'json', '--', '--model', 'default'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.colors, online.colors)
  })

  const models = await runJson<ColormindModelsResult>(['apis', 'run', 'colormind.models', '--format', 'json', '--', '--limit', '5'])
  assert.equal(models.kind, 'colormind.models')
  assert.equal(models.api.transport, 'http-only')
  assert.ok(models.models.includes('default'))
  assert.ok(models.models.includes('ui'))

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<ColormindModelsResult>(['apis', 'run', 'colormind.models', '--online', '--persist', '--format', 'json', '--', '--limit', '5'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<ColormindModelsResult>(['apis', 'run', 'colormind.models', '--offline', '--format', 'json', '--', '--limit', '5'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.models, online.models)
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
