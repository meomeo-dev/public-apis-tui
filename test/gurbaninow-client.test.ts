import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getGurbaniNowBani,
  listGurbaniNowBanis,
  normalizeGurbaniNowBaniInput,
  normalizeGurbaniNowSearchInput,
  searchGurbaniNow,
} from '../src/application/usecases/gurbaninow.js'
import { GurbaniNowClient } from '../src/infrastructure/openApis/gurbaninowClient.js'

const searchFixture = {
  inputvalues: {
    searchvalue: 'DDrgj',
    searchtype: '1',
    source: '1',
    results: '2',
    skip: 0,
  },
  count: 1,
  shabads: [
    {
      shabad: {
        id: 'YLSG',
        type: 4,
        shabadid: '02L',
        gurmukhi: {
          akhar: 'DMnu DMnu rwmdws guru ijin isirAw iqnY svwirAw ]',
          unicode: (
            'ਧੰਨੁ ਧੰਨੁ ਰਾਮਦਾਸ ' +
            'ਗੁਰੁ ਜਿਨਿ ਸਿਰਿਆ ' +
            'ਤਿਨੈ ਸਵਾਰਿਆ ॥'
          ),
        },
        translation: {
          english: {
            default: 'Blessed, blessed is Guru Raam Daas.',
          },
        },
        transliteration: {
          english: { text: 'dhan dhan raamadaas gur' },
        },
        source: {
          id: 1,
          english: 'Sri Guru Granth Sahib Ji',
          length: 1430,
        },
        writer: { id: 35, english: 'Satta and Balwand' },
        raag: { id: 22, english: 'Raag Raamkalee' },
        pageno: 968,
        lineno: 9,
      },
    },
  ],
  error: false,
}

const banisFixture = [
  {
    id: 1,
    akhar: 'jpu jI swihb',
    unicode: 'ਜਪੁ ਜੀ ਸਾਹਿਬ',
    english: 'Jap Ji Sahib',
  },
  {
    id: 2,
    akhar: 'jwpu swihb',
    unicode: 'ਜਾਪੁ ਸਾਹਿਬ',
    english: 'Jaap Sahib',
  },
]

const baniFixture = {
  baniinfo: {
    id: 1,
    akhar: 'jpu jI swihb',
    unicode: 'ਜਪੁ ਜੀ ਸਾਹਿਬ',
    english: 'Jap Ji Sahib',
    count: 2,
    source: { id: 1, english: 'Sri Guru Granth Sahib Ji', length: 1430 },
    writer: { id: 1, english: 'Guru Nanak Dev Ji' },
    raag: { id: 1, english: 'Jap' },
  },
  bani: [
    {
      line: {
        id: '0NVY',
        shabadid: 'DMP',
        gurmukhi: {
          unicode: (
            'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ' +
            'ਨਿਰਵੈਰੁ ॥'
          ),
        },
        translation: {
          english: { default: 'One Universal Creator God.' },
        },
        transliteration: {
          english: { text: 'ik oankaar sat naam' },
        },
        linenum: 1,
      },
    },
    {
      line: {
        id: 'RBP6',
        gurmukhi: { unicode: '॥ ਜਪੁ ॥' },
        translation: { english: { default: 'Chant And Meditate:' } },
        linenum: 2,
      },
    },
  ],
}

test('GurbaniNow client calls search, banis, and bani endpoints', async () => {
  const requestedUrls: URL[] = []
  const client = new GurbaniNowClient({
    baseUrl: 'https://api.gurbani.test/v2',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requestedUrls.push(url)
      if (url.pathname.includes('/search/')) return jsonResponse(searchFixture)
      if (url.pathname.endsWith('/banis')) return jsonResponse(banisFixture)
      return jsonResponse(baniFixture)
    }) as typeof fetch,
  })

  const search = await client.search({
    query: 'DDrgj',
    source: 1,
    searchType: 1,
    writer: 35,
    raag: 22,
    ang: 968,
    results: 2,
    skip: 3,
  })
  const banis = await client.listBanis()
  const bani = await client.getBani({ id: 1, offset: 0, limit: 2 })

  assert.equal(requestedUrls[0]?.pathname, '/v2/search/DDrgj/')
  assert.equal(requestedUrls[0]?.searchParams.get('source'), '1')
  assert.equal(requestedUrls[0]?.searchParams.get('searchtype'), '1')
  assert.equal(requestedUrls[0]?.searchParams.get('writer'), '35')
  assert.equal(requestedUrls[0]?.searchParams.get('raag'), '22')
  assert.equal(requestedUrls[0]?.searchParams.get('ang'), '968')
  assert.equal(requestedUrls[0]?.searchParams.get('results'), '2')
  assert.equal(requestedUrls[0]?.searchParams.get('skip'), '3')
  assert.equal(search.shabads[0]?.writer?.english, 'Satta and Balwand')

  assert.equal(requestedUrls[1]?.pathname, '/v2/banis')
  assert.equal(banis[0]?.english, 'Jap Ji Sahib')
  assert.equal(requestedUrls[2]?.pathname, '/v2/banis/1')
  assert.equal(bani.baniinfo.english, 'Jap Ji Sahib')
  assert.equal(bani.bani[0]?.translation?.english, 'One Universal Creator God.')
})

test('GurbaniNow usecases project no-auth bounded summaries', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.includes('/search/')) return jsonResponse(searchFixture)
    if (url.pathname.endsWith('/banis')) return jsonResponse(banisFixture)
    return jsonResponse(baniFixture)
  }) as typeof fetch

  try {
    const search = await searchGurbaniNow({ query: 'DDrgj', results: 2 })
    assert.equal(search.kind, 'gurbaninow.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.pagination.total, 1)
    const line = search.shabads[0]?.line as Record<string, unknown> | undefined
    const gurmukhi = line?.gurmukhi as Record<string, unknown> | undefined
    assert.equal(
      gurmukhi?.unicode,
      (
        'ਧੰਨੁ ਧੰਨੁ ਰਾਮਦਾਸ ਗੁਰੁ ' +
        'ਜਿਨਿ ਸਿਰਿਆ ਤਿਨੈ ਸਵਾਰਿਆ ॥'
      ),
    )

    const banis = await listGurbaniNowBanis({ limit: 1 })
    assert.equal(banis.kind, 'gurbaninow.banis')
    assert.equal(banis.count, 1)
    assert.equal(banis.total, 2)

    const bani = await getGurbaniNowBani({ id: 1, offset: 1, limit: 1 })
    assert.equal(bani.kind, 'gurbaninow.bani')
    assert.equal(bani.pagination.total, 2)
    assert.equal(bani.pagination.returned, 1)
    assert.equal(bani.lines[0]?.id, 'RBP6')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('GurbaniNow normalizers reject invalid or unbounded input', () => {
  assert.deepEqual(normalizeGurbaniNowSearchInput({}), {
    query: 'DDrgj',
    source: 1,
    searchType: 1,
    writer: undefined,
    raag: undefined,
    ang: undefined,
    results: 10,
    skip: 0,
  })
  assert.throws(
    () => normalizeGurbaniNowSearchInput({ searchType: 3 }),
    /search-type must be one of/u,
  )
  assert.throws(
    () => normalizeGurbaniNowSearchInput({ results: 51 }),
    /results must be an integer from 1 to 50/u,
  )
  assert.throws(
    () => normalizeGurbaniNowSearchInput({ skip: 10001 }),
    /skip must be an integer from 0 to 10000/u,
  )
  assert.throws(
    () => normalizeGurbaniNowBaniInput({ id: 0 }),
    /id must be a positive integer/u,
  )
  assert.throws(
    () => normalizeGurbaniNowBaniInput({ limit: 121 }),
    /limit must be an integer from 1 to 120/u,
  )
})

test('GurbaniNow client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new GurbaniNowClient({
    baseUrl: 'https://api.gurbani.test/v2',
    fetchImpl: (async () =>
      new Response('<!DOCTYPE html><title>Just a moment...</title>', {
        status: 403,
        statusText: 'Forbidden',
        headers: {
          'content-type': 'text/html; charset=UTF-8',
          'server': 'cloudflare',
          'cf-mitigated': 'challenge',
        },
      })) as typeof fetch,
  })

  await assert.rejects(
    () =>
      client.search({
        query: 'DDrgj',
        source: 1,
        searchType: 1,
        results: 1,
        skip: 0,
      }),
    /Cloudflare challenge HTML page/u,
  )
})

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
