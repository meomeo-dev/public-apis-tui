import { z } from 'zod'
import { getFedTreasuryDebt, getFedTreasuryRates } from '../../application/usecases/fedTreasury.js'
import {
  FED_TREASURY_DEFAULT_PAGE_NUMBER,
  FED_TREASURY_DEFAULT_PAGE_SIZE,
  FED_TREASURY_MAX_PAGE_SIZE,
  normalizeFedTreasuryDebtInput,
  normalizeFedTreasuryRatesInput,
  type FedTreasuryDebtInput,
  type FedTreasuryRatesInput,
} from '../../infrastructure/openApis/fedTreasuryClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const debtParamsSchema = z.object({
  pageNumber: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  recordDate: z.string().optional(),
}) satisfies z.ZodType<FedTreasuryDebtInput>

const ratesParamsSchema = z.object({
  pageNumber: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  recordDate: z.string().optional(),
  securityDesc: z.string().optional(),
}) satisfies z.ZodType<FedTreasuryRatesInput>

const debtOperation: PublicApiOperationDefinition<FedTreasuryDebtInput> = {
  id: 'fedtreasury.debt',
  providerId: 'fedtreasury',
  name: 'Debt to the Penny',
  commandPath: ['fedtreasury', 'debt'],
  rpcMethod: 'fedtreasury.debt',
  description: 'Read U.S. Treasury Debt to the Penny records.',
  category: 'finance',
  options: [
    {
      name: 'recordDate',
      flag: '--record-date <YYYY-MM-DD>',
      description: 'Optional record date filter',
      exposure: 'primary',
      group: 'filters',
      reason: 'Record-date filtering supports focused historical analysis without extra pages.',
    },
    {
      name: 'pageSize',
      flag: '--page-size <count>',
      description: `Rows per page, default/cap ${FED_TREASURY_DEFAULT_PAGE_SIZE}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Fiscal Data defaults page size to 100; using the max/default conserves requests.',
      valueType: 'integer',
      defaultValue: String(FED_TREASURY_DEFAULT_PAGE_SIZE),
    },
    {
      name: 'pageNumber',
      flag: '--page-number <page>',
      description: `Page number, default ${FED_TREASURY_DEFAULT_PAGE_NUMBER}`,
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Page navigation is advanced because latest sorted page covers the default TUI use case.',
      valueType: 'integer',
      defaultValue: String(FED_TREASURY_DEFAULT_PAGE_NUMBER),
    },
  ],
  paramsSchema: debtParamsSchema,
  execute: params => getFedTreasuryDebt(params),
  normalizeParams: params => debtParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeFedTreasuryDebtInput(params),
  resultKind: 'fedtreasury.debt',
  defaultFormat: 'text',
}

const ratesOperation: PublicApiOperationDefinition<FedTreasuryRatesInput> = {
  id: 'fedtreasury.rates',
  providerId: 'fedtreasury',
  name: 'Average Interest Rates',
  commandPath: ['fedtreasury', 'rates'],
  rpcMethod: 'fedtreasury.rates',
  description: 'Read U.S. Treasury average interest rates by security type.',
  category: 'finance',
  options: [
    {
      name: 'recordDate',
      flag: '--record-date <YYYY-MM-DD>',
      description: 'Optional record date filter',
      exposure: 'primary',
      group: 'filters',
      reason: 'Record-date filtering lets users inspect a known monthly rate snapshot.',
    },
    {
      name: 'securityDesc',
      flag: '--security-desc <text>',
      description: 'Optional exact security description filter',
      exposure: 'primary',
      group: 'filters',
      reason: 'Security filtering keeps rate output focused on an instrument class.',
    },
    {
      name: 'pageSize',
      flag: '--page-size <count>',
      description: `Rows per page, default/cap ${FED_TREASURY_DEFAULT_PAGE_SIZE}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Fiscal Data defaults page size to 100; using the max/default conserves requests.',
      valueType: 'integer',
      defaultValue: String(FED_TREASURY_DEFAULT_PAGE_SIZE),
    },
    {
      name: 'pageNumber',
      flag: '--page-number <page>',
      description: `Page number, default ${FED_TREASURY_DEFAULT_PAGE_NUMBER}`,
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Page navigation is advanced because latest sorted page covers the default TUI use case.',
      valueType: 'integer',
      defaultValue: String(FED_TREASURY_DEFAULT_PAGE_NUMBER),
    },
  ],
  paramsSchema: ratesParamsSchema,
  execute: params => getFedTreasuryRates(params),
  normalizeParams: params => ratesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeFedTreasuryRatesInput(params),
  resultKind: 'fedtreasury.rates',
  defaultFormat: 'text',
}

export const fedTreasuryProvider: PublicApiProviderModule = {
  manifest: {
    id: 'fedtreasury',
    name: 'Fed Treasury',
    description: 'No-auth U.S. Treasury Fiscal Data JSON API.',
    publicApisCategory: 'Finance',
    homepageUrl: 'https://fiscaldata.treasury.gov/api-documentation/',
    docsUrl: 'https://fiscaldata.treasury.gov/api-documentation/',
    auth: {
      mode: 'none',
      notes: ['Fiscal Data API is open without API key, token registration, cookies, browser session, or account setup.'],
    },
    tags: ['finance', 'government', 'treasury', 'debt', 'interest-rates', 'no-auth', 'json'],
    freePlanNotes: [
      'Official docs and live probes confirm HTTPS JSON GET endpoints without authentication.',
      `Fiscal Data default page size is ${FED_TREASURY_DEFAULT_PAGE_SIZE}; CLI caps page size at ${FED_TREASURY_MAX_PAGE_SIZE}.`,
    ],
  },
  operations: [debtOperation, ratesOperation],
  endpoints: [
    {
      id: 'fedtreasury-debt-to-penny',
      method: 'GET',
      urlPattern: 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'U.S. Treasury Fiscal Data Debt to the Penny endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://fiscaldata.treasury.gov/api-documentation/', 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny'],
      consumedBy: ['fedtreasury debt'],
      notes: ['No API key required.', 'Uses official HTTPS JSON API.'],
    },
    {
      id: 'fedtreasury-average-interest-rates',
      method: 'GET',
      urlPattern: 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'U.S. Treasury Fiscal Data average interest rates endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://fiscaldata.treasury.gov/api-documentation/', 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates'],
      consumedBy: ['fedtreasury rates'],
      notes: ['No API key required.', 'Uses official HTTPS JSON API.'],
    },
  ],
}
