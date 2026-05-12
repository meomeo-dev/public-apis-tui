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

type XColorsRandomResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { hue: string; number: number; type?: string | undefined }
  count: number
  colors: Array<{ hex?: string | undefined; rgb?: string | undefined; hsl?: string | undefined }>
  storage: StorageMeta
}

type XColorsConvertResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { operation: string; value: string }
  color: { hex?: string | undefined; rgb?: string | undefined; hsl?: string | undefined }
  storage: StorageMeta
}

test('xColors live e2e covers random and convert json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const random = await runJson<XColorsRandomResult>(['apis', 'run', 'xcolors.random', '--format', 'json', '--', '--hue', 'blue', '--number', '2', '--type', 'light'])
  assert.equal(random.kind, 'xcolors.random')
  assert.equal(random.api.provider, 'xcolors')
  assert.equal(random.api.authentication, 'none')
  assert.equal(random.api.usesBrowserClickstream, false)
  assert.equal(random.query.hue, 'blue')
  assert.equal(random.query.number, 2)
  assert.equal(random.count, 2)
  assert.ok(random.colors.every(color => typeof color.hex === 'string' && /^#[0-9A-F]{6}$/u.test(color.hex)))

  const randomText = await runCli(['apis', 'run', 'xcolors.random', '--format', 'text', '--', '--hue', 'blue', '--number', '2', '--type', 'light'])
  assert.match(randomText.stdout, /xColors Random/)
  assert.match(randomText.stdout, /open REST API only · no auth/)
  assert.match(randomText.stdout, /#/)

  const converted = await runJson<XColorsConvertResult>(['apis', 'run', 'xcolors.convert', '--format', 'json', '--', '--operation', 'rgb2hex', '--value', '120-200-30'])
  assert.equal(converted.kind, 'xcolors.convert')
  assert.equal(converted.api.provider, 'xcolors')
  assert.equal(converted.api.authentication, 'none')
  assert.equal(converted.api.usesBrowserClickstream, false)
  assert.equal(converted.color.hex, '#78C81E')

  const convertText = await runCli(['apis', 'run', 'xcolors.convert', '--format', 'text', '--', '--operation', 'rgb2hex', '--value', '120-200-30'])
  assert.match(convertText.stdout, /xColors Convert/)
  assert.match(convertText.stdout, /open REST API only · no auth/)
  assert.match(convertText.stdout, /#78C81E/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<XColorsConvertResult>(['apis', 'run', 'xcolors.convert', '--online', '--persist', '--format', 'json', '--', '--operation', 'rgb2hex', '--value', '120-200-30'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<XColorsConvertResult>(['apis', 'run', 'xcolors.convert', '--offline', '--format', 'json', '--', '--operation', 'rgb2hex', '--value', '120-200-30'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.color, online.color)
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
