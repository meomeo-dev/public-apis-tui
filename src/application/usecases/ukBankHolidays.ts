import {
  UK_BANK_HOLIDAYS_DEFAULT_LIMIT,
  UK_BANK_HOLIDAYS_MAX_LIMIT,
  UkBankHolidaysClient,
  getUkBankHolidaysDefaultYear,
  normalizeUkBankHolidaysQuery,
  type UkBankHolidayEvent,
} from '../../infrastructure/openApis/ukBankHolidaysClient.js'

export type UkBankHolidaysInput = {
  division?: string | undefined
  year?: number | undefined
  upcoming?: boolean | undefined
  limit?: number | undefined
}

export async function listUkBankHolidays(input: UkBankHolidaysInput = {}): Promise<Record<string, unknown>> {
  const client = new UkBankHolidaysClient()
  const query = normalizeUkBankHolidaysInput(input)
  const divisions = await client.listEvents(query)
  const allEvents = divisions.flatMap(division => division.events.map(event => projectEvent(division.division, event)))
  const events = sortProjectedEvents(allEvents).slice(0, query.limit)
  const divisionSummaries = summarizeVisibleDivisions(events)
  return {
    kind: 'ukbankholidays.events',
    api: {
      provider: 'uk-bank-holidays',
      endpoint: 'GET /bank-holidays.json',
      authentication: 'none',
      usesBrowserClickstream: false,
      docs: 'https://www.gov.uk/bank-holidays.json',
      documentedMaximumResult: 'Full static JSON document; no page-size parameter. CLI defaults to 100 and caps at 200.',
      defaultYear: getUkBankHolidaysDefaultYear(),
      defaultLimit: UK_BANK_HOLIDAYS_DEFAULT_LIMIT,
      limitCap: UK_BANK_HOLIDAYS_MAX_LIMIT,
      divisions: ['england-and-wales', 'scotland', 'northern-ireland'],
    },
    query,
    count: events.length,
    totalEvents: allEvents.length,
    divisions: divisionSummaries,
    events,
  }
}

export function normalizeUkBankHolidaysInput(input: UkBankHolidaysInput = {}) {
  return normalizeUkBankHolidaysQuery(input)
}

function projectEvent(division: string, event: UkBankHolidayEvent): Record<string, unknown> {
  return {
    division,
    title: event.title,
    date: event.date,
    notes: event.notes,
    bunting: event.bunting,
  }
}

function sortProjectedEvents(events: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...events].sort((left, right) => {
    const leftDate = typeof left.date === 'string' ? left.date : ''
    const rightDate = typeof right.date === 'string' ? right.date : ''
    if (leftDate !== rightDate) {
      return leftDate.localeCompare(rightDate)
    }
    const leftDivision = typeof left.division === 'string' ? left.division : ''
    const rightDivision = typeof right.division === 'string' ? right.division : ''
    if (leftDivision !== rightDivision) {
      return leftDivision.localeCompare(rightDivision)
    }
    return String(left.title ?? '').localeCompare(String(right.title ?? ''))
  })
}

function summarizeVisibleDivisions(events: Record<string, unknown>[]): Array<{ division: string; count: number }> {
  const counts = new Map<string, number>()
  for (const event of events) {
    const division = typeof event.division === 'string' ? event.division : 'unknown'
    counts.set(division, (counts.get(division) ?? 0) + 1)
  }
  return [...counts.entries()].map(([division, count]) => ({ division, count }))
}
