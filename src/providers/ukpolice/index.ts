import { z } from 'zod'
import { listUkPoliceStreetCrimes } from '../../application/usecases/ukPolice.js'
import {
  normalizeUkPoliceStreetCrimesInput,
  UK_POLICE_DEFAULT_CATEGORY,
  UK_POLICE_DEFAULT_LATITUDE,
  UK_POLICE_DEFAULT_LIMIT,
  UK_POLICE_DEFAULT_LONGITUDE,
  type UkPoliceStreetCrimesInput,
} from '../../infrastructure/openApis/ukPoliceClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const streetCrimesParamsSchema = z.object({
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  date: z.string().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<UkPoliceStreetCrimesInput>

const streetCrimesOperation: PublicApiOperationDefinition<UkPoliceStreetCrimesInput> = {
  id: 'ukpolice.streetCrimes',
  providerId: 'ukpolice',
  name: 'Street-level Crimes',
  commandPath: ['ukpolice', 'street-crimes'],
  rpcMethod: 'ukpolice.streetCrimes',
  description: 'Read public UK street-level crime records near coordinates through the no-auth data.police.uk API.',
  category: 'security',
  options: [
    {
      name: 'latitude',
      flag: '--latitude <number>',
      description: `Latitude, default ${String(UK_POLICE_DEFAULT_LATITUDE)}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented street-crime endpoint requires explicit coordinates; the default is the docs sample point near Leicester.',
      defaultValue: String(UK_POLICE_DEFAULT_LATITUDE),
    },
    {
      name: 'longitude',
      flag: '--longitude <number>',
      description: `Longitude, default ${String(UK_POLICE_DEFAULT_LONGITUDE)}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented street-crime endpoint requires explicit coordinates; no address search or person lookup is exposed.',
      defaultValue: String(UK_POLICE_DEFAULT_LONGITUDE),
    },
    {
      name: 'category',
      flag: '--category <category>',
      description: `Crime category, default ${UK_POLICE_DEFAULT_CATEGORY}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'Category is a documented path segment and avoids free-form endpoint construction.',
      defaultValue: UK_POLICE_DEFAULT_CATEGORY,
    },
    {
      name: 'date',
      flag: '--date <YYYY-MM>',
      description: 'Optional crime data month such as 2024-01; omitted uses latest available month',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Date is documented and locally validated to a month to keep cache keys repeatable.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Rows to show, default ${String(UK_POLICE_DEFAULT_LIMIT)}, cap 100`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Street-crime responses can contain many records; the CLI caps terminal output and offline cache payloads.',
      valueType: 'integer',
      defaultValue: String(UK_POLICE_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: streetCrimesParamsSchema,
  execute: params => listUkPoliceStreetCrimes(params),
  normalizeParams: params => streetCrimesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeUkPoliceStreetCrimesInput(params),
  resultKind: 'ukpolice.streetCrimes',
  defaultFormat: 'text',
}

export const ukPoliceProvider: PublicApiProviderModule = {
  manifest: {
    id: 'ukpolice',
    name: 'UK Police',
    description: 'No-auth public data.police.uk street-level crime data API.',
    publicApisCategory: 'Security',
    homepageUrl: 'https://data.police.uk/docs/',
    docsUrl: 'https://data.police.uk/docs/',
    auth: {
      mode: 'none',
      notes: ['Implemented GET street-crime endpoint returns JSON without API keys, OAuth, cookies, browser sessions, or account setup.'],
    },
    tags: ['security', 'open-data', 'police', 'uk', 'crime', 'json', 'no-auth'],
    freePlanNotes: [
      'This provider exposes bounded read-only public street-level crime records only.',
      'Incident reporting, police contact workflows, free-form polygons, stop-and-search/person searches, and browser clickstream surfaces are intentionally not exposed.',
      'Street-level crime coordinates are approximate public open data; validate legal, operational, or safety-critical decisions against official sources.',
    ],
  },
  operations: [streetCrimesOperation],
  endpoints: [
    {
      id: 'ukpolice-docs',
      method: 'GET',
      urlPattern: 'https://data.police.uk/docs/',
      category: 'public-apis:security',
      evidenceStatus: 'confirmed',
      description: 'data.police.uk public API documentation.',
      observedOn: '2026-05-09',
      sampleSources: ['https://data.police.uk/docs/'],
      consumedBy: [],
      notes: ['Public HTML docs; used as documentation/context only.'],
    },
    {
      id: 'ukpolice-street-crimes',
      method: 'GET',
      urlPattern: 'https://data.police.uk/api/crimes-street/{category}?lat={latitude}&lng={longitude}&date={YYYY-MM}',
      category: 'public-apis:security',
      evidenceStatus: 'confirmed',
      description: 'Public UK street-level crime records near WGS84 coordinates.',
      observedOn: '2026-05-09',
      sampleSources: [
        'https://data.police.uk/api/crimes-street/all-crime?lat=52.629729&lng=-1.131592&date=2024-01',
        'https://data.police.uk/api/crimes-street/anti-social-behaviour?lat=52.629729&lng=-1.131592',
      ],
      consumedBy: ['public-apis apis run ukpolice.streetCrimes'],
      notes: [
        'No API key observed; returns application/json arrays.',
        'CLI restricts category to documented crime-category slugs, validates coordinates/month, and caps output at 100 rows.',
        'Free-form polygon queries, stop-and-search endpoints, and personal/police-contact workflows are intentionally out of scope for this pass.',
      ],
    },
  ],
}
