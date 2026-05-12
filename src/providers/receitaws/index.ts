import { z } from 'zod'
import { lookupReceitaWs } from '../../application/usecases/receitaWs.js'
import {
  RECEITA_WS_DEFAULT_CNPJ,
  normalizeReceitaWsLookupInput,
  type ReceitaWsLookupInput,
} from '../../infrastructure/openApis/receitaWsClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const lookupParamsSchema = z.object({
  cnpj: z.string().optional(),
}) satisfies z.ZodType<ReceitaWsLookupInput>

const lookupOperation: PublicApiOperationDefinition<ReceitaWsLookupInput> = {
  id: 'receitaws.lookup',
  providerId: 'receitaws',
  name: 'CNPJ Lookup',
  commandPath: ['receitaws', 'lookup'],
  rpcMethod: 'receitaws.lookup',
  description: 'Lookup Brazilian company registration data by CNPJ.',
  category: 'government',
  options: [
    {
      name: 'cnpj',
      flag: '--cnpj <digits>',
      description: `Brazilian CNPJ identifier, default ${RECEITA_WS_DEFAULT_CNPJ}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The public endpoint supports one CNPJ per request; exposing only the identifier keeps quota use explicit.',
      defaultValue: RECEITA_WS_DEFAULT_CNPJ,
    },
  ],
  paramsSchema: lookupParamsSchema,
  execute: params => lookupReceitaWs(params),
  normalizeParams: params => lookupParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeReceitaWsLookupInput(params),
  resultKind: 'receitaws.lookup',
  defaultFormat: 'text',
}

export const receitaWsProvider: PublicApiProviderModule = {
  manifest: {
    id: 'receitaws',
    name: 'Brazil Receita WS',
    description: 'No-auth ReceitaWS CNPJ company registration lookup API.',
    publicApisCategory: 'Government',
    homepageUrl: 'https://www.receitaws.com.br/',
    docsUrl: 'https://www.receitaws.com.br/',
    auth: {
      mode: 'none',
      notes: ['Public CNPJ lookup requires no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['government', 'brazil', 'cnpj', 'company-data', 'commercial-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'The public endpoint is a single-CNPJ lookup; the CLI defaults to one request and encourages --persist/--offline replay.',
      'No pagination exists for this endpoint; no browser clickstream or scraping is used.',
    ],
  },
  operations: [lookupOperation],
  endpoints: [
    {
      id: 'receitaws-cnpj-lookup',
      method: 'GET',
      urlPattern: 'https://www.receitaws.com.br/v1/cnpj/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'ReceitaWS public CNPJ lookup endpoint returning Brazilian company registration JSON.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://www.receitaws.com.br/', 'https://www.receitaws.com.br/v1/cnpj/27865757000102'],
      consumedBy: ['receitaws lookup'],
      notes: ['No API key required for public lookup.', 'One CNPJ per request.', 'No browser clickstream or scraping required.'],
    },
  ],
}
