import assert from 'node:assert/strict'
import test from 'node:test'
import { getNamedaysByDate, normalizeNamedaysDateInput, normalizeNamedaysNameInput, searchNamedaysByName } from '../src/application/usecases/namedays.js'
import { getNamedaysDefaultDateParts, NamedaysClient, normalizeNamedaysDateQuery, normalizeNamedaysNameQuery } from '../src/infrastructure/openApis/namedaysClient.js'

const dateFixture = {
  success: true,
  message: 'Namedays for 05-03',
  data: {
    at: 'Jakob, Philipp, Viola',
    ru: 'Putin is a war criminal',
    us: 'Joletta, Trey, Troy, Viola, Violet, Violetta, Yolanda',
  },
}

const nameFixture = {
  success: true,
  message: 'Namedays for name John',
  data: [
    { country: 'at', 0: { day: 10, month: 3, name: 'Emil, John, Gustav' } },
    { country: 'us', 0: { day: 24, month: 6, name: 'Hans, John, Johnny' }, 1: { day: 11, month: 11, name: 'Jonathan, Johnathon' } },
  ],
}

test('Namedays client fetches V2 date namedays with query params', async () => {
  let requestedUrl: URL | undefined
  const client = new NamedaysClient('https://nameday.abalin.net/api', (async input => {
    requestedUrl = new URL(String(input))
    return jsonResponse(dateFixture)
  }) as typeof fetch)

  const countries = await client.getDate({ day: 3, month: 5, country: 'us', limit: 30 })

  assert.equal(requestedUrl?.href, 'https://nameday.abalin.net/api/V2/date?day=3&month=5')
  assert.deepEqual(countries, [{ country: 'us', names: 'Joletta, Trey, Troy, Viola, Violet, Violetta, Yolanda' }])
})

test('Namedays client searches V2 names with POST body', async () => {
  let requestedUrl: URL | undefined
  let requestBody = ''
  const client = new NamedaysClient('https://nameday.abalin.net/api', (async (input, init) => {
    requestedUrl = new URL(String(input))
    requestBody = String(init?.body ?? '')
    return jsonResponse(nameFixture)
  }) as typeof fetch)

  const matches = await client.getName({ name: 'John', country: 'us', limit: 20 })

  assert.equal(requestedUrl?.href, 'https://nameday.abalin.net/api/V2/getname')
  assert.equal(requestBody, JSON.stringify({ name: 'John' }))
  assert.equal(matches.length, 2)
  assert.equal(matches[0]?.month, 6)
})

test('Namedays usecases project no-auth metadata and defaults', async () => {
  const originalFetch = globalThis.fetch
  const defaultDate = getNamedaysDefaultDateParts()
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/V2/date')) {
      return jsonResponse(dateFixture)
    }
    assert.equal(url.pathname, '/api/V2/getname')
    return jsonResponse(nameFixture)
  }) as typeof fetch

  try {
    const date = await getNamedaysByDate()
    assert.equal(date.kind, 'namedays.date')
    assert.equal((date.api as Record<string, unknown>).authentication, 'none')
    assert.equal((date.api as Record<string, unknown>).usesBrowserClickstream, false)
    assert.equal((date.api as Record<string, unknown>).defaultDateLabel, 'today')
    assert.equal((date.query as Record<string, unknown>).day, defaultDate.day)
    assert.equal((date.query as Record<string, unknown>).month, defaultDate.month)
    assert.equal((date.count as number), 2)
    assert.equal((date.totalCountries as number), 3)
    assert.deepEqual(date.suppressedCountries, ['ru'])
    assert.match(String((date.warningMessage as string | undefined) ?? ''), /Hidden unstable upstream date entries for ru/)

    const name = await searchNamedaysByName()
    assert.equal(name.kind, 'namedays.name')
    assert.equal((name.query as Record<string, unknown>).name, 'John')
    assert.equal((name.matches as Array<Record<string, unknown>>)[0]?.country, 'at')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Namedays normalizers enforce documented and curated bounds', () => {
  assert.deepEqual(getNamedaysDefaultDateParts(new Date('2030-05-06T00:00:00.000Z')), { day: 6, month: 5 })
  const defaultDate = getNamedaysDefaultDateParts()
  assert.deepEqual(normalizeNamedaysDateInput(), { day: defaultDate.day, month: defaultDate.month, limit: 30 })
  assert.deepEqual(normalizeNamedaysNameInput({ country: 'us' }), { name: 'John', country: 'us', limit: 20 })
  assert.throws(() => normalizeNamedaysDateQuery({ day: 32 }), /between 1 and 31/)
  assert.throws(() => normalizeNamedaysDateQuery({ month: 13 }), /between 1 and 12/)
  assert.throws(() => normalizeNamedaysDateQuery({ day: 31, month: 2 }), /valid calendar date/)
  assert.throws(() => normalizeNamedaysNameQuery({ name: 'A' }), /2 to 15/)
  assert.throws(() => normalizeNamedaysNameQuery({ country: 'usa' }), /two-letter/)
})

test('Namedays client surfaces provider JSON error messages on non-ok responses', async () => {
  const client = new NamedaysClient('https://nameday.abalin.net/api', (async () =>
    new Response(JSON.stringify({ success: false, message: 'missing or invalid parameters' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch)

  await assert.rejects(
    () => client.getName({ name: 'John', limit: 20 }),
    /missing or invalid parameters/,
  )
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
