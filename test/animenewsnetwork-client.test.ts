import assert from 'node:assert/strict'
import test from 'node:test'
import { listAnimeNewsNetworkTitles } from '../src/application/usecases/animeNewsNetwork.js'
import { AnimeNewsNetworkClient } from '../src/infrastructure/openApis/animeNewsNetworkClient.js'

const sampleReport = `<report skipped="0" listed="2"><args><type>anime</type><name>Z</name><licensed></licensed><search></search></args>
<item><id>38280</id><gid>1841634502</gid><type>TV</type><name>ZERO RISE</name><precision>TV</precision></item>
<item><id>34508</id><gid>2943618097</gid><type>movie</type><name>Zombie Land Saga: Yumeginga Paradise</name><precision>movie</precision><vintage>2025-10-24</vintage></item></report>`

test('Anime News Network client sends documented report query and parses XML rows', async () => {
  const requests: string[] = []
  const client = new AnimeNewsNetworkClient({
    baseUrl: 'https://ann.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      return new Response(sampleReport, {
        status: 200,
        headers: { 'content-type': 'text/xml' },
      })
    }) as typeof fetch,
  })

  const report = await client.listAnimeTitles({ skip: 5, limit: 2, namePrefix: 'Z' })

  assert.equal(requests[0], 'https://ann.test/encyclopedia/reports.xml?id=155&type=anime&nskip=5&nlist=2&name=Z')
  assert.equal(report.skipped, 0)
  assert.equal(report.listed, 2)
  assert.equal(report.args.type, 'anime')
  assert.equal(report.args.name, 'Z')
  assert.equal(report.items[0]?.name, 'ZERO RISE')
  assert.equal(report.items[1]?.vintage, '2025-10-24')
})

test('Anime News Network usecase projects no-auth metadata and normalized query', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(sampleReport, {
    status: 200,
    headers: { 'content-type': 'text/xml' },
  })) as typeof fetch
  try {
    const result = await listAnimeNewsNetworkTitles({ limit: 2, namePrefix: ' Z ' })

    assert.equal(result.kind, 'animenewsnetwork.titles')
    assert.equal(result.api.provider, 'anime-news-network')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.equal(result.api.rateLimit, '1 request/second/IP')
    assert.deepEqual(result.query, { reportId: 155, type: 'anime', skip: 0, limit: 2, namePrefix: 'Z' })
    assert.equal(result.pagination.nextSkip, 2)
    assert.equal(result.titles[0]?.url, 'https://www.animenewsnetwork.com/encyclopedia/anime.php?id=38280')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Anime News Network usecase validates interactive pagination limits', async () => {
  await assert.rejects(() => listAnimeNewsNetworkTitles({ skip: -1 }), /non-negative integer/u)
  await assert.rejects(() => listAnimeNewsNetworkTitles({ limit: 201 }), /1 to 200/u)
})

test('Anime News Network client surfaces XML endpoint failures', async () => {
  const client = new AnimeNewsNetworkClient({
    fetchImpl: (async () => new Response('error code: 502', {
      status: 502,
      statusText: 'Bad Gateway',
      headers: { 'content-type': 'text/plain' },
    })) as typeof fetch,
  })

  await assert.rejects(
    () => client.listAnimeTitles({ limit: 1 }),
    /error code: 502/u,
  )
})
