import { z } from 'zod'
import {
  getWorldBankIndicator,
  listWorldBankCountries,
  normalizeWorldBankCountriesInput,
  normalizeWorldBankIndicatorInput,
  WORLD_BANK_DEFAULT_COUNTRY,
  WORLD_BANK_DEFAULT_DATE,
  WORLD_BANK_DEFAULT_INDICATOR,
  WORLD_BANK_DEFAULT_PER_PAGE,
  WORLD_BANK_MAX_PER_PAGE,
  type WorldBankCountriesInput,
  type WorldBankIndicatorInput,
} from '../../application/usecases/worldBank.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const countriesParamsSchema = z.object({
  page: z.number().int().optional(),
  perPage: z.number().int().optional(),
}) satisfies z.ZodType<WorldBankCountriesInput>

const indicatorParamsSchema = z.object({
  country: z.string().optional(),
  indicator: z.string().optional(),
  date: z.string().optional(),
  page: z.number().int().optional(),
  perPage: z.number().int().optional(),
}) satisfies z.ZodType<WorldBankIndicatorInput>

const countriesOperation: PublicApiOperationDefinition<WorldBankCountriesInput> = {
  id: 'worldbank.countries',
  providerId: 'worldbank',
  name: 'Countries',
  commandPath: ['worldbank', 'countries'],
  rpcMethod: 'worldbank.countries',
  description: 'List bounded World Bank country and aggregate metadata.',
  category: 'science',
  options: [
    {
      name: 'page',
      flag: '--page <number>',
      description: 'Result page, default 1.',
      exposure: 'primary',
      group: 'pagination',
      reason: 'World Bank country lists are paged; page keeps traversal explicit.',
      valueType: 'integer',
      defaultValue: '1',
    },
    {
      name: 'perPage',
      flag: '--per-page <count>',
      description: [
        `Rows per page, 1-${String(WORLD_BANK_MAX_PER_PAGE)},`,
        `default ${String(WORLD_BANK_DEFAULT_PER_PAGE)}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Bounds terminal output and persisted cache payloads.',
      valueType: 'integer',
      defaultValue: String(WORLD_BANK_DEFAULT_PER_PAGE),
    },
  ],
  paramsSchema: countriesParamsSchema,
  execute: params => listWorldBankCountries(params),
  normalizeParams: params => countriesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeWorldBankCountriesInput(params),
  resultKind: 'worldbank.countries',
  defaultFormat: 'text',
}

const indicatorOperation: PublicApiOperationDefinition<WorldBankIndicatorInput> = {
  id: 'worldbank.indicator',
  providerId: 'worldbank',
  name: 'Indicator series',
  commandPath: ['worldbank', 'indicator'],
  rpcMethod: 'worldbank.indicator',
  description: 'Read a bounded World Bank country indicator time series.',
  category: 'science',
  options: [
    {
      name: 'country',
      flag: '--country <code>',
      description: `Country or aggregate code, default ${WORLD_BANK_DEFAULT_COUNTRY}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'World Bank indicator routes are scoped by country or aggregate code.',
      valueType: 'string',
      defaultValue: WORLD_BANK_DEFAULT_COUNTRY,
    },
    {
      name: 'indicator',
      flag: '--indicator <code>',
      description: `Indicator code, default ${WORLD_BANK_DEFAULT_INDICATOR}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'The selected indicator determines the data series returned.',
      valueType: 'string',
      defaultValue: WORLD_BANK_DEFAULT_INDICATOR,
    },
    {
      name: 'date',
      flag: '--date <YYYY|YYYY:YYYY>',
      description: `Year or range, default ${WORLD_BANK_DEFAULT_DATE}.`,
      exposure: 'primary',
      group: 'filters',
      reason: 'Date bounds keep the query focused and avoid bulk historical dumps.',
      valueType: 'string',
      defaultValue: WORLD_BANK_DEFAULT_DATE,
    },
    {
      name: 'page',
      flag: '--page <number>',
      description: 'Result page, default 1.',
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Supports explicit traversal when a date range exceeds one page.',
      valueType: 'integer',
      defaultValue: '1',
    },
    {
      name: 'perPage',
      flag: '--per-page <count>',
      description: [
        `Rows per page, 1-${String(WORLD_BANK_MAX_PER_PAGE)},`,
        `default ${String(WORLD_BANK_DEFAULT_PER_PAGE)}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Bounds terminal output and persisted cache payloads.',
      valueType: 'integer',
      defaultValue: String(WORLD_BANK_DEFAULT_PER_PAGE),
    },
  ],
  paramsSchema: indicatorParamsSchema,
  execute: params => getWorldBankIndicator(params),
  normalizeParams: params => indicatorParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeWorldBankIndicatorInput(params),
  resultKind: 'worldbank.indicator',
  defaultFormat: 'text',
}

export const worldBankProvider: PublicApiProviderModule = {
  manifest: {
    id: 'worldbank',
    name: 'World Bank',
    description: [
      'No-auth HTTPS JSON access to bounded World Bank API v2 country',
      'metadata and country indicator time series.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: 'https://datahelpdesk.worldbank.org/knowledgebase/articles/889392',
    docsUrl: 'https://datahelpdesk.worldbank.org/knowledgebase/articles/889392',
    auth: {
      mode: 'none',
      notes: [
        [
          'Selected api.worldbank.org v2 JSON GET routes return public data',
          'without API key, OAuth, account setup, or browser sessions.',
        ].join(' '),
      ],
    },
    tags: ['science', 'economics', 'development', 'countries', 'no-auth', 'json'],
    freePlanNotes: [
      'The CLI fixes format=json and does not consume XML or HTML responses.',
      'Date ranges are capped at 60 years; per_page is capped at 100.',
      [
        'Bulk downloads, arbitrary route proxying, and HTML helpdesk',
        'scraping are excluded.',
      ].join(' '),
    ],
  },
  operations: [countriesOperation, indicatorOperation],
  endpoints: [
    {
      id: 'worldbank-countries',
      method: 'GET',
      urlPattern: 'https://api.worldbank.org/v2/country?*format=json*',
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'World Bank API v2 country and aggregate metadata JSON route.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://datahelpdesk.worldbank.org/knowledgebase/articles/889392',
        'https://api.worldbank.org/v2/country?format=json&per_page=3',
      ],
      consumedBy: ['public-apis apis run worldbank.countries'],
      notes: [
        'No authentication required for bounded GET JSON requests.',
        'CLI fixes format=json and validates page/per_page locally.',
      ],
    },
    {
      id: 'worldbank-country-indicator',
      method: 'GET',
      urlPattern: [
        'regex:^https://api\\.worldbank\\.org/v2/country/[A-Z0-9]{2,3}/',
        'indicator/[A-Z0-9_.-]+\\?.*format=json.*$',
      ].join(''),
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'World Bank API v2 country indicator time-series JSON route.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://datahelpdesk.worldbank.org/knowledgebase/articles/889392',
        [
          'https://api.worldbank.org/v2/country/US/indicator/',
          'SP.POP.TOTL?format=json&per_page=3&date=2020:2022',
        ].join(''),
      ],
      consumedBy: ['public-apis apis run worldbank.indicator'],
      notes: [
        'No authentication required for bounded GET JSON requests.',
        'CLI validates country, indicator, date range, page, and per_page locally.',
      ],
    },
    {
      id: 'worldbank-indicator-metadata',
      method: 'GET',
      urlPattern: [
        'regex:^https://api\\.worldbank\\.org/v2/indicator/',
        '[A-Z0-9_.-]+\\?.*format=json.*$',
      ].join(''),
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'World Bank API v2 indicator metadata JSON route.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://api.worldbank.org/v2/indicator/SP.POP.TOTL?format=json&per_page=3',
      ],
      consumedBy: ['public-apis apis run worldbank.indicator'],
      notes: [
        'Used to project indicator source and topic metadata.',
        'CLI fixes format=json and per_page=1 for metadata lookup.',
      ],
    },
  ],
}

export type {
  WorldBankCountriesInput,
  WorldBankIndicatorInput,
} from '../../application/usecases/worldBank.js'
