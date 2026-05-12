import { z } from 'zod'
import { lookupRazorpayIfsc } from '../../application/usecases/razorpayIfsc.js'
import {
  RAZORPAY_IFSC_DEFAULT_CODE,
  normalizeRazorpayIfscLookupInput,
  type RazorpayIfscLookupInput,
} from '../../infrastructure/openApis/razorpayIfscClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({
  ifsc: z.string().optional(),
}) satisfies z.ZodType<RazorpayIfscLookupInput>

const lookupOperation: PublicApiOperationDefinition<RazorpayIfscLookupInput> = {
  id: 'razorpayifsc.lookup',
  providerId: 'razorpayifsc',
  name: 'IFSC Lookup',
  commandPath: ['razorpayifsc', 'lookup'],
  rpcMethod: 'razorpayifsc.lookup',
  description: 'Lookup Indian bank branch metadata by IFSC code.',
  category: 'finance',
  options: [
    {
      name: 'ifsc',
      flag: '--ifsc <code>',
      description: `Indian Financial System Code, default ${RAZORPAY_IFSC_DEFAULT_CODE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The documented endpoint requires one IFSC code per request.',
      defaultValue: RAZORPAY_IFSC_DEFAULT_CODE,
    },
  ],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupRazorpayIfsc(params),
  normalizeParams: params => lookupParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeRazorpayIfscLookupInput(params),
  resultKind: 'razorpayifsc.lookup',
  defaultFormat: 'text',
}

export const razorpayIfscProvider: PublicApiProviderModule = {
  manifest: {
    id: 'razorpayifsc',
    name: 'Razorpay IFSC',
    description: 'No-auth Indian IFSC bank branch lookup API.',
    publicApisCategory: 'Finance',
    homepageUrl: 'https://github.com/razorpay/ifsc/wiki/API',
    docsUrl: 'https://github.com/razorpay/ifsc/wiki/API',
    auth: {
      mode: 'none',
      notes: ['No API key, OAuth, cookies, browser session, or account setup required for IFSC lookup.'],
    },
    tags: ['finance', 'banking', 'ifsc', 'india', 'no-auth', 'json'],
    freePlanNotes: ['One IFSC lookup per request; no documented page-size or quota controls for this endpoint.'],
  },
  operations: [lookupOperation],
  endpoints: [
    {
      id: 'razorpay-ifsc-lookup',
      method: 'GET',
      urlPattern: 'https://ifsc.razorpay.com/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'Razorpay IFSC lookup endpoint returning bank branch details.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://github.com/razorpay/ifsc/wiki/API', 'https://ifsc.razorpay.com/HDFC0CAGSBK'],
      consumedBy: ['razorpayifsc lookup'],
      notes: ['No API key required.', 'GET one IFSC code per request.'],
    },
  ],
}
