import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getLectServeDate,
  getLectServeSunday,
  normalizeLectServeDateInput,
  normalizeLectServeSundayInput,
} from '../src/application/usecases/lectServe.js'
import { LectServeClient } from '../src/infrastructure/openApis/lectServeClient.js'

test('LectServe client calls documented date endpoint with lectionary', async () => {
  let requestedUrl: URL | undefined
  const client = new LectServeClient({
    baseUrl: 'https://www.lectserve.com',
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(createDateFixture())
    }) as typeof fetch,
  })

  const response = await client.date({ date: '2026-05-10', lectionary: 'rcl' })

  assert.equal(requestedUrl?.pathname, '/date/2026-05-10')
  assert.equal(requestedUrl?.searchParams.get('lect'), 'rcl')
  assert.equal(response.sunday?.lectionary, 'rcl')
  assert.equal(response.daily?.readings.morning.first, 'Deuteronomy 11')
  assert.equal(response.redLetter?.services[0]?.name, 'Sixth Sunday of Easter')
})

test('LectServe usecases project no-auth date and Sunday payloads', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/sunday') return jsonResponse(createSundayFixture())
    return jsonResponse(createDateFixture())
  }) as typeof fetch

  try {
    const date = await getLectServeDate({
      date: '2026-05-10',
      lectionary: 'acna',
    })
    assert.equal(date.kind, 'lectserve.date')
    assert.equal(date.api.provider, 'lectserve')
    assert.equal(date.api.authentication, 'none')
    assert.equal(date.api.usesBrowserClickstream, false)
    assert.equal(date.query.date, '2026-05-10')
    assert.equal(date.sections.hasDaily, true)
    assert.equal(date.sunday?.services[0]?.readings[0], 'Acts 17:22-34')

    const sunday = await getLectServeSunday({ lectionary: 'rcl' })
    assert.equal(sunday.kind, 'lectserve.sunday')
    assert.equal(sunday.query.scope, 'upcoming-server-relative-sunday')
    assert.equal(sunday.sunday.date, '2026-05-17')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('LectServe client rejects Cloudflare challenge HTML clearly', async () => {
  const client = new LectServeClient({
    baseUrl: 'https://www.lectserve.com',
    fetchImpl: (async () => {
      return new Response('<!DOCTYPE html><title>Just a moment...</title>', {
        status: 429,
        statusText: 'Too Many Requests',
        headers: {
          'cf-mitigated': 'challenge',
          'content-type': 'text/html; charset=UTF-8',
          server: 'cloudflare',
        },
      })
    }) as typeof fetch,
  })

  await assert.rejects(
    () => client.date({ date: '2026-05-10', lectionary: 'acna' }),
    /Cloudflare challenge HTML/u,
  )
})

test('LectServe normalizers enforce curated inputs', () => {
  assert.deepEqual(normalizeLectServeDateInput({
    date: '2026-05-10',
    lectionary: 'RCL',
  }), {
    date: '2026-05-10',
    lectionary: 'rcl',
  })
  assert.deepEqual(normalizeLectServeSundayInput({}), { lectionary: 'acna' })
  assert.throws(
    () => normalizeLectServeDateInput({ date: '2026-02-30' }),
    /real Gregorian date/,
  )
  assert.throws(
    () => normalizeLectServeDateInput({ date: '20260510' }),
    /YYYY-MM-DD/,
  )
  assert.throws(
    () => normalizeLectServeSundayInput({ lectionary: 'roman' }),
    /must be one of/,
  )
})

function createDateFixture(): Record<string, unknown> {
  return {
    sunday: createSundayFixture('2026-05-10', 'rcl'),
    daily: {
      date: '2026-05-10',
      date_pretty: '10. May 2026',
      day: 'Sunday',
      week: 'The Sixth Sunday of Easter',
      lectionary: 'acna-sec',
      yesterday: '2026-05-09',
      tomorrow: '2026-05-11',
      readings: {
        morning: { first: 'Deuteronomy 11', second: 'Luke 6:39-7:10' },
        evening: { first: 'Job 38', second: '2 Peter 2' },
      },
    },
    red_letter: createSundayFixture('2026-05-10', 'rcl'),
  }
}

function createSundayFixture(
  date = '2026-05-17',
  lectionary = 'acna',
): Record<string, unknown> {
  return {
    date,
    date_pretty: date === '2026-05-10' ? '10. May 2026' : '17. May 2026',
    nextSunday: '2026-05-24',
    prevSunday: '2026-05-10',
    day: 'Sunday',
    year: 'A',
    type: 'Sunday',
    lectionary,
    services: [
      {
        name: date === '2026-05-10'
          ? 'Sixth Sunday of Easter'
          : 'The Sunday after Ascension Day',
        alt: '',
        readings: [
          'Acts 17:22-34',
          'Psalm 66:8-20',
          '1 Peter 3:13-22',
          'John 14:15-21',
        ],
      },
    ],
  }
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
