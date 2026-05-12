import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const BANK_OF_RUSSIA_DEFAULT_BASE_URL = 'https://www.cbr.ru'
export const BANK_OF_RUSSIA_RATES_DEFAULT_LIMIT = 54
export const BANK_OF_RUSSIA_RATES_MAX_LIMIT = 54
export const BANK_OF_RUSSIA_HISTORY_DEFAULT_LIMIT = 60
export const BANK_OF_RUSSIA_HISTORY_MAX_LIMIT = 60
export const BANK_OF_RUSSIA_DEFAULT_CODE = 'USD'

export type BankOfRussiaRatesInput = {
  date?: string | undefined
  code?: string | undefined
  limit?: number | undefined
}

export type NormalizedBankOfRussiaRatesInput = {
  date: string
  code: string
  limit: number
}

export type BankOfRussiaHistoryInput = {
  code?: string | undefined
  from?: string | undefined
  to?: string | undefined
  limit?: number | undefined
}

export type NormalizedBankOfRussiaHistoryInput = {
  code: string
  from: string
  to: string
  limit: number
}

export type BankOfRussiaRate = {
  id: string
  numCode?: string | undefined
  charCode: string
  nominal: number
  name?: string | undefined
  value: number
  unitRate?: number | undefined
}

export type BankOfRussiaRates = {
  date?: string | undefined
  name?: string | undefined
  rates: BankOfRussiaRate[]
}

export type BankOfRussiaHistoryRecord = {
  date: string
  nominal: number
  value: number
  unitRate?: number | undefined
}

export type BankOfRussiaHistory = {
  id: string
  code: string
  from?: string | undefined
  to?: string | undefined
  records: BankOfRussiaHistoryRecord[]
}

export class BankOfRussiaClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async rates(input: NormalizedBankOfRussiaRatesInput): Promise<BankOfRussiaRates> {
    const url = this.createUrl('/scripts/XML_daily.asp')
    if (input.date !== '') {
      url.searchParams.set('date_req', formatCbrDate(input.date))
    }
    const parsed = parseRatesXml(await this.fetchXml(url))
    const filtered = input.code === '' ? parsed.rates : parsed.rates.filter(rate => rate.charCode === input.code)
    return { ...parsed, rates: filtered.slice(0, input.limit) }
  }

  async history(input: NormalizedBankOfRussiaHistoryInput): Promise<BankOfRussiaHistory> {
    const latestRates = await this.rates({ date: '', code: input.code, limit: BANK_OF_RUSSIA_RATES_MAX_LIMIT })
    const rate = latestRates.rates.find(entry => entry.charCode === input.code)
    if (rate === undefined) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `Bank of Russia did not return currency code ${input.code} in the latest daily list.`, { code: input.code })
    }
    const url = this.createUrl('/scripts/XML_dynamic.asp')
    url.searchParams.set('date_req1', formatCbrDate(input.from))
    url.searchParams.set('date_req2', formatCbrDate(input.to))
    url.searchParams.set('VAL_NM_RQ', rate.id)
    return parseHistoryXml(await this.fetchXml(url), input.code, input.limit)
  }

  private createUrl(pathname: string): URL {
    return new URL(pathname, this.options.baseUrl ?? BANK_OF_RUSSIA_DEFAULT_BASE_URL)
  }

  private async fetchXml(url: URL): Promise<string> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/xml,text/xml,*/*', 'user-agent': 'public-apis-tui-cli' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Bank of Russia request failed: ${String(error)}`, { provider: 'bankofrussia', endpoint: url.href })
    }
    const body = decodeWindows1251(await response.arrayBuffer())
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Bank of Russia request failed with HTTP ${response.status}.`, {
        provider: 'bankofrussia',
        endpoint: url.href,
        status: response.status,
        response: body.slice(0, 500),
      })
    }
    return body
  }
}

export function normalizeBankOfRussiaRatesInput(input: BankOfRussiaRatesInput = {}): NormalizedBankOfRussiaRatesInput {
  return {
    date: normalizeOptionalDate(input.date),
    code: normalizeOptionalCurrencyCode(input.code),
    limit: normalizeLimit(input.limit ?? BANK_OF_RUSSIA_RATES_DEFAULT_LIMIT, '--limit', BANK_OF_RUSSIA_RATES_MAX_LIMIT),
  }
}

export function normalizeBankOfRussiaHistoryInput(input: BankOfRussiaHistoryInput = {}): NormalizedBankOfRussiaHistoryInput {
  const today = new Date()
  const from = normalizeOptionalDate(input.from) || formatIsoDate(addDays(today, -30))
  const to = normalizeOptionalDate(input.to) || formatIsoDate(today)
  if (from > to) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--from must be on or before --to.', { from, to })
  }
  return {
    code: normalizeRequiredCurrencyCode(input.code ?? BANK_OF_RUSSIA_DEFAULT_CODE),
    from,
    to,
    limit: normalizeLimit(input.limit ?? BANK_OF_RUSSIA_HISTORY_DEFAULT_LIMIT, '--limit', BANK_OF_RUSSIA_HISTORY_MAX_LIMIT),
  }
}

function parseRatesXml(xml: string): BankOfRussiaRates {
  return {
    date: readAttribute(xml, 'ValCurs', 'Date'),
    name: readAttribute(xml, 'ValCurs', 'name'),
    rates: matchBlocks(xml, 'Valute').flatMap(block => {
      const id = readAttribute(block, 'Valute', 'ID')
      const charCode = readTag(block, 'CharCode')
      const nominal = parseCbrNumber(readTag(block, 'Nominal'))
      const value = parseCbrNumber(readTag(block, 'Value'))
      if (id === undefined || charCode === undefined || nominal === undefined || value === undefined) {
        return []
      }
      return [{
        id,
        numCode: readTag(block, 'NumCode'),
        charCode,
        nominal,
        name: readTag(block, 'Name'),
        value,
        unitRate: parseCbrNumber(readTag(block, 'VunitRate')),
      }]
    }),
  }
}

function parseHistoryXml(xml: string, code: string, limit: number): BankOfRussiaHistory {
  const id = readAttribute(xml, 'ValCurs', 'ID') ?? ''
  const records = matchBlocks(xml, 'Record').flatMap(block => {
    const date = readAttribute(block, 'Record', 'Date')
    const nominal = parseCbrNumber(readTag(block, 'Nominal'))
    const value = parseCbrNumber(readTag(block, 'Value'))
    if (date === undefined || nominal === undefined || value === undefined) {
      return []
    }
    return [{
      date,
      nominal,
      value,
      unitRate: parseCbrNumber(readTag(block, 'VunitRate')),
    }]
  })
  return {
    id,
    code,
    from: readAttribute(xml, 'ValCurs', 'DateRange1'),
    to: readAttribute(xml, 'ValCurs', 'DateRange2'),
    records: records.slice(-limit),
  }
}

function matchBlocks(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}>`, 'gu'))].map(match => match[0])
}

function readTag(xml: string, tag: string): string | undefined {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'u').exec(xml)
  return match?.[1] === undefined ? undefined : decodeXmlEntities(match[1].trim())
}

function readAttribute(xml: string, tag: string, attribute: string): string | undefined {
  const match = new RegExp(`<${tag}\\b[^>]*\\s${attribute}="([^"]*)"`, 'u').exec(xml)
  return match?.[1] === undefined ? undefined : decodeXmlEntities(match[1])
}

function parseCbrNumber(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : undefined
}

function formatCbrDate(value: string): string {
  const [year, month, day] = value.split('-')
  if (year === undefined || month === undefined || day === undefined) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Date must be formatted as YYYY-MM-DD.', { value })
  }
  return `${day}/${month}/${year}`
}

function normalizeOptionalDate(value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    return ''
  }
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Date must be formatted as YYYY-MM-DD.', { value })
  }
  return value
}

function normalizeOptionalCurrencyCode(value: string | undefined): string {
  if (value === undefined || value.trim() === '') {
    return ''
  }
  return normalizeRequiredCurrencyCode(value)
}

function normalizeRequiredCurrencyCode(value: string): string {
  const code = value.trim().toUpperCase()
  if (!/^[A-Z]{3}$/u.test(code)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'Currency code must be a three-letter ISO code, e.g. USD.', { value })
  }
  return code
}

function normalizeLimit(value: number, optionName: string, max: number): number {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `${optionName} must be an integer between 1 and ${max}.`, { value, max })
  }
  return value
}

function decodeWindows1251(buffer: ArrayBuffer): string {
  return new TextDecoder('windows-1251').decode(buffer)
}

function decodeXmlEntities(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function formatIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10)
}
