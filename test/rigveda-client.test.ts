import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeRigVedaBookInput,
  normalizeRigVedaSearchInput,
  searchRigVeda,
  getRigVedaBook,
} from '../src/application/usecases/rigVeda.js'
import { RigVedaClient } from '../src/infrastructure/openApis/rigVedaClient.js'

test('Rig Veda client calls documented metadata endpoints', async () => {
  const requestedUrls: string[] = []
  const client = new RigVedaClient(
    'https://indica-1hwj.onrender.com/rv/v2/meta',
    (async input => {
      requestedUrls.push(String(input))
      return jsonResponse([createRigVedaRecord()])
    }) as typeof fetch,
  )

  await client.book(4)
  await client.god('ganga')
  await client.godInBook('agni', 1)
  await client.godByPoet('agni', 'vasishth')
  await client.godCategoryByPoetCategory('divine male', 'human male')

  assert.deepEqual(requestedUrls, [
    'https://indica-1hwj.onrender.com/rv/v2/meta/book/4',
    'https://indica-1hwj.onrender.com/rv/v2/meta/god/ganga',
    'https://indica-1hwj.onrender.com/rv/v2/meta/god/agni/1',
    'https://indica-1hwj.onrender.com/rv/v2/meta/godbypoet/agni/vasishth',
    [
      'https://indica-1hwj.onrender.com/rv/v2/meta/',
      'godcategorybypoetcategory/divine%20male/human%20male',
    ].join(''),
  ])
})

test('Rig Veda usecases project metadata and local pagination', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/book/4')) {
      return jsonResponse([
        createRigVedaRecord({ mandal: 4, sukta: 1, sungfor: 'Agni' }),
        createRigVedaRecord({ mandal: 4, sukta: 2, sungfor: 'Indra' }),
        createRigVedaRecord({ mandal: 4, sukta: 3, sungfor: 'Agni' }),
      ])
    }
    assert.equal(url.pathname, '/rv/v2/meta/god/ganga')
    return jsonResponse([createRigVedaRecord({
      mandal: 10,
      sukta: 75,
      sungfor: 'Ganga',
      sungforcategory: 'divine female',
    })])
  }) as typeof fetch

  try {
    const book = await getRigVedaBook({ mandal: 4, limit: 2, offset: 1 })
    assert.equal(book.kind, 'rigveda.book')
    assert.equal(book.api.authentication, 'none')
    assert.equal(book.api.usesBrowserClickstream, false)
    assert.equal(book.pagination.total, 3)
    assert.equal(book.pagination.returned, 2)
    assert.equal(book.verses[0]?.sukta, 2)
    assert.deepEqual(book.facets.gods, ['Agni', 'Indra'])

    const search = await searchRigVeda({ field: 'god', value: 'ganga' })
    assert.equal(search.kind, 'rigveda.search')
    assert.equal(search.query.field, 'god')
    assert.equal(search.verses[0]?.sungfor, 'Ganga')
    assert.match(search.api.boundary, /Read-only Rig Veda metadata/u)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Rig Veda normalization rejects unsafe or warning-as-data inputs', () => {
  assert.deepEqual(normalizeRigVedaBookInput({}), {
    mandal: 1,
    limit: 20,
    offset: 0,
  })
  assert.equal(normalizeRigVedaSearchInput({}).value, 'ganga')
  assert.equal(
    normalizeRigVedaSearchInput({
      field: 'god-category-by-poet-category',
      value: 'DIVINE MALE',
      poetCategory: 'Human Male',
    }).poetCategory,
    'human male',
  )
  assert.throws(
    () => normalizeRigVedaBookInput({ mandal: 11 }),
    /--mandal must be an integer from 1 to 10/u,
  )
  assert.throws(
    () => normalizeRigVedaSearchInput({ field: 'godcategory', value: 'gods' }),
    /--field must be one of/u,
  )
  assert.throws(
    () => normalizeRigVedaSearchInput({ field: 'god-category', value: 'gods' }),
    /god categories must be one of/u,
  )
  assert.throws(
    () => normalizeRigVedaSearchInput({ field: 'poet', value: '../secret' }),
    /must not include slash/u,
  )
  assert.throws(
    () => normalizeRigVedaSearchInput({ limit: 101 }),
    /--limit must be an integer from 1 to 100/u,
  )
})

test('Rig Veda client rejects HTML warnings and malformed records', async () => {
  const htmlClient = new RigVedaClient(
    'https://indica-1hwj.onrender.com/rv/v2/meta',
    (async () => new Response('A god can belong to only these categories', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })) as typeof fetch,
  )
  await assert.rejects(() => htmlClient.godCategory('gods'), /was not JSON/u)

  const malformedClient = new RigVedaClient(
    'https://indica-1hwj.onrender.com/rv/v2/meta',
    (async () => jsonResponse([{ mandal: 1, sukta: 1 }])) as typeof fetch,
  )
  await assert.rejects(() => malformedClient.book(1), /missing string field meter/u)
})

test('Rig Veda client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new RigVedaClient(
    'https://indica-1hwj.onrender.com/rv/v2/meta',
    (async () => new Response(
      '<!DOCTYPE html><title>Just a moment...</title>',
      {
        status: 403,
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      },
    )) as typeof fetch,
  )

  await assert.rejects(
    () => client.book(1),
    /Cloudflare challenge HTML page/u,
  )
})

function createRigVedaRecord(
  overrides: Partial<ReturnType<typeof baseRigVedaRecord>> = {},
): Record<string, unknown> {
  return { ...baseRigVedaRecord(), ...overrides }
}

function baseRigVedaRecord(): Record<string, unknown> {
  return {
    mandal: 1,
    meter: 'Gayatri',
    sukta: 1,
    sungby: 'Madhuchchhanda Vaishwamitra',
    sungbycategory: 'human male',
    sungfor: 'Agni',
    sungforcategory: 'divine male',
  }
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
