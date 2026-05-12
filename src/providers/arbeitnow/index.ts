import { z } from 'zod'
import { listArbeitnowJobs } from '../../application/usecases/arbeitnow.js'
import {
  ARBEITNOW_DEFAULT_PAGE,
  ARBEITNOW_PAGE_SIZE,
  normalizeArbeitnowJobsInput,
  type ArbeitnowJobsInput,
} from '../../infrastructure/openApis/arbeitnowClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const jobsParamsSchema = z.object({
  page: z.coerce.number().optional(),
  visaSponsorship: z.boolean().optional(),
}) satisfies z.ZodType<ArbeitnowJobsInput>

const jobsOperation: PublicApiOperationDefinition<ArbeitnowJobsInput> = {
  id: 'arbeitnow.jobs',
  providerId: 'arbeitnow',
  name: 'Jobs',
  commandPath: ['arbeitnow', 'jobs'],
  rpcMethod: 'arbeitnow.jobs',
  description: 'List current Arbeitnow job-board postings.',
  category: 'jobs',
  options: [
    { name: 'page', flag: '--page <number>', description: `Results page, default ${ARBEITNOW_DEFAULT_PAGE}; upstream returns ${ARBEITNOW_PAGE_SIZE} rows/page`, exposure: 'primary', group: 'pagination', reason: 'Arbeitnow documents and returns page-based pagination; page is the safe quota-conscious navigation control.', valueType: 'integer', defaultValue: String(ARBEITNOW_DEFAULT_PAGE) },
    { name: 'visaSponsorship', flag: '--visa-sponsorship <true|false>', description: 'Filter visa sponsorship jobs when true', exposure: 'primary', group: 'filters', reason: 'Visa sponsorship is a documented/high-value Arbeitnow job-board slice and live probes confirm it changes the result set.', valueType: 'boolean' },
  ],
  paramsSchema: jobsParamsSchema,
  execute: params => listArbeitnowJobs(params),
  normalizeParams: params => jobsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeArbeitnowJobsInput(params),
  resultKind: 'arbeitnow.jobs',
  defaultFormat: 'text',
}

export const arbeitnowProvider: PublicApiProviderModule = {
  manifest: {
    id: 'arbeitnow',
    name: 'Arbeitnow',
    description: 'No-auth public job-board API for Europe/remote-oriented job postings.',
    publicApisCategory: 'Jobs',
    homepageUrl: 'https://www.arbeitnow.com/',
    docsUrl: 'https://documenter.getpostman.com/view/18545278/UVJbJdKh',
    auth: { mode: 'none', notes: ['Job-board API requires no API key, OAuth, cookies, browser session, or account setup.'] },
    tags: ['jobs', 'job-board', 'hiring', 'europe', 'remote'],
    freePlanNotes: [
      'The response metadata says jobs are updated every hour and asks API users not to abuse the free public API.',
      'Live responses expose x-ratelimit-limit and x-ratelimit-remaining; cache with --persist and use --offline replay where possible.',
    ],
  },
  operations: [jobsOperation],
  endpoints: [
    {
      id: 'arbeitnow-job-board-api',
      method: 'GET',
      urlPattern: 'https://www.arbeitnow.com/api/job-board-api',
      category: 'public-api:jobs',
      evidenceStatus: 'confirmed',
      observedOn: '2026-05-04',
      sampleSources: ['https://documenter.getpostman.com/view/18545278/UVJbJdKh', 'https://www.arbeitnow.com/api/job-board-api?page=1'],
      consumedBy: ['arbeitnow.jobs'],
      description: 'Arbeitnow free job board JSON API.',
      notes: ['No auth required; endpoint is HTTPS JSON and paginates with page. Upstream currently returns 100 rows per page regardless of per_page probes.'],
    },
  ],
}
