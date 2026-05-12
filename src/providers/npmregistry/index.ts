import { z } from 'zod'
import {
  getNpmRegistryPackage,
  searchNpmRegistry,
  type NpmRegistryPackageInput,
  type NpmRegistrySearchInput,
} from '../../application/usecases/npmRegistry.js'
import {
  normalizeNpmRegistryPackageInput,
  normalizeNpmRegistrySearchInput,
} from '../../infrastructure/openApis/npmRegistryClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const searchParamsSchema = z.object({
  query: z.string().optional(),
  size: z.number().int().optional(),
  from: z.number().int().optional(),
  quality: z.union([z.number(), z.string()]).optional(),
  popularity: z.union([z.number(), z.string()]).optional(),
  maintenance: z.union([z.number(), z.string()]).optional(),
}) satisfies z.ZodType<NpmRegistrySearchInput>

const packageParamsSchema = z.object({
  packageName: z.string().optional(),
  versionLimit: z.number().int().optional(),
}) satisfies z.ZodType<NpmRegistryPackageInput>

const searchOperation: PublicApiOperationDefinition<NpmRegistrySearchInput> = {
  id: 'npmregistry.search',
  providerId: 'npm-registry',
  name: 'Search Packages',
  commandPath: ['npmregistry', 'search'],
  rpcMethod: 'npmregistry.search',
  description: 'Search npm Registry packages with the documented no-auth /-/v1/search endpoint.',
  category: 'development',
  options: [
    {
      name: 'query',
      flag: '--query <text>',
      description: 'Full-text search query, default typescript',
      exposure: 'primary',
      group: 'query',
      reason: 'The search endpoint is centered on the documented text query and supports npm search qualifiers.',
      defaultValue: 'typescript',
    },
    {
      name: 'size',
      flag: '--size <count>',
      description: 'Results to request, default/max 250',
      exposure: 'primary',
      group: 'pagination',
      reason: 'The documented maximum size is 250; using it by default conserves request quotas.',
      valueType: 'integer',
      defaultValue: '250',
    },
    {
      name: 'from',
      flag: '--from <offset>',
      description: 'Search result offset, default 0',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Offset is the documented pagination mechanism for continuing large search result sets.',
      valueType: 'integer',
      defaultValue: '0',
    },
    {
      name: 'quality',
      flag: '--quality <0-1>',
      description: 'Advanced ranking weight for quality',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Weight tuning is documented and useful, but secondary to the core search query UX.',
      defaultValue: undefined,
    },
    {
      name: 'popularity',
      flag: '--popularity <0-1>',
      description: 'Advanced ranking weight for popularity',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Weight tuning is documented and useful, but secondary to the core search query UX.',
      defaultValue: undefined,
    },
    {
      name: 'maintenance',
      flag: '--maintenance <0-1>',
      description: 'Advanced ranking weight for maintenance',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Weight tuning is documented and useful, but secondary to the core search query UX.',
      defaultValue: undefined,
    },
  ],
  paramsSchema: searchParamsSchema,
  execute: params => searchNpmRegistry(params),
  normalizeParams: params => searchParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNpmRegistrySearchInput(params),
  resultKind: 'npmregistry.search',
  defaultFormat: 'text',
}

const packageOperation: PublicApiOperationDefinition<NpmRegistryPackageInput> = {
  id: 'npmregistry.package',
  providerId: 'npm-registry',
  name: 'Package Summary',
  commandPath: ['npmregistry', 'package'],
  rpcMethod: 'npmregistry.package',
  description: 'Fetch a bounded summary projection of an npm package packument.',
  category: 'development',
  options: [
    {
      name: 'packageName',
      flag: '--package <name>',
      description: 'npm package name, default typescript',
      exposure: 'primary',
      group: 'query',
      reason: 'The package metadata endpoint is addressed directly by package name.',
      defaultValue: 'typescript',
    },
    {
      name: 'versionLimit',
      flag: '--version-limit <count>',
      description: 'Recent versions to show, default 20, CLI cap 100',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Packuments can be very large; the CLI persists and renders only a bounded summary projection.',
      valueType: 'integer',
      defaultValue: '20',
    },
  ],
  paramsSchema: packageParamsSchema,
  execute: params => getNpmRegistryPackage(params),
  normalizeParams: params => packageParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNpmRegistryPackageInput(params),
  resultKind: 'npmregistry.package',
  defaultFormat: 'text',
}

export const npmRegistryProvider: PublicApiProviderModule = {
  manifest: {
    id: 'npm-registry',
    name: 'npm Registry',
    description: 'Official no-auth HTTPS JSON read API for searching npm packages and reading package metadata summaries.',
    publicApisCategory: 'Development',
    homepageUrl: 'https://registry.npmjs.org',
    docsUrl: 'https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md',
    auth: {
      mode: 'none',
      notes: ['Official Registry API docs document read/search endpoints without an API key, OAuth, cookies, or browser session.'],
    },
    tags: ['development', 'npm', 'packages', 'registry', 'search', 'metadata', 'no-auth', 'json'],
    freePlanNotes: [
      'The documented search endpoint supports size default 20 and max 250; this CLI defaults to 250 per quota-conserving project policy.',
      'Package packuments may contain README/full version metadata; this provider returns and persists only a bounded summary projection.',
      'No Chrome clickstream, scraping, login, or account preparation is used.',
    ],
  },
  operations: [searchOperation, packageOperation],
  endpoints: [
    {
      id: 'npm-registry-search',
      method: 'GET',
      urlPattern: 'https://registry.npmjs.org/-/v1/search*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'npm Registry package search endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: [
        'https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md',
        'https://registry.npmjs.org/-/v1/search?text=typescript&size=2',
      ],
      consumedBy: ['npmregistry search'],
      notes: ['No authentication required; no browser clickstream or scraping required.', 'Search size is documented as default 20 and max 250.'],
    },
    {
      id: 'npm-registry-package-metadata',
      method: 'GET',
      urlPattern: 'regex:^https://registry\\.npmjs\\.org/(?:@[^/?]+/)?[^/?]+(?:\\?.*)?$',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'npm Registry package metadata packument endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: [
        'https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md',
        'https://registry.npmjs.org/typescript',
      ],
      consumedBy: ['npmregistry package'],
      notes: ['No authentication required; no browser clickstream or scraping required.', 'Provider projects packuments to bounded summaries before rendering or persistence.'],
    },
  ],
}
