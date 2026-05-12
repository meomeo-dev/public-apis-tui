import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getUrantiaPaper,
  getUrantiaParagraph,
  getUrantiaToc,
  normalizeUrantiaPaperInput,
  normalizeUrantiaParagraphInput,
  normalizeUrantiaSearchInput,
  normalizeUrantiaTocInput,
  searchUrantia,
} from '../src/application/usecases/urantia.js'
import { UrantiaClient } from '../src/infrastructure/openApis/urantiaClient.js'

test('Urantia client calls documented no-auth JSON endpoints', async () => {
  const requestedUrls: URL[] = []
  const client = new UrantiaClient({
    baseUrl: 'https://api.urantia.example',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requestedUrls.push(url)
      return jsonResponse(responseForUrl(url))
    }) as typeof fetch,
  })

  const toc = await client.toc()
  const paper = await client.paper('0', 'eng')
  const paragraph = await client.paragraph('0:0.1', 'eng')
  const search = await client.search({
    query: 'thought adjuster',
    type: 'and',
    limit: 3,
    page: 0,
    lang: 'eng',
  })

  assert.equal(requestedUrls[0]?.pathname, '/toc')
  assert.equal(requestedUrls[1]?.pathname, '/papers/0')
  assert.equal(requestedUrls[1]?.searchParams.get('lang'), 'eng')
  assert.equal(requestedUrls[2]?.pathname, '/paragraphs/0%3A0.1')
  assert.equal(requestedUrls[3]?.pathname, '/search')
  assert.equal(requestedUrls[3]?.searchParams.get('q'), 'thought adjuster')
  assert.equal(toc[0]?.papers[0]?.title, 'Foreword')
  assert.equal(paper.paragraphs[0]?.standardReferenceId, '0:0.1')
  assert.equal(paragraph.navigation.next, '0:0.2')
  assert.equal(search.meta.total, 244)
})

test('Urantia usecases project bounded text-only no-auth results', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    return jsonResponse(responseForUrl(url))
  }) as typeof fetch

  try {
    const toc = await getUrantiaToc({ limit: 1 })
    assert.equal(toc.kind, 'urantia.toc')
    assert.equal(toc.api.authentication, 'none')
    assert.equal(toc.api.usesBrowserClickstream, false)
    assert.equal(toc.parts.length, 1)

    const paper = await getUrantiaPaper({ paperId: '0', limit: 1 })
    assert.equal(paper.kind, 'urantia.paper')
    assert.equal(paper.paper.title, 'Foreword')
    assert.equal(paper.paragraphs.length, 1)
    assert.equal('htmlText' in paper.paragraphs[0]!, false)
    assert.equal('audio' in paper.paragraphs[0]!, false)

    const paragraph = await getUrantiaParagraph({ ref: '0:0.1' })
    assert.equal(paragraph.kind, 'urantia.paragraph')
    assert.equal(paragraph.paragraph.text.includes('Urantia'), true)
    assert.equal(paragraph.navigation.next, '0:0.2')

    const search = await searchUrantia({ query: 'thought adjuster', limit: 3 })
    assert.equal(search.kind, 'urantia.search')
    assert.equal(search.paragraphs[0]?.standardReferenceId, '16:8.3')
    assert.equal(search.pagination.nextPage, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Urantia normalizers enforce curated bounds and path safety', () => {
  assert.deepEqual(normalizeUrantiaTocInput({}), { limit: 5, offset: 0 })
  assert.deepEqual(normalizeUrantiaPaperInput({}), {
    paperId: '0',
    lang: 'eng',
    limit: 10,
    offset: 0,
  })
  assert.deepEqual(normalizeUrantiaParagraphInput({}), {
    ref: '0:0.1',
    lang: 'eng',
  })
  assert.deepEqual(normalizeUrantiaSearchInput({}), {
    query: 'thought adjuster',
    type: 'and',
    limit: 10,
    page: 0,
    lang: 'eng',
  })
  assert.throws(() => normalizeUrantiaPaperInput({ paperId: '197' }), /0 to 196/)
  assert.throws(() => normalizeUrantiaPaperInput({ lang: 'xx' }), /eng, es/)
  assert.throws(() => normalizeUrantiaParagraphInput({ ref: '../secret' }), /--ref/)
  assert.throws(() => normalizeUrantiaSearchInput({ query: '' }), /1 and 500/)
  assert.throws(() => normalizeUrantiaSearchInput({ limit: 101 }), /1 to 50/)
  assert.throws(() => normalizeUrantiaSearchInput({ type: 'semantic' }), /and, or/)
})

test('Urantia client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new UrantiaClient({
    baseUrl: 'https://api.urantia.example',
    fetchImpl: (async () => new Response(
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
  })

  await assert.rejects(
    () => client.toc(),
    /Cloudflare challenge HTML page/u,
  )
})

function responseForUrl(url: URL): Record<string, unknown> {
  if (url.pathname === '/toc') return createTocFixture()
  if (url.pathname === '/papers/0') return createPaperFixture()
  if (url.pathname === '/paragraphs/0%3A0.1') {
    return { data: createParagraphFixture(), navigation: { prev: null, next: '0:0.2' } }
  }
  if (url.pathname === '/search') {
    return {
      data: [createParagraphFixture({
        id: '1:16.8.3',
        standardReferenceId: '16:8.3',
        paperId: '16',
        paperTitle: 'The Seven Master Spirits',
        sectionTitle: 'Urantia Personality',
      })],
      meta: { page: 0, limit: 3, total: 244, totalPages: 82 },
    }
  }
  return { data: [] }
}

function createTocFixture(): Record<string, unknown> {
  return {
    data: {
      parts: [{
        id: '0',
        title: 'Foreword',
        sponsorship: null,
        papers: [{ id: '0', title: 'Foreword', labels: ['Theology'] }],
      }],
    },
  }
}

function createPaperFixture(): Record<string, unknown> {
  return {
    data: {
      paper: {
        id: '0',
        partId: '0',
        title: 'Foreword',
        sortId: '0.000.000.000',
        labels: ['Theology'],
        video: { nova: { mp4: 'https://video.example/0.mp4' } },
      },
      paragraphs: [createParagraphFixture()],
    },
  }
}

function createParagraphFixture(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: '0:0.0.1',
    standardReferenceId: '0:0.1',
    sortId: '0.000.000.001',
    paperId: '0',
    sectionId: '0',
    partId: '0',
    paperTitle: 'Foreword',
    sectionTitle: null,
    paragraphId: '1',
    text: 'IN THE MINDS of the mortals of Urantia there exists great confusion.',
    htmlText: '<span>IN THE MINDS</span>',
    labels: ['Theology'],
    audio: { nova: { mp3: 'https://audio.example/0.mp3' } },
    ...overrides,
  }
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
