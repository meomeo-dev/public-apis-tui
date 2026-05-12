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

type WaifuImagesResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { includedTags: string[]; nsfw: string; pageSize: number }
  count: number
  images: Array<{ url: string; tags: string[]; isNsfw: boolean }>
  storage: StorageMeta
}

type WaifuTagsResult = Record<string, unknown> & {
  kind: string
  api: PublicApiMeta
  query: { name?: string | undefined; pageSize: number }
  count: number
  tags: Array<{ slug: string; imageCount: number }>
  storage: StorageMeta
}

test('Waifu.im live e2e covers images and tags json, text, and offline replay', { skip: liveEnabled ? false : 'set PUBLIC_APIS_LIVE_E2E=1 to call live public APIs' }, async () => {
  const images = await runJson<WaifuImagesResult>(['apis', 'run', 'waifuim.images', '--format', 'json', '--', '--included-tags', 'waifu', '--page-size', '3'])
  assert.equal(images.kind, 'waifuim.images')
  assert.equal(images.api.provider, 'waifu.im')
  assert.equal(images.api.authentication, 'none')
  assert.equal(images.api.usesBrowserClickstream, false)
  assert.deepEqual(images.query.includedTags, ['waifu'])
  assert.equal(images.query.nsfw, 'False')
  assert.equal(images.query.pageSize, 3)
  assert.ok(images.count > 0)
  assert.ok(images.images.every(image => image.url.startsWith('https://cdn.waifu.im/')))
  assert.ok(images.images.every(image => image.isNsfw === false))

  const tags = await runJson<WaifuTagsResult>(['apis', 'run', 'waifuim.tags', '--format', 'json', '--', '--name', 'waifu', '--page-size', '100'])
  assert.equal(tags.kind, 'waifuim.tags')
  assert.equal(tags.api.provider, 'waifu.im')
  assert.ok(tags.tags.some(tag => tag.slug === 'waifu'))

  const text = await runCli(['apis', 'run', 'waifuim.images', '--format', 'text', '--', '--included-tags', 'waifu', '--page-size', '3'])
  assert.match(text.stdout, /Waifu\.im Images/)
  assert.match(text.stdout, /open REST API only · no auth/)
  assert.match(text.stdout, /waifu/)

  await withPublicApisHome(async publicApisHome => {
    const env = { ...process.env, PUBLIC_APIS_HOME_DIR: publicApisHome }
    const online = await runJson<WaifuImagesResult>(['apis', 'run', 'waifuim.images', '--online', '--persist', '--format', 'json', '--', '--included-tags', 'waifu', '--page-size', '3'], env)
    assert.equal(online.storage.persisted, true)
    const offline = await runJson<WaifuImagesResult>(['apis', 'run', 'waifuim.images', '--offline', '--format', 'json', '--', '--included-tags', 'waifu', '--page-size', '3'], env)
    assert.equal(offline.storage.mode, 'offline')
    assert.deepEqual(offline.images, online.images)
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
