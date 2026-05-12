import assert from 'node:assert/strict'
import test from 'node:test'
import { getQuranCloudAyah, getQuranCloudSurah } from '../src/application/usecases/quranCloud.js'
import { QuranCloudClient } from '../src/infrastructure/openApis/quranCloudClient.js'

const ayahData = {
  number: 262,
  text: 'God - there is no deity save Him.',
  numberInSurah: 255,
  juz: 3,
  page: 42,
  surah: {
    number: 2,
    name: 'سُورَةُ البَقَرَة',
    englishName: 'Al-Baqara',
    englishNameTranslation: 'The Cow',
    numberOfAyahs: 286,
    revelationType: 'Medinan',
  },
  edition: { identifier: 'en.asad', language: 'en', englishName: 'Asad', format: 'text', type: 'translation' },
}

const surahData = {
  number: 1,
  name: 'سُورَةُ ٱلْفَاتِحَةِ',
  englishName: 'Al-Faatiha',
  englishNameTranslation: 'The Opening',
  numberOfAyahs: 7,
  revelationType: 'Meccan',
  edition: { identifier: 'en.asad', language: 'en', englishName: 'Asad', format: 'text', type: 'translation' },
  ayahs: [
    { number: 1, text: 'In the name of God.', numberInSurah: 1, juz: 1, page: 1 },
    { number: 2, text: 'All praise is due to God alone.', numberInSurah: 2, juz: 1, page: 1 },
  ],
}

test('Quran Cloud client fetches ayah by documented reference and edition', async () => {
  let requestedUrl: URL | undefined
  const client = new QuranCloudClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse({ code: 200, status: 'OK', data: ayahData })
    }) as typeof fetch,
  })

  const ayah = await client.getAyah({ reference: '2:255', edition: 'en.asad' })

  assert.equal(requestedUrl?.href, 'https://api.alquran.cloud/v1/ayah/2%3A255/en.asad')
  assert.equal(ayah.numberInSurah, 255)
  assert.equal(ayah.surah?.englishName, 'Al-Baqara')
})

test('Quran Cloud client fetches surah with offset and capped limit', async () => {
  let requestedUrl: URL | undefined
  const client = new QuranCloudClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse({ code: 200, status: 'OK', data: surahData })
    }) as typeof fetch,
  })

  const surah = await client.getSurah({ surah: 1, edition: 'en.asad', offset: 1, limit: 999 })

  assert.equal(requestedUrl?.href, 'https://api.alquran.cloud/v1/surah/1/en.asad?offset=1&limit=286')
  assert.equal(surah.englishName, 'Al-Faatiha')
  assert.equal(surah.ayahs.length, 2)
})

test('Quran Cloud usecases project no-auth metadata and readable defaults', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.startsWith('/v1/ayah/')) {
      assert.equal(url.pathname, '/v1/ayah/2%3A255/en.asad')
      return jsonResponse({ code: 200, status: 'OK', data: ayahData })
    }
    assert.equal(url.pathname, '/v1/surah/1/en.asad')
    assert.equal(url.searchParams.get('limit'), '286')
    return jsonResponse({ code: 200, status: 'OK', data: surahData })
  }) as typeof fetch

  try {
    const ayah = await getQuranCloudAyah()
    assert.equal(ayah.kind, 'qurancloud.ayah')
    assert.equal((ayah.api as Record<string, unknown>).authentication, 'none')
    assert.equal((ayah.api as Record<string, unknown>).usesBrowserClickstream, false)
    assert.equal((ayah.ayah as Record<string, unknown>).numberInSurah, 255)

    const surah = await getQuranCloudSurah()
    assert.equal(surah.kind, 'qurancloud.surah')
    assert.equal((surah.query as Record<string, unknown>).limit, 286)
    assert.equal((surah.ayahs as Array<Record<string, unknown>>)[0]?.text, 'In the name of God.')
  } finally {
    globalThis.fetch = originalFetch
  }
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
