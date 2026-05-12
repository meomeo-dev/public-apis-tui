import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const OPEN_DISEASE_DEFAULT_BASE_URL = 'https://disease.sh'
export const OPEN_DISEASE_DEFAULT_PERIOD: OpenDiseasePeriod = 'today'
export const OPEN_DISEASE_DEFAULT_SORT: OpenDiseaseSort = 'cases'
export const OPEN_DISEASE_COUNTRIES_DEFAULT_LIMIT = 231
export const OPEN_DISEASE_COUNTRIES_MAX_LIMIT = 231
export const OPEN_DISEASE_INFLUENZA_DEFAULT_LIMIT = 28
export const OPEN_DISEASE_INFLUENZA_MAX_LIMIT = 28

export type OpenDiseasePeriod = 'today' | 'yesterday' | 'two-days-ago'
export type OpenDiseaseSort =
  | 'cases'
  | 'todayCases'
  | 'deaths'
  | 'todayDeaths'
  | 'recovered'
  | 'active'
  | 'critical'
  | 'casesPerOneMillion'
  | 'deathsPerOneMillion'

export type OpenDiseaseGlobalInput = {
  period?: string | undefined
  allowNull?: boolean | undefined
}

export type NormalizedOpenDiseaseGlobalInput = {
  period: OpenDiseasePeriod
  allowNull: boolean
}

export type OpenDiseaseCountriesInput = {
  sort?: string | undefined
  allowNull?: boolean | undefined
  search?: string | undefined
  limit?: number | undefined
}

export type NormalizedOpenDiseaseCountriesInput = {
  sort: OpenDiseaseSort
  allowNull: boolean
  search: string
  limit: number
}

export type OpenDiseaseInfluenzaInput = {
  limit?: number | undefined
}

export type NormalizedOpenDiseaseInfluenzaInput = {
  limit: number
}

export type OpenDiseaseGlobalStats = {
  updated?: number | undefined
  cases?: number | undefined
  todayCases?: number | undefined
  deaths?: number | undefined
  todayDeaths?: number | undefined
  recovered?: number | undefined
  todayRecovered?: number | undefined
  active?: number | undefined
  critical?: number | undefined
  tests?: number | undefined
  population?: number | undefined
  affectedCountries?: number | undefined
  casesPerOneMillion?: number | undefined
  deathsPerOneMillion?: number | undefined
  testsPerOneMillion?: number | undefined
  activePerOneMillion?: number | undefined
  recoveredPerOneMillion?: number | undefined
  criticalPerOneMillion?: number | undefined
}

export type OpenDiseaseCountryInfo = {
  iso2?: string | undefined
  iso3?: string | undefined
  flag?: string | undefined
}

export type OpenDiseaseCountryStats = OpenDiseaseGlobalStats & {
  country: string
  continent?: string | undefined
  countryInfo: OpenDiseaseCountryInfo
}

export type OpenDiseaseInfluenzaRow = {
  week: string
  age0To4?: number | undefined
  age5To24?: number | undefined
  age25To49?: number | undefined
  age50To64?: number | undefined
  age64Plus?: number | undefined
  totalILI?: number | undefined
  totalPatients?: number | undefined
  percentUnweightedILI?: number | undefined
  percentWeightedILI?: number | undefined
}

export type OpenDiseaseInfluenza = {
  updated?: number | undefined
  source?: string | undefined
  rows: OpenDiseaseInfluenzaRow[]
}

export class OpenDiseaseClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async global(input: NormalizedOpenDiseaseGlobalInput): Promise<OpenDiseaseGlobalStats> {
    const url = this.createUrl('/v3/covid-19/all')
    applyPeriod(url, input.period)
    if (input.allowNull) {
      url.searchParams.set('allowNull', 'true')
    }
    return parseGlobalStats(await this.fetchJson(url))
  }

  async countries(input: NormalizedOpenDiseaseCountriesInput): Promise<{ total: number; countries: OpenDiseaseCountryStats[] }> {
    const url = this.createUrl('/v3/covid-19/countries')
    url.searchParams.set('sort', input.sort)
    if (input.allowNull) {
      url.searchParams.set('allowNull', 'true')
    }
    const allCountries = parseCountries(await this.fetchJson(url))
    const filtered = filterCountries(allCountries, input.search)
    return {
      total: filtered.length,
      countries: filtered.slice(0, input.limit),
    }
  }

  async influenza(input: NormalizedOpenDiseaseInfluenzaInput): Promise<OpenDiseaseInfluenza> {
    const parsed = await this.fetchJson(this.createUrl('/v3/influenza/cdc/ILINet'))
    const influenza = parseInfluenza(parsed)
    return {
      ...influenza,
      rows: influenza.rows.slice(0, input.limit),
    }
  }

  private createUrl(pathname: string): URL {
    return new URL(pathname, this.options.baseUrl ?? OPEN_DISEASE_DEFAULT_BASE_URL)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json', 'user-agent': 'public-apis-tui-cli' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Disease request failed: ${String(error)}`, { provider: 'opendisease', endpoint: url.href })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Open Disease returned a non-JSON response: ${String(error)}`, {
        provider: 'opendisease',
        endpoint: url.href,
        status: response.status,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed) ?? `Open Disease request failed with HTTP ${response.status}.`, {
        provider: 'opendisease',
        endpoint: url.href,
        status: response.status,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeOpenDiseaseGlobalInput(input: OpenDiseaseGlobalInput = {}): NormalizedOpenDiseaseGlobalInput {
  return {
    period: normalizePeriod(input.period ?? OPEN_DISEASE_DEFAULT_PERIOD),
    allowNull: input.allowNull === true,
  }
}

export function normalizeOpenDiseaseCountriesInput(input: OpenDiseaseCountriesInput = {}): NormalizedOpenDiseaseCountriesInput {
  return {
    sort: normalizeSort(input.sort ?? OPEN_DISEASE_DEFAULT_SORT),
    allowNull: input.allowNull === true,
    search: normalizeSearch(input.search),
    limit: normalizeLimit(input.limit ?? OPEN_DISEASE_COUNTRIES_DEFAULT_LIMIT, '--limit', OPEN_DISEASE_COUNTRIES_MAX_LIMIT),
  }
}

export function normalizeOpenDiseaseInfluenzaInput(input: OpenDiseaseInfluenzaInput = {}): NormalizedOpenDiseaseInfluenzaInput {
  return {
    limit: normalizeLimit(input.limit ?? OPEN_DISEASE_INFLUENZA_DEFAULT_LIMIT, '--limit', OPEN_DISEASE_INFLUENZA_MAX_LIMIT),
  }
}

function applyPeriod(url: URL, period: OpenDiseasePeriod): void {
  if (period === 'yesterday') {
    url.searchParams.set('yesterday', 'true')
  }
  if (period === 'two-days-ago') {
    url.searchParams.set('twoDaysAgo', 'true')
  }
}

function parseGlobalStats(value: unknown): OpenDiseaseGlobalStats {
  const record = requireRecord(value, 'Open Disease global response')
  return {
    updated: readNumber(record.updated),
    cases: readNumber(record.cases),
    todayCases: readNumber(record.todayCases),
    deaths: readNumber(record.deaths),
    todayDeaths: readNumber(record.todayDeaths),
    recovered: readNumber(record.recovered),
    todayRecovered: readNumber(record.todayRecovered),
    active: readNumber(record.active),
    critical: readNumber(record.critical),
    tests: readNumber(record.tests),
    population: readNumber(record.population),
    affectedCountries: readNumber(record.affectedCountries),
    casesPerOneMillion: readNumber(record.casesPerOneMillion),
    deathsPerOneMillion: readNumber(record.deathsPerOneMillion),
    testsPerOneMillion: readNumber(record.testsPerOneMillion),
    activePerOneMillion: readNumber(record.activePerOneMillion),
    recoveredPerOneMillion: readNumber(record.recoveredPerOneMillion),
    criticalPerOneMillion: readNumber(record.criticalPerOneMillion),
  }
}

function parseCountries(value: unknown): OpenDiseaseCountryStats[] {
  if (!Array.isArray(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Open Disease countries response must be a JSON array.', { provider: 'opendisease' })
  }
  return value.filter(isRecord).flatMap(country => {
    const name = readString(country.country)
    if (name === undefined) {
      return []
    }
    const countryInfo = isRecord(country.countryInfo) ? country.countryInfo : {}
    return [{
      ...parseGlobalStats(country),
      country: name,
      continent: readString(country.continent),
      countryInfo: {
        iso2: readString(countryInfo.iso2),
        iso3: readString(countryInfo.iso3),
        flag: readString(countryInfo.flag),
      },
    }]
  })
}

function parseInfluenza(value: unknown): OpenDiseaseInfluenza {
  const record = requireRecord(value, 'Open Disease influenza response')
  const data = Array.isArray(record.data) ? record.data.filter(isRecord) : []
  return {
    updated: readNumber(record.updated),
    source: readString(record.source),
    rows: data.flatMap(row => {
      const week = readString(row.week)
      if (week === undefined) {
        return []
      }
      return [{
        week,
        age0To4: readNumber(row['age 0-4']),
        age5To24: readNumber(row['age 5-24']),
        age25To49: readNumber(row['age 25-49']),
        age50To64: readNumber(row['age 50-64']),
        age64Plus: readNumber(row['age 64+']),
        totalILI: readNumber(row.totalILI),
        totalPatients: readNumber(row.totalPatients),
        percentUnweightedILI: readNumber(row.percentUnweightedILI),
        percentWeightedILI: readNumber(row.percentWeightedILI),
      }]
    }),
  }
}

function filterCountries(countries: OpenDiseaseCountryStats[], search: string): OpenDiseaseCountryStats[] {
  if (search === '') {
    return countries
  }
  const needle = search.toLowerCase()
  return countries.filter(country =>
    country.country.toLowerCase().includes(needle)
    || country.continent?.toLowerCase().includes(needle) === true
    || country.countryInfo.iso2?.toLowerCase() === needle
    || country.countryInfo.iso3?.toLowerCase() === needle)
}

function normalizePeriod(value: string): OpenDiseasePeriod {
  if (value === 'today' || value === 'yesterday' || value === 'two-days-ago') {
    return value
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', '--period must be today, yesterday, or two-days-ago.', { value })
}

function normalizeSort(value: string): OpenDiseaseSort {
  if (isOpenDiseaseSort(value)) {
    return value
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', '--sort must be one of the documented Open Disease country sort fields.', {
    value,
    supported: ['cases', 'todayCases', 'deaths', 'todayDeaths', 'recovered', 'active', 'critical', 'casesPerOneMillion', 'deathsPerOneMillion'],
  })
}

function isOpenDiseaseSort(value: string): value is OpenDiseaseSort {
  return ['cases', 'todayCases', 'deaths', 'todayDeaths', 'recovered', 'active', 'critical', 'casesPerOneMillion', 'deathsPerOneMillion'].includes(value)
}

function normalizeSearch(value: string | undefined): string {
  return value?.trim() ?? ''
}

function normalizeLimit(value: number, optionName: string, max: number): number {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${optionName} must be an integer between 1 and ${max}.`, { value, max })
  }
  return value
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new RuntimeFailure('OPEN_API_FAILED', `${label} must be a JSON object.`, { provider: 'opendisease' })
  }
  return value
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readErrorMessage(value: unknown): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  return readString(value.message) ?? readString(value.error)
}
