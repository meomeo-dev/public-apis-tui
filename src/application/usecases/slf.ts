import {
  SLF_DOCS_URL,
  SLF_MAX_LIMIT,
  SlfClient,
  normalizeSlfLookupInput,
  type SlfLookupInput,
} from '../../infrastructure/openApis/slfClient.js'

type SlfApiMeta = {
  providerId: 'slf'
  providerName: 'SLF'
  endpoint: 'GET /data.json'
  documentation: typeof SLF_DOCS_URL
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'HTTPS static JSON'
  reliability: 'Static Stadt-Land-Fluss word-list/game helper data; validate language-sensitive or authoritative uses elsewhere.'
}

const apiBase = {
  providerId: 'slf',
  providerName: 'SLF',
  endpoint: 'GET /data.json',
  documentation: SLF_DOCS_URL,
  authentication: 'none',
  usesBrowserClickstream: false,
  transport: 'HTTPS static JSON',
  reliability: 'Static Stadt-Land-Fluss word-list/game helper data; validate language-sensitive or authoritative uses elsewhere.',
} satisfies SlfApiMeta

export type SlfLookupResult = {
  kind: 'slf.lookup'
  api: SlfApiMeta
  query: ReturnType<typeof normalizeSlfLookupInput>
  values: string[]
  availableCategories: string[]
  count: { returned: number; maxLimit: typeof SLF_MAX_LIMIT }
}

export async function lookupSlf(input: SlfLookupInput = {}): Promise<SlfLookupResult> {
  const query = normalizeSlfLookupInput(input)
  const lookup = await new SlfClient().lookup(query)
  return {
    kind: 'slf.lookup',
    api: apiBase,
    query,
    values: lookup.values,
    availableCategories: lookup.availableCategories,
    count: { returned: lookup.values.length, maxLimit: SLF_MAX_LIMIT },
  }
}

export type { SlfLookupInput }
