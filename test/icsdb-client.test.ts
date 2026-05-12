import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getIcsdbEvents,
  listIcsdbCalendars,
  normalizeIcsdbCalendarsInput,
  normalizeIcsdbEventsInput,
  normalizeIcsdbSlug,
} from '../src/application/usecases/icsdb.js'
import {
  IcsdbClient,
  parseIcsCalendar,
} from '../src/infrastructure/openApis/icsdbClient.js'

test('icsdb client lists generated build calendars from GitHub tree', async () => {
  let requestedUrl: URL | undefined
  const client = new IcsdbClient({
    treeUrl: 'https://api.github.com/repos/gadael/icsdb/git/trees/master?recursive=1',
    rawBaseUrl: 'https://raw.githubusercontent.com/gadael/icsdb/master/build',
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return jsonResponse(createTreeFixture())
    }) as typeof fetch,
  })

  const calendars = await client.listCalendars('en-US')

  assert.equal(requestedUrl?.hostname, 'api.github.com')
  assert.equal(calendars.length, 2)
  assert.equal(calendars[0]?.slug, 'germany-all')
  assert.equal(calendars[1]?.slug, 'us-all')
  assert.match(calendars[1]?.sourceUrl ?? '', /us-all-nonworkingdays\.ics/u)
})

test('icsdb client fetches and parses one fixed raw ICS path', async () => {
  let requestedUrl: URL | undefined
  const client = new IcsdbClient({
    rawBaseUrl: 'https://raw.githubusercontent.com/gadael/icsdb/master/build',
    fetchImpl: (async input => {
      requestedUrl = new URL(String(input))
      return textResponse(createIcsFixture())
    }) as typeof fetch,
  })

  const calendar = await client.calendarEvents('en-US', 'us-all')

  assert.equal(
    requestedUrl?.pathname,
    '/gadael/icsdb/master/build/en-US/us-all-nonworkingdays.ics',
  )
  assert.equal(calendar.title, 'US legal holidays')
  assert.equal(calendar.events[0]?.summary, "New Year's Day")
  assert.equal(calendar.events[0]?.startDate, '1970-01-01')
  assert.equal(calendar.events[0]?.rrule, 'FREQ=YEARLY')
  assert.deepEqual(calendar.events[1]?.categories, ['Georgia', 'Texas'])
  assert.deepEqual(calendar.events[1]?.rdatePreview, [
    '1970-02-01',
    '1971-02-01',
  ])
})

test('icsdb usecases project no-auth calendar metadata and events', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.hostname === 'api.github.com') return jsonResponse(createTreeFixture())
    return textResponse(createIcsFixture())
  }) as typeof fetch

  try {
    const calendars = await listIcsdbCalendars({
      locale: 'en-US',
      query: 'us',
      limit: 1,
    })
    assert.equal(calendars.kind, 'icsdb.calendars')
    assert.equal(calendars.api.provider, 'icsdb')
    assert.equal(calendars.api.authentication, 'none')
    assert.equal(calendars.api.usesBrowserClickstream, false)
    assert.equal(calendars.count, 1)
    assert.equal(calendars.totalCalendars, 1)
    assert.equal(calendars.calendars[0]?.slug, 'us-all')

    const events = await getIcsdbEvents({
      locale: 'en-US',
      slug: 'us-all',
      query: 'day',
      limit: 2,
    })
    assert.equal(events.kind, 'icsdb.events')
    assert.equal(events.calendar.title, 'US legal holidays')
    assert.equal(events.query.slug, 'us-all')
    assert.equal(events.count, 2)
    assert.equal(events.events[0]?.summary, "New Year's Day")
    assert.match(events.api.boundary, /no GitHub HTML scraping/u)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('icsdb normalizers enforce locale, slug, query, and limit guardrails', () => {
  assert.deepEqual(normalizeIcsdbCalendarsInput({}), {
    locale: 'en-US',
    query: undefined,
    limit: 20,
  })
  assert.deepEqual(normalizeIcsdbEventsInput({
    locale: 'fr-FR',
    slug: ' Germany-All ',
    limit: 5,
  }), {
    locale: 'fr-FR',
    query: undefined,
    limit: 5,
    slug: 'germany-all',
  })
  assert.equal(normalizeIcsdbSlug('uk-england-wales'), 'uk-england-wales')
  assert.throws(() => normalizeIcsdbEventsInput({ locale: 'de-DE' }), /locale/)
  assert.throws(() => normalizeIcsdbSlug('../us-all'), /paths, URLs/)
  assert.throws(() => normalizeIcsdbSlug('us-all.ics'), /paths, URLs/)
  assert.throws(() => normalizeIcsdbCalendarsInput({ limit: 101 }), /1 to 100/)
})

test('icsdb parser rejects missing or malformed calendars', async () => {
  assert.throws(() => parseIcsCalendar('404: Not Found'), /BEGIN:VCALENDAR/)
  assert.throws(
    () => parseIcsCalendar('BEGIN:VCALENDAR\nEND:VCALENDAR'),
    /VEVENT/,
  )

  const client = new IcsdbClient({
    fetchImpl: (async () => textResponse('404: Not Found', 404)) as typeof fetch,
  })
  await assert.rejects(
    () => client.calendarEvents('en-US', 'missing'),
    /HTTP 404/,
  )
})

test('icsdb client rejects Cloudflare challenge HTML clearly', async () => {
  const challenge = '<!DOCTYPE html><title>Just a moment...</title>'
  const treeClient = new IcsdbClient({
    fetchImpl: (async () => cloudflareChallengeResponse(challenge)) as typeof fetch,
  })

  await assert.rejects(
    () => treeClient.listCalendars('en-US'),
    /Cloudflare challenge HTML/u,
  )

  const rawClient = new IcsdbClient({
    fetchImpl: (async () => cloudflareChallengeResponse(challenge)) as typeof fetch,
  })

  await assert.rejects(
    () => rawClient.calendarEvents('en-US', 'us-all'),
    /Cloudflare challenge HTML/u,
  )
})

function createTreeFixture(): Record<string, unknown> {
  return {
    truncated: false,
    tree: [
      { path: 'README.md', type: 'blob' },
      { path: 'build/en-US/us-all-nonworkingdays.ics', type: 'blob' },
      { path: 'build/en-US/germany-all-nonworkingdays.ics', type: 'blob' },
      { path: 'build/fr-FR/us-all-nonworkingdays.ics', type: 'blob' },
    ],
  }
}

function createIcsFixture(): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Paul de Rosanbo//NONSGML icsdb//EN',
    'METHOD:PUBLISH',
    'X-WR-TIMEZONE:UTC',
    'X-WR-CALNAME:US legal holidays',
    'BEGIN:VEVENT',
    'DTSTART;VALUE=DATE:19700101',
    'DTEND;VALUE=DATE:19700102',
    'RRULE:FREQ=YEARLY',
    'UID:new-year',
    "SUMMARY:New Year's Day",
    'END:VEVENT',
    'BEGIN:VEVENT',
    'DTSTART;VALUE=DATE:19700201',
    'DTEND;VALUE=DATE:19700202',
    'RDATE;VALUE=DATE:19700201,19710201',
    'UID:state-day',
    'CATEGORIES:Georgia,Texas',
    'SUMMARY:State Day',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

function cloudflareChallengeResponse(value: string): Response {
  return new Response(value, {
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
