import {
  POSTAL_PIN_CODE_DEFAULT_LIMIT,
  POSTAL_PIN_CODE_MAX_LIMIT,
  PostalPinCodeClient,
  type PostalPinCodePincodeInput,
  type PostalPinCodePostOffice,
  type PostalPinCodePostOfficeInput,
  normalizePostalPinCodePincodeInput,
  normalizePostalPinCodePostOfficeInput,
} from '../../infrastructure/openApis/postalPinCodeClient.js'

type PostalPinCodeApiMeta = {
  provider: 'postalpincode'
  publicApisProject: string
  endpoint: string
  docsUrl: 'http://www.postalpincode.in/Api-Details'
  usesBrowserClickstream: false
  authentication: 'none'
  transport: string
  limitPolicy: string
  detailPolicy: string
}

export type PostalPinCodeLookupByPincodeResult = {
  kind: 'postalpincode.pincode'
  api: PostalPinCodeApiMeta
  query: ReturnType<typeof normalizePostalPinCodePincodeInput>
  count: number
  upstream: {
    status: string
    message: string
    count?: number | undefined
  }
  pagination: {
    returned: number
    upstreamCount?: number | undefined
    limit: number
    maxLimit: number
  }
  postOffices: PostalPinCodePostOffice[]
}

export type PostalPinCodeLookupByPostOfficeResult = {
  kind: 'postalpincode.postOffice'
  api: PostalPinCodeApiMeta
  query: ReturnType<typeof normalizePostalPinCodePostOfficeInput>
  count: number
  upstream: {
    status: string
    message: string
    count?: number | undefined
  }
  pagination: {
    returned: number
    upstreamCount?: number | undefined
    limit: number
    maxLimit: number
  }
  postOffices: PostalPinCodePostOffice[]
}

export type { PostalPinCodePincodeInput, PostalPinCodePostOfficeInput }

export async function lookupPostalPinCodePincode(input: PostalPinCodePincodeInput = {}): Promise<PostalPinCodeLookupByPincodeResult> {
  const query = normalizePostalPinCodePincodeInput(input)
  const client = new PostalPinCodeClient()
  const response = await client.lookupPincode(query)
  return {
    kind: 'postalpincode.pincode',
    api: createApiMeta('GET /pincode/{pincode}'),
    query,
    count: response.postOffices.length,
    upstream: createUpstreamMeta(response),
    pagination: {
      returned: response.postOffices.length,
      ...(response.upstreamCount !== undefined ? { upstreamCount: response.upstreamCount } : {}),
      limit: query.limit,
      maxLimit: POSTAL_PIN_CODE_MAX_LIMIT,
    },
    postOffices: response.postOffices,
  }
}

export async function lookupPostalPinCodePostOffice(input: PostalPinCodePostOfficeInput = {}): Promise<PostalPinCodeLookupByPostOfficeResult> {
  const query = normalizePostalPinCodePostOfficeInput(input)
  const client = new PostalPinCodeClient()
  const response = await client.lookupPostOffice(query)
  return {
    kind: 'postalpincode.postOffice',
    api: createApiMeta('GET /postoffice/{name}'),
    query,
    count: response.postOffices.length,
    upstream: createUpstreamMeta(response),
    pagination: {
      returned: response.postOffices.length,
      ...(response.upstreamCount !== undefined ? { upstreamCount: response.upstreamCount } : {}),
      limit: query.limit,
      maxLimit: POSTAL_PIN_CODE_MAX_LIMIT,
    },
    postOffices: response.postOffices,
  }
}

function createApiMeta(endpoint: string): PostalPinCodeApiMeta {
  return {
    provider: 'postalpincode',
    publicApisProject: 'https://github.com/public-apis/public-apis',
    endpoint,
    docsUrl: 'http://www.postalpincode.in/Api-Details',
    usesBrowserClickstream: false,
    authentication: 'none',
    transport: 'HTTPS JSON REST via api.postalpincode.in; listed docs page is HTTP/HTML',
    limitPolicy: `The upstream API does not expose pagination; CLI slices returned post offices locally with default ${POSTAL_PIN_CODE_DEFAULT_LIMIT} and cap ${POSTAL_PIN_CODE_MAX_LIMIT}.`,
    detailPolicy: 'Only the documented JSON endpoints are implemented; postalpincode.in HTML search/detail pages are not scraped.',
  }
}

function createUpstreamMeta(response: { status: string; message: string; upstreamCount?: number | undefined }): PostalPinCodeLookupByPincodeResult['upstream'] {
  return {
    status: response.status,
    message: response.message,
    ...(response.upstreamCount !== undefined ? { count: response.upstreamCount } : {}),
  }
}
