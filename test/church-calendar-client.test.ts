import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getChurchCalendarDay,
  listChurchCalendarMonth,
  normalizeChurchCalendarDayInput,
  normalizeChurchCalendarMonthInput,
} from '../src/application/usecases/churchCalendar.js'
import {
  ChurchCalendarClient,
  normalizeChurchCalendarDate,
  normalizeChurchCalendarId,
  normalizeChurchCalendarLanguage,
  normalizeChurchCalendarLimit,
  normalizeChurchCalendarMonth,
  normalizeChurchCalendarYear,
} from '../src/infrastructure/openApis/churchCalendarClient.js'

const dayFixture = {
  date: '2026-05-10',
  season: 'easter',
  season_week: 6,
  weekday: 'sunday',
  celebrations: [
    {
      title: 'Sixth Sunday of Easter',
      colour: 'white',
      rank: 'sunday',
      rank_num: 4,
    },
  ],
}

test('Church Calendar client sends documented day and month paths', async () => {
  const requests: string[] = []
  const client = new ChurchCalendarClient({
    baseUrl: 'http://calendar.test',
    fetchImpl: (async input => {
      requests.push(String(input))
      const body = String(input).endsWith('/2026/5')
        ? JSON.stringify([dayFixture])
        : JSON.stringify(dayFixture)
      return new Response(body, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }) as typeof fetch,
  })

  const day = await client.day({
    date: '2026-05-10',
    language: 'en',
    calendar: 'general-en',
  })
  const month = await client.month({
    year: 2026,
    month: 5,
    language: 'en',
    calendar: 'general-en',
    limit: 1,
  })

  assert.deepEqual(requests, [
    'http://calendar.test/api/v0/en/calendars/general-en/2026/5/10',
    'http://calendar.test/api/v0/en/calendars/general-en/2026/5',
  ])
  assert.equal(day.date, '2026-05-10')
  assert.equal(day.seasonWeek, 6)
  assert.equal(day.celebrations[0]?.title, 'Sixth Sunday of Easter')
  assert.equal(month[0]?.celebrations[0]?.rankNum, 4)
})

test('Church Calendar usecases expose metadata and normalized defaults', async () => {
  const originalFetch = globalThis.fetch
  const requests: string[] = []
  globalThis.fetch = (async input => {
    requests.push(String(input))
    const body = String(input).endsWith('/2026/5')
      ? JSON.stringify([dayFixture])
      : JSON.stringify(dayFixture)
    return new Response(body, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  try {
    const day = await getChurchCalendarDay({ date: '2026-05-10' })
    assert.equal(day.kind, 'churchcalendar.day')
    assert.equal(day.api.authentication, 'none')
    assert.equal(day.api.usesBrowserClickstream, false)
    assert.equal(day.api.transport, 'HTTP JSON')
    assert.equal(day.query.language, 'en')
    assert.equal(day.query.calendar, 'general-en')
    assert.match(requests[0] ?? '', /\/2026\/5\/10$/u)

    const month = await listChurchCalendarMonth({
      year: 2026,
      month: 5,
      limit: 1,
    })
    assert.equal(month.kind, 'churchcalendar.month')
    assert.equal(month.count, 1)
    assert.equal(month.query.limit, 1)
    assert.match(requests[1] ?? '', /\/2026\/5$/u)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Church Calendar normalizers validate curated option bounds', () => {
  assert.equal(normalizeChurchCalendarLanguage(undefined), 'en')
  assert.equal(normalizeChurchCalendarId(undefined), 'general-en')
  assert.equal(normalizeChurchCalendarDate('2026-05-10'), '2026-05-10')
  assert.equal(normalizeChurchCalendarYear(2026), 2026)
  assert.equal(normalizeChurchCalendarMonth(5), 5)
  assert.equal(normalizeChurchCalendarLimit(31), 31)
  assert.deepEqual(normalizeChurchCalendarDayInput({
    date: '2026-05-10',
    language: 'en',
    calendar: 'general-en',
  }), {
    date: '2026-05-10',
    language: 'en',
    calendar: 'general-en',
  })
  assert.deepEqual(normalizeChurchCalendarMonthInput({
    year: 2026,
    month: 5,
    language: 'en',
    calendar: 'general-en',
    limit: 2,
  }), {
    year: 2026,
    month: 5,
    language: 'en',
    calendar: 'general-en',
    limit: 2,
  })

  assert.throws(() => normalizeChurchCalendarLanguage('de'), /language/u)
  assert.throws(() => normalizeChurchCalendarId('general-de'), /calendar/u)
  assert.throws(() => normalizeChurchCalendarDate('2026-02-30'), /real/u)
  assert.throws(() => normalizeChurchCalendarYear(1969), /1970 to 9999/u)
  assert.throws(() => normalizeChurchCalendarMonth(13), /1 to 12/u)
  assert.throws(() => normalizeChurchCalendarLimit(32), /1 to 31/u)
})

test('Church Calendar client surfaces upstream and JSON failures', async () => {
  const failingClient = new ChurchCalendarClient({
    fetchImpl: (async () => new Response('bad gateway', {
      status: 502,
      headers: { 'content-type': 'text/plain' },
    })) as typeof fetch,
  })
  await assert.rejects(
    () => failingClient.day({
      date: '2026-05-10',
      language: 'en',
      calendar: 'general-en',
    }),
    /bad gateway/u,
  )

  const htmlClient = new ChurchCalendarClient({
    fetchImpl: (async () => new Response('<html></html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    })) as typeof fetch,
  })
  await assert.rejects(
    () => htmlClient.month({
      year: 2026,
      month: 5,
      language: 'en',
      calendar: 'general-en',
      limit: 1,
    }),
    /not JSON/u,
  )
})

test('Church Calendar client surfaces Cloudflare challenge HTML clearly', async () => {
  const client = new ChurchCalendarClient({
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
  await assert.rejects(
    () => client.day({
      date: '2026-05-10',
      language: 'en',
      calendar: 'general-en',
    }),
    /Cloudflare challenge HTML page/u,
  )
})
