import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const UK_BANK_HOLIDAYS_DEFAULT_URL = 'https://www.gov.uk/bank-holidays.json'
export const UK_BANK_HOLIDAYS_DEFAULT_DIVISION = 'england-and-wales'
export const UK_BANK_HOLIDAYS_DEFAULT_LIMIT = 100
export const UK_BANK_HOLIDAYS_MAX_LIMIT = 200

export type UkBankHolidaysQuery = {
  division?: string | undefined
  year: number
  upcoming?: boolean | undefined
  limit: number
}

export type UkBankHolidayEvent = {
  title: string
  date: string
  notes: string
  bunting: boolean
}

export type UkBankHolidaysDivision = {
  division: string
  events: UkBankHolidayEvent[]
}

export class UkBankHolidaysClient {
  constructor(private readonly url = UK_BANK_HOLIDAYS_DEFAULT_URL, private readonly fetchImpl: typeof fetch = globalThis.fetch) {}

  async listEvents(query: UkBankHolidaysQuery, today = new Date()): Promise<UkBankHolidaysDivision[]> {
    const data = await this.fetchJson()
    const divisions = parseDivisions(data)
    const filteredDivisions = query.division === undefined
      ? divisions
      : divisions.filter(division => division.division === query.division)
    if (query.division !== undefined && filteredDivisions.length === 0) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `Unknown UK bank holidays division: ${query.division}`, {
        division: query.division,
        supported: divisions.map(division => division.division),
      })
    }

    return filteredDivisions.map(division => ({
      division: division.division,
      events: filterEvents(division.events, query, today),
    }))
  }

  private async fetchJson(): Promise<unknown> {
    let response: Response
    try {
      response = await this.fetchImpl(this.url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `UK Bank Holidays request failed: ${String(error)}`, {
        provider: 'uk-bank-holidays',
        url: this.url,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `UK Bank Holidays request failed with HTTP ${response.status}.`, {
        provider: 'uk-bank-holidays',
        status: response.status,
        url: this.url,
      })
    }

    try {
      return await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `UK Bank Holidays response was not JSON: ${String(error)}`, {
        provider: 'uk-bank-holidays',
        url: this.url,
      })
    }
  }
}

export function normalizeUkBankHolidaysQuery(input: {
  division?: string | undefined
  year?: number | undefined
  upcoming?: boolean | undefined
  limit?: number | undefined
} = {}): UkBankHolidaysQuery {
  const division = normalizeDivision(input.division)
  return {
    ...(division !== undefined ? { division } : {}),
    year: normalizeYear(input.year),
    ...(input.upcoming !== undefined ? { upcoming: input.upcoming } : {}),
    limit: normalizeLimit(input.limit),
  }
}

function parseDivisions(value: unknown): UkBankHolidaysDivision[] {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'UK Bank Holidays response was not an object.')
  }

  return Object.entries(value).flatMap(([division, rawDivision]) => {
    if (!isRecord(rawDivision) || !Array.isArray(rawDivision.events)) {
      return []
    }
    return [{
      division,
      events: rawDivision.events.filter(isRecord).flatMap(parseEvent),
    }]
  })
}

function parseEvent(entry: Record<string, unknown>): UkBankHolidayEvent[] {
  if (typeof entry.title !== 'string' || typeof entry.date !== 'string') {
    return []
  }
  return [{
    title: entry.title,
    date: entry.date,
    notes: typeof entry.notes === 'string' ? entry.notes : '',
    bunting: entry.bunting === true,
  }]
}

function filterEvents(events: UkBankHolidayEvent[], query: UkBankHolidaysQuery, today: Date): UkBankHolidayEvent[] {
  const todayText = toDateOnly(today)
  return events
    .filter(event => event.date.startsWith(`${query.year}-`))
    .filter(event => query.upcoming !== true || event.date >= todayText)
}

function normalizeDivision(value: string | undefined): string | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }
  const normalized = value.trim().toLowerCase()
  if (!/^(england-and-wales|scotland|northern-ireland)$/u.test(normalized)) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'UK Bank Holidays --division must be england-and-wales, scotland, or northern-ireland.',
      { division: value },
    )
  }
  return normalized
}

function normalizeYear(value: number | undefined): number {
  if (value === undefined) {
    return getUkBankHolidaysDefaultYear()
  }
  if (!Number.isInteger(value) || value < 1900 || value > 9999) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'UK Bank Holidays --year must be between 1900 and 9999.', { year: value })
  }
  return value
}

function normalizeLimit(value: number | undefined): number {
  const limit = value ?? UK_BANK_HOLIDAYS_DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit < 1 || limit > UK_BANK_HOLIDAYS_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `UK Bank Holidays --limit must be between 1 and ${UK_BANK_HOLIDAYS_MAX_LIMIT}.`, {
      limit: value,
      max: UK_BANK_HOLIDAYS_MAX_LIMIT,
    })
  }
  return limit
}

export function getUkBankHolidaysDefaultYear(today = new Date()): number {
  return today.getFullYear()
}

function toDateOnly(value: Date): string {
  return `${String(value.getFullYear()).padStart(4, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
