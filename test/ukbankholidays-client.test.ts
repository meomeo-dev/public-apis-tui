import assert from 'node:assert/strict'
import test from 'node:test'
import { listUkBankHolidays } from '../src/application/usecases/ukBankHolidays.js'
import {
  UkBankHolidaysClient,
  getUkBankHolidaysDefaultYear,
  normalizeUkBankHolidaysQuery,
} from '../src/infrastructure/openApis/ukBankHolidaysClient.js'

const fixture = {
  'england-and-wales': {
    division: 'england-and-wales',
    events: [
      { title: 'New Year’s Day', date: '2026-01-01', notes: '', bunting: true },
      { title: 'Good Friday', date: '2026-04-03', notes: '', bunting: false },
    ],
  },
  scotland: {
    division: 'scotland',
    events: [
      { title: 'New Year’s Day', date: '2026-01-01', notes: '', bunting: true },
      { title: 'St Andrew’s Day', date: '2026-11-30', notes: 'Substitute day', bunting: true },
    ],
  },
  'northern-ireland': {
    division: 'northern-ireland',
    events: [
      { title: 'Battle of the Boyne', date: '2026-07-13', notes: 'Substitute day', bunting: false },
    ],
  },
}

test('UK Bank Holidays client filters division, year, upcoming, and limit', async () => {
  let requestedUrl = ''
  const client = new UkBankHolidaysClient('https://www.gov.uk/bank-holidays.json', (async input => {
    requestedUrl = String(input)
    return jsonResponse(fixture)
  }) as typeof fetch)

  const divisions = await client.listEvents(
    { division: 'scotland', year: 2026, upcoming: true, limit: 1 },
    new Date('2026-05-03T00:00:00.000Z'),
  )

  assert.equal(requestedUrl, 'https://www.gov.uk/bank-holidays.json')
  assert.deepEqual(divisions, [
    {
      division: 'scotland',
      events: [{ title: 'St Andrew’s Day', date: '2026-11-30', notes: 'Substitute day', bunting: true }],
    },
  ])
})

test('UK Bank Holidays usecase projects no-auth metadata and defaults', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(fixture)) as typeof fetch
  try {
    const result = await listUkBankHolidays({ division: 'england-and-wales', year: 2026 })
    assert.equal(result.kind, 'ukbankholidays.events')
    assert.equal((result.api as Record<string, unknown>).authentication, 'none')
    assert.equal((result.api as Record<string, unknown>).usesBrowserClickstream, false)
    assert.equal((result.query as Record<string, unknown>).limit, 100)
    assert.equal((result.events as Array<Record<string, unknown>>)[0]?.division, 'england-and-wales')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('UK Bank Holidays usecase sorts globally and applies limit across divisions', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => jsonResponse(fixture)) as typeof fetch
  try {
    const result = await listUkBankHolidays({ year: 2026, limit: 3 })
    assert.equal(result.count, 3)
    assert.equal(result.totalEvents, 5)
    assert.deepEqual(result.divisions, [
      { division: 'england-and-wales', count: 2 },
      { division: 'scotland', count: 1 },
    ])
    assert.deepEqual((result.events as Array<Record<string, unknown>>).map(event => event.date), [
      '2026-01-01',
      '2026-01-01',
      '2026-04-03',
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('UK Bank Holidays normalizer enforces curated CLI bounds', () => {
  const expectedYear = getUkBankHolidaysDefaultYear()
  assert.deepEqual(normalizeUkBankHolidaysQuery({ division: 'Scotland', limit: 10 }), {
    division: 'scotland',
    year: expectedYear,
    limit: 10,
  })
  assert.deepEqual(normalizeUkBankHolidaysQuery({}), { year: expectedYear, limit: 100 })
  assert.throws(() => normalizeUkBankHolidaysQuery({ division: 'wales' }), /england-and-wales/)
  assert.throws(() => normalizeUkBankHolidaysQuery({ year: 1899 }), /between 1900 and 9999/)
  assert.throws(() => normalizeUkBankHolidaysQuery({ limit: 201 }), /between 1 and 200/)
})

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
