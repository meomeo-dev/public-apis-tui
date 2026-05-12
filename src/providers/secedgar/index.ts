import { z } from 'zod'
import { getSecEdgarCompanyConcept, getSecEdgarSubmissions } from '../../application/usecases/secEdgar.js'
import {
  SEC_EDGAR_DEFAULT_CIK,
  SEC_EDGAR_DEFAULT_LIMIT,
  SEC_EDGAR_DEFAULT_TAG,
  SEC_EDGAR_DEFAULT_TAXONOMY,
  SEC_EDGAR_DEFAULT_UNIT,
  SEC_EDGAR_MAX_LIMIT,
  normalizeSecEdgarCompanyConceptInput,
  normalizeSecEdgarSubmissionsInput,
  type SecEdgarCompanyConceptInput,
  type SecEdgarSubmissionsInput,
} from '../../infrastructure/openApis/secEdgarClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const submissionsParamsSchema = z.object({
  cik: z.union([z.string(), z.number()]).optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<SecEdgarSubmissionsInput>

const companyConceptParamsSchema = z.object({
  cik: z.union([z.string(), z.number()]).optional(),
  taxonomy: z.string().optional(),
  tag: z.string().optional(),
  unit: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<SecEdgarCompanyConceptInput>

const cikOption = {
  name: 'cik',
  flag: '--cik <digits>',
  description: `SEC CIK, default ${SEC_EDGAR_DEFAULT_CIK} (Apple Inc.)`,
  exposure: 'primary' as const,
  group: 'query' as const,
  reason: 'CIK is the stable SEC company identifier used by official EDGAR JSON endpoints.',
  valueType: 'string' as const,
  defaultValue: SEC_EDGAR_DEFAULT_CIK,
}

const limitOption = {
  name: 'limit',
  flag: '--limit <count>',
  description: `Records to show/cache, default ${SEC_EDGAR_DEFAULT_LIMIT}, cap ${SEC_EDGAR_MAX_LIMIT}`,
  exposure: 'primary' as const,
  group: 'pagination' as const,
  reason: 'Submissions returns up to 1,000 recent filings; default/cap follows the documented useful maximum while limiting text display separately.',
  valueType: 'integer' as const,
  defaultValue: String(SEC_EDGAR_DEFAULT_LIMIT),
}

const submissionsOperation: PublicApiOperationDefinition<SecEdgarSubmissionsInput> = {
  id: 'secedgar.submissions',
  providerId: 'secedgar',
  name: 'Company Submissions',
  commandPath: ['secedgar', 'submissions'],
  rpcMethod: 'secedgar.submissions',
  description: 'List recent SEC EDGAR company submissions by CIK.',
  category: 'finance',
  options: [cikOption, limitOption],
  paramsSchema: submissionsParamsSchema,
  execute: params => getSecEdgarSubmissions(params),
  normalizeParams: params => submissionsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeSecEdgarSubmissionsInput(params),
  resultKind: 'secedgar.submissions',
  defaultFormat: 'text',
}

const companyConceptOperation: PublicApiOperationDefinition<SecEdgarCompanyConceptInput> = {
  id: 'secedgar.companyConcept',
  providerId: 'secedgar',
  name: 'Company Concept',
  commandPath: ['secedgar', 'company-concept'],
  rpcMethod: 'secedgar.companyConcept',
  description: 'Read one SEC XBRL company concept time series by CIK, taxonomy, tag, and unit.',
  category: 'finance',
  options: [
    cikOption,
    {
      name: 'taxonomy',
      flag: '--taxonomy <name>',
      description: `XBRL taxonomy, default ${SEC_EDGAR_DEFAULT_TAXONOMY}`,
      exposure: 'advanced',
      group: 'query',
      reason: 'Most terminal users start with us-gaap; alternative taxonomies are useful for advanced XBRL exploration.',
      valueType: 'string',
      defaultValue: SEC_EDGAR_DEFAULT_TAXONOMY,
    },
    {
      name: 'tag',
      flag: '--tag <name>',
      description: `XBRL tag, default ${SEC_EDGAR_DEFAULT_TAG}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The concept tag selects the financial metric to analyze.',
      valueType: 'string',
      defaultValue: SEC_EDGAR_DEFAULT_TAG,
    },
    {
      name: 'unit',
      flag: '--unit <name>',
      description: `Unit key to read, default ${SEC_EDGAR_DEFAULT_UNIT}`,
      exposure: 'advanced',
      group: 'filters',
      reason: 'Unit selection is provider-specific XBRL detail; USD covers the default financial metric.',
      valueType: 'string',
      defaultValue: SEC_EDGAR_DEFAULT_UNIT,
    },
    limitOption,
  ],
  paramsSchema: companyConceptParamsSchema,
  execute: params => getSecEdgarCompanyConcept(params),
  normalizeParams: params => companyConceptParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeSecEdgarCompanyConceptInput(params),
  resultKind: 'secedgar.companyConcept',
  defaultFormat: 'text',
}

export const secEdgarProvider: PublicApiProviderModule = {
  manifest: {
    id: 'secedgar',
    name: 'SEC EDGAR Data',
    description: 'No-auth SEC EDGAR data.sec.gov company submissions and XBRL JSON APIs.',
    publicApisCategory: 'Finance',
    homepageUrl: 'https://www.sec.gov/edgar/sec-api-documentation',
    docsUrl: 'https://www.sec.gov/search-filings/edgar-application-programming-interfaces',
    auth: {
      mode: 'none',
      notes: ['SEC official docs state these APIs do not require authentication or API keys.'],
    },
    tags: ['finance', 'sec', 'edgar', 'filings', 'xbrl', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Automated clients should send a descriptive User-Agent and respect SEC fair-access guidance.',
      'Submissions returns at least one year or 1,000 recent filings; CLI default/cap is 1,000 for cache/query completeness while text rendering caps visible rows.',
    ],
  },
  operations: [submissionsOperation, companyConceptOperation],
  endpoints: [
    {
      id: 'secedgar-submissions',
      method: 'GET',
      urlPattern: 'https://data.sec.gov/submissions/CIK*.json',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'SEC EDGAR company submissions JSON endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://www.sec.gov/search-filings/edgar-application-programming-interfaces', 'https://data.sec.gov/submissions/CIK0000320193.json'],
      consumedBy: ['secedgar submissions'],
      notes: ['No API key required.', 'Descriptive User-Agent is sent.', 'No browser clickstream or scraping required.'],
    },
    {
      id: 'secedgar-company-concept',
      method: 'GET',
      urlPattern: 'https://data.sec.gov/api/xbrl/companyconcept/CIK*/*/*.json',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'SEC EDGAR company concept XBRL facts JSON endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://www.sec.gov/search-filings/edgar-application-programming-interfaces', 'https://data.sec.gov/api/xbrl/companyconcept/CIK0000320193/us-gaap/AccountsPayableCurrent.json'],
      consumedBy: ['secedgar company-concept'],
      notes: ['No API key required.', 'Descriptive User-Agent is sent.', 'No browser clickstream or scraping required.'],
    },
  ],
}
