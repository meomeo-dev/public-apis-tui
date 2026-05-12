import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getIsdayoffDay,
  listIsdayoffRange,
  normalizeIsdayoffDayInput,
  normalizeIsdayoffRangeInput,
} from '../src/application/usecases/isdayoff.js'
import {
  IsdayoffClient,
  parseStatusSeries,
} from '../src/infrastructure/openApis/isdayoffClient.js'

test('isDayOff client fetches and parses one documented day status', async () => {
  let requestedUrl: URL | undefined
  const client = new IsdayoffClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return textResponse('1')
    }) as typeof fetch,
  })

  const status = await client.day({
    date: '2026-05-11',
    countryCode: 'ru',
    includeShortened: true,
    sixDay: false,
    markHoliday: false,
  })

  assert.equal(requestedUrl?.pathname, '/api/getdata')
  assert.equal(requestedUrl?.searchParams.get('year'), '2026')
  assert.equal(requestedUrl?.searchParams.get('month'), '05')
  assert.equal(requestedUrl?.searchParams.get('day'), '11')
  assert.equal(requestedUrl?.searchParams.get('cc'), 'ru')
  assert.equal(requestedUrl?.searchParams.get('pre'), '1')
  assert.equal(status.code, '1')
  assert.equal(status.isNonWorkingDay, true)
})

test('isDayOff client parses range status codes into dated records', async () => {
  let requestedUrl: URL | undefined
  const client = new IsdayoffClient({
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return textResponse('102')
    }) as typeof fetch,
  })

  const days = await client.range({
    from: '2026-05-10',
    to: '2026-05-12',
    countryCode: 'ru',
    includeShortened: true,
    sixDay: true,
    markHoliday: true,
  })

  assert.equal(requestedUrl?.searchParams.get('date1'), '20260510')
  assert.equal(requestedUrl?.searchParams.get('date2'), '20260512')
  assert.equal(requestedUrl?.searchParams.get('sd'), '1')
  assert.equal(requestedUrl?.searchParams.get('holiday'), '1')
  assert.deepEqual(days.map(day => day.date), [
    '2026-05-10',
    '2026-05-11',
    '2026-05-12',
  ])
  assert.equal(days[2]?.isShortenedDay, true)
})

test('isDayOff usecases project bounded no-auth day and range JSON', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.searchParams.has('date1')) return textResponse('102')
    return textResponse('1')
  }) as typeof fetch

  try {
    const day = await getIsdayoffDay({
      date: '2026-05-11',
      countryCode: 'ru',
    })
    assert.equal(day.kind, 'isdayoff.day')
    assert.equal(day.api.provider, 'isdayoff')
    assert.equal(day.api.authentication, 'none')
    assert.equal(day.api.usesBrowserClickstream, false)
    assert.equal(day.status.label, 'non-working day')
    assert.match(day.api.boundary, /no browser scraping/u)

    const range = await listIsdayoffRange({
      from: '2026-05-10',
      days: 3,
      countryCode: 'ru',
    })
    assert.equal(range.kind, 'isdayoff.range')
    assert.equal(range.query.to, '2026-05-12')
    assert.equal(range.count, 3)
    assert.equal(range.totals.workingDays, 2)
    assert.equal(range.totals.nonWorkingDays, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('isDayOff normalizers enforce country, date, and range bounds', () => {
  assert.deepEqual(normalizeIsdayoffDayInput({
    date: '2026-05-11',
    countryCode: 'RU',
  }), {
    date: '2026-05-11',
    countryCode: 'ru',
    includeShortened: true,
    sixDay: false,
    markHoliday: false,
  })
  assert.deepEqual(normalizeIsdayoffRangeInput({
    from: '2026-05-10',
    days: 2,
  }), {
    from: '2026-05-10',
    to: '2026-05-11',
    days: 2,
    countryCode: 'ru',
    includeShortened: true,
    sixDay: false,
    markHoliday: false,
  })
  assert.throws(() => normalizeIsdayoffDayInput({ countryCode: 'de' }), /one of/)
  assert.throws(() => normalizeIsdayoffDayInput({ date: '2026-02-30' }), /real/)
  assert.throws(() => normalizeIsdayoffRangeInput({
    from: '2026-01-01',
    days: 367,
  }), /1 to 366/)
})

test('isDayOff parser rejects provider errors and malformed status text', async () => {
  assert.throws(() => parseStatusSeries({
    text: '109',
    status: 200,
    url: 'https://isdayoff.ru/api/getdata',
  }), /undocumented/)

  const client = new IsdayoffClient({
    fetchImpl: (async () => textResponse('101', 404)) as typeof fetch,
  })
  await assert.rejects(
    () => client.day({
      date: '2026-05-11',
      countryCode: 'ru',
      includeShortened: true,
      sixDay: false,
      markHoliday: false,
    }),
    /provider code 101/,
  )
})

test('isDayOff client rejects Cloudflare challenge HTML clearly', async () => {
  const client = new IsdayoffClient({
    fetchImpl: (async () => cloudflareChallengeResponse()) as typeof fetch,
  })

  await assert.rejects(
    () => client.day({
      date: '2026-05-11',
      countryCode: 'ru',
      includeShortened: true,
      sixDay: false,
      markHoliday: false,
    }),
    /Cloudflare challenge HTML/u,
  )
})

function cloudflareChallengeResponse(): Response {
  return new Response('<!DOCTYPE html><title>Just a moment...</title>', {
    status: 429,
    statusText: 'Too Many Requests',
    headers: {
      'cf-mitigated': 'challenge',
      'content-type': 'text/html; charset=UTF-8',
      server: 'cloudflare',
    },
  })
}

function textResponse(value: string, status = 200): Response {
  return new Response(value, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
