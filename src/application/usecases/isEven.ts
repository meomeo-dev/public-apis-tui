import {
  ISEVEN_FREE_MAX,
  ISEVEN_FREE_MIN,
  IsEvenClient,
  normalizeIsEvenQuery,
} from '../../infrastructure/openApis/isEvenClient.js'

export type IsEvenCheckInput = {
  number?: number | undefined
}

export type IsEvenCheckResult = {
  kind: 'iseven.check'
  api: {
    provider: 'iseven'
    endpoint: 'GET /iseven/{number}/'
    docsUrl: 'https://isevenapi.xyz/'
    apiUrl: 'https://api.isevenapi.xyz/api/'
    authentication: 'none'
    usesBrowserClickstream: false
    transport: 'HTTPS JSON REST'
    freeRange: {
      min: number
      max: number
    }
    tierPolicy: string
    adPolicy: string
    boundary: string
  }
  query: {
    number: number
  }
  result: {
    number: number
    isEven: boolean
    parity: 'even' | 'odd'
  }
  upstream: {
    ad?: string | undefined
  }
}

export async function checkIsEven(
  input: IsEvenCheckInput = {},
): Promise<IsEvenCheckResult> {
  const query = normalizeIsEvenQuery(input)
  const response = await new IsEvenClient().check(query)
  return {
    kind: 'iseven.check',
    api: createApiMeta(),
    query,
    result: {
      number: query.number,
      isEven: response.isEven,
      parity: response.isEven ? 'even' : 'odd',
    },
    upstream: {
      ...(response.ad !== undefined ? { ad: response.ad } : {}),
    },
  }
}

export function normalizeIsEvenInput(
  input: IsEvenCheckInput = {},
): IsEvenCheckResult['query'] {
  return normalizeIsEvenQuery(input)
}

function createApiMeta(): IsEvenCheckResult['api'] {
  return {
    provider: 'iseven',
    endpoint: 'GET /iseven/{number}/',
    docsUrl: 'https://isevenapi.xyz/',
    apiUrl: 'https://api.isevenapi.xyz/api/',
    authentication: 'none',
    usesBrowserClickstream: false,
    transport: 'HTTPS JSON REST',
    freeRange: {
      min: ISEVEN_FREE_MIN,
      max: ISEVEN_FREE_MAX,
    },
    tierPolicy: [
      'Public free tier is documented for numbers 0 through 999999; negative',
      'numbers and larger ranges belong to paid tiers and are not exposed.',
    ].join(' '),
    adPolicy: [
      'Free responses include provider-supplied ad text; CLI labels it as',
      'upstream ad metadata and does not treat it as a decision field.',
    ].join(' '),
    boundary: [
      'Read-only JSON parity check only; no account signup, Premium or',
      'Enterprise tier probing, browser scraping, HTML parsing, arbitrary code',
      'execution, or local parity substitution.',
    ].join(' '),
  }
}

export {
  ISEVEN_DEFAULT_NUMBER,
  ISEVEN_FREE_MAX,
  ISEVEN_FREE_MIN,
} from '../../infrastructure/openApis/isEvenClient.js'
