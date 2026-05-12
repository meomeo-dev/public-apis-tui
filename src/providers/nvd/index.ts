import { z } from 'zod'
import { listNvdCves } from '../../application/usecases/nvd.js'
import { NVD_DEFAULT_LIMIT, NVD_DEFAULT_SEARCH, normalizeNvdCvesInput, type NvdCvesInput } from '../../infrastructure/openApis/nvdClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const cvesParamsSchema = z.object({
  cveId: z.string().optional(),
  keyword: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<NvdCvesInput>

const cvesOperation: PublicApiOperationDefinition<NvdCvesInput> = {
  id: 'nvd.cves',
  providerId: 'nvd',
  name: 'CVE Search',
  commandPath: ['nvd', 'cves'],
  rpcMethod: 'nvd.cves',
  description: 'Query public NVD 2.0 CVE metadata through the no-auth REST API.',
  category: 'security',
  options: [
    {
      name: 'cveId',
      flag: '--cve-id <CVE-ID>',
      description: 'Fetch one CVE id such as CVE-2024-3094',
      exposure: 'primary',
      group: 'query',
      reason: 'CVE id lookup is precise read-only metadata and avoids exposing broad raw query surfaces.',
    },
    {
      name: 'keyword',
      flag: '--keyword <text>',
      description: `Keyword search text, default ${NVD_DEFAULT_SEARCH}`,
      exposure: 'primary',
      group: 'query',
      reason: 'NVD keywordSearch is useful but broad; a bounded default keeps no-key queries terminal-readable.',
      defaultValue: NVD_DEFAULT_SEARCH,
    },
    {
      name: 'severity',
      flag: '--severity <low|medium|high|critical>',
      description: 'Filter by CVSS v3 severity',
      exposure: 'primary',
      group: 'filters',
      reason: 'Severity is a curated triage filter; raw CVSS vector filtering and CPE expansion are intentionally not exposed.',
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Rows to request, default ${NVD_DEFAULT_LIMIT}, cap 50`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'NVD no-key API requests are rate-limited; a cap keeps output and cache entries bounded.',
      valueType: 'integer',
      defaultValue: String(NVD_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: cvesParamsSchema,
  execute: params => listNvdCves(params),
  normalizeParams: params => cvesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNvdCvesInput(params),
  resultKind: 'nvd.cves',
  defaultFormat: 'text',
}

export const nvdProvider: PublicApiProviderModule = {
  manifest: {
    id: 'nvd',
    name: 'National Vulnerability Database',
    description: 'No-auth public NVD 2.0 CVE metadata queries.',
    publicApisCategory: 'Security',
    homepageUrl: 'https://nvd.nist.gov/vuln/Data-Feeds/JSON-feed-changelog',
    docsUrl: 'https://nvd.nist.gov/developers/vulnerabilities',
    auth: {
      mode: 'none',
      notes: ['The implemented NVD 2.0 CVE API supports no-key access, but responses may include Cloudflare cookies and public rate limits.'],
    },
    tags: ['security', 'nvd', 'cve', 'cvss', 'vulnerability', 'metadata', 'no-auth'],
    freePlanNotes: [
      'No API key is required for the implemented CVE metadata query, but no-key NVD API access is rate-limited.',
      'This provider exposes CVE metadata only and intentionally filters text output to safe advisory-style HTTPS references.',
    ],
  },
  operations: [cvesOperation],
  endpoints: [
    {
      id: 'nvd-cve-api-2',
      method: 'GET',
      urlPattern: 'https://services.nvd.nist.gov/rest/json/cves/2.0',
      category: 'public-apis:security',
      evidenceStatus: 'confirmed',
      description: 'NVD 2.0 public CVE metadata REST endpoint.',
      observedOn: '2026-05-09',
      sampleSources: [
        'https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=2',
        'https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2024-3094',
      ],
      consumedBy: ['public-apis apis run nvd.cves'],
      notes: ['No API key observed for small requests; docs pages can be Cloudflare-blocked from CLI probes, but API JSON endpoint returned application/json with CORS *.'],
    },
    {
      id: 'nvd-cve-history-api-2',
      method: 'GET',
      urlPattern: 'https://services.nvd.nist.gov/rest/json/cvehistory/2.0',
      category: 'public-apis:security',
      evidenceStatus: 'confirmed',
      description: 'NVD CVE change history endpoint confirmed as public JSON but not exposed in this pass.',
      observedOn: '2026-05-09',
      sampleSources: ['https://services.nvd.nist.gov/rest/json/cvehistory/2.0?cveId=CVE-2024-3094'],
      consumedBy: [],
      notes: ['Can return large detailed change records; not exposed to keep this pass focused on bounded CVE metadata.'],
    },
  ],
}
