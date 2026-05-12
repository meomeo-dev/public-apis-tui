import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const RAZORPAY_IFSC_DEFAULT_BASE_URL = 'https://ifsc.razorpay.com'
export const RAZORPAY_IFSC_DEFAULT_CODE = 'HDFC0CAGSBK'

export type RazorpayIfscLookupInput = {
  ifsc?: string | undefined
}

export type NormalizedRazorpayIfscLookupInput = {
  ifsc: string
}

export type RazorpayIfscBranch = {
  ifsc: string
  bank: string
  bankCode?: string | undefined
  branch?: string | undefined
  address?: string | undefined
  city?: string | undefined
  centre?: string | undefined
  district?: string | undefined
  state?: string | undefined
  iso3166?: string | undefined
  micr?: string | undefined
  contact?: string | undefined
  swift?: string | undefined
  upi?: boolean | undefined
  rtgs?: boolean | undefined
  neft?: boolean | undefined
  imps?: boolean | undefined
}

export class RazorpayIfscClient {
  constructor(private readonly options: { baseUrl?: string | undefined; fetchImpl?: typeof fetch | undefined } = {}) {}

  async lookup(input: NormalizedRazorpayIfscLookupInput): Promise<RazorpayIfscBranch> {
    const parsed = await this.fetchJson(new URL(`/${encodeURIComponent(input.ifsc)}`, this.options.baseUrl ?? RAZORPAY_IFSC_DEFAULT_BASE_URL))
    return parseBranch(parsed)
  }

  private async fetchJson(url: URL): Promise<unknown> {
    const fetchImpl = this.options.fetchImpl ?? globalThis.fetch
    let response: Response
    try {
      response = await fetchImpl(url, { headers: { accept: 'application/json' } })
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Razorpay IFSC request failed: ${String(error)}`, {
        provider: 'razorpayifsc',
        endpoint: url.href,
      })
    }

    let parsed: unknown
    try {
      parsed = await response.json()
    } catch (error) {
      throw new RuntimeFailure('OPEN_API_FAILED', `Razorpay IFSC returned a non-JSON response: ${String(error)}`, {
        provider: 'razorpayifsc',
        status: response.status,
        endpoint: url.href,
      })
    }

    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', readErrorMessage(parsed, response.status, readIfscFromUrl(url)) ?? `Razorpay IFSC request failed with HTTP ${response.status}.`, {
        provider: 'razorpayifsc',
        status: response.status,
        endpoint: url.href,
        response: parsed,
      })
    }

    return parsed
  }
}

export function normalizeRazorpayIfscLookupInput(input: RazorpayIfscLookupInput = {}): NormalizedRazorpayIfscLookupInput {
  const ifsc = (input.ifsc ?? RAZORPAY_IFSC_DEFAULT_CODE).trim().toUpperCase()
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/u.test(ifsc)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--ifsc must be an 11-character IFSC code such as HDFC0CAGSBK.')
  }
  return { ifsc }
}

function parseBranch(value: unknown): RazorpayIfscBranch {
  if (!isRecord(value) || typeof value.IFSC !== 'string' || typeof value.BANK !== 'string') {
    throw new RuntimeFailure('OPEN_API_FAILED', 'Razorpay IFSC branch response had an unexpected schema.')
  }
  return {
    ifsc: value.IFSC,
    bank: value.BANK,
    bankCode: optionalString(value.BANKCODE),
    branch: optionalString(value.BRANCH),
    address: optionalString(value.ADDRESS),
    city: optionalString(value.CITY),
    centre: optionalString(value.CENTRE),
    district: optionalString(value.DISTRICT),
    state: optionalString(value.STATE),
    iso3166: optionalString(value.ISO3166),
    micr: optionalString(value.MICR),
    contact: optionalString(value.CONTACT),
    swift: optionalString(value.SWIFT),
    upi: optionalBoolean(value.UPI),
    rtgs: optionalBoolean(value.RTGS),
    neft: optionalBoolean(value.NEFT),
    imps: optionalBoolean(value.IMPS),
  }
}

function readErrorMessage(value: unknown, status: number, ifsc: string): string | undefined {
  if (status === 404) {
    return `No Razorpay IFSC branch found for ${ifsc}; verify the code or try --ifsc ${RAZORPAY_IFSC_DEFAULT_CODE}.`
  }
  if (!isRecord(value)) {
    return typeof value === 'string' && value.trim() !== '' ? value : undefined
  }
  return optionalString(value.error) ?? optionalString(value.message)
}

function readIfscFromUrl(url: URL): string {
  const ifsc = decodeURIComponent(url.pathname.replace(/^\/+/u, '')).trim().toUpperCase()
  return ifsc === '' ? RAZORPAY_IFSC_DEFAULT_CODE : ifsc
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
