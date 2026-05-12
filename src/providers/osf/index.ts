import { z } from 'zod'
import {
  OSF_DEFAULT_DESCRIPTION_LENGTH,
  OSF_DEFAULT_LIMIT,
  OSF_DEFAULT_NODE_TITLE,
  OSF_DEFAULT_PREPRINT_PROVIDER,
  OSF_MAX_LIMIT,
  OSF_MAX_PAGE,
  OSF_NODE_CATEGORIES,
  listOsfNodes,
  listOsfPreprints,
  normalizeOsfNodesInput,
  normalizeOsfPreprintsInput,
  type OsfNodesInput,
  type OsfPreprintsInput,
} from '../../application/usecases/osf.js'
import type {
  PublicApiOperationDefinition,
  PublicApiProviderModule,
} from '../providerTypes.js'

const nodesParamsSchema = z.object({
  title: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
  public: z.boolean().optional(),
  limit: z.number().int().optional(),
  page: z.number().int().optional(),
  descriptionLength: z.number().int().optional(),
}) satisfies z.ZodType<OsfNodesInput>

const preprintsParamsSchema = z.object({
  provider: z.string().optional(),
  isPublished: z.boolean().optional(),
  limit: z.number().int().optional(),
  page: z.number().int().optional(),
  descriptionLength: z.number().int().optional(),
}) satisfies z.ZodType<OsfPreprintsInput>

const nodesOperation: PublicApiOperationDefinition<OsfNodesInput> = {
  id: 'osf.nodes',
  providerId: 'osf',
  name: 'Public nodes',
  commandPath: ['osf', 'nodes'],
  rpcMethod: 'osf.nodes',
  description: 'Search public Open Science Framework project/component metadata.',
  category: 'science',
  options: [
    {
      name: 'title',
      flag: '--title <text>',
      description: `Filter node title text, default ${OSF_DEFAULT_NODE_TITLE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Official docs define filter[title] substring matching for nodes.',
      defaultValue: OSF_DEFAULT_NODE_TITLE,
    },
    {
      name: 'category',
      flag: '--category <category>',
      description: `Optional node category; one of ${OSF_NODE_CATEGORIES.join(', ')}`,
      exposure: 'primary',
      group: 'filters',
      reason: 'Official docs list category as a supported node filter.',
    },
    {
      name: 'tags',
      flag: '--tags <tag>',
      description: 'Optional node tag filter such as reproducibility',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Official docs list tags as a supported node filter.',
    },
    {
      name: 'public',
      flag: '--public <true|false>',
      description: 'Filter public nodes, default true',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Keeps the default query on public records only.',
      valueType: 'boolean',
      defaultValue: 'true',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `Results to request/show, default ${OSF_DEFAULT_LIMIT},`,
        `cap ${OSF_MAX_LIMIT}`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'OSF pages can be large; terminal output is bounded.',
      valueType: 'integer',
      defaultValue: String(OSF_DEFAULT_LIMIT),
    },
    {
      name: 'page',
      flag: '--page <number>',
      description: `1-based result page, default 1, CLI cap ${OSF_MAX_PAGE}`,
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Page supports documented pagination without raw URL proxying.',
      valueType: 'integer',
      defaultValue: '1',
    },
    {
      name: 'descriptionLength',
      flag: '--description-length <count>',
      description: [
        `Description characters, default ${OSF_DEFAULT_DESCRIPTION_LENGTH},`,
        '0 hides descriptions.',
      ].join(' '),
      exposure: 'advanced',
      group: 'presentation',
      reason: 'OSF descriptions can be long; output and cache stay bounded.',
      valueType: 'integer',
      defaultValue: String(OSF_DEFAULT_DESCRIPTION_LENGTH),
    },
  ],
  paramsSchema: nodesParamsSchema,
  execute: params => listOsfNodes(params),
  normalizeParams: params => nodesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOsfNodesInput(params),
  resultKind: 'osf.nodes',
  defaultFormat: 'text',
}

const preprintsOperation: PublicApiOperationDefinition<OsfPreprintsInput> = {
  id: 'osf.preprints',
  providerId: 'osf',
  name: 'Public preprints',
  commandPath: ['osf', 'preprints'],
  rpcMethod: 'osf.preprints',
  description: 'List public OSF preprint metadata from documented filters.',
  category: 'science',
  options: [
    {
      name: 'provider',
      flag: '--provider <slug>',
      description: [
        'Preprint provider slug, default',
        `${OSF_DEFAULT_PREPRINT_PROVIDER}.`,
      ].join(' '),
      exposure: 'primary',
      group: 'filters',
      reason: 'Official docs define provider as a supported preprint filter.',
      defaultValue: OSF_DEFAULT_PREPRINT_PROVIDER,
    },
    {
      name: 'isPublished',
      flag: '--is-published <true|false>',
      description: 'Filter published preprints, default true',
      exposure: 'advanced',
      group: 'filters',
      reason: 'Official docs define is_published as a supported preprint filter.',
      valueType: 'boolean',
      defaultValue: 'true',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: [
        `Results to request/show, default ${OSF_DEFAULT_LIMIT},`,
        `cap ${OSF_MAX_LIMIT}`,
      ].join(' '),
      exposure: 'primary',
      group: 'pagination',
      reason: 'OSF preprint pages can be large; terminal output is bounded.',
      valueType: 'integer',
      defaultValue: String(OSF_DEFAULT_LIMIT),
    },
    {
      name: 'page',
      flag: '--page <number>',
      description: `1-based result page, default 1, CLI cap ${OSF_MAX_PAGE}`,
      exposure: 'advanced',
      group: 'pagination',
      reason: 'Page supports documented pagination without raw URL proxying.',
      valueType: 'integer',
      defaultValue: '1',
    },
    {
      name: 'descriptionLength',
      flag: '--description-length <count>',
      description: [
        `Description characters, default ${OSF_DEFAULT_DESCRIPTION_LENGTH},`,
        '0 hides descriptions.',
      ].join(' '),
      exposure: 'advanced',
      group: 'presentation',
      reason: 'Preprint abstracts can be long; output and cache stay bounded.',
      valueType: 'integer',
      defaultValue: String(OSF_DEFAULT_DESCRIPTION_LENGTH),
    },
  ],
  paramsSchema: preprintsParamsSchema,
  execute: params => listOsfPreprints(params),
  normalizeParams: params => preprintsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeOsfPreprintsInput(params),
  resultKind: 'osf.preprints',
  defaultFormat: 'text',
}

export const osfProvider: PublicApiProviderModule = {
  manifest: {
    id: 'osf',
    name: 'Open Science Framework',
    description: [
      'No-auth HTTPS JSON:API metadata provider for public OSF project nodes',
      'and preprints.',
    ].join(' '),
    publicApisCategory: 'Science & Math',
    homepageUrl: 'https://osf.io/',
    docsUrl: 'https://developer.osf.io',
    auth: {
      mode: 'none',
      notes: [
        [
          'Public list endpoints returned JSON:API with current_user null;',
          'account endpoint probes returned 401 without credentials.',
        ].join(' '),
      ],
    },
    tags: [
      'science',
      'open-science',
      'research',
      'preprints',
      'metadata',
      'json-api',
      'no-auth',
    ],
    freePlanNotes: [
      'No public quota was found for selected public metadata list endpoints.',
      [
        'CLI exposes read-only public JSON:API metadata only and excludes',
        'file download, account, private record, upload, delete, share, and',
        'write workflows.',
      ].join(' '),
    ],
  },
  operations: [nodesOperation, preprintsOperation],
  endpoints: [
    {
      id: 'osf-nodes-list',
      method: 'GET',
      urlPattern: 'regex:^https://api\\.osf\\.io/v2/nodes/(?:\\?.*)?$',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'OSF API v2 public nodes JSON:API list endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://developer.osf.io',
        'https://api.osf.io/v2/nodes/?filter%5Btitle%5D=reproducibility',
      ],
      consumedBy: ['public-apis apis run osf.nodes'],
      notes: [
        'No authentication required for public node metadata list probes.',
        [
          'CLI exposes documented node filters only and excludes files,',
          'private records, view-only links, writes, and browser scraping.',
        ].join(' '),
      ],
    },
    {
      id: 'osf-preprints-list',
      method: 'GET',
      urlPattern: 'regex:^https://api\\.osf\\.io/v2/preprints/(?:\\?.*)?$',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-11',
      description: 'OSF API v2 public preprints JSON:API list endpoint.',
      siteIds: ['public-apis-tui'],
      sampleSources: [
        'https://developer.osf.io',
        'https://api.osf.io/v2/preprints/?filter%5Bprovider%5D=psyarxiv',
      ],
      consumedBy: ['public-apis apis run osf.preprints'],
      notes: [
        'No authentication required for public preprint metadata list probes.',
        [
          'CLI exposes documented preprint filters only and excludes file',
          'downloads, review actions, requests, writes, and browser scraping.',
        ].join(' '),
      ],
    },
  ],
}

export type {
  OsfNodesInput,
  OsfPreprintsInput,
} from '../../application/usecases/osf.js'
