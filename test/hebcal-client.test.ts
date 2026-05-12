import assert from 'node:assert/strict'
import test from 'node:test'
import { convertHebcalDate, listHebcalCalendar, normalizeHebcalCalendarInput, normalizeHebcalConvertInput } from '../src/application/usecases/hebcal.js'
import { HebcalClient, normalizeHebcalCalendarQuery } from '../src/infrastructure/openApis/hebcalClient.js'

const convertFixture = {
  gy: 2026,
  gm: 5,
  gd: 3,
  hy: 5786,
  hm: 'Iyyar',
  hd: 16,
  hebrew: 'ט״ז בְּאִיָיר תשפ״ו',
  events: ['Pesach Sheni'],
}

const calendarFixture = {
  title: 'Hebcal Diaspora May 2026',
  items: [
    {
      title: 'Pesach Sheni',
      date: '2026-05-01',
      category: 'holiday',
      subcat: 'minor',
      hebrew: 'פסח שני',
      link: 'https://www.hebcal.com/holidays/pesach-sheni-2026',
      memo: 'Second Passover.',
    },
    {
      title: 'Parashat Emor',
      date: '2026-05-02',
      category: 'parashat',
      hebrew: 'פרשת אמור',
    },
  ],
}

test('Hebcal client converts Gregorian dates using documented converter JSON endpoint', async () => {
  let requestedUrl: URL | undefined
  const client = new HebcalClient('https://www.hebcal.com', (async input => {
    requestedUrl = new URL(String(input))
    return jsonResponse(convertFixture)
  }) as typeof fetch)

  const result = await client.convert({ date: '2026-05-03', strict: true })

  assert.equal(requestedUrl?.origin, 'https://www.hebcal.com')
  assert.equal(requestedUrl?.pathname, '/converter')
  assert.equal(requestedUrl?.searchParams.get('cfg'), 'json')
  assert.equal(requestedUrl?.searchParams.get('g2h'), '1')
  assert.equal(requestedUrl?.searchParams.get('strict'), '1')
  assert.equal(result.gregorianDate, '2026-05-03')
  assert.equal(result.hebrewDate, '5786 Iyyar 16')
  assert.equal(result.hebrewText, 'ט״ז בְּאִיָיר תשפ״ו')
  assert.deepEqual(result.events, ['Pesach Sheni'])
})

test('Hebcal client fetches calendar events using curated documented flags', async () => {
  let requestedUrl: URL | undefined
  const client = new HebcalClient('https://www.hebcal.com', (async input => {
    requestedUrl = new URL(String(input))
    return jsonResponse(calendarFixture)
  }) as typeof fetch)

  const result = await client.calendar({
    start: '2026-05-03',
    end: '2026-05-10',
    days: 8,
    israel: true,
    major: true,
    minor: true,
    roshChodesh: true,
    modern: false,
    shabbat: true,
  })

  assert.equal(requestedUrl?.pathname, '/hebcal')
  assert.equal(requestedUrl?.searchParams.get('v'), '1')
  assert.equal(requestedUrl?.searchParams.get('cfg'), 'json')
  assert.equal(requestedUrl?.searchParams.get('start'), '2026-05-03')
  assert.equal(requestedUrl?.searchParams.get('end'), '2026-05-10')
  assert.equal(requestedUrl?.searchParams.get('i'), 'on')
  assert.equal(requestedUrl?.searchParams.get('mod'), 'off')
  assert.equal(result.events.length, 2)
  assert.equal(result.events[0]?.title, 'Pesach Sheni')
})

test('Hebcal usecases project no-auth metadata and stable defaults', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async input => {
    const url = new URL(String(input))
    if (url.pathname === '/converter') {
      return jsonResponse(convertFixture)
    }
    assert.equal(url.pathname, '/hebcal')
    return jsonResponse(calendarFixture)
  }) as typeof fetch

  try {
    const today = new Date().toISOString().slice(0, 10)
    const conversion = await convertHebcalDate()
    assert.equal(conversion.kind, 'hebcal.convert')
    assert.equal((conversion.api as Record<string, unknown>).authentication, 'none')
    assert.equal((conversion.api as Record<string, unknown>).usesBrowserClickstream, false)
    assert.equal((conversion.api as Record<string, unknown>).defaultConvertDate, 'today')
    assert.equal((conversion.query as Record<string, unknown>).date, today)

    const calendar = await listHebcalCalendar()
    assert.equal(calendar.kind, 'hebcal.calendar')
    assert.equal((calendar.api as Record<string, unknown>).defaultCalendarStart, 'today')
    assert.equal((calendar.api as Record<string, unknown>).calendarDaysCap, 180)
    assert.equal((calendar.query as Record<string, unknown>).start, today)
    assert.equal((calendar.query as Record<string, unknown>).days, 7)
    assert.equal((calendar.events as Array<Record<string, unknown>>)[0]?.title, 'Pesach Sheni')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Hebcal normalizer enforces documented 180-day calendar range cap', () => {
  assert.throws(() => normalizeHebcalCalendarQuery({ start: '2026-01-01', days: 181 }), /between 1 and 180/)
  assert.throws(() => normalizeHebcalCalendarQuery({ start: '2026-01-01', end: '2026-07-01' }), /180 days or fewer/)
})

test('Hebcal operation cache keys use normalized runtime today defaults', () => {
  const today = new Date().toISOString().slice(0, 10)

  assert.deepEqual(normalizeHebcalConvertInput(), { date: today, strict: true })
  assert.deepEqual(normalizeHebcalCalendarInput({ days: 3 }), {
    start: today,
    end: addUtcDays(today, 2),
    days: 3,
    israel: false,
    major: true,
    minor: true,
    roshChodesh: true,
    modern: true,
    shabbat: true,
  })
})

function addUtcDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
