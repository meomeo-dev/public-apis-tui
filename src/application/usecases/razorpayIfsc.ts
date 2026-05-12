import {
  RazorpayIfscClient,
  normalizeRazorpayIfscLookupInput,
  type RazorpayIfscBranch,
  type RazorpayIfscLookupInput,
} from '../../infrastructure/openApis/razorpayIfscClient.js'

export type RazorpayIfscLookupResult = {
  kind: 'razorpayifsc.lookup'
  api: {
    provider: 'razorpayifsc'
    publicApisProject: string
    endpoint: string
    docsUrl: string
    usesBrowserClickstream: false
    authentication: 'none'
    transport: 'HTTPS JSON REST'
  }
  query: ReturnType<typeof normalizeRazorpayIfscLookupInput>
  branch: RazorpayIfscBranch
  paymentRails: {
    upi?: boolean | undefined
    rtgs?: boolean | undefined
    neft?: boolean | undefined
    imps?: boolean | undefined
  }
}

export async function lookupRazorpayIfsc(input: RazorpayIfscLookupInput = {}): Promise<RazorpayIfscLookupResult> {
  const query = normalizeRazorpayIfscLookupInput(input)
  const client = new RazorpayIfscClient()
  const branch = await client.lookup(query)
  return {
    kind: 'razorpayifsc.lookup',
    api: {
      provider: 'razorpayifsc',
      publicApisProject: 'https://github.com/public-apis/public-apis',
      endpoint: 'GET /{ifsc}',
      docsUrl: 'https://github.com/razorpay/ifsc/wiki/API',
      usesBrowserClickstream: false,
      authentication: 'none',
      transport: 'HTTPS JSON REST',
    },
    query,
    branch,
    paymentRails: {
      upi: branch.upi,
      rtgs: branch.rtgs,
      neft: branch.neft,
      imps: branch.imps,
    },
  }
}
