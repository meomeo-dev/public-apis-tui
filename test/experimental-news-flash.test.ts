import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import {
  createLaunchAgentPlist,
  doctorNewsFlashMonitor,
  listNewsFlashProviders,
  parseNewsFlashProvider,
  parseOptionalNewsFlashProvider,
} from '../src/application/usecases/experimentalNewsFlash.js'
import { writePublicApiProviderConfig } from '../src/infrastructure/persistence/publicApiConfig.js'

test('experimental news flash provider parser accepts supported providers', () => {
  assert.equal(parseNewsFlashProvider('spaceflightnews'), 'spaceflightnews')
  assert.equal(parseNewsFlashProvider('hackernews'), 'hackernews')
  assert.equal(parseNewsFlashProvider('hashnode'), 'hashnode')
  assert.equal(parseNewsFlashProvider('newsapi'), 'newsapi')
  assert.equal(parseNewsFlashProvider('gnews'), 'gnews')
})

test('experimental news flash provider parser rejects unsupported provider', () => {
  assert.throws(() => parseNewsFlashProvider('unknown'), /Unsupported news flash provider/u)
})

test('experimental news flash optional provider parser supports omitted filter', () => {
  assert.equal(parseOptionalNewsFlashProvider(undefined), undefined)
  assert.equal(parseOptionalNewsFlashProvider('gnews'), 'gnews')
})

test('experimental news flash rejects parameters outside the selected provider', async () => {
  await assert.rejects(
    () => doctorNewsFlashMonitor({
      provider: 'hackernews',
      repoRoot: '/repo',
      intervalMinutes: 30,
      providerEnv: {
        NEWSAPI_COUNTRY: 'us',
      },
    }),
    /Unsupported news flash parameter for hackernews: NEWSAPI_COUNTRY/u,
  )
})

test('experimental news flash provider list exposes lifecycle metadata', () => {
  const result = listNewsFlashProviders('/repo')
  assert.equal(result.kind, 'experimental.newsFlash.providers')
  assert.equal(result.providers.length, 5)
  assert.equal(result.providers.find(provider => provider.provider === 'newsapi')?.operation, 'newsapi.headlines')
  assert.equal(result.providers.find(provider => provider.provider === 'gnews')?.operation, 'gnews.headlines')
  assert.deepEqual(result.providers.find(provider => provider.provider === 'newsapi')?.requiredEnv, ['NEWSAPI_API_KEY'])
  assert.equal(result.providers.find(provider => provider.provider === 'hackernews')?.requiredEnv.length, 0)
  assert.match(result.providers.find(provider => provider.provider === 'hackernews')?.parameters.map(parameter => parameter.option).join(' ') ?? '', /--hackernews-list <top\|new\|best\|ask\|show\|job>/u)
  assert.match(result.providers.find(provider => provider.provider === 'spaceflightnews')?.parameters.map(parameter => parameter.option).join(' ') ?? '', /--spaceflightnews-search <text>/u)
})

test('LaunchAgent plist includes runner, interval, repo env, and logs', () => {
  const plist = createLaunchAgentPlist({
    label: 'com.example.news-flash.test',
    templateDir: '/tmp/news flash/template',
    intervalSeconds: 1800,
    repoRoot: '/tmp/public-apis-cli',
    shellPath: '/bin/bash',
  })
  assert.match(plist, /<string>com.example.news-flash.test<\/string>/u)
  assert.match(plist, /<string>\/bin\/bash<\/string>/u)
  assert.match(plist, /<string>-c<\/string>/u)
  assert.match(plist, /run-news-flash-cycle-notify\.sh/u)
  assert.match(plist, /for name in .*ANTHROPIC_API_KEY/u)
  assert.match(plist, /\.bashrc/u)
  assert.match(plist, /cd &apos;\/tmp\/news flash\/template&apos; &amp;&amp;/u)
  assert.doesNotMatch(plist, /CYCLES=1/u)
  assert.doesNotMatch(plist, /\$\(P\)/u)
  assert.match(plist, /<integer>1800<\/integer>/u)
  assert.match(plist, /<key>PUBLIC_APIS_CLI_REPO<\/key>/u)
  assert.match(plist, /<key>PUBLIC_APIS_TUI_REPO<\/key>/u)
  assert.match(plist, /\/tmp\/public-apis-cli/u)
  assert.match(plist, /launchagent\.out\.log/u)
  assert.match(plist, /launchagent\.err\.log/u)
})

test('LaunchAgent plist persists provider parameters into runner command', () => {
  const plist = createLaunchAgentPlist({
    label: 'com.example.news-flash.params',
    templateDir: '/tmp/news-flash/template',
    intervalSeconds: 300,
    repoRoot: '/tmp/public-apis-cli',
    shellPath: '/bin/zsh',
    providerEnv: {
      HACKERNEWS_LIST: 'new',
      HACKERNEWS_LIMIT: '5',
    },
  })
  assert.match(plist, /HACKERNEWS_LIST=&apos;new&apos;/u)
  assert.match(plist, /HACKERNEWS_LIMIT=&apos;5&apos;/u)
  assert.doesNotMatch(plist, /CYCLES=1/u)
})

test('LaunchAgent plist reads provider secret from local config without embedding the value', () => {
  const plist = createLaunchAgentPlist({
    label: 'com.example.news-flash.newsapi',
    templateDir: '/tmp/news-flash/template',
    intervalSeconds: 300,
    repoRoot: '/tmp/public-apis-cli',
    shellPath: '/bin/zsh',
    provider: 'newsapi',
    providerEnv: {
      NEWSAPI_COUNTRY: 'us',
    },
  })
  assert.match(plist, /NEWSAPI_API_KEY/u)
  assert.match(plist, /config\.json/u)
  assert.match(plist, /NEWSAPI_COUNTRY=&apos;us&apos;/u)
  assert.doesNotMatch(plist, /72402057/u)
})

test('news flash keyed provider preflight accepts public-apis local config secret', async () => {
  const previousHome = process.env.SITE_CDP_HOME_DIR
  const previousPath = process.env.PATH
  const tempDir = await mkdtemp(join(tmpdir(), 'news-flash-config-secret-'))
  const binDir = join(tempDir, 'bin')
  try {
    process.env.SITE_CDP_HOME_DIR = tempDir
    await writePublicApiProviderConfig({ providerId: 'newsapi', secrets: { NEWSAPI_API_KEY: 'config-secret' } })
    process.env.PATH = `${binDir}:${previousPath ?? ''}`

    await import('node:fs/promises').then(async fs => {
      await fs.mkdir(binDir, { recursive: true })
      for (const command of ['node', 'npm', 'claude', 'terminal-notifier', 'launchctl']) {
        await fs.writeFile(join(binDir, command), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
      }
    })

    const result = await doctorNewsFlashMonitor({
      provider: 'newsapi',
      repoRoot: process.cwd(),
      intervalMinutes: 30,
      shellPath: '/bin/sh',
    })

    const newsapiKeyCheck = result.checks.find(check => check.name === 'NEWSAPI_API_KEY')
    assert.equal(newsapiKeyCheck?.ok, true)
    assert.match(newsapiKeyCheck?.detail ?? '', /local provider config/u)
  } finally {
    if (previousHome === undefined) delete process.env.SITE_CDP_HOME_DIR
    else process.env.SITE_CDP_HOME_DIR = previousHome
    if (previousPath === undefined) delete process.env.PATH
    else process.env.PATH = previousPath
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('LaunchAgent plist supports sh-compatible shell startup', () => {
  const plist = createLaunchAgentPlist({
    label: 'com.example.news-flash.sh',
    templateDir: '/tmp/news-flash/template',
    intervalSeconds: 60,
    repoRoot: '/tmp/public-apis-cli',
    shellPath: '/bin/sh',
  })
  assert.match(plist, /<string>\/bin\/sh<\/string>/u)
  assert.match(plist, /\.profile/u)
  assert.match(plist, /eval &quot;value=\\\$\{\$name-\}&quot;/u)
})
