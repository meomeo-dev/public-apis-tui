import { z } from 'zod'
import { listMsrcVulnerabilities } from '../../application/usecases/msrc.js'
import { MSRC_DEFAULT_LIMIT, normalizeMsrcVulnerabilitiesInput, type MsrcVulnerabilitiesInput } from '../../infrastructure/openApis/msrcClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const vulnerabilitiesParamsSchema = z.object({
  releaseNumber: z.string().optional(),
  cve: z.string().optional(),
  severity: z.enum(['critical', 'important', 'moderate', 'low', 'none']).optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<MsrcVulnerabilitiesInput>

const vulnerabilitiesOperation: PublicApiOperationDefinition<MsrcVulnerabilitiesInput> = {
  id: 'msrc.vulnerabilities',
  providerId: 'msrc',
  name: 'Security Update Guide Vulnerabilities',
  commandPath: ['msrc', 'vulnerabilities'],
  rpcMethod: 'msrc.vulnerabilities',
  description: 'Query public MSRC Security Update Guide vulnerability metadata through the no-auth OData API.',
  category: 'security',
  options: [
    {
      name: 'releaseNumber',
      flag: '--release-number <YYYY-Mon>',
      description: 'Filter by MSRC release number such as 2026-May',
      exposure: 'primary',
      group: 'filters',
      reason: 'Release number is the primary MSRC Update Guide grouping and gives a bounded monthly metadata result set.',
    },
    {
      name: 'cve',
      flag: '--cve <CVE-ID>',
      description: 'Filter by one CVE id such as CVE-2026-7896',
      exposure: 'primary',
      group: 'query',
      reason: 'CVE lookup is a precise read-only metadata query and avoids exposing free-form OData filters.',
    },
    {
      name: 'severity',
      flag: '--severity <critical|important|moderate|low|none>',
      description: 'Filter by MSRC severity',
      exposure: 'primary',
      group: 'filters',
      reason: 'Severity is a curated high-value security triage filter; raw numeric severity ids are intentionally hidden.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Rows to request, default ${MSRC_DEFAULT_LIMIT}, cap 50`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'MSRC OData supports $top; a cap keeps vulnerability metadata output and offline cache entries bounded.',
      valueType: 'integer',
      defaultValue: String(MSRC_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: vulnerabilitiesParamsSchema,
  execute: params => listMsrcVulnerabilities(params),
  normalizeParams: params => vulnerabilitiesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeMsrcVulnerabilitiesInput(params),
  resultKind: 'msrc.vulnerabilities',
  defaultFormat: 'text',
}

export const msrcProvider: PublicApiProviderModule = {
  manifest: {
    id: 'msrc',
    name: 'Microsoft Security Response Center (MSRC)',
    description: 'No-auth public Microsoft Security Update Guide vulnerability metadata.',
    publicApisCategory: 'Security',
    homepageUrl: 'https://msrc.microsoft.com/report/developer',
    docsUrl: 'https://msrc.microsoft.com/update-guide',
    auth: {
      mode: 'none',
      notes: ['The implemented Security Update Guide OData endpoints return public JSON with x-user-authenticated=false and x-data-type=public.'],
    },
    tags: ['security', 'microsoft', 'msrc', 'vulnerabilities', 'cve', 'odata', 'no-auth'],
    freePlanNotes: [
      'This provider exposes read-only public vulnerability/update metadata only.',
      'The Microsoft reporting portal, authenticated report/case workflows, uploads, proof-of-concept material, and free-form OData filters are intentionally not exposed.',
    ],
  },
  operations: [vulnerabilitiesOperation],
  endpoints: [
    {
      id: 'msrc-update-guide-spa',
      method: 'GET',
      urlPattern: 'https://msrc.microsoft.com/update-guide',
      category: 'public-apis:security',
      evidenceStatus: 'confirmed',
      description: 'Microsoft Security Update Guide public web application.',
      observedOn: '2026-05-09',
      sampleSources: ['https://msrc.microsoft.com/update-guide'],
      consumedBy: [],
      notes: ['Public HTML SPA; used as documentation/context only, not scraped by the CLI.'],
    },
    {
      id: 'msrc-sug-vulnerabilities',
      method: 'GET',
      urlPattern: 'https://api.msrc.microsoft.com/sug/v2.0/en-US/vulnerability',
      category: 'public-apis:security',
      evidenceStatus: 'confirmed',
      description: 'Public MSRC Security Update Guide OData vulnerability metadata endpoint.',
      observedOn: '2026-05-09',
      sampleSources: [
        'https://api.msrc.microsoft.com/sug/v2.0/en-US/vulnerability?$orderby=releaseDate%20desc&$top=3',
        'https://api.msrc.microsoft.com/sug/v2.0/en-US/vulnerability?$filter=releaseNumber%20eq%20%272026-May%27&$top=3',
      ],
      consumedBy: ['public-apis apis run msrc.vulnerabilities'],
      notes: ['No API key observed; response includes x-user-authenticated=false and x-data-type=public. CLI exposes curated CVE/release/severity filters only.'],
    },
    {
      id: 'msrc-cvrf-updates',
      method: 'GET',
      urlPattern: 'https://api.msrc.microsoft.com/cvrf/v3.0/updates',
      category: 'public-apis:security',
      evidenceStatus: 'confirmed',
      description: 'Public CVRF updates index used as no-auth evidence but not exposed in this pass.',
      observedOn: '2026-05-09',
      sampleSources: ['https://api.msrc.microsoft.com/cvrf/v3.0/updates'],
      consumedBy: [],
      notes: ['Confirmed public JSON index. CVRF document XML can be large, so this pass exposes bounded SUG vulnerability metadata instead.'],
    },
  ],
}
