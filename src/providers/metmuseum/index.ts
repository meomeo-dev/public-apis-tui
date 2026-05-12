import { z } from 'zod'
import {
  getMetMuseumObject,
  listMetMuseumDepartments,
  searchMetMuseum,
  type MetMuseumDepartmentsInput,
  type MetMuseumObjectInput,
  type MetMuseumSearchInput,
} from '../../application/usecases/metMuseum.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().min(1).optional(),
  departmentId: z.number().int().optional(),
  hasImages: z.boolean().optional(),
  isPublicDomain: z.boolean().optional(),
  limit: z.number().int().optional(),
  detailLimit: z.number().int().optional(),
}) satisfies z.ZodType<MetMuseumSearchInput>

const objectParamsSchema = z.object({
  objectId: z.number().int(),
}) satisfies z.ZodType<MetMuseumObjectInput>

const departmentsParamsSchema = z.object({
  limit: z.number().int().optional(),
}) satisfies z.ZodType<MetMuseumDepartmentsInput>

const searchOperation: PublicApiOperationDefinition<MetMuseumSearchInput> = {
  id: 'metmuseum.search',
  providerId: 'metmuseum',
  name: 'Search objects',
  commandPath: ['metmuseum', 'search'],
  rpcMethod: 'metmuseum.search',
  description: 'Search Met Museum collection object IDs and hydrate a bounded set of object details.',
  category: 'art-design',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: 'Search query text',
      exposure: 'primary',
      group: 'query',
      reason: 'Required documented search parameter and primary discovery path.',
    },
    {
      name: 'departmentId',
      flag: '--department-id <id>',
      description: 'Optional department id filter from metmuseum.departments',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Documented filter, useful after users discover departments.',
      valueType: 'integer',
    },
    {
      name: 'hasImages',
      flag: '--has-images <true|false>',
      description: 'Filter objects by image availability',
      exposure: 'primary',
      group: 'filters',
      reason: 'High-value terminal filter because image URLs are useful in readable output.',
      valueType: 'boolean',
    },
    {
      name: 'isPublicDomain',
      flag: '--is-public-domain <true|false>',
      description: 'Filter public-domain objects',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Documented rights filter, useful but secondary to query and images.',
      valueType: 'boolean',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Maximum object IDs to keep, 1-100; default 100',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Bounds object id output because search can return hundreds of IDs.',
      valueType: 'integer',
      defaultValue: '100',
    },
    {
      name: 'detailLimit',
      flag: '--detail-limit <count>',
      description: 'Maximum object IDs to hydrate with detail requests, 1-20; default 5',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Keeps request count well below the documented 80 requests/second rate limit.',
      valueType: 'integer',
      defaultValue: '5',
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchMetMuseum(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  resultKind: 'metmuseum.search',
  defaultFormat: 'text',
}

const objectOperation: PublicApiOperationDefinition<MetMuseumObjectInput> = {
  id: 'metmuseum.object',
  providerId: 'metmuseum',
  name: 'Object',
  commandPath: ['metmuseum', 'object'],
  rpcMethod: 'metmuseum.object',
  description: 'Fetch one Met Museum object by object ID.',
  category: 'art-design',
  options: [
    {
      name: 'objectId',
      flag: '--object-id <id>',
      description: 'Met Museum object ID',
      exposure: 'primary',
      group: 'query',
      reason: 'Required documented object lookup identifier.',
      valueType: 'integer',
    },
  ],
  paramsSchema: objectParamsSchema,
  execute: params => getMetMuseumObject(params),
  normalizeParams: params => objectParamsSchema.parse(params),
  resultKind: 'metmuseum.object',
  defaultFormat: 'text',
}

const departmentsOperation: PublicApiOperationDefinition<MetMuseumDepartmentsInput> = {
  id: 'metmuseum.departments',
  providerId: 'metmuseum',
  name: 'Departments',
  commandPath: ['metmuseum', 'departments'],
  rpcMethod: 'metmuseum.departments',
  description: 'List Met Museum department IDs for search filters.',
  category: 'art-design',
  options: [
    {
      name: 'limit',
      flag: '--limit <count>',
      description: 'Maximum departments to show, 1-100; default 100',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Keeps terminal output bounded while showing all current departments by default.',
      valueType: 'integer',
      defaultValue: '100',
    },
  ],
  paramsSchema: departmentsParamsSchema,
  execute: params => listMetMuseumDepartments(params),
  normalizeParams: params => departmentsParamsSchema.parse(params),
  resultKind: 'metmuseum.departments',
  defaultFormat: 'text',
}

export const metMuseumProvider: PublicApiProviderModule = {
  manifest: {
    id: 'metmuseum',
    name: 'Metropolitan Museum of Art',
    description: 'No-auth HTTPS JSON API for Met Museum collection search, object details, and departments.',
    publicApisCategory: 'Art & Design',
    homepageUrl: 'https://metmuseum.github.io/',
    docsUrl: 'https://metmuseum.github.io/',
    auth: {
      mode: 'none',
      notes: ['Official docs state the API has no API key requirement.'],
    },
    tags: ['art', 'museum', 'collection', 'images', 'no-auth'],
    freePlanNotes: ['Official docs document a request limit of 80 requests per second.'],
  },
  operations: [searchOperation, objectOperation, departmentsOperation],
  endpoints: [
    {
      id: 'metmuseum-search',
      method: 'GET',
      urlPattern: 'https://collectionapi.metmuseum.org/public/collection/v1/search*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Met Museum collection search endpoint returning matching object IDs.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://metmuseum.github.io/'],
      consumedBy: ['metmuseum search'],
      notes: ['No authentication required.', 'Supports q, departmentId, hasImages, isPublicDomain query parameters.'],
    },
    {
      id: 'metmuseum-object',
      method: 'GET',
      urlPattern: 'https://collectionapi.metmuseum.org/public/collection/v1/objects/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Met Museum object detail endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://metmuseum.github.io/'],
      consumedBy: ['metmuseum object', 'metmuseum search'],
      notes: ['No authentication required.'],
    },
    {
      id: 'metmuseum-departments',
      method: 'GET',
      urlPattern: 'https://collectionapi.metmuseum.org/public/collection/v1/departments',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Met Museum department taxonomy endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: ['https://metmuseum.github.io/'],
      consumedBy: ['metmuseum departments'],
      notes: ['No authentication required.'],
    },
  ],
}
