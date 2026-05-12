import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createSiteAdapter,
  createSiteRegistry,
  defaultSiteConfig,
  loadSiteRegistryFromEnv,
} from '../src/infrastructure/site/siteRegistry.js'
import type { SiteRegistryConfig } from '../src/infrastructure/site/siteAdapter.js'

test('default site adapter exposes Public APIs contract', () => {
  const adapter = createSiteAdapter()

  assert.equal(adapter.config.id, 'public-apis-tui')
  assert.equal(adapter.config.baseUrl, 'https://github.com/public-apis/public-apis')
  assert.equal(adapter.config.selectors.ready, 'body')
  assert.equal(adapter.config.auth.mode, 'none')
})

test('site registry can model multiple sites and multiple auth profiles', () => {
  const registry = createSiteRegistry(createDocsRegistryFixture())

  assert.equal(registry.defaultSite.id, 'docs-internal')
  assert.equal(registry.getSite('docs-public').auth.mode, 'none')
  assert.equal(registry.getSite('docs-internal').auth.mode, 'required')
  assert.equal(registry.getAuthProfile('docs-reviewer').label, 'Docs reviewer profile')
  assert.equal(registry.getAuthProfile('docs-reviewer').profile?.interaction?.scrollIntoView, true)
  assert.equal(registry.listSitesForAuthProfile('docs-reviewer')[0]?.id, 'docs-internal')
  assert.equal(
    registry.config.workflows[0]?.steps.map(step => step.siteId).join(' -> '),
    'docs-public -> docs-internal',
  )
})

test('site registry rejects workflow references to unknown sites', () => {
  const config = createDocsRegistryFixture()
  config.workflows[0]?.steps.push({
    id: 'bad-step',
    siteId: 'missing',
    kind: 'open',
    description: 'Broken fixture step.',
  })

  assert.throws(() => createSiteRegistry(config), /unknown site/)
})

test('site registry rejects unknown auth profile references', () => {
  const config = createDocsRegistryFixture()
  const internalDocs = config.sites.find(site => site.id === 'docs-internal')
  assert.ok(internalDocs)
  internalDocs.auth.profileId = 'missing-profile'

  assert.throws(() => createSiteRegistry(config), /unknown auth profile/)
})

test('site registry config can be supplied by environment variables', () => {
  const previous = snapshotEnv()
  try {
    process.env.SITE_ID = 'docs-example'
    process.env.SITE_NAME = 'Example Docs'
    process.env.SITE_BASE_URL = 'https://example.com/docs/'
    process.env.SITE_READY_SELECTOR = 'body'
    process.env.SITE_SEARCH_INPUT_SELECTOR = 'input[name=query]'
    process.env.SITE_RESULT_ITEMS_SELECTOR = '.doc-card, article'
    process.env.SITE_AUTH_MODE = 'optional'
    process.env.SITE_AUTH_PROFILE_ID = 'docs-reviewer'
    process.env.SITE_AUTH_PROFILE_LABEL = 'Docs reviewer profile'
    process.env.SITE_AUTH_USER_DATA_DIR = '/tmp/docs-reviewer'
    process.env.SITE_ROLES = 'search,content'

    const registry = loadSiteRegistryFromEnv()
    const config = registry.defaultSite
    assert.equal(config.id, 'docs-example')
    assert.equal(config.name, 'Example Docs')
    assert.equal(config.baseUrl, 'https://example.com/docs/')
    assert.equal(config.selectors.searchInput, 'input[name=query]')
    assert.equal(config.selectors.resultItems, '.doc-card, article')
    assert.equal(config.auth.mode, 'optional')
    assert.equal(config.auth.profileId, 'docs-reviewer')
    assert.deepEqual(config.roles, ['search', 'content'])
    assert.equal(registry.getAuthProfile('docs-reviewer').label, 'Docs reviewer profile')
    assert.equal(registry.getAuthProfile('docs-reviewer').userDataDir, '/tmp/docs-reviewer')
  } finally {
    restoreEnv(previous)
  }
})

test('default config is valid for adapter construction', () => {
  assert.doesNotThrow(() => createSiteAdapter(defaultSiteConfig))
})

function createDocsRegistryFixture(): SiteRegistryConfig {
  return {
    defaultSiteId: 'docs-internal',
    authProfiles: [
      {
        id: 'docs-reviewer',
        label: 'Docs reviewer profile',
        userDataDir: '/tmp/cdp-cli-docs-reviewer-profile',
        profile: {
          interaction: {
            scrollIntoView: true,
            typeDelayMs: 30,
          },
        },
      },
    ],
    sites: [
      {
        id: 'docs-public',
        name: 'Public Docs',
        baseUrl: 'https://example.com/docs/',
        selectors: {
          ready: 'body',
          searchInput: 'input[name=q]',
          resultItems: 'a',
        },
        auth: { mode: 'none' },
        roles: ['docs', 'search'],
      },
      {
        id: 'docs-internal',
        name: 'Internal Docs',
        baseUrl: 'https://example.com/internal/docs/',
        selectors: {
          ready: 'body',
          resultItems: '.doc-card, article',
        },
        auth: {
          mode: 'required',
          profileId: 'docs-reviewer',
          loginUrl: 'https://example.com/internal/docs/session',
          checkSelector: '[data-session-ready="true"]',
        },
        roles: ['docs', 'internal'],
      },
    ],
    workflows: [
      {
        id: 'docs-public-to-internal',
        name: 'Public docs then internal docs',
        description: 'Use public docs search, then open internal docs with a prepared browser profile.',
        steps: [
          {
            id: 'search-public-docs',
            siteId: 'docs-public',
            kind: 'search',
            description: 'Search public docs.',
          },
          {
            id: 'open-internal-docs',
            siteId: 'docs-internal',
            kind: 'open',
            authProfileId: 'docs-reviewer',
            description: 'Open internal docs using the prepared profile.',
          },
        ],
      },
    ],
  }
}

function snapshotEnv(): NodeJS.ProcessEnv {
  return { ...process.env }
}

function restoreEnv(previous: NodeJS.ProcessEnv): void {
  process.env = previous
}
