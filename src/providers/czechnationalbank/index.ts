import { z } from 'zod'
import { getCzechNationalBankRates, type CzechNationalBankRatesInput } from '../../application/usecases/czechNationalBank.js'
import {
  CZECH_NATIONAL_BANK_DEFAULT_LIMIT,
  CZECH_NATIONAL_BANK_RATES_PATH,
  normalizeCzechNationalBankRatesInput,
} from '../../infrastructure/openApis/czechNationalBankClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const ratesParamsSchema = z.object({
  date: z.string().optional(),
  code: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<CzechNationalBankRatesInput>

const ratesOperation: PublicApiOperationDefinition<CzechNationalBankRatesInput> = {
  id: 'czechnationalbank.rates',
  providerId: 'czechnationalbank',
  name: 'Daily Exchange Rates',
  commandPath: ['czechnationalbank', 'rates'],
  rpcMethod: 'czechnationalbank.rates',
  description: 'Read Czech National Bank daily foreign exchange rates.',
  category: 'currency',
  options: [
    { name: 'date', flag: '--date <YYYY-MM-DD>', description: 'Daily rate date, default latest available business day', exposure: 'advanced', group: 'filters', reason: 'The documented date query is useful for historical snapshots but latest is the common terminal workflow.', defaultValue: '' },
    { name: 'code', flag: '--code <ISO>', description: 'Optional three-letter currency code filter, e.g. EUR', exposure: 'primary', group: 'filters', reason: 'Currency code is the key terminal exploration filter while preserving the full-list default.', defaultValue: '' },
    { name: 'limit', flag: '--limit <count>', description: `Rates to retain, default/cap ${CZECH_NATIONAL_BANK_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'The daily CNB XML feed currently returns 30 rows; default/cap preserves the full response in one request.', valueType: 'integer', defaultValue: String(CZECH_NATIONAL_BANK_DEFAULT_LIMIT) },
  ],
  paramsSchema: ratesParamsSchema,
  execute: params => getCzechNationalBankRates(params),
  normalizeParams: params => ratesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeCzechNationalBankRatesInput(params),
  resultKind: 'czechnationalbank.rates',
  defaultFormat: 'text',
}

export const czechNationalBankProvider: PublicApiProviderModule = {
  manifest: {
    id: 'czechnationalbank',
    name: 'Czech National Bank',
    description: 'Czech National Bank no-auth XML exchange-rate API projected to JSON.',
    publicApisCategory: 'Currency Exchange',
    homepageUrl: 'https://www.cnb.cz/',
    docsUrl: 'https://www.cnb.cz/cs/faq/Format-kurzu-devizoveho-trhu/',
    auth: { mode: 'none', notes: ['The daily XML feed requires no API key, OAuth, account setup, browser session, or Chrome clickstream.'] },
    tags: ['currency', 'exchange-rates', 'central-bank', 'czechia', 'xml', 'no-auth'],
    freePlanNotes: [
      'The CNB FAQ documents direct daily TXT/XML exchange-rate downloads.',
      'No public request quota or API key requirement is documented for the selected XML feed.',
      'Default/cap 30 preserves the full observed daily XML row set in one request.',
    ],
  },
  operations: [ratesOperation],
  endpoints: [
    {
      id: 'czechnationalbank-daily-rates',
      method: 'GET',
      urlPattern: `https://www.cnb.cz${CZECH_NATIONAL_BANK_RATES_PATH}*`,
      category: 'public-apis:currency',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-05',
      sampleSources: [
        'https://www.cnb.cz/cs/faq/Format-kurzu-devizoveho-trhu/',
        `https://www.cnb.cz${CZECH_NATIONAL_BANK_RATES_PATH}`,
      ],
      consumedBy: ['czechnationalbank.rates'],
      description: 'Czech National Bank daily foreign exchange rates in XML format.',
      notes: [
        'No authentication required.',
        'Optional date query uses Czech dd.mm.yyyy format; CLI accepts YYYY-MM-DD and converts it.',
        'Endpoint returns the latest available business-day rates when no date is provided.',
      ],
    },
  ],
}
