import assert from 'node:assert/strict'
import test from 'node:test'
import { getQueimadasInpeLatest10Min } from '../src/application/usecases/queimadasInpe.js'
import { QueimadasInpeClient, normalizeQueimadasInpeLatestInput } from '../src/infrastructure/openApis/queimadasInpeClient.js'

const indexHtml = '<a href="focos_10min_20260508_1400.csv">old</a><a href="focos_10min_20260508_1410.csv">latest</a>'
const csv = [
  'lat,lon,satelite,data',
  ' -32.677710, -61.493530,TERRA_M-T,2026-05-08 12:44:00',
  ' -30.612970, -60.916130,TERRA_M-T,2026-05-08 12:44:00',
].join('\n')

test('Queimadas INPE client selects latest 10-minute CSV and parses bounded rows', async () => {
  const requests: string[] = []
  const client = new QueimadasInpeClient({
    indexUrl: 'https://queimadas.test/10min/',
    fetchImpl: (async input => {
      requests.push(String(input))
      return new Response(requests.length === 1 ? indexHtml : csv, { status: 200, headers: { 'content-type': requests.length === 1 ? 'text/html' : 'text/csv' } })
    }) as typeof fetch,
  })
  const latest = await client.latest10Min({ limit: 1 })
  assert.deepEqual(requests, [
    'https://queimadas.test/10min/',
    'https://queimadas.test/10min/focos_10min_20260508_1410.csv',
  ])
  assert.equal(latest.fileName, 'focos_10min_20260508_1410.csv')
  assert.equal(latest.totalRows, 2)
  assert.equal(latest.focuses.length, 1)
  assert.equal(latest.focuses[0]?.satellite, 'TERRA_M-T')
})

test('Queimadas INPE usecase projects public-safety metadata', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => new Response(String(input).endsWith('.csv') ? csv : indexHtml, { status: 200 })) as typeof fetch
  try {
    const result = await getQueimadasInpeLatest10Min({ limit: 2 })
    assert.equal(result.kind, 'queimadas-inpe.latest10min')
    assert.equal(result.api.authentication, 'none')
    assert.equal(result.api.usesBrowserClickstream, false)
    assert.match(result.api.publicSafety, /not emergency dispatch/u)
    assert.equal(result.count.totalRows, 2)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Queimadas INPE normalizer and parser enforce bounds/schema', async () => {
  assert.deepEqual(normalizeQueimadasInpeLatestInput({}), { limit: 10 })
  assert.deepEqual(normalizeQueimadasInpeLatestInput({ limit: 1 }), { limit: 1 })
  assert.throws(() => normalizeQueimadasInpeLatestInput({ limit: 51 }), /between 1 and 50/u)

  const noFiles = new QueimadasInpeClient({
    indexUrl: 'https://queimadas.test/10min/',
    fetchImpl: (async () => new Response('<html>empty</html>', { status: 200 })) as typeof fetch,
  })
  await assert.rejects(() => noFiles.latest10Min({ limit: 1 }), /did not include any/u)

  const badCsv = new QueimadasInpeClient({
    indexUrl: 'https://queimadas.test/10min/',
    fetchImpl: (async input => new Response(String(input).endsWith('.csv') ? 'bad,header\n1,2' : indexHtml, { status: 200 })) as typeof fetch,
  })
  await assert.rejects(() => badCsv.latest10Min({ limit: 1 }), /CSV header/u)
})

test('Queimadas INPE client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new QueimadasInpeClient({
    indexUrl: 'https://queimadas.test/10min/',
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
  await assert.rejects(() => client.latest10Min({ limit: 1 }), /Cloudflare challenge HTML page/u)
})
