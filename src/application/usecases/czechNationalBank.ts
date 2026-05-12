import {
  CZECH_NATIONAL_BANK_MAX_LIMIT,
  CZECH_NATIONAL_BANK_RATES_PATH,
  CzechNationalBankClient,
  normalizeCzechNationalBankRatesInput,
  type CzechNationalBankRate,
  type CzechNationalBankRatesInput,
} from '../../infrastructure/openApis/czechNationalBankClient.js'

export type CzechNationalBankRatesResult = {
  kind: 'czechnationalbank.rates'
  api: {
    provider: 'czechnationalbank'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'none'
    transport: 'HTTPS XML REST projected to JSON'
    rateLimit: string
  }
  query: ReturnType<typeof normalizeCzechNationalBankRatesInput>
  bank?: string | undefined
  date?: string | undefined
  order?: string | undefined
  rates: CzechNationalBankRate[]
  pagination: { returned: number; limit: number; maxLimit: number }
}

export async function getCzechNationalBankRates(input: CzechNationalBankRatesInput = {}): Promise<CzechNationalBankRatesResult> {
  const query = normalizeCzechNationalBankRatesInput(input)
  const result = await new CzechNationalBankClient().rates(query)
  return {
    kind: 'czechnationalbank.rates',
    api: {
      provider: 'czechnationalbank',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: `GET ${CZECH_NATIONAL_BANK_RATES_PATH}`,
      docsUrl: 'https://www.cnb.cz/cs/faq/Format-kurzu-devizoveho-trhu/',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS XML REST projected to JSON',
      rateLimit: 'No API key or public request quota is documented for the daily CNB XML endpoint.',
    },
    query,
    bank: result.bank,
    date: result.date,
    order: result.order,
    rates: result.rates,
    pagination: { returned: result.rates.length, limit: query.limit, maxLimit: CZECH_NATIONAL_BANK_MAX_LIMIT },
  }
}

export type { CzechNationalBankRatesInput }
