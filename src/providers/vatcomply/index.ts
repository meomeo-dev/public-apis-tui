import { z } from 'zod'
import {
  geolocateVatComply,
  getVatComplyRates,
  listVatComplyVatRates,
  validateVatComplyVat,
  type VatComplyRatesInput,
  type VatComplyVatInput,
  type VatComplyVatRatesInput,
} from '../../application/usecases/vatComply.js'
import {
  VATCOMPLY_DEFAULT_BASE,
  VATCOMPLY_RATES_DEFAULT_LIMIT,
  VATCOMPLY_VAT_RATES_DEFAULT_LIMIT,
  normalizeVatComplyRatesInput,
  normalizeVatComplyVatInput,
  normalizeVatComplyVatRatesInput,
} from '../../infrastructure/openApis/vatComplyClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const ratesParamsSchema = z.object({
  base: z.string().optional(),
  symbols: z.string().optional(),
  date: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<VatComplyRatesInput>

const vatRatesParamsSchema = z.object({
  countryCode: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<VatComplyVatRatesInput>

const vatParamsSchema = z.object({
  vatNumber: z.string().optional(),
}) satisfies z.ZodType<VatComplyVatInput>

const ratesOperation: PublicApiOperationDefinition<VatComplyRatesInput> = {
  id: 'vatcomply.rates',
  providerId: 'vatcomply',
  name: 'Exchange Rates',
  commandPath: ['vatcomply', 'rates'],
  rpcMethod: 'vatcomply.rates',
  description: 'Read VATComply ECB exchange rates for one base currency.',
  category: 'currency',
  options: [
    { name: 'base', flag: '--base <code>', description: `Base currency code, default ${VATCOMPLY_DEFAULT_BASE}`, exposure: 'primary', group: 'filters', reason: 'Base currency is the main selector for exchange-rate exploration.', defaultValue: VATCOMPLY_DEFAULT_BASE },
    { name: 'symbols', flag: '--symbols <codes>', description: 'Comma-separated quote currencies, e.g. USD,GBP', exposure: 'primary', group: 'filters', reason: 'The upstream API supports symbol filtering, keeping one request and concise terminal output.', defaultValue: '' },
    { name: 'date', flag: '--date <YYYY-MM-DD>', description: 'Optional historical rates date', exposure: 'advanced', group: 'filters', reason: 'Most users need latest rates; date is still useful for repeatable financial checks.', defaultValue: '' },
    { name: 'limit', flag: '--limit <count>', description: `Rates to show/cache, default/cap ${VATCOMPLY_RATES_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Default/cap preserves the full observed 33-currency rate map in one request.', valueType: 'integer', defaultValue: String(VATCOMPLY_RATES_DEFAULT_LIMIT) },
  ],
  paramsSchema: ratesParamsSchema,
  execute: params => getVatComplyRates(params),
  normalizeParams: params => ratesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeVatComplyRatesInput(params),
  resultKind: 'vatcomply.rates',
  defaultFormat: 'text',
}

const vatRatesOperation: PublicApiOperationDefinition<VatComplyVatRatesInput> = {
  id: 'vatcomply.vatRates',
  providerId: 'vatcomply',
  name: 'VAT Rates',
  commandPath: ['vatcomply', 'vat-rates'],
  rpcMethod: 'vatcomply.vatRates',
  description: 'Read VATComply country VAT rate tables.',
  category: 'tax',
  options: [
    { name: 'countryCode', flag: '--country-code <ISO2>', description: 'Optional two-letter country filter, e.g. DE', exposure: 'primary', group: 'filters', reason: 'Country code is the key selector for VAT rate lookup while preserving all-country default.', defaultValue: '' },
    { name: 'limit', flag: '--limit <count>', description: `VAT rate rows to show/cache, default/cap ${VATCOMPLY_VAT_RATES_DEFAULT_LIMIT}`, exposure: 'primary', group: 'pagination', reason: 'Default/cap preserves the full observed 27-country VAT rate list in one request.', valueType: 'integer', defaultValue: String(VATCOMPLY_VAT_RATES_DEFAULT_LIMIT) },
  ],
  paramsSchema: vatRatesParamsSchema,
  execute: params => listVatComplyVatRates(params),
  normalizeParams: params => vatRatesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeVatComplyVatRatesInput(params),
  resultKind: 'vatcomply.vatRates',
  defaultFormat: 'text',
}

const geolocateOperation: PublicApiOperationDefinition<Record<string, never>> = {
  id: 'vatcomply.geolocate',
  providerId: 'vatcomply',
  name: 'Geolocate',
  commandPath: ['vatcomply', 'geolocate'],
  rpcMethod: 'vatcomply.geolocate',
  description: 'Geolocate the CLI host public IP through VATComply.',
  category: 'geolocation',
  options: [],
  paramsSchema: z.object({}),
  execute: () => geolocateVatComply(),
  normalizeParams: () => ({}),
  createCacheKeyParams: () => ({}),
  resultKind: 'vatcomply.geolocate',
  defaultFormat: 'text',
}

const vatOperation: PublicApiOperationDefinition<VatComplyVatInput> = {
  id: 'vatcomply.vat',
  providerId: 'vatcomply',
  name: 'VAT Validation',
  commandPath: ['vatcomply', 'vat'],
  rpcMethod: 'vatcomply.vat',
  description: 'Validate a VAT number through VATComply.',
  category: 'tax',
  options: [
    { name: 'vatNumber', flag: '--vat-number <country+number>', description: 'VAT number with country prefix, e.g. IE6388047V', exposure: 'primary', group: 'query', reason: 'VAT number is the single required lookup key for the validation endpoint.' },
  ],
  paramsSchema: vatParamsSchema,
  execute: params => validateVatComplyVat(params),
  normalizeParams: params => vatParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeVatComplyVatInput(params),
  resultKind: 'vatcomply.vat',
  defaultFormat: 'text',
}

export const vatComplyProvider: PublicApiProviderModule = {
  manifest: {
    id: 'vatcomply',
    name: 'VATComply.com',
    description: 'No-auth VATComply API for ECB exchange rates, VAT rates, geolocation, and VAT validation.',
    publicApisCategory: 'Currency Exchange',
    homepageUrl: 'https://www.vatcomply.com/documentation',
    docsUrl: 'https://api.vatcomply.com/docs',
    auth: { mode: 'none', notes: ['The current OpenAPI document contains no security scheme and selected endpoints require no API key, OAuth, account setup, browser session, or Chrome clickstream.'] },
    tags: ['currency', 'exchange-rates', 'vat', 'tax', 'geolocation', 'no-auth', 'json'],
    freePlanNotes: [
      'OpenAPI docs publish /rates, /vat_rates, /geolocate, and /vat as JSON GET endpoints.',
      'No public request quota is documented; persistence/offline mode should be used for repeated terminal exploration.',
      'Defaults/caps preserve the full observed currency and VAT rate lists in one request.',
    ],
  },
  operations: [ratesOperation, vatRatesOperation, geolocateOperation, vatOperation],
  endpoints: [
    { id: 'vatcomply-rates', method: 'GET', urlPattern: 'https://api.vatcomply.com/rates*', category: 'public-apis:currency', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://api.vatcomply.com/docs', 'https://api.vatcomply.com/rates?base=USD&symbols=EUR,GBP'], consumedBy: ['vatcomply.rates'], description: 'VATComply exchange rates with optional base, symbols, and date query parameters.', notes: ['No authentication required.'] },
    { id: 'vatcomply-vat-rates', method: 'GET', urlPattern: 'https://api.vatcomply.com/vat_rates*', category: 'public-apis:tax', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://api.vatcomply.com/docs', 'https://api.vatcomply.com/vat_rates?country_code=DE'], consumedBy: ['vatcomply.vatRates'], description: 'VATComply country VAT rate table with optional country_code filter.', notes: ['No authentication required.'] },
    { id: 'vatcomply-geolocate', method: 'GET', urlPattern: 'https://api.vatcomply.com/geolocate', category: 'public-apis:geolocation', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://api.vatcomply.com/docs', 'https://api.vatcomply.com/geolocate'], consumedBy: ['vatcomply.geolocate'], description: 'VATComply geolocation for the request public IP.', notes: ['No authentication required.', 'Uses server-side IP geolocation only; no browser location or Chrome clickstream.'] },
    { id: 'vatcomply-vat-validation', method: 'GET', urlPattern: 'https://api.vatcomply.com/vat?*', category: 'public-apis:tax', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://api.vatcomply.com/docs', 'https://api.vatcomply.com/vat?vat_number=DE123456789'], consumedBy: ['vatcomply.vat'], description: 'VATComply VAT number validation endpoint.', notes: ['No authentication required.'] },
  ],
}
