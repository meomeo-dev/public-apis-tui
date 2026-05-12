import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const CZECH_NATIONAL_BANK_DEFAULT_BASE_URL = 'https://www.cnb.cz'
export const CZECH_NATIONAL_BANK_RATES_PATH = '/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/denni_kurz.xml'
export const CZECH_NATIONAL_BANK_DEFAULT_LIMIT = 30
export const CZECH_NATIONAL_BANK_MAX_LIMIT = 30

export type CzechNationalBankRatesInput = {
  date?: string | undefined
  code?: string | undefined
  limit?: number | undefined
}

export type NormalizedCzechNationalBankRatesInput = {
  date: string
  code: string
  limit: number
}

export type CzechNationalBankRate = {
  code: string
  currency?: string | undefined
  amount: number
  rate: number
  country?: string | undefined
}

export type CzechNationalBankRates = {
  bank?: string | undefined
  date?: string | undefined
  order?: string | undefined
  rates: CzechNationalBankRate[]
}

export class CzechNationalBankClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined; retryDelayMs?: number | undefined } = {}) {}

  async rates(input: NormalizedCzechNationalBankRatesInput): Promise<CzechNationalBankRates> {
    const url = new URL(CZECH_NATIONAL_BANK_RATES_PATH, this.options.baseUrl ?? CZECH_NATIONAL_BANK_DEFAULT_BASE_URL)
    if (input.date !== '') {
      url.searchParams.set('date', formatCnbDate(input.date))
    }
    const parsed = parseRatesXml(await this.fetchXml(url))
    const filtered = input.code === '' ? parsed.rates : parsed.rates.filter(rate => rate.code === input.code)
    return { ...parsed, rates: filtered.slice(0, input.limit) }
  }

  private async fetchXml(url: URL): Promise<string> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    const response = await fetchWithRetry(fetchImpl, url, this.options.retryDelayMs ?? 300)
    const body = await response.text()
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Czech National Bank request failed with HTTP ${response.status}.`, { provider: 'czechnationalbank', endpoint: url.href, status: response.status, response: body.slice(0, 500) })
    }
    return body
  }
}

async function fetchWithRetry(fetchImpl: typeof fetch, url: URL, retryDelayMs: number): Promise<Response> {
  const maxAttempts = 3
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, { headers: { accept: 'application/xml,text/xml,*/*', 'user-agent': 'public-apis-tui-cli' } })
      if (!shouldRetryResponse(response) || attempt === maxAttempts) {
        return response
      }
    } catch (error) {
      lastError = error
      if (attempt === maxAttempts) {
        throw new RuntimeFailure('OPEN_API_FAILED', 'Czech National Bank request failed after retrying transient network errors.', {
          provider: 'czechnationalbank',
          endpoint: url.href,
          cause: error instanceof Error ? error.message : String(error),
        })
      }
    }
    await delay(retryDelayMs * attempt)
  }
  throw new RuntimeFailure('OPEN_API_FAILED', 'Czech National Bank request failed after retrying transient network errors.', {
    provider: 'czechnationalbank',
    endpoint: url.href,
    cause: lastError instanceof Error ? lastError.message : String(lastError),
  })
}

function shouldRetryResponse(response: Response): boolean {
  return response.status === 429 || response.status === 500 || response.status === 502 || response.status === 503 || response.status === 504
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, milliseconds))
}

export function normalizeCzechNationalBankRatesInput(input: CzechNationalBankRatesInput = {}): NormalizedCzechNationalBankRatesInput {
  return {
    date: normalizeDate(input.date),
    code: normalizeCode(input.code),
    limit: normalizeLimit(input.limit ?? CZECH_NATIONAL_BANK_DEFAULT_LIMIT),
  }
}

function parseRatesXml(xml: string): CzechNationalBankRates {
  return {
    bank: readAttribute(xml, 'kurzy', 'banka'),
    date: readAttribute(xml, 'kurzy', 'datum'),
    order: readAttribute(xml, 'kurzy', 'poradi'),
    rates: [...xml.matchAll(/<radek\b([^>]*)\/>/gu)].flatMap(match => {
      const attrs = match[1] ?? ''
      const code = readAttributeFragment(attrs, 'kod')
      const amount = parseCnbNumber(readAttributeFragment(attrs, 'mnozstvi'))
      const rate = parseCnbNumber(readAttributeFragment(attrs, 'kurz'))
      if (code === undefined || amount === undefined || rate === undefined) {
        return []
      }
      return [{ code, currency: readAttributeFragment(attrs, 'mena'), amount, rate, country: readAttributeFragment(attrs, 'zeme') }]
    }),
  }
}

function readAttribute(xml: string, tag: string, attribute: string): string | undefined {
  const match = new RegExp(`<${tag}\\b[^>]*\\s${attribute}="([^"]*)"`, 'u').exec(xml)
  return match?.[1] === undefined ? undefined : decodeXmlEntities(match[1])
}

function readAttributeFragment(fragment: string, attribute: string): string | undefined {
  const match = new RegExp(`\\s${attribute}="([^"]*)"`, 'u').exec(fragment)
  return match?.[1] === undefined ? undefined : decodeXmlEntities(match[1])
}

function parseCnbNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeDate(value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    return ''
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Date must be formatted as YYYY-MM-DD.', { value })
  }
  return value
}

function normalizeCode(value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    return ''
  }
  const code = value.trim().toUpperCase()
  if (!/^[A-Z]{3}$/u.test(code)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Currency code must be a three-letter ISO code, e.g. EUR.', { value })
  }
  return code
}

function normalizeLimit(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > CZECH_NATIONAL_BANK_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `--limit must be an integer between 1 and ${CZECH_NATIONAL_BANK_MAX_LIMIT}.`, { value, max: CZECH_NATIONAL_BANK_MAX_LIMIT })
  }
  return value
}

function formatCnbDate(value: string): string {
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}`
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
}
