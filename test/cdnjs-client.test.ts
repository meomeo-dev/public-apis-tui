import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getCdnjsLibrary,
  getCdnjsVersion,
  normalizeCdnjsLibraryInput,
  normalizeCdnjsSearchInput,
  searchCdnjsLibraries,
} from '../src/application/usecases/cdnjs.js'
import { CdnjsClient } from '../src/infrastructure/openApis/cdnjsClient.js'

const searchFixture = {
  results: [
    {
      name: 'jquery',
      latest: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js',
      version: '3.7.1',
      filename: 'jquery.min.js',
      description: 'JavaScript library for DOM operations',
      keywords: ['jquery', 'library'],
      license: 'MIT',
      homepage: 'https://jquery.com/',
      sri: 'sha512-search',
      github: { user: 'jquery', repo: 'jquery', stargazers_count: 59543, forks: 20557, subscribers_count: 3151 },
      repository: { type: 'git', url: 'https://github.com/jquery/jquery.git' },
    },
  ],
  total: 1,
  available: 6169,
}

const libraryFixture = {
  name: 'jquery',
  latest: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js',
  version: '3.7.1',
  filename: 'jquery.min.js',
  description: 'JavaScript library for DOM operations',
  keywords: ['jquery', 'library'],
  license: 'MIT',
  homepage: 'https://jquery.com/',
  sri: 'sha512-current',
  github: { user: 'jquery', repo: 'jquery', stargazers_count: 59543, forks: 20557, subscribers_count: 3151 },
  repository: { type: 'git', url: 'https://github.com/jquery/jquery.git' },
  assets: [
    {
      version: '3.7.1',
      files: ['jquery.js', 'jquery.min.js'],
      rawFiles: ['jquery.js', 'jquery.min.js'],
      sri: { 'jquery.js': 'sha512-js', 'jquery.min.js': 'sha512-min' },
    },
  ],
}

test('CDNJS client calls documented search, library, and version endpoints', async () => {
  const requested: string[] = []
  const client = new CdnjsClient({
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requested.push(`${url.pathname}?${url.searchParams.toString()}`)
      if (url.pathname === '/libraries') {
        return jsonResponse(searchFixture)
      }
      if (url.pathname === '/libraries/jquery') {
        return jsonResponse(libraryFixture)
      }
      if (url.pathname === '/libraries/jquery/3.7.1') {
        return jsonResponse({ files: ['jquery.js', 'jquery.min.js'], sri: { 'jquery.min.js': 'sha512-min' } })
      }
      return jsonResponse({ error: 'missing' }, 404)
    }) as typeof fetch,
  })

  assert.equal((await client.searchLibraries({ search: 'jquery', fields: ['version'], searchFields: ['name'], limit: 3 })).results[0]?.name, 'jquery')
  assert.equal((await client.getLibrary('jquery', { fields: ['assets'] })).assets[0]?.version, '3.7.1')
  assert.equal((await client.getVersion('jquery', '3.7.1', { fields: ['files', 'sri'] })).sri['jquery.min.js'], 'sha512-min')
  assert.deepEqual(requested, [
    '/libraries?search=jquery&fields=version&search_fields=name&limit=3',
    '/libraries/jquery?fields=assets',
    '/libraries/jquery/3.7.1?fields=files%2Csri',
  ])
})

test('CDNJS usecases project no-auth metadata and bounded output', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/libraries') {
      return jsonResponse(searchFixture)
    }
    if (url.pathname === '/libraries/jquery') {
      return jsonResponse(libraryFixture)
    }
    return jsonResponse({ files: ['jquery.js', 'jquery.min.js'], sri: { 'jquery.min.js': 'sha512-min' } })
  }) as typeof fetch

  try {
    const search = await searchCdnjsLibraries({ query: 'jquery', limit: 1 })
    assert.equal(search.kind, 'cdnjs.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.libraries[0]?.github?.stars, 59543)

    const library = await getCdnjsLibrary({ name: 'jquery', versionLimit: 1, fileLimit: 1 })
    assert.equal(library.kind, 'cdnjs.library')
    assert.equal(library.library.assets[0]?.files.length, 1)

    const version = await getCdnjsVersion({ name: 'jquery', version: '3.7.1', fileLimit: 2 })
    assert.equal(version.kind, 'cdnjs.version')
    assert.equal(version.totalFiles, 2)
    assert.equal(version.files[1]?.sri, 'sha512-min')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('CDNJS normalizers enforce curated caps and search fields', () => {
  assert.deepEqual(normalizeCdnjsSearchInput({ query: ' react ', searchFields: 'name,keywords', limit: 2 }), {
    query: 'react',
    searchFields: ['name', 'keywords'],
    limit: 2,
  })
  assert.equal(normalizeCdnjsSearchInput({}).limit, 1000)
  assert.equal(normalizeCdnjsLibraryInput({}).versionLimit, 20)
  assert.throws(() => normalizeCdnjsSearchInput({ limit: 1001 }), /between 1 and 1000/)
  assert.throws(() => normalizeCdnjsSearchInput({ searchFields: 'bad' }), /search fields/)
})

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
