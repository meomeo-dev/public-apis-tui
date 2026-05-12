import assert from 'node:assert/strict'
import test from 'node:test'
import { getNpmRegistryPackage, searchNpmRegistry } from '../src/application/usecases/npmRegistry.js'
import {
  NpmRegistryClient,
  normalizeNpmRegistryPackageInput,
  normalizeNpmRegistrySearchInput,
} from '../src/infrastructure/openApis/npmRegistryClient.js'

test('npm Registry client calls documented search and package endpoints', async () => {
  const requests: string[] = []
  const client = new NpmRegistryClient({
    baseUrl: 'https://registry.test',
    fetchImpl: (async input => {
      const url = new URL(String(input))
      requests.push(url.href)
      if (url.pathname === '/-/v1/search') {
        assert.equal(url.searchParams.get('text'), 'typescript')
        assert.equal(url.searchParams.get('size'), '250')
        assert.equal(url.searchParams.get('from'), '10')
        assert.equal(url.searchParams.get('quality'), '0.8')
        return jsonResponse(createSearchBody(url.href))
      }
      assert.equal(url.pathname, '/%40types/node')
      return jsonResponse(createPackageBody())
    }) as typeof fetch,
  })

  const search = await client.search({ query: 'typescript', from: 10, quality: 0.8 })
  const packageMetadata = await client.getPackageMetadata({ packageName: '@types/node', versionLimit: 1 })

  assert.deepEqual(requests, [
    'https://registry.test/-/v1/search?text=typescript&size=250&from=10&quality=0.8',
    'https://registry.test/%40types/node',
  ])
  assert.equal(search.total, 1)
  assert.equal(search.objects[0]?.package.name, 'typescript')
  assert.equal(packageMetadata.name, '@types/node')
  assert.equal(packageMetadata.latestVersion?.dependenciesCount, 1)
  assert.equal(packageMetadata.versions.length, 1)
})

test('npm Registry usecases project TUI-ready bounded JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/-/v1/search') {
      return jsonResponse(createSearchBody(url.href))
    }
    return jsonResponse(createPackageBody())
  }) as typeof fetch
  try {
    const search = await searchNpmRegistry({ query: 'typescript', size: 250 })
    assert.equal(search.kind, 'npmregistry.search')
    assert.equal(search.api.authentication, 'none')
    assert.equal(search.api.usesBrowserClickstream, false)
    assert.equal(search.api.documentedMaxSize, 250)
    assert.equal(search.query.size, 250)
    assert.equal(search.search.packages[0]?.name, 'typescript')
    assert.equal(search.pagination.hasNextPage, false)

    const packageResult = await getNpmRegistryPackage({ packageName: 'typescript', versionLimit: 1 })
    assert.equal(packageResult.kind, 'npmregistry.package')
    assert.equal(packageResult.api.authentication, 'none')
    assert.equal(packageResult.api.packumentProjection, 'summary-only-no-readme-or-full-versions')
    assert.equal(packageResult.package.name, '@types/node')
    assert.equal(packageResult.package.versions.length, 1)
    assert.equal('readme' in packageResult.package, false)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('npm Registry normalizers enforce documented and curated bounds', () => {
  assert.deepEqual(normalizeNpmRegistrySearchInput({ query: ' react ', from: 5, size: 250 }), {
    query: 'react',
    size: 250,
    from: 5,
  })
  assert.deepEqual(normalizeNpmRegistrySearchInput({ quality: '0.2', popularity: 0.7, maintenance: '1' }), {
    query: 'typescript',
    size: 250,
    from: 0,
    quality: 0.2,
    popularity: 0.7,
    maintenance: 1,
  })
  assert.deepEqual(normalizeNpmRegistryPackageInput({ packageName: '@types/node', versionLimit: 2 }), {
    packageName: '@types/node',
    versionLimit: 2,
  })
  assert.throws(() => normalizeNpmRegistrySearchInput({ size: 251 }), /--size/u)
  assert.throws(() => normalizeNpmRegistrySearchInput({ from: -1 }), /--from/u)
  assert.throws(() => normalizeNpmRegistrySearchInput({ quality: 2 }), /--quality/u)
  assert.throws(() => normalizeNpmRegistryPackageInput({ packageName: 'bad name' }), /valid npm package name/u)
  assert.throws(() => normalizeNpmRegistryPackageInput({ versionLimit: 101 }), /version-limit/u)
})

function createSearchBody(searchUrl: string) {
  return {
    objects: [
      {
        package: {
          name: 'typescript',
          version: '5.9.3',
          description: 'TypeScript is a language for application scale JavaScript development',
          date: '2026-01-01T00:00:00.000Z',
          keywords: ['typescript', 'language'],
          links: { npm: 'https://www.npmjs.com/package/typescript', repository: 'https://github.com/microsoft/TypeScript' },
          publisher: { username: 'typescript-bot' },
          maintainers: [{ username: 'typescript-bot' }],
        },
        score: {
          final: 0.99,
          detail: { quality: 0.95, popularity: 0.98, maintenance: 0.97 },
        },
        searchScore: 100,
      },
    ],
    total: 1,
    time: searchUrl,
  }
}

function createPackageBody() {
  return {
    name: '@types/node',
    description: 'TypeScript definitions for node',
    'dist-tags': { latest: '20.0.0' },
    time: {
      created: '2020-01-01T00:00:00.000Z',
      modified: '2026-01-03T00:00:00.000Z',
      '19.0.0': '2026-01-02T00:00:00.000Z',
      '20.0.0': '2026-01-03T00:00:00.000Z',
    },
    license: 'MIT',
    homepage: 'https://github.com/DefinitelyTyped/DefinitelyTyped',
    repository: { url: 'git+https://github.com/DefinitelyTyped/DefinitelyTyped.git' },
    bugs: { url: 'https://github.com/DefinitelyTyped/DefinitelyTyped/issues' },
    keywords: ['types', 'node'],
    maintainers: [{ name: 'types' }, { name: 'node' }],
    versions: {
      '19.0.0': { version: '19.0.0' },
      '20.0.0': {
        version: '20.0.0',
        license: 'MIT',
        dependencies: { undici: '*' },
        devDependencies: { dtslint: '*' },
        dist: { unpackedSize: 123456, tarball: 'https://registry.npmjs.org/@types/node/-/node-20.0.0.tgz' },
      },
    },
    readme: 'large readme omitted by projection',
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
