import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import {
  createLaunchAgentPlist,
  doctorNewsFlashMonitor,
  getNewsFlashStatus,
  listNewsFlashProviders,
  type NewsFlashProviderInfo,
  parseNewsFlashProvider,
  parseNewsFlashAgentCliRunner,
  parseOptionalNewsFlashProvider,
  validateNewsFlashSmokeOutput,
} from '../src/application/usecases/experimentalNewsFlash.js'
import {
  writePublicApiProviderConfig,
} from '../src/infrastructure/persistence/publicApiConfig.js'

const windowsPosixSkip = process.platform === 'win32'
  ? 'POSIX shell and LaunchAgent paths are not available on Windows'
  : false

function findProvider(
  providers: NewsFlashProviderInfo[],
  provider: string,
): NewsFlashProviderInfo | undefined {
  return providers.find(entry => entry.provider === provider)
}

function parameterOptions(provider: NewsFlashProviderInfo | undefined): string {
  return provider?.parameters.map(parameter => parameter.option).join(' ') ?? ''
}

test('experimental news flash provider parser accepts supported providers', () => {
  const providers = [
    'spaceflightnews',
    'hackernews',
    'hashnode',
    'newsapi',
    'gnews',
    'chroniclingamerica',
    'currents',
    'guardian',
    'marketaux',
    'mediastack',
    'newsdata',
    'nytimes',
    'thenews',
  ]
  for (const provider of providers) {
    assert.equal(parseNewsFlashProvider(provider), provider)
  }
})

test('experimental news flash provider parser rejects unsupported provider', () => {
  assert.throws(
    () => parseNewsFlashProvider('unknown'),
    /Unsupported news flash provider/u,
  )
})

test('experimental news flash agent runner parser accepts supported runners', () => {
  assert.equal(parseNewsFlashAgentCliRunner('claude_code'), 'claude_code')
  assert.equal(parseNewsFlashAgentCliRunner('codex'), 'codex')
  assert.throws(
    () => parseNewsFlashAgentCliRunner('open-ended'),
    /Unsupported agent CLI runner/u,
  )
})

test('experimental news flash optional provider parser supports omitted filter', () => {
  assert.equal(parseOptionalNewsFlashProvider(undefined), undefined)
  assert.equal(parseOptionalNewsFlashProvider('gnews'), 'gnews')
})

test(
  'experimental news flash rejects parameters outside the selected provider',
  async () => {
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
  },
)

test('experimental news flash rejects new provider parameter mismatch', async () => {
  await assert.rejects(
    () => doctorNewsFlashMonitor({
      provider: 'guardian',
      repoRoot: '/repo',
      intervalMinutes: 30,
      providerEnv: {
        NEWSDATA_QUERY: 'technology',
      },
    }),
    /Unsupported news flash parameter for guardian: NEWSDATA_QUERY/u,
  )
})

test('experimental news flash provider list exposes lifecycle metadata', () => {
  const result = listNewsFlashProviders('/repo')
  const providers = result.providers
  assert.equal(result.kind, 'experimental.newsFlash.providers')
  assert.equal(result.providers.length, 13)
  assert.equal(findProvider(providers, 'newsapi')?.operation, 'newsapi.headlines')
  assert.equal(findProvider(providers, 'gnews')?.operation, 'gnews.headlines')
  assert.equal(findProvider(providers, 'guardian')?.operation, 'guardian.search')
  assert.equal(findProvider(providers, 'newsdata')?.operation, 'newsdata.latest')
  assert.equal(findProvider(providers, 'nytimes')?.operation, 'nytimes.topStories')
  assert.equal(findProvider(providers, 'thenews')?.operation, 'thenews.all')
  assert.deepEqual(
    findProvider(providers, 'newsapi')?.requiredEnv,
    ['NEWSAPI_API_KEY'],
  )
  assert.deepEqual(
    findProvider(providers, 'guardian')?.requiredEnv,
    ['GUARDIAN_API_KEY'],
  )
  assert.deepEqual(
    findProvider(providers, 'newsdata')?.requiredEnv,
    ['NEWSDATAIO_API_KEY'],
  )
  assert.deepEqual(
    findProvider(providers, 'nytimes')?.requiredEnv,
    ['NYTIMES_API_KEY'],
  )
  assert.deepEqual(
    findProvider(providers, 'thenews')?.requiredEnv,
    ['THENEWSAPI_API_KEY'],
  )
  assert.equal(findProvider(providers, 'hackernews')?.requiredEnv.length, 0)
  assert.equal(
    findProvider(providers, 'chroniclingamerica')?.requiredEnv.length,
    0,
  )
  assert.match(
    parameterOptions(findProvider(providers, 'hackernews')),
    /--hackernews-list <top\|new\|best\|ask\|show\|job>/u,
  )
  assert.match(
    parameterOptions(findProvider(providers, 'spaceflightnews')),
    /--spaceflightnews-search <text>/u,
  )
  assert.match(
    parameterOptions(findProvider(providers, 'guardian')),
    /--guardian-query <text>/u,
  )
  assert.match(
    parameterOptions(findProvider(providers, 'mediastack')),
    /--mediastack-keywords <text>/u,
  )
})

test(
  'LaunchAgent plist includes runner, interval, repo env, and logs',
  { skip: windowsPosixSkip },
  () => {
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
    assert.match(plist, /AGENT_CLI_RUNNER=&apos;claude_code&apos;/u)
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
  },
)

test(
  'LaunchAgent plist persists provider parameters into runner command',
  { skip: windowsPosixSkip },
  () => {
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
  },
)

test(
  'LaunchAgent plist persists agent runner env assignments',
  { skip: windowsPosixSkip },
  () => {
    const plist = createLaunchAgentPlist({
      label: 'com.example.news-flash.agent',
      templateDir: '/tmp/news-flash/template',
      intervalSeconds: 300,
      repoRoot: '/tmp/public-apis-cli',
      shellPath: '/bin/zsh',
      agent: {
        runner: 'claude_code',
        envFile: '/tmp/news-flash/anthropic.env',
        env: {
          ANTHROPIC_BASE_URL: 'https://anthropic.example/v1',
          ANTHROPIC_API_KEY: 'test-anthropic-secret',
          ANTHROPIC_MODEL: 'claude-sonnet-4-5',
        },
      },
    })
    assert.match(plist, /AGENT_ENV_FILE=&apos;\/tmp\/news-flash\/anthropic.env&apos;/u)
    assert.match(plist, /ANTHROPIC_MODEL=&apos;claude-sonnet-4-5&apos;/u)
    assert.match(
      plist,
      /ANTHROPIC_BASE_URL=&apos;https:\/\/anthropic\.example\/v1&apos;/u,
    )
    assert.match(plist, /ANTHROPIC_API_KEY=&apos;test-anthropic-secret&apos;/u)
  },
)

test(
  'LaunchAgent plist persists Codex runner profile',
  { skip: windowsPosixSkip },
  () => {
    const plist = createLaunchAgentPlist({
      label: 'com.example.news-flash.codex',
      templateDir: '/tmp/news-flash/template',
      intervalSeconds: 300,
      repoRoot: '/tmp/public-apis-cli',
      shellPath: '/bin/zsh',
      agent: {
        runner: 'codex',
        codexProfile: 'news-flash',
        env: {
          CODEX_BIN: '/usr/local/bin/codex',
        },
      },
    })
    assert.match(plist, /AGENT_CLI_RUNNER=&apos;codex&apos;/u)
    assert.match(plist, /CODEX_PROFILE=&apos;news-flash&apos;/u)
    assert.match(plist, /CODEX_BIN=&apos;\/usr\/local\/bin\/codex&apos;/u)
    assert.match(plist, /for name in .*CODEX_PROFILE/u)
  },
)

test(
  'LaunchAgent plist reads provider secret from local config without value',
  { skip: windowsPosixSkip },
  () => {
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
  },
)

test(
  'LaunchAgent plist reads new provider secret without embedding value',
  { skip: windowsPosixSkip },
  () => {
    const plist = createLaunchAgentPlist({
      label: 'com.example.news-flash.guardian',
      templateDir: '/tmp/news-flash/template',
      intervalSeconds: 300,
      repoRoot: '/tmp/public-apis-cli',
      shellPath: '/bin/zsh',
      provider: 'guardian',
      providerEnv: {
        GUARDIAN_QUERY: 'technology',
      },
    })
    assert.match(plist, /GUARDIAN_API_KEY/u)
    assert.match(plist, /config\.json/u)
    assert.match(plist, /GUARDIAN_QUERY=&apos;technology&apos;/u)
    assert.doesNotMatch(plist, /test-guardian-secret/u)
  },
)

test(
  'LaunchAgent plist with agent env file omits provider config fallback',
  { skip: windowsPosixSkip },
  () => {
    const plist = createLaunchAgentPlist({
      label: 'com.example.news-flash.thenews',
      templateDir: '/tmp/news-flash/template',
      intervalSeconds: 300,
      repoRoot: '/tmp/public-apis-cli',
      shellPath: '/bin/zsh',
      provider: 'thenews',
      providerEnv: {
        THENEWS_SEARCH: 'ai chips',
      },
      agent: {
        runner: 'claude_code',
        env: {},
        envFile: '/tmp/news-flash/provider.env',
      },
    })
    assert.match(plist, /AGENT_ENV_FILE=&apos;\/tmp\/news-flash\/provider\.env&apos;/u)
    assert.match(plist, /THENEWS_SEARCH=&apos;ai chips&apos;/u)
    assert.match(plist, /unset THENEWSAPI_API_KEY/u)
    assert.doesNotMatch(plist, /THENEWSAPI_API_KEY=/u)
    assert.doesNotMatch(plist, /configured_secret/u)
    assert.doesNotMatch(plist, /config\.json/u)
  },
)

test(
  'news flash keyed provider preflight accepts public-apis config secret',
  async () => {
    const previousHome = process.env.SITE_CDP_HOME_DIR
    const previousPath = process.env.PATH
    const tempDir = await mkdtemp(join(tmpdir(), 'news-flash-config-secret-'))
    const binDir = join(tempDir, 'bin')
    try {
      process.env.SITE_CDP_HOME_DIR = tempDir
      await writePublicApiProviderConfig({
        providerId: 'newsapi',
        secrets: { NEWSAPI_API_KEY: 'config-secret' },
      })
      process.env.PATH = `${binDir}:${previousPath ?? ''}`

      await import('node:fs/promises').then(async fs => {
        await fs.mkdir(binDir, { recursive: true })
        const commands = [
          'node',
          'npm',
          'claude',
          'terminal-notifier',
          'launchctl',
        ]
        for (const command of commands) {
          await fs.writeFile(join(binDir, command), '#!/bin/sh\nexit 0\n', {
            mode: 0o755,
          })
        }
      })

      const result = await doctorNewsFlashMonitor({
        provider: 'newsapi',
        repoRoot: process.cwd(),
        intervalMinutes: 30,
        shellPath: '/bin/sh',
      })

      const newsapiKeyCheck = result.checks.find(
        check => check.name === 'NEWSAPI_API_KEY',
      )
      assert.equal(newsapiKeyCheck?.ok, true)
      assert.match(newsapiKeyCheck?.detail ?? '', /local provider config/u)
    } finally {
      if (previousHome === undefined) delete process.env.SITE_CDP_HOME_DIR
      else process.env.SITE_CDP_HOME_DIR = previousHome
      if (previousPath === undefined) delete process.env.PATH
      else process.env.PATH = previousPath
      await rm(tempDir, { recursive: true, force: true })
    }
  },
)

test(
  'news flash keyed provider preflight accepts agent env file secret',
  { skip: windowsPosixSkip },
  async () => {
    const previousHome = process.env.HOME
    const previousPath = process.env.PATH
    const tempDir = await mkdtemp(join(tmpdir(), 'news-flash-provider-env-file-'))
    const binDir = join(tempDir, 'bin')
    const homeDir = join(tempDir, 'home')
    const envFilePath = join(tempDir, 'provider.env')
    try {
      process.env.HOME = homeDir
      process.env.PATH = `${binDir}:${previousPath ?? ''}`

      await import('node:fs/promises').then(async fs => {
        await fs.mkdir(binDir, { recursive: true })
        await fs.mkdir(homeDir, { recursive: true })
        const commands = [
          'node',
          'npm',
          'claude',
          'terminal-notifier',
          'launchctl',
        ]
        for (const command of commands) {
          await fs.writeFile(join(binDir, command), '#!/bin/sh\nexit 0\n', {
            mode: 0o755,
          })
        }
        await fs.writeFile(envFilePath, [
          'THENEWSAPI_API_KEY=test-provider-secret',
          'ANTHROPIC_API_KEY=test-agent-secret',
          '',
        ].join('\n'))
      })

      const result = await doctorNewsFlashMonitor({
        provider: 'thenews',
        repoRoot: process.cwd(),
        intervalMinutes: 30,
        shellPath: '/bin/sh',
        agent: {
          envFile: envFilePath,
        },
      })

      const keyCheck = result.checks.find(
        check => check.name === 'THENEWSAPI_API_KEY',
      )
      assert.equal(keyCheck?.ok, true)
      assert.match(keyCheck?.detail ?? '', /--agent-env-file/u)
      assert.equal(
        result.checks.find(check => check.name === 'agent env file')?.ok,
        true,
      )
    } finally {
      if (previousHome === undefined) delete process.env.HOME
      else process.env.HOME = previousHome
      if (previousPath === undefined) delete process.env.PATH
      else process.env.PATH = previousPath
      await rm(tempDir, { recursive: true, force: true })
    }
  },
)

test(
  'news flash preflight loads agent env file before runner checks',
  { skip: windowsPosixSkip },
  async () => {
    const previousHome = process.env.HOME
    const previousPath = process.env.PATH
    const tempDir = await mkdtemp(join(tmpdir(), 'news-flash-agent-env-file-'))
    const binDir = join(tempDir, 'bin')
    const homeDir = join(tempDir, 'home')
    const codexPath = join(tempDir, 'codex-from-env-file')
    const envFilePath = join(tempDir, 'agent.env')
    try {
      process.env.HOME = homeDir
      process.env.PATH = `${binDir}:${previousPath ?? ''}`

      await import('node:fs/promises').then(async fs => {
        await fs.mkdir(binDir, { recursive: true })
        await fs.mkdir(homeDir, { recursive: true })
        for (const command of ['node', 'npm', 'terminal-notifier', 'launchctl']) {
          await fs.writeFile(join(binDir, command), '#!/bin/sh\nexit 0\n', {
            mode: 0o755,
          })
        }
        await fs.writeFile(codexPath, '#!/bin/sh\nexit 0\n', { mode: 0o755 })
        await fs.writeFile(envFilePath, `export CODEX_BIN=${codexPath}\n`)
      })

      const result = await doctorNewsFlashMonitor({
        provider: 'hackernews',
        repoRoot: process.cwd(),
        intervalMinutes: 30,
        shellPath: '/bin/sh',
        agent: {
          runner: 'codex',
          envFile: envFilePath,
          codexProfile: 'news-flash',
        },
      })

      assert.equal(result.agent.runner, 'codex')
      assert.equal(result.agent.codexProfile, 'news-flash')
      assert.equal(result.agent.envFile, envFilePath)
      assert.equal(result.checks.find(check => check.name === 'codex')?.ok, true)
      assert.equal(
        result.checks.find(check => check.name === 'agent env file')?.ok,
        true,
      )
    } finally {
      if (previousHome === undefined) delete process.env.HOME
      else process.env.HOME = previousHome
      if (previousPath === undefined) delete process.env.PATH
      else process.env.PATH = previousPath
      await rm(tempDir, { recursive: true, force: true })
    }
  },
)

test(
  'news flash preflight bridges Codex model provider env_key',
  { skip: windowsPosixSkip },
  async () => {
    const previousHome = process.env.HOME
    const previousPath = process.env.PATH
    const tempDir = await mkdtemp(join(tmpdir(), 'news-flash-codex-env-key-'))
    const binDir = join(tempDir, 'bin')
    const codexHome = join(tempDir, '.codex')
    const homeDir = join(tempDir, 'home')
    try {
      process.env.HOME = homeDir
      process.env.PATH = `${binDir}:${previousPath ?? ''}`

      await import('node:fs/promises').then(async fs => {
        await fs.mkdir(binDir, { recursive: true })
        await fs.mkdir(codexHome, { recursive: true })
        await fs.mkdir(homeDir, { recursive: true })
        const commands = ['node', 'npm', 'terminal-notifier', 'launchctl', 'codex']
        for (const command of commands) {
          await fs.writeFile(join(binDir, command), '#!/bin/sh\nexit 0\n', {
            mode: 0o755,
          })
        }
        await fs.writeFile(join(codexHome, 'config.toml'), [
          '[profiles.news-flash]',
          'model_provider = "custom"',
          '[model_providers.custom]',
          'env_key = "CUSTOM_CODEX_KEY"',
          '',
        ].join('\n'))
        await fs.writeFile(join(homeDir, '.profile'), [
          `export CODEX_HOME=${codexHome}`,
          'export CUSTOM_CODEX_KEY=from-profile',
          '',
        ].join('\n'))
      })

      const result = await doctorNewsFlashMonitor({
        provider: 'hackernews',
        repoRoot: process.cwd(),
        intervalMinutes: 30,
        shellPath: '/bin/sh',
        agent: {
          runner: 'codex',
          codexProfile: 'news-flash',
        },
      })

      assert.equal(
        result.checks.find(check => {
          return check.name === 'codex provider env key'
        })?.detail,
        'CUSTOM_CODEX_KEY set in runner environment',
      )
    } finally {
      if (previousHome === undefined) delete process.env.HOME
      else process.env.HOME = previousHome
      if (previousPath === undefined) delete process.env.PATH
      else process.env.PATH = previousPath
      await rm(tempDir, { recursive: true, force: true })
    }
  },
)

test(
  'LaunchAgent plist supports sh-compatible shell startup',
  { skip: windowsPosixSkip },
  () => {
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
  },
)

test('news flash smoke validation rejects failed collector record', () => {
  const validation = validateNewsFlashSmokeOutput(JSON.stringify({
    jsonlPath: '/tmp/news-flash.jsonl',
    record: {
      ok: false,
      item_count: 0,
      error: 'public-apis exited 127',
    },
  }, null, 2))

  assert.equal(validation.ok, false)
  assert.equal(validation.recordOk, false)
  assert.equal(validation.itemCount, 0)
  assert.match(validation.detail, /public-apis exited 127/u)
})

test('news flash smoke validation accepts non-empty collector record', () => {
  const validation = validateNewsFlashSmokeOutput(JSON.stringify({
    jsonlPath: '/tmp/news-flash.jsonl',
    record: {
      ok: true,
      item_count: 2,
      items: [{ title: 'A' }, { title: 'B' }],
    },
  }, null, 2))

  assert.equal(validation.ok, true)
  assert.equal(validation.recordOk, true)
  assert.equal(validation.itemCount, 2)
})

test(
  'news flash status reads installed plist path over repo-root',
  { skip: windowsPosixSkip },
  async () => {
    const previousHome = process.env.HOME
    const previousPath = process.env.PATH
    const tempDir = await mkdtemp(join(tmpdir(), 'news-flash-status-plist-'))
    const homeDir = join(tempDir, 'home')
    const binDir = join(tempDir, 'bin')
    const templateDir = join(tempDir, 'installed-template')
    const repoRoot = join(tempDir, 'installed-repo')
    try {
      process.env.HOME = homeDir
      process.env.PATH = `${binDir}:${previousPath ?? ''}`
      await import('node:fs/promises').then(async fs => {
        await fs.mkdir(join(homeDir, 'Library/LaunchAgents'), { recursive: true })
        await fs.mkdir(templateDir, { recursive: true })
        await fs.mkdir(binDir, { recursive: true })
        await fs.writeFile(join(binDir, 'launchctl'), '#!/bin/sh\nexit 1\n', {
          mode: 0o755,
        })
      })

      const plist = createLaunchAgentPlist({
        label: 'com.public-apis-cli.experimental.news-flash.hackernews',
        templateDir,
        intervalSeconds: 60,
        repoRoot,
        shellPath: '/bin/sh',
      })
      await writeFile(
        join(
          homeDir,
          'Library/LaunchAgents',
          'com.public-apis-cli.experimental.news-flash.hackernews.plist',
        ),
        plist,
      )

      const result = await getNewsFlashStatus({
        provider: 'hackernews',
        repoRoot: '/wrong/repo',
      })
      const monitor = result.monitors[0]
      assert.ok(monitor)
      assert.equal(monitor.statusSource, 'installed-plist')
      assert.equal(monitor.templateDir, templateDir)
      assert.equal(monitor.installedWorkingDirectory, templateDir)
      assert.equal(monitor.installedRepoRoot, repoRoot)
      assert.equal(
        monitor.latestSummaryPath,
        join(templateDir, 'summary/news-flash.txt'),
      )
    } finally {
      if (previousHome === undefined) delete process.env.HOME
      else process.env.HOME = previousHome
      if (previousPath === undefined) delete process.env.PATH
      else process.env.PATH = previousPath
      await rm(tempDir, { recursive: true, force: true })
    }
  },
)
