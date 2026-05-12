import {
  NAMEDAYS_DEFAULT_COUNTRY_LIMIT,
  NAMEDAYS_DEFAULT_DATE_LABEL,
  NAMEDAYS_DEFAULT_MATCH_LIMIT,
  NAMEDAYS_DEFAULT_NAME,
  NAMEDAYS_MAX_COUNTRY_LIMIT,
  NAMEDAYS_MAX_MATCH_LIMIT,
  NamedaysClient,
  getNamedaysDefaultDateParts,
  normalizeNamedaysDateQuery,
  normalizeNamedaysNameQuery,
  type NamedaysCountryNames,
  type NamedaysNameMatch,
} from '../../infrastructure/openApis/namedaysClient.js'

export type NamedaysDateInput = {
  day?: number | undefined
  month?: number | undefined
  country?: string | undefined
  limit?: number | undefined
}

export type NamedaysNameInput = {
  name?: string | undefined
  country?: string | undefined
  limit?: number | undefined
}

export async function getNamedaysByDate(input: NamedaysDateInput = {}): Promise<Record<string, unknown>> {
  const client = new NamedaysClient()
  const query = normalizeNamedaysDateInput(input)
  const countries = await client.getDate(query)
  const { visibleCountries, suppressedCountries } = suppressUnstableDateCountries(countries)
  return {
    kind: 'namedays.date',
    api: createApiMeta('GET /V2/date'),
    query,
    count: visibleCountries.length,
    totalCountries: countries.length,
    suppressedCountries,
    ...(suppressedCountries.length > 0 ? { warningMessage: `Hidden unstable upstream date entries for ${suppressedCountries.join(', ')} after repeated live probes returned non-nameday text.` } : {}),
    countries: visibleCountries.map(projectCountryNames),
  }
}

export async function searchNamedaysByName(input: NamedaysNameInput = {}): Promise<Record<string, unknown>> {
  const client = new NamedaysClient()
  const query = normalizeNamedaysNameInput(input)
  const matches = await client.getName(query)
  return {
    kind: 'namedays.name',
    api: createApiMeta('POST /V2/getname'),
    query,
    count: matches.length,
    matches: matches.map(projectNameMatch),
  }
}

function createApiMeta(endpoint: string): Record<string, unknown> {
  const defaultDate = getNamedaysDefaultDateParts()
  return {
    provider: 'namedays',
    endpoint,
    authentication: 'none',
    usesBrowserClickstream: false,
    docs: 'https://nameday.abalin.net/docs/api',
    apiVersion: 'V2',
    defaultDateLabel: NAMEDAYS_DEFAULT_DATE_LABEL,
    defaultDay: defaultDate.day,
    defaultMonth: defaultDate.month,
    defaultName: NAMEDAYS_DEFAULT_NAME,
    defaultCountryLimit: NAMEDAYS_DEFAULT_COUNTRY_LIMIT,
    countryLimitCap: NAMEDAYS_MAX_COUNTRY_LIMIT,
    defaultMatchLimit: NAMEDAYS_DEFAULT_MATCH_LIMIT,
    matchLimitCap: NAMEDAYS_MAX_MATCH_LIMIT,
  }
}

export function normalizeNamedaysDateInput(input: NamedaysDateInput = {}) {
  return normalizeNamedaysDateQuery(input)
}

export function normalizeNamedaysNameInput(input: NamedaysNameInput = {}) {
  return normalizeNamedaysNameQuery(input)
}

function projectCountryNames(entry: NamedaysCountryNames): Record<string, unknown> {
  return {
    country: entry.country,
    names: entry.names,
  }
}

function projectNameMatch(match: NamedaysNameMatch): Record<string, unknown> {
  return {
    country: match.country,
    day: match.day,
    month: match.month,
    names: match.names,
  }
}

function suppressUnstableDateCountries(countries: NamedaysCountryNames[]): {
  visibleCountries: NamedaysCountryNames[]
  suppressedCountries: string[]
} {
  const visibleCountries: NamedaysCountryNames[] = []
  const suppressedCountries: string[] = []

  for (const entry of countries) {
    if (entry.country === 'ru') {
      suppressedCountries.push(entry.country)
      continue
    }
    visibleCountries.push(entry)
  }

  return {
    visibleCountries,
    suppressedCountries,
  }
}
