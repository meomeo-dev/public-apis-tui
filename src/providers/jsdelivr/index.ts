import { z } from 'zod'
import { getJsdelivrMetadata, getJsdelivrStats, type JsdelivrMetadataInput, type JsdelivrStatsInput } from '../../application/usecases/jsdelivr.js'
import { normalizeJsdelivrMetadataInput, normalizeJsdelivrStatsInput } from '../../infrastructure/openApis/jsdelivrClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const metadataParamsSchema = z.object({
  packageName: z.string().optional(),
  versionLimit: z.number().int().optional(),
}) satisfies z.ZodType<JsdelivrMetadataInput>

const statsParamsSchema = z.object({
  packageName: z.string().optional(),
  period: z.string().optional(),
  dateLimit: z.number().int().optional(),
}) satisfies z.ZodType<JsdelivrStatsInput>

const metadataOperation: PublicApiOperationDefinition<JsdelivrMetadataInput> = {
  id: 'jsdelivr.metadata',
  providerId: 'jsdelivr',
  name: 'npm Package Metadata',
  commandPath: ['jsdelivr', 'metadata'],
  rpcMethod: 'jsdelivr.metadata',
  description: 'Fetch jsDelivr npm package tags, versions, and API resource links.',
  category: 'development',
  options: [
    {
      name: 'packageName',
      flag: '--package <name>',
      description: 'npm package name, default jquery',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented npm metadata endpoint is package-name addressed.',
      defaultValue: 'jquery',
    },
    {
      name: 'versionLimit',
      flag: '--version-limit <count>',
      description: 'Versions to show, default 20, CLI cap 100',
      exposure: 'primary',
      group: 'pagination',
      reason: 'The metadata endpoint returns all versions; a display/cache cap keeps the TUI bounded.',
      valueType: 'integer',
      defaultValue: '20',
    },
  ],
  paramsSchema: metadataParamsSchema,
  execute: params => getJsdelivrMetadata(params),
  normalizeParams: params => metadataParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeJsdelivrMetadataInput(params),
  resultKind: 'jsdelivr.metadata',
  defaultFormat: 'text',
}

const statsOperation: PublicApiOperationDefinition<JsdelivrStatsInput> = {
  id: 'jsdelivr.stats',
  providerId: 'jsdelivr',
  name: 'npm Package Stats',
  commandPath: ['jsdelivr', 'stats'],
  rpcMethod: 'jsdelivr.stats',
  description: 'Fetch jsDelivr npm package hits and bandwidth stats for a documented period.',
  category: 'development',
  options: [
    {
      name: 'packageName',
      flag: '--package <name>',
      description: 'npm package name, default jquery',
      exposure: 'primary',
      group: 'query',
      reason: 'The documented npm stats endpoint is package-name addressed.',
      defaultValue: 'jquery',
    },
    {
      name: 'period',
      flag: '--period <period>',
      description: 'Stats period: day/week/month/quarter/year/s-month/s-quarter/s-year/YYYY/YYYY-MM/YYYY-Qn',
      exposure: 'primary',
      group: 'filters',
      reason: 'Period is the documented stats selector and materially changes totals/trends.',
      defaultValue: 'month',
    },
    {
      name: 'dateLimit',
      flag: '--date-limit <count>',
      description: 'Recent date buckets to show, default 14, CLI cap 366',
      exposure: 'primary',
      group: 'pagination',
      reason: 'Stats responses can include many date buckets; a cap keeps terminal output readable.',
      valueType: 'integer',
      defaultValue: '14',
    },
  ],
  paramsSchema: statsParamsSchema,
  execute: params => getJsdelivrStats(params),
  normalizeParams: params => statsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeJsdelivrStatsInput(params),
  resultKind: 'jsdelivr.stats',
  defaultFormat: 'text',
}

export const jsdelivrProvider: PublicApiProviderModule = {
  manifest: {
    id: 'jsdelivr',
    name: 'jsDelivr',
    description: 'No-auth HTTPS JSON API for package metadata, CDN URLs, and download statistics on jsDelivr.',
    publicApisCategory: 'Development',
    homepageUrl: 'https://github.com/jsdelivr/data.jsdelivr.com',
    docsUrl: 'https://www.jsdelivr.com/docs/data.jsdelivr.com',
    auth: {
      mode: 'none',
      notes: ['Official README/OpenAPI document public HTTPS JSON endpoints with no API key requirement.'],
    },
    tags: ['development', 'cdn', 'npm', 'package-metadata', 'download-stats', 'no-auth', 'json'],
    freePlanNotes: [
      'Official README/OpenAPI says the API is free and imposes no rate limits.',
      'Users planning sustained 100+ requests per minute are asked to contact jsDelivr first.',
      'Usage statistics are available with a 48 hour delay; historical data older than one year may not be available.',
      'This first pass intentionally focuses on npm package metadata/stats and uses current /v1/packages endpoints, not deprecated singular /v1/package routes.',
    ],
  },
  operations: [metadataOperation, statsOperation],
  endpoints: [
    {
      id: 'jsdelivr-npm-package-metadata',
      method: 'GET',
      urlPattern: 'regex:^https://data\\.jsdelivr\\.com/v1/packages/npm/[^/?]+(?:\\?.*)?$',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'jsDelivr npm package metadata endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://github.com/jsdelivr/data.jsdelivr.com', 'https://data.jsdelivr.com/v1/spec.yaml', 'https://data.jsdelivr.com/v1/packages/npm/jquery'],
      consumedBy: ['jsdelivr metadata'],
      notes: ['No authentication required; no browser clickstream or scraping required.', 'Endpoint returns tags, versions, and links; output caps displayed versions.'],
    },
    {
      id: 'jsdelivr-npm-package-stats',
      method: 'GET',
      urlPattern: 'regex:^https://data\\.jsdelivr\\.com/v1/stats/packages/npm/[^/?]+(?:\\?.*)?$',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'jsDelivr npm package hits and bandwidth stats endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://github.com/jsdelivr/data.jsdelivr.com', 'https://data.jsdelivr.com/v1/spec.yaml', 'https://data.jsdelivr.com/v1/stats/packages/npm/jquery?period=month'],
      consumedBy: ['jsdelivr stats'],
      notes: ['No authentication required; no browser clickstream or scraping required.', 'Stats are documented as delayed by 48 hours; date buckets are capped in TUI output.'],
    },
  ],
}
