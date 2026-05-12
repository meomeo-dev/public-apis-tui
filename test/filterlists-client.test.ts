import assert from 'node:assert/strict'
import test from 'node:test'
import { listFilterLists } from '../src/application/usecases/filterLists.js'
import {
  FilterListsClient,
  normalizeFilterListsInput,
} from '../src/infrastructure/openApis/filterListsClient.js'
import { RuntimeFailure } from '../src/shared/errors/runtimeFailure.js'

test('FilterLists client reads directory metadata and joins lookup names', async () => {
  const seenPaths: string[] = []
  const client = new FilterListsClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      assert.equal(url.hostname, 'api.filterlists.com')
      seenPaths.push(url.pathname)
      return jsonResponse(fixtureForPath(url.pathname))
    }) as typeof fetch,
  })

  const result = await client.listLists({ query: 'privacy', limit: 10, tagId: 9 })
  assert.deepEqual(seenPaths.sort(), [
    '/languages',
    '/licenses',
    '/lists',
    '/maintainers',
    '/syntaxes',
    '/tags',
  ])
  assert.equal(result.summary.totalLists, 2)
  assert.equal(result.summary.totalSafeLists, 2)
  assert.equal(result.summary.restrictedExcluded, 0)
  assert.equal(result.summary.totalMatched, 1)
  assert.equal(result.summary.returned, 1)
  assert.equal(result.lists[0]?.name, 'EasyPrivacy')
  assert.equal(result.lists[0]?.license, 'GPLv3')
  assert.deepEqual(result.lists[0]?.tags, ['privacy'])
  assert.deepEqual(result.lists[0]?.syntaxes, ['Adblock Plus'])
  assert.deepEqual(result.lists[0]?.languages, ['English'])
  assert.deepEqual(result.lists[0]?.maintainers, ['The EasyList Authors'])
})

test('FilterLists usecase projects TUI-ready JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input =>
    jsonResponse(fixtureForPath(new URL(String(input)).pathname))) as typeof fetch

  try {
    const result = await listFilterLists({ query: 'ads', limit: 1 })
    assert.equal(result.kind, 'filterlists.lists')
    assert.equal(result.api.provider, 'filterlists')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.pagination.maxLimit, 100)
    assert.equal(result.lists[0]?.name, 'EasyList')
    assert.match(result.api.safety, /does not download raw/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('FilterLists normalizer enforces curated bounds', () => {
  assert.deepEqual(normalizeFilterListsInput({}), {
    query: 'privacy',
    limit: 25,
    tagId: undefined,
    syntaxId: undefined,
    languageId: undefined,
    licenseId: undefined,
  })
  assert.deepEqual(normalizeFilterListsInput({ query: ' * ', limit: 3, tagId: 2 }), {
    query: '*',
    limit: 3,
    tagId: 2,
    syntaxId: undefined,
    languageId: undefined,
    licenseId: undefined,
  })
  assert.throws(() => normalizeFilterListsInput({ limit: 101 }), RuntimeFailure)
  assert.throws(() => normalizeFilterListsInput({ tagId: 0 }), RuntimeFailure)
  assert.throws(
    () => normalizeFilterListsInput({ query: 'x'.repeat(81) }),
    RuntimeFailure,
  )
})

test('FilterLists client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new FilterListsClient({
    fetchImpl: (async () =>
      new Response('<!DOCTYPE html><title>Just a moment...</title>', {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      })) as typeof fetch,
  })

  await assert.rejects(
    () => client.listLists({ query: 'privacy', limit: 1 }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function fixtureForPath(pathname: string): unknown {
  switch (pathname) {
    case '/lists':
      return [
        {
          id: 301,
          name: 'EasyList',
          description: 'Primary ads filter list.',
          licenseId: 1,
          syntaxIds: [3],
          languageIds: [37],
          tagIds: [2],
          maintainerIds: [7],
        },
        {
          id: 302,
          name: 'EasyPrivacy',
          description: 'Privacy protection filters.',
          licenseId: 1,
          syntaxIds: [3],
          languageIds: [37],
          tagIds: [9],
          maintainerIds: [7],
        },
      ]
    case '/licenses':
      return [{ id: 1, name: 'GPLv3' }]
    case '/syntaxes':
      return [{ id: 3, name: 'Adblock Plus' }]
    case '/languages':
      return [{ id: 37, name: 'English' }]
    case '/tags':
      return [{ id: 2, name: 'ads' }, { id: 9, name: 'privacy' }]
    case '/maintainers':
      return [{ id: 7, name: 'The EasyList Authors' }]
    default:
      throw new Error(`Unexpected fixture path ${pathname}`)
  }
}
