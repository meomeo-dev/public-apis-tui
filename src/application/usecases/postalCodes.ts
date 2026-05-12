import {
  POSTAL_CODES_BASE_URL,
  POSTAL_CODES_DOCS_URL,
  POSTAL_CODES_MAX_LIMIT,
  PostalCodesClient,
  normalizePostalCodesSearchInput,
  type PostalCodesSearchInput,
  type PostalCodesSuggestion,
} from '../../infrastructure/openApis/postalCodesClient.js'

export type PostalCodesSearchResult = {
  kind: 'postalcodes.search'
  api: {
    providerId: 'postalcodes'
    providerName: 'PostalCodes.info'
    endpoint: 'GET /search'
    documentation: typeof POSTAL_CODES_DOCS_URL
    authentication: 'none'
    usesBrowserClickstream: false
    transport: 'HTTPS JSON REST'
    licence: 'Open Database License 1.0'
    reliability: 'Reference/search data only; not an official delivery-grade postal authority API.'
    downloadBoundary: 'CLI exposes lightweight /search only; tokenized same-origin download.php exports are not exposed.'
  }
  query: ReturnType<typeof normalizePostalCodesSearchInput>
  suggestions: Array<PostalCodesSuggestion & { absoluteUrl: string }>
  pagination: { returned: number; limit: number; maxLimit: typeof POSTAL_CODES_MAX_LIMIT }
}

export async function searchPostalCodes(input: PostalCodesSearchInput = {}): Promise<PostalCodesSearchResult> {
  const query = normalizePostalCodesSearchInput(input)
  const suggestions = await new PostalCodesClient().search(query)
  return {
    kind: 'postalcodes.search',
    api: {
      providerId: 'postalcodes',
      providerName: 'PostalCodes.info',
      endpoint: 'GET /search',
      documentation: POSTAL_CODES_DOCS_URL,
      authentication: 'none',
      usesBrowserClickstream: false,
      transport: 'HTTPS JSON REST',
      licence: 'Open Database License 1.0',
      reliability: 'Reference/search data only; not an official delivery-grade postal authority API.',
      downloadBoundary: 'CLI exposes lightweight /search only; tokenized same-origin download.php exports are not exposed.',
    },
    query,
    suggestions: suggestions.map(suggestion => ({
      ...suggestion,
      absoluteUrl: new URL(suggestion.url, POSTAL_CODES_BASE_URL).href,
    })),
    pagination: { returned: suggestions.length, limit: query.limit, maxLimit: POSTAL_CODES_MAX_LIMIT },
  }
}

export type { PostalCodesSearchInput }
