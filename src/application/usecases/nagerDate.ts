import {
  NagerDateClient,
  NAGER_DATE_DEFAULT_COUNTRY_CODE,
  NAGER_DATE_DEFAULT_COUNTRY_LIMIT,
  NAGER_DATE_MAX_COUNTRY_LIMIT,
  getNagerDateDefaultYear,
  normalizeNagerDateCountriesQuery,
  normalizeNagerDateHolidaysQuery,
  type NagerDateCountry,
  type NagerDateHoliday,
} from '../../infrastructure/openApis/nagerDateClient.js'

export type NagerDateCountriesInput = {
  query?: string | undefined
  limit?: number | undefined
}

export type NagerDateHolidaysInput = {
  year?: number | undefined
  countryCode?: string | undefined
  county?: string | undefined
  type?: string | undefined
}

export async function listNagerDateCountries(input: NagerDateCountriesInput = {}): Promise<Record<string, unknown>> {
  const client = new NagerDateClient()
  const query = normalizeNagerDateCountriesQuery(input)
  const countries = await client.listCountries(query)
  return {
    kind: 'nagerdate.countries',
    api: createApiMeta('GET /availablecountries'),
    query,
    count: countries.length,
    countries: countries.map(projectCountry),
  }
}

export async function listNagerDateHolidays(input: NagerDateHolidaysInput = {}): Promise<Record<string, unknown>> {
  const client = new NagerDateClient()
  const query = normalizeNagerDateHolidaysQuery(input)
  const holidays = await client.listPublicHolidays(query)
  return {
    kind: 'nagerdate.holidays',
    api: createApiMeta('GET /publicholidays/{year}/{countryCode}'),
    query,
    count: holidays.length,
    holidays: holidays.map(projectHoliday),
  }
}

function createApiMeta(endpoint: string): Record<string, unknown> {
  return {
    provider: 'nagerdate',
    endpoint,
    authentication: 'none',
    usesBrowserClickstream: false,
    docs: 'https://date.nager.at/Api',
    noRateLimitClaim: true,
    defaultYear: getNagerDateDefaultYear(),
    defaultCountryCode: NAGER_DATE_DEFAULT_COUNTRY_CODE,
    defaultCountryLimit: NAGER_DATE_DEFAULT_COUNTRY_LIMIT,
    countryLimitCap: NAGER_DATE_MAX_COUNTRY_LIMIT,
  }
}

export {
  getNagerDateDefaultYear,
  normalizeNagerDateCountriesQuery,
  normalizeNagerDateHolidaysQuery,
}

function projectCountry(country: NagerDateCountry): Record<string, unknown> {
  return {
    countryCode: country.countryCode,
    name: country.name,
  }
}

function projectHoliday(holiday: NagerDateHoliday): Record<string, unknown> {
  return {
    date: holiday.date,
    localName: holiday.localName,
    name: holiday.name,
    countryCode: holiday.countryCode,
    fixed: holiday.fixed,
    global: holiday.global,
    counties: holiday.counties,
    ...(holiday.launchYear !== undefined ? { launchYear: holiday.launchYear } : {}),
    types: holiday.types,
  }
}
