import assert from 'node:assert/strict'
import test from 'node:test'
import { getOpenCollectiveAccount } from '../src/application/usecases/openCollective.js'
import { OpenCollectiveClient, normalizeOpenCollectiveAccountInput } from '../src/infrastructure/openApis/openCollectiveClient.js'

test('Open Collective client posts public GraphQL account query without auth', async () => {
  let body = ''
  const client = new OpenCollectiveClient({
    fetchImpl: async (_input, init) => {
      body = String(init?.body)
      return jsonResponse(createFixture())
    },
  })
  const result = await client.account({ slug: 'webpack' })
  const parsed = JSON.parse(body) as { variables: Record<string, unknown> }
  assert.equal(parsed.variables.slug, 'webpack')
  assert.equal(result.name, 'webpack')
  assert.equal(result.stats.balance?.valueInCents, 9711549)
})

test('Open Collective usecase projects no-auth metadata and account stats', async () => {
  const previousFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(createFixture())) as typeof fetch
  try {
    const result = await getOpenCollectiveAccount({ slug: 'webpack' })
    assert.equal(result.kind, 'opencollective.account')
    assert.equal(result.api.authentication, 'none for public GraphQL reads')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.account.slug, 'webpack')
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('Open Collective normalizer validates public account slugs', () => {
  assert.deepEqual(normalizeOpenCollectiveAccountInput({ slug: 'Webpack' }), { slug: 'webpack' })
  assert.deepEqual(normalizeOpenCollectiveAccountInput({ slug: 'open-source' }), { slug: 'open-source' })
  assert.throws(() => normalizeOpenCollectiveAccountInput({ slug: '-bad' }), /--slug/)
})

function createFixture() {
  return {
    data: {
      account: {
        id: 'account-1',
        slug: 'webpack',
        type: 'COLLECTIVE',
        name: 'webpack',
        description: 'webpack is a build solution for modern web applications.',
        website: 'https://webpack.js.org/',
        imageUrl: 'https://images.opencollective.com/webpack/logo.png',
        currency: 'USD',
        isVerified: true,
        isActive: true,
        isArchived: false,
        tags: ['open-source', 'javascript'],
        stats: {
          balance: { valueInCents: 9711549, currency: 'USD' },
          yearlyBudget: { valueInCents: 15916255, currency: 'USD' },
          totalAmountReceived: { valueInCents: 196101735, currency: 'USD' },
        },
      },
    },
  }
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}
