import { z } from 'zod'
import { getBnmExchangeRates, getBnmKijangEmas, getBnmOpr } from '../../application/usecases/bankNegaraMalaysia.js'
import {
  BNM_DEFAULT_CURRENCY,
  BNM_DEFAULT_LIMIT,
  BNM_MAX_LIMIT,
  normalizeBnmExchangeRatesInput,
  type BnmExchangeRatesInput,
} from '../../infrastructure/openApis/bankNegaraMalaysiaClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

type EmptyParams = Record<string, unknown>

const emptyParamsSchema = z.object({}).passthrough() satisfies z.ZodType<EmptyParams>

const exchangeRatesParamsSchema = z.object({
  currencyCode: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<BnmExchangeRatesInput>

const oprOperation: PublicApiOperationDefinition<EmptyParams> = {
  id: 'banknegaramalaysia.opr',
  providerId: 'banknegaramalaysia',
  name: 'Overnight Policy Rate',
  commandPath: ['banknegaramalaysia', 'opr'],
  rpcMethod: 'banknegaramalaysia.opr',
  description: 'Read Bank Negara Malaysia latest Overnight Policy Rate.',
  category: 'government',
  options: [],
  paramsSchema: emptyParamsSchema,
  execute: () => getBnmOpr(),
  normalizeParams: params => emptyParamsSchema.parse(params),
  resultKind: 'banknegaramalaysia.opr',
  defaultFormat: 'text',
}

const exchangeRatesOperation: PublicApiOperationDefinition<BnmExchangeRatesInput> = {
  id: 'banknegaramalaysia.exchangeRates',
  providerId: 'banknegaramalaysia',
  name: 'Exchange Rates',
  commandPath: ['banknegaramalaysia', 'exchange-rates'],
  rpcMethod: 'banknegaramalaysia.exchangeRates',
  description: 'Read Bank Negara Malaysia latest exchange rates.',
  category: 'government',
  options: [
    {
      name: 'currencyCode',
      flag: '--currency-code <code>',
      description: `Optional 3-letter currency code, e.g. ${BNM_DEFAULT_CURRENCY}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'Single-currency focus is the common terminal workflow; omitting it returns the full latest rate board.',
      valueType: 'string',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Rates to show/cache, default/cap ${BNM_DEFAULT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The latest exchange-rate board currently returns 27 currencies; default/cap uses that maximum to maximize each request.',
      valueType: 'integer',
      defaultValue: String(BNM_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: exchangeRatesParamsSchema,
  execute: params => getBnmExchangeRates(params),
  normalizeParams: params => exchangeRatesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeBnmExchangeRatesInput(params),
  resultKind: 'banknegaramalaysia.exchangeRates',
  defaultFormat: 'text',
}

const kijangEmasOperation: PublicApiOperationDefinition<EmptyParams> = {
  id: 'banknegaramalaysia.kijangEmas',
  providerId: 'banknegaramalaysia',
  name: 'Kijang Emas Gold',
  commandPath: ['banknegaramalaysia', 'kijang-emas'],
  rpcMethod: 'banknegaramalaysia.kijangEmas',
  description: 'Read Bank Negara Malaysia Kijang Emas gold coin prices.',
  category: 'government',
  options: [],
  paramsSchema: emptyParamsSchema,
  execute: () => getBnmKijangEmas(),
  normalizeParams: params => emptyParamsSchema.parse(params),
  resultKind: 'banknegaramalaysia.kijangEmas',
  defaultFormat: 'text',
}

export const bankNegaraMalaysiaProvider: PublicApiProviderModule = {
  manifest: {
    id: 'banknegaramalaysia',
    name: 'Bank Negara Malaysia Open Data',
    description: 'No-auth API Kijang central-bank JSON data for OPR, exchange rates, and Kijang Emas gold quotes.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://apikijangportal.bnm.gov.my/',
    docsUrl: 'https://apikijangportal.bnm.gov.my/',
    auth: {
      mode: 'none',
      notes: ['API Kijang public endpoints require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['government', 'central-bank', 'malaysia', 'finance', 'exchange-rates', 'gold', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Requests use the documented versioned Accept header application/vnd.BNM.API.v1+json.',
      `Exchange-rate default/cap is ${BNM_MAX_LIMIT}, matching the latest board size observed on 2026-05-04.`,
    ],
  },
  operations: [oprOperation, exchangeRatesOperation, kijangEmasOperation],
  endpoints: [
    {
      id: 'banknegaramalaysia-opr',
      method: 'GET',
      urlPattern: 'https://api.bnm.gov.my/public/opr',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'API Kijang Overnight Policy Rate endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://apikijangportal.bnm.gov.my/', 'https://api.bnm.gov.my/public/opr'],
      consumedBy: ['banknegaramalaysia opr'],
      notes: ['No API key required.', 'Requires versioned Accept header.', 'No browser clickstream or scraping required.'],
    },
    {
      id: 'banknegaramalaysia-exchange-rate',
      method: 'GET',
      urlPattern: 'https://api.bnm.gov.my/public/exchange-rate*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'API Kijang latest exchange-rate board and single-currency endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://apikijangportal.bnm.gov.my/', 'https://api.bnm.gov.my/public/exchange-rate', 'https://api.bnm.gov.my/public/exchange-rate/USD'],
      consumedBy: ['banknegaramalaysia exchange-rates'],
      notes: ['No API key required.', 'Requires versioned Accept header.', 'No browser clickstream or scraping required.'],
    },
    {
      id: 'banknegaramalaysia-kijang-emas',
      method: 'GET',
      urlPattern: 'https://api.bnm.gov.my/public/kijang-emas',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'API Kijang Kijang Emas gold coin prices endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://apikijangportal.bnm.gov.my/', 'https://api.bnm.gov.my/public/kijang-emas'],
      consumedBy: ['banknegaramalaysia kijang-emas'],
      notes: ['No API key required.', 'Requires versioned Accept header.', 'No browser clickstream or scraping required.'],
    },
  ],
}
