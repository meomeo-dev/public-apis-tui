import { z } from 'zod'
import { listFoodStandardsAgencyAuthorities, searchFoodStandardsAgencyEstablishments } from '../../application/usecases/foodStandardsAgency.js'
import {
  FSA_DEFAULT_AUTHORITY_LIMIT,
  FSA_DEFAULT_ESTABLISHMENT_LIMIT,
  FSA_DEFAULT_ESTABLISHMENT_QUERY,
  FSA_DEFAULT_PAGE_NUMBER,
  normalizeFoodStandardsAgencyAuthoritiesInput,
  normalizeFoodStandardsAgencyEstablishmentsInput,
  type FoodStandardsAgencyAuthoritiesInput,
  type FoodStandardsAgencyEstablishmentsInput,
} from '../../infrastructure/openApis/foodStandardsAgencyClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const authoritiesParamsSchema = z.object({
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<FoodStandardsAgencyAuthoritiesInput>

const establishmentsParamsSchema = z.object({
  query: z.string().optional(),
  localAuthorityId: z.coerce.number().optional(),
  ratingValue: z.string().optional(),
  pageSize: z.coerce.number().optional(),
  pageNumber: z.coerce.number().optional(),
}) satisfies z.ZodType<FoodStandardsAgencyEstablishmentsInput>

const authoritiesOperation: PublicApiOperationDefinition<FoodStandardsAgencyAuthoritiesInput> = {
  id: 'foodstandardsagency.authorities',
  providerId: 'foodstandardsagency',
  name: 'Authorities',
  commandPath: ['foodstandardsagency', 'authorities'],
  rpcMethod: 'foodstandardsagency.authorities',
  description: 'List UK food hygiene rating local authorities.',
  category: 'government',
  options: [
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Authorities to show/cache, default/cap ${FSA_DEFAULT_AUTHORITY_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The authorities list is finite; 5000 captures the full current list in one request while keeping persistence bounded.',
      valueType: 'integer',
      defaultValue: String(FSA_DEFAULT_AUTHORITY_LIMIT),
    },
  ],
  paramsSchema: authoritiesParamsSchema,
  execute: params => listFoodStandardsAgencyAuthorities(params),
  normalizeParams: params => authoritiesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeFoodStandardsAgencyAuthoritiesInput(params),
  resultKind: 'foodstandardsagency.authorities',
  defaultFormat: 'text',
}

const establishmentsOperation: PublicApiOperationDefinition<FoodStandardsAgencyEstablishmentsInput> = {
  id: 'foodstandardsagency.establishments',
  providerId: 'foodstandardsagency',
  name: 'Establishments',
  commandPath: ['foodstandardsagency', 'establishments'],
  rpcMethod: 'foodstandardsagency.establishments',
  description: 'Search UK food hygiene rating establishments.',
  category: 'government',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: `Business name search, default ${FSA_DEFAULT_ESTABLISHMENT_QUERY}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Name search is the most accessible high-value filter and avoids dumping all UK establishments by default.',
      defaultValue: FSA_DEFAULT_ESTABLISHMENT_QUERY,
    },
    {
      name: 'localAuthorityId',
      flag: '--local-authority-id <id>',
      description: 'Optional local authority id from foodstandardsagency.authorities',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Authority scoping is useful after discovery but not required for the default commercial search UX.',
      valueType: 'integer',
    },
    {
      name: 'ratingValue',
      flag: '--rating-value <0-5|Pass|Improvement Required|Exempt>',
      description: 'Optional rating filter',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Rating is useful for compliance analysis while hiding upstream ratingKey details from CLI users.',
    },
    {
      name: 'pageSize',
      flag: '--page-size <count>',
      description: `Rows per page, default/cap ${FSA_DEFAULT_ESTABLISHMENT_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'Live probes show the API caps pageSize at 5000; defaulting to that maximizes one bounded request under rate-sensitive usage.',
      valueType: 'integer',
      defaultValue: String(FSA_DEFAULT_ESTABLISHMENT_LIMIT),
    },
    {
      name: 'pageNumber',
      flag: '--page-number <page>',
      description: `Page number, default ${FSA_DEFAULT_PAGE_NUMBER}`,
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Paging is useful for deep review but hidden from primary UX to avoid accidental high-volume crawling.',
      valueType: 'integer',
      defaultValue: String(FSA_DEFAULT_PAGE_NUMBER),
    },
  ],
  paramsSchema: establishmentsParamsSchema,
  execute: params => searchFoodStandardsAgencyEstablishments(params),
  normalizeParams: params => establishmentsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeFoodStandardsAgencyEstablishmentsInput(params),
  resultKind: 'foodstandardsagency.establishments',
  defaultFormat: 'text',
}

export const foodStandardsAgencyProvider: PublicApiProviderModule = {
  manifest: {
    id: 'foodstandardsagency',
    name: 'Food Standards Agency',
    description: 'No-auth UK Food Hygiene Rating Scheme local authority and establishment API integration.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://ratings.food.gov.uk/open-data/en-GB',
    docsUrl: 'https://api.ratings.food.gov.uk/help',
    auth: {
      mode: 'none',
      notes: ['Implemented Food Hygiene Rating API v2 JSON reads require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['government', 'uk', 'food-hygiene', 'ratings', 'business-compliance', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'The API requires the x-api-version: 2 header but no secret.',
      'Establishment pageSize defaults/caps at the observed service maximum of 5000 rows per request.',
    ],
  },
  operations: [authoritiesOperation, establishmentsOperation],
  endpoints: [
    {
      id: 'foodstandardsagency-authorities-basic',
      method: 'GET',
      urlPattern: 'https://api.ratings.food.gov.uk/Authorities/basic',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Food Hygiene Rating API v2 local authorities list.',
      observedOn: '2026-05-04',
      sampleSources: ['https://api.ratings.food.gov.uk/help', 'https://api.ratings.food.gov.uk/Authorities/basic'],
      consumedBy: ['public-apis apis run foodstandardsagency.authorities'],
      notes: ['Requires x-api-version: 2 header; no API key observed.'],
    },
    {
      id: 'foodstandardsagency-establishments',
      method: 'GET',
      urlPattern: 'https://api.ratings.food.gov.uk/Establishments',
      category: 'public-apis:government',
      evidenceStatus: 'confirmed',
      description: 'Food Hygiene Rating API v2 establishment search.',
      observedOn: '2026-05-04',
      sampleSources: ['https://api.ratings.food.gov.uk/help', 'https://api.ratings.food.gov.uk/Establishments?name=coffee&pageSize=10&pageNumber=1'],
      consumedBy: ['public-apis apis run foodstandardsagency.establishments'],
      notes: ['Requires x-api-version: 2 header; service caps pageSize at 5000.'],
    },
  ],
}
