import { defaultPublicApiRegistry, listPublicApiEndpoints } from '../../providers/providerRegistry.js'

export type EndpointEvidenceStatus = 'unknown' | 'observed' | 'confirmed' | 'deprecated'

export type EndpointCatalogRecord = {
  id: string
  method?: string | undefined
  urlPattern: string
  category: string
  evidenceStatus: EndpointEvidenceStatus
  description: string
  siteIds?: string[] | undefined
  observedOn?: string | undefined
  sampleSources?: string[] | undefined
  consumedBy?: string[] | undefined
  notes?: string[] | undefined
}

export type EndpointCatalog = {
  records: EndpointCatalogRecord[]
}

export const defaultEndpointCatalog: EndpointCatalog = {
  records: listPublicApiEndpoints(defaultPublicApiRegistry),
}

export function listEndpointCatalog(catalog: EndpointCatalog = defaultEndpointCatalog): EndpointCatalogRecord[] {
  return [...catalog.records]
}

export function matchEndpointRecord(
  catalog: EndpointCatalog,
  input: { url: string; method: string },
): EndpointCatalogRecord | undefined {
  return catalog.records.find(record => {
    if (record.method !== undefined && record.method.toUpperCase() !== input.method.toUpperCase()) {
      return false
    }

    return matchesUrlPattern(input.url, record.urlPattern)
  })
}

export function matchesUrlPattern(url: string, pattern: string): boolean {
  if (pattern.startsWith('regex:')) {
    return new RegExp(pattern.slice('regex:'.length)).test(url)
  }

  if (pattern.includes('*')) {
    const escaped = pattern.split('*').map(escapeRegExp).join('.*')
    return new RegExp(`^${escaped}$`).test(url)
  }

  try {
    const parsedUrl = new URL(url)
    return parsedUrl.pathname === pattern || `${parsedUrl.origin}${parsedUrl.pathname}` === pattern
  } catch {
    return url === pattern
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$+?.()|[\]{}]/g, '\\$&')
}
