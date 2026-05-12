import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const ISDAYOFF_BASE_URL = 'https://isdayoff.ru/api'
export const ISDAYOFF_DOCS_URL = 'https://www.isdayoff.ru/docs/'
export const ISDAYOFF_DB_URL = 'https://www.isdayoff.ru/db/'

export const ISDAYOFF_COUNTRIES = [
  'ru',
  'by',
  'kz',
  'us',
  'uz',
  'tr',
  'lv',
] as const

export const ISDAYOFF_DEFAULT_COUNTRY = 'ru'
export const ISDAYOFF_MAX_RANGE_DAYS = 366

export type IsdayoffCountry = typeof ISDAYOFF_COUNTRIES[number]

export type IsdayoffDayQuery = {
  date: string
  countryCode: IsdayoffCountry
  includeShortened: boolean
  sixDay: boolean
  markHoliday: boolean
}

export type IsdayoffRangeQuery = {
  from: string
  to: string
  countryCode: IsdayoffCountry
  includeShortened: boolean
  sixDay: boolean
  markHoliday: boolean
}

export type IsdayoffStatusCode = '0' | '1' | '2' | '4' | '8'

export type IsdayoffDayStatus = {
  date: string
  code: IsdayoffStatusCode
  label: string
  isWorkingDay: boolean
  isNonWorkingDay: boolean
  isShortenedDay: boolean
  isHoliday: boolean
  isCovidSpecialDay: boolean
}

type IsdayoffClientOptions = {
  baseUrl?: string | undefined
  fetchImpl?: typeof fetch | undefined
}

type FetchTextResult = {
  text: string
  status: number
  contentType?: string | undefined
  url: string
}

export class IsdayoffClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch

  constructor(options: IsdayoffClientOptions = {}) {
    this.baseUrl = trimTrailingSlashes(options.baseUrl ?? ISDAYOFF_BASE_URL)
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch
  }

  async day(query: IsdayoffDayQuery): Promise<IsdayoffDayStatus> {
    const url = this.createGetDataUrl()
    appendDateParams(url, query.date)
    appendCommonParams(url, query)
    const response = await this.fetchText(url)
    const code = parseSingleStatus(response)
    return createDayStatus(query.date, code)
  }

  async range(query: IsdayoffRangeQuery): Promise<IsdayoffDayStatus[]> {
    const url = this.createGetDataUrl()
    url.searchParams.set('date1', query.from.replaceAll('-', ''))
    url.searchParams.set('date2', query.to.replaceAll('-', ''))
    appendCommonParams(url, query)
    const response = await this.fetchText(url)
    const codes = parseStatusSeries(response)
    const dates = enumerateIsoDates(query.from, query.to)
    if (codes.length !== dates.length) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        'isDayOff range response length did not match requested dates.',
        {
          provider: 'isdayoff',
          expectedDays: dates.length,
          returnedCodes: codes.length,
          url: response.url,
        },
      )
    }
    return dates.map((date, index) => createDayStatus(date, codes[index] ?? '0'))
  }

  private createGetDataUrl(): URL {
    return new URL(`${this.baseUrl}/getdata`)
  }

  private async fetchText(url: URL): Promise<FetchTextResult> {
    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method: 'GET',
        headers: {
          accept: 'text/plain',
          'user-agent': 'public-apis-tui no-auth CLI',
        },
      })
    } catch (error) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        `isDayOff request failed: ${String(error)}`,
        { provider: 'isdayoff', url: url.toString() },
      )
    }

    const text = (await response.text()).trim()

    if (isCloudflareChallenge(response, text)) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        [
          'isDayOff is currently returning a Cloudflare challenge HTML page',
          'instead of the documented text status API response; retry later',
          'or use cached/offline data.',
        ].join(' '),
        createResponseDetails(response, url),
      )
    }

    const contentType = response.headers.get('content-type') ?? undefined
    if (!response.ok) {
      throw new RuntimeFailure(
        'OPEN_API_FAILED',
        createProviderErrorMessage(response.status, text),
        {
          provider: 'isdayoff',
          status: response.status,
          contentType,
          providerCode: text,
          providerMeaning: readProviderErrorMeaning(text),
          url: url.toString(),
        },
      )
    }
    return {
      text,
      status: response.status,
      contentType: response.headers.get('content-type') ?? undefined,
      url: url.toString(),
    }
  }
}

function createResponseDetails(
  response: Response,
  url: URL,
): Record<string, unknown> {
  return {
    provider: 'isdayoff',
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get('content-type') ?? undefined,
    url: url.toString(),
  }
}

function isCloudflareChallenge(response: Response, body: string): boolean {
  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const mitigated = response.headers.get('cf-mitigated')?.toLowerCase() ?? ''
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
  return (
    (response.status === 403 || response.status === 429) &&
    contentType.includes('text/html') &&
    (
      mitigated === 'challenge' ||
      server.includes('cloudflare') ||
      /<title>\s*just a moment/i.test(body)
    )
  )
}

export function createDayStatus(
  date: string,
  code: IsdayoffStatusCode,
): IsdayoffDayStatus {
  const meaning = statusCodeMeanings[code]
  return {
    date,
    code,
    label: meaning.label,
    isWorkingDay: meaning.isWorkingDay,
    isNonWorkingDay: !meaning.isWorkingDay,
    isShortenedDay: code === '2',
    isHoliday: code === '8',
    isCovidSpecialDay: code === '4',
  }
}

export function parseSingleStatus(response: FetchTextResult): IsdayoffStatusCode {
  const codes = parseStatusSeries(response)
  if (codes.length !== 1) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'isDayOff day response did not contain exactly one status code.',
      {
        provider: 'isdayoff',
        status: response.status,
        contentType: response.contentType,
        preview: response.text.slice(0, 40),
        url: response.url,
      },
    )
  }
  return codes[0] ?? '0'
}

export function parseStatusSeries(response: FetchTextResult): IsdayoffStatusCode[] {
  const text = response.text
  if (text === '') return []
  const codes = [...text]
  if (!codes.every(isStatusCode)) {
    throw new RuntimeFailure(
      'OPEN_API_FAILED',
      'isDayOff response contained an undocumented status code.',
      {
        provider: 'isdayoff',
        status: response.status,
        contentType: response.contentType,
        preview: text.slice(0, 80),
        url: response.url,
      },
    )
  }
  return codes
}

export function enumerateIsoDates(from: string, to: string): string[] {
  const start = parseIsoDate(from)
  const end = parseIsoDate(to)
  const dates: string[] = []
  for (
    let time = start.getTime();
    time <= end.getTime();
    time += 24 * 60 * 60 * 1000
  ) {
    dates.push(toIsoDate(new Date(time)))
  }
  return dates
}

export function diffIsoDays(from: string, to: string): number {
  const start = parseIsoDate(from)
  const end = parseIsoDate(to)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

export function addIsoDays(date: string, days: number): string {
  const parsed = parseIsoDate(date)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return toIsoDate(parsed)
}

export function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function appendDateParams(url: URL, date: string): void {
  const [year, month, day] = date.split('-')
  url.searchParams.set('year', year ?? '')
  url.searchParams.set('month', month ?? '')
  url.searchParams.set('day', day ?? '')
}

function appendCommonParams(
  url: URL,
  query: {
    countryCode: IsdayoffCountry
    includeShortened: boolean
    sixDay: boolean
    markHoliday: boolean
  },
): void {
  url.searchParams.set('cc', query.countryCode)
  if (query.includeShortened) url.searchParams.set('pre', '1')
  if (query.sixDay) url.searchParams.set('sd', '1')
  if (query.markHoliday) url.searchParams.set('holiday', '1')
}

function parseIsoDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || toIsoDate(parsed) !== value) {
    throw new RuntimeFailure(
      'INVALID_ARGUMENT',
      'isDayOff date must be a real date in YYYY-MM-DD format.',
      { date: value },
    )
  }
  return parsed
}

function createProviderErrorMessage(status: number, code: string): string {
  const meaning = readProviderErrorMeaning(code)
  return meaning === undefined
    ? `isDayOff request failed with HTTP ${status}.`
    : `isDayOff request failed with provider code ${code}: ${meaning}.`
}

function readProviderErrorMeaning(code: string): string | undefined {
  if (code === '100') return 'date or country code error'
  if (code === '101') return 'data not found'
  if (code === '199') return 'service error'
  return undefined
}

function isStatusCode(value: string): value is IsdayoffStatusCode {
  return value === '0' || value === '1' || value === '2' ||
    value === '4' || value === '8'
}

const statusCodeMeanings: Record<
  IsdayoffStatusCode,
  { label: string; isWorkingDay: boolean }
> = {
  '0': { label: 'working day', isWorkingDay: true },
  '1': { label: 'non-working day', isWorkingDay: false },
  '2': { label: 'shortened working day', isWorkingDay: true },
  '4': { label: 'COVID special non-working day', isWorkingDay: false },
  '8': { label: 'holiday', isWorkingDay: false },
}

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/u, '')
}
