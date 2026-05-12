import { z } from 'zod'
import { listFakerApiCompanies, listFakerApiPersons } from '../../application/usecases/fakerApi.js'
import {
  FAKER_API_DEFAULT_LOCALE,
  FAKER_API_DEFAULT_QUANTITY,
  FAKER_API_MAX_QUANTITY,
  normalizeFakerApiCommonInput,
  type FakerApiCommonInput,
} from '../../infrastructure/openApis/fakerApiClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const commonParamsSchema = z.object({
  quantity: z.coerce.number().optional(),
  locale: z.string().min(1).optional(),
  seed: z.coerce.number().optional(),
}) satisfies z.ZodType<FakerApiCommonInput>

const commonOptions: PublicApiOperationDefinition<FakerApiCommonInput>['options'] = [
  {
    name: 'quantity',
    flag: '--quantity <count>',
    description: `Records to generate, default ${FAKER_API_DEFAULT_QUANTITY}, cap ${FAKER_API_MAX_QUANTITY}`,
    exposure: 'primary',
    group: 'pagination',
    reason: 'FakerAPI documents _quantity for batch generation; bounded requests conserve the 60/min free quota and terminal space.',
    valueType: 'integer',
    defaultValue: String(FAKER_API_DEFAULT_QUANTITY),
  },
  {
    name: 'locale',
    flag: '--locale <locale>',
    description: `Faker locale such as ${FAKER_API_DEFAULT_LOCALE} or it_IT`,
    exposure: 'primary',
    group: 'content',
    reason: 'Locale is a core FakerAPI capability for generating region-specific fake data.',
    defaultValue: FAKER_API_DEFAULT_LOCALE,
  },
  {
    name: 'seed',
    flag: '--seed <number>',
    description: 'Optional deterministic seed for reproducible fixtures',
    exposure: 'advanced',
    group: 'query',
    reason: 'Seed supports repeatable prototyping and tests without being necessary for casual exploration.',
    valueType: 'integer',
  },
]

const personsOperation: PublicApiOperationDefinition<FakerApiCommonInput> = {
  id: 'fakerapi.persons',
  providerId: 'fakerapi',
  name: 'Persons',
  commandPath: ['fakerapi', 'persons'],
  rpcMethod: 'fakerapi.persons',
  description: 'Generate fake person records from FakerAPI.',
  category: 'test-data',
  options: commonOptions,
  paramsSchema: commonParamsSchema,
  execute: params => listFakerApiPersons(params),
  normalizeParams: params => commonParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeFakerApiCommonInput(params),
  resultKind: 'fakerapi.persons',
  defaultFormat: 'text',
}

const companiesOperation: PublicApiOperationDefinition<FakerApiCommonInput> = {
  id: 'fakerapi.companies',
  providerId: 'fakerapi',
  name: 'Companies',
  commandPath: ['fakerapi', 'companies'],
  rpcMethod: 'fakerapi.companies',
  description: 'Generate fake company records from FakerAPI.',
  category: 'test-data',
  options: commonOptions,
  paramsSchema: commonParamsSchema,
  execute: params => listFakerApiCompanies(params),
  normalizeParams: params => commonParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeFakerApiCommonInput(params),
  resultKind: 'fakerapi.companies',
  defaultFormat: 'text',
}

export const fakerApiProvider: PublicApiProviderModule = {
  manifest: {
    id: 'fakerapi',
    name: 'FakerAPI',
    description: 'No-auth HTTPS JSON API for generating localized fake test data.',
    publicApisCategory: 'Test Data',
    homepageUrl: 'https://fakerapi.it/en',
    docsUrl: 'https://fakerapi.it/en',
    auth: {
      mode: 'none',
      notes: ['Public FakerAPI endpoints require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['test-data', 'fake-api', 'fixtures', 'localization', 'no-auth', 'json'],
    freePlanNotes: [
      'Live responses expose 60 requests/minute rate-limit headers.',
      `CLI defaults to ${FAKER_API_DEFAULT_QUANTITY} records and caps at ${FAKER_API_MAX_QUANTITY} to keep terminal output/cache bounded.`,
      'Implementation starts with read-only persons and companies because they are broadly useful for CLI/TUI prototyping.',
    ],
  },
  operations: [personsOperation, companiesOperation],
  endpoints: [
    {
      id: 'fakerapi-persons',
      method: 'GET',
      urlPattern: 'https://fakerapi.it/api/v2/persons*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'FakerAPI persons generator endpoint returning localized fake people records.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://fakerapi.it/en', 'https://fakerapi.it/api/v2/persons?_quantity=2&_locale=en_US&_seed=12345'],
      consumedBy: ['fakerapi persons'],
      notes: ['No authentication required.', 'Query parameters use _quantity, _locale, and _seed.'],
    },
    {
      id: 'fakerapi-companies',
      method: 'GET',
      urlPattern: 'https://fakerapi.it/api/v2/companies*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'FakerAPI companies generator endpoint returning localized fake company records.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://fakerapi.it/en', 'https://fakerapi.it/api/v2/companies?_quantity=2&_locale=en_US&_seed=12345'],
      consumedBy: ['fakerapi companies'],
      notes: ['No authentication required.', 'Query parameters use _quantity, _locale, and _seed.'],
    },
  ],
}
