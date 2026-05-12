import { z } from 'zod'
import {
  getUsgsWaterDaily,
  getUsgsWaterInstantaneous,
  normalizeUsgsWaterDailyInput,
  normalizeUsgsWaterInstantaneousInput,
  USGS_WATER_MAX_DAILY_DAYS,
  type UsgsWaterDailyInput,
  type UsgsWaterInstantaneousInput,
} from '../../application/usecases/usgsWater.js'
import {
  USGS_WATER_DEFAULT_DAILY_PARAMETER_CODES,
  USGS_WATER_DEFAULT_END_DATE,
  USGS_WATER_DEFAULT_LIMIT,
  USGS_WATER_DEFAULT_PARAMETER_CODES,
  USGS_WATER_DEFAULT_SITE,
  USGS_WATER_DEFAULT_START_DATE,
  USGS_WATER_DEFAULT_STATISTIC_CODE,
  USGS_WATER_DOCS_URL,
  USGS_WATER_DV_DOCS_URL,
  USGS_WATER_IV_DOCS_URL,
  USGS_WATER_MAX_LIMIT,
  USGS_WATER_MAX_PARAMETER_CODES,
} from '../../infrastructure/openApis/usgsWaterClient.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const instantaneousParamsSchema = z.object({
  site: z.string().optional(),
  parameterCodes: z.string().optional(),
  period: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<UsgsWaterInstantaneousInput>

const dailyParamsSchema = z.object({
  site: z.string().optional(),
  parameterCodes: z.string().optional(),
  statisticCode: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<UsgsWaterDailyInput>

const instantaneousOperation:
PublicApiOperationDefinition<UsgsWaterInstantaneousInput> = {
  id: 'usgswater.instantaneous',
  providerId: 'usgswater',
  name: 'Instantaneous values',
  commandPath: ['usgswater', 'instantaneous'],
  rpcMethod: 'usgswater.instantaneous',
  description: 'Read current USGS water values for one monitored site.',
  category: 'science',
  options: [
    {
      name: 'site',
      flag: '--site <number>',
      description: `USGS site number, default ${USGS_WATER_DEFAULT_SITE}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'Single-site queries avoid broad service-wide downloads.',
      defaultValue: USGS_WATER_DEFAULT_SITE,
    },
    {
      name: 'parameterCodes',
      flag: '--parameter-codes <codes>',
      description: [
        'Comma-separated five-digit parameter codes, default',
        USGS_WATER_DEFAULT_PARAMETER_CODES.join(','),
        `cap ${USGS_WATER_MAX_PARAMETER_CODES}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'filters',
      reason: 'Maps to documented parameterCd while bounding query breadth.',
      defaultValue: USGS_WATER_DEFAULT_PARAMETER_CODES.join(','),
    },
    {
      name: 'period',
      flag: '--period <PT1H|P1D>',
      description: 'Optional recent period, capped to PT99H or P7D.',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Maps to documented period for recent bounded windows only.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `Values to show, default ${USGS_WATER_DEFAULT_LIMIT},`,
        `cap ${USGS_WATER_MAX_LIMIT}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Limits terminal output and discourages bulk extraction.',
      valueType: 'integer',
      defaultValue: String(USGS_WATER_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: instantaneousParamsSchema,
  execute: params => getUsgsWaterInstantaneous(params),
  normalizeParams: params => instantaneousParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeUsgsWaterInstantaneousInput(params),
  resultKind: 'usgswater.instantaneous',
  defaultFormat: 'text',
}

const dailyOperation: PublicApiOperationDefinition<UsgsWaterDailyInput> = {
  id: 'usgswater.daily',
  providerId: 'usgswater',
  name: 'Daily values',
  commandPath: ['usgswater', 'daily'],
  rpcMethod: 'usgswater.daily',
  description: 'Read bounded daily USGS water values for one monitored site.',
  category: 'science',
  options: [
    {
      name: 'site',
      flag: '--site <number>',
      description: `USGS site number, default ${USGS_WATER_DEFAULT_SITE}.`,
      exposure: 'primary',
      group: 'query',
      reason: 'Single-site queries avoid broad service-wide downloads.',
      defaultValue: USGS_WATER_DEFAULT_SITE,
    },
    {
      name: 'parameterCodes',
      flag: '--parameter-codes <codes>',
      description: [
        'Comma-separated five-digit parameter codes, default',
        USGS_WATER_DEFAULT_DAILY_PARAMETER_CODES.join(','),
        `cap ${USGS_WATER_MAX_PARAMETER_CODES}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'filters',
      reason: 'Maps to documented parameterCd while bounding query breadth.',
      defaultValue: USGS_WATER_DEFAULT_DAILY_PARAMETER_CODES.join(','),
    },
    {
      name: 'statisticCode',
      flag: '--statistic-code <code>',
      description: `Statistic code, default ${USGS_WATER_DEFAULT_STATISTIC_CODE}.`,
      exposure: 'advanced',
      group: 'filters',
      reason: 'Maps to documented statCd for daily statistics.',
      defaultValue: USGS_WATER_DEFAULT_STATISTIC_CODE,
    },
    {
      name: 'startDate',
      flag: '--start-date <YYYY-MM-DD>',
      description: [
        `Inclusive start date, default ${USGS_WATER_DEFAULT_START_DATE}.`,
        `Window cap ${USGS_WATER_MAX_DAILY_DAYS} days.`,
      ].join(' '),
      exposure: 'primary',
      group: 'filters',
      reason: 'Maps to documented startDT with a bounded date window.',
      defaultValue: USGS_WATER_DEFAULT_START_DATE,
    },
    {
      name: 'endDate',
      flag: '--end-date <YYYY-MM-DD>',
      description: `Inclusive end date, default ${USGS_WATER_DEFAULT_END_DATE}.`,
      exposure: 'primary',
      group: 'filters',
      reason: 'Maps to documented endDT with a bounded date window.',
      defaultValue: USGS_WATER_DEFAULT_END_DATE,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `Values to show, default ${USGS_WATER_DEFAULT_LIMIT},`,
        `cap ${USGS_WATER_MAX_LIMIT}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'Limits terminal output and discourages bulk extraction.',
      valueType: 'integer',
      defaultValue: String(USGS_WATER_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: dailyParamsSchema,
  execute: params => getUsgsWaterDaily(params),
  normalizeParams: params => dailyParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeUsgsWaterDailyInput(params),
  resultKind: 'usgswater.daily',
  defaultFormat: 'text',
}

export const usgsWaterProvider: PublicApiProviderModule = {
  manifest: {
    id: 'usgswater',
    name: 'USGS Water Services',
    description: [
      'No-auth HTTPS WaterML JSON access to bounded USGS instantaneous',
      'and daily water values for one monitored site.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: USGS_WATER_DOCS_URL,
    docsUrl: USGS_WATER_DOCS_URL,
    auth: {
      mode: 'none',
      notes: [
        [
          'Official docs and live probes confirmed selected IV/DV JSON',
          'routes return data without API key, OAuth, cookies, account setup,',
          'or browser session requirements.',
        ].join(' '),
      ],
    },
    tags: [
      'science',
      'water',
      'usgs',
      'hydrology',
      'waterml',
      'streamflow',
      'no-auth',
    ],
    freePlanNotes: [
      [
        'WaterServices docs warn users to specify the minimum data needed and',
        'avoid downloading all data with one call.',
      ].join(' '),
      [
        'WaterServices will be decommissioned in early 2027; provider records',
        'the migration URL but does not switch to unreviewed endpoints.',
      ].join(' '),
      [
        'Recent data can be provisional and subject to revision; CLI exposes',
        'read-only bounded values only.',
      ].join(' '),
    ],
  },
  operations: [instantaneousOperation, dailyOperation],
  endpoints: [
    {
      id: 'usgswater-instantaneous-values',
      method: 'GET',
      urlPattern: 'https://waterservices.usgs.gov/nwis/iv/?*',
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'USGS NWIS instantaneous values endpoint as WaterML JSON.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        USGS_WATER_DOCS_URL,
        USGS_WATER_IV_DOCS_URL,
        [
          'https://waterservices.usgs.gov/nwis/iv/?format=json',
          '&sites=01646500&parameterCd=00060,00065&siteStatus=all',
        ].join(''),
      ],
      consumedBy: ['usgswater.instantaneous'],
      notes: [
        'No authentication required.',
        [
          'CLI forces format=json, uses one site, caps parameter codes and',
          'returned readings, and excludes XML/RDB/KML/bulk downloads.',
        ].join(' '),
      ],
    },
    {
      id: 'usgswater-daily-values',
      method: 'GET',
      urlPattern: 'https://waterservices.usgs.gov/nwis/dv/?*',
      category: 'public-apis:science',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'USGS NWIS daily values endpoint as WaterML JSON.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        USGS_WATER_DOCS_URL,
        USGS_WATER_DV_DOCS_URL,
        [
          'https://waterservices.usgs.gov/nwis/dv/?format=json',
          '&sites=01646500&parameterCd=00060',
          '&startDT=2026-05-01&endDT=2026-05-11&siteStatus=all',
        ].join(''),
      ],
      consumedBy: ['usgswater.daily'],
      notes: [
        'No authentication required.',
        [
          'CLI forces format=json, uses one site, caps date window and',
          'returned readings, and excludes XML/RDB/KML/bulk downloads.',
        ].join(' '),
      ],
    },
  ],
}

export type {
  UsgsWaterDailyInput,
  UsgsWaterInstantaneousInput,
} from '../../application/usecases/usgsWater.js'
