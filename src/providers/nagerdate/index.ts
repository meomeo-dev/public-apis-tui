import { z } from 'zod'
import {
  listNagerDateCountries,
  listNagerDateHolidays,
  normalizeNagerDateCountriesQuery,
  normalizeNagerDateHolidaysQuery,
  type NagerDateCountriesInput,
  type NagerDateHolidaysInput,
} from '../../application/usecases/nagerDate.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const countriesParamsSchema = z.object({
  query: z.string().min(1).optional(),
  limit: z.number().int().optional(),
}) satisfies z.ZodType<NagerDateCountriesInput>

const holidaysParamsSchema = z.object({
  year: z.number().int().optional(),
  countryCode: z.string().min(1).optional(),
  county: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
}) satisfies z.ZodType<NagerDateHolidaysInput>

const countriesOperation: PublicApiOperationDefinition<NagerDateCountriesInput> = {
  id: 'nagerdate.countries',
  providerId: 'nagerdate',
  name: 'Available Countries',
  commandPath: ['nagerdate', 'countries'],
  rpcMethod: 'nagerdate.countries',
  description: 'List countries supported by the Nager.Date public holiday API.',
  category: 'calendar',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: 'Filter country code or name',
      exposure: 'primary',
      group: 'query',
      reason: 'Country lookup is the main discovery step before requesting holidays.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Countries to show/cache, default 250, CLI cap 250',
      exposure: 'primary',
      group: 'pagination',
      reason: 'The endpoint returns a finite country list; the cap keeps output bounded while covering the full current set.',
      valueType: 'integer',
      defaultValue: '250',
    },
  ],
  paramsSchema: countriesParamsSchema,
  execute: params => listNagerDateCountries(params),
  normalizeParams: params => normalizeNagerDateCountriesQuery(countriesParamsSchema.parse(params)),
  createCacheKeyParams: params => normalizeNagerDateCountriesQuery(params),
  resultKind: 'nagerdate.countries',
  defaultFormat: 'text',
}

const holidaysOperation: PublicApiOperationDefinition<NagerDateHolidaysInput> = {
  id: 'nagerdate.holidays',
  providerId: 'nagerdate',
  name: 'Public Holidays',
  commandPath: ['nagerdate', 'holidays'],
  rpcMethod: 'nagerdate.holidays',
  description: 'List public holidays for a country and year from Nager.Date.',
  category: 'calendar',
  options: [
    {
      name: 'year',
      flag: '--year <year>',
      description: 'Calendar year, default current year',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented public holidays endpoint is year-addressed.',
      valueType: 'integer',
      defaultValue: 'current year',
    },
    {
      name: 'countryCode',
      flag: '--country-code <code>',
      description: 'ISO 3166-1 alpha-2 country code, default US',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented public holidays endpoint is country-addressed.',
      defaultValue: 'US',
    },
    {
      name: 'county',
      flag: '--county <code>',
      description: 'Filter by subdivision/county code, for example US-CA',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Nager.Date returns county-specific holidays; filtering them is useful but optional.',
    },
    {
      name: 'type',
      flag: '--type <name>',
      description: 'Filter by holiday type, for example Public or Bank',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Holiday type metadata is documented in responses and useful for terminal narrowing.',
    },
  ],
  paramsSchema: holidaysParamsSchema,
  execute: params => listNagerDateHolidays(params),
  normalizeParams: params => normalizeNagerDateHolidaysQuery(holidaysParamsSchema.parse(params)),
  createCacheKeyParams: params => normalizeNagerDateHolidaysQuery(params),
  resultKind: 'nagerdate.holidays',
  defaultFormat: 'text',
}

export const nagerDateProvider: PublicApiProviderModule = {
  manifest: {
    id: 'nagerdate',
    name: 'Nager.Date',
    description: 'No-auth HTTPS JSON API for worldwide public holiday data.',
    publicApisCategory: 'Calendar',
    homepageUrl: 'https://date.nager.at/',
    docsUrl: 'https://date.nager.at/Api',
    auth: {
      mode: 'none',
      notes: ['Official site documents public JSON endpoints without API keys.'],
    },
    tags: ['calendar', 'holidays', 'countries', 'no-auth', 'json'],
    freePlanNotes: [
      'Official site advertises no rate limit and JSON responses.',
      'Countries output defaults/caps at 250 to cover the finite supported country list while bounding cache/output.',
    ],
  },
  operations: [countriesOperation, holidaysOperation],
  endpoints: [
    {
      id: 'nagerdate-available-countries',
      method: 'GET',
      urlPattern: 'https://date.nager.at/api/v3/availablecountries',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Nager.Date supported countries JSON endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://date.nager.at/Api'],
      consumedBy: ['nagerdate countries'],
      notes: ['No authentication required.'],
    },
    {
      id: 'nagerdate-public-holidays',
      method: 'GET',
      urlPattern: 'https://date.nager.at/api/v3/publicholidays/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Nager.Date public holidays by year and country code.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://date.nager.at/Api'],
      consumedBy: ['nagerdate holidays'],
      notes: ['No authentication required.'],
    },
  ],
}
