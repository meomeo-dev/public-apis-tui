import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export const POSTAL_PIN_CODE_DEFAULT_PINCODE = '110001'
export const POSTAL_PIN_CODE_DEFAULT_POST_OFFICE = 'Connaught Place'
export const POSTAL_PIN_CODE_DEFAULT_LIMIT = 10
export const POSTAL_PIN_CODE_MAX_LIMIT = 50
export const POSTAL_PIN_CODE_MAX_RESPONSE_BYTES = 1_000_000

type FetchImpl = typeof fetch

export type PostalPinCodePincodeInput = {
  pincode?: string | undefined
  limit?: number | undefined
}

export type PostalPinCodePostOfficeInput = {
  name?: string | undefined
  limit?: number | undefined
}

export type NormalizedPostalPinCodePincodeInput = {
  pincode: string
  limit: number
}

export type NormalizedPostalPinCodePostOfficeInput = {
  name: string
  limit: number
}

export type PostalPinCodePostOffice = {
  name: string
  pincode?: string | undefined
  description?: string | undefined
  branchType?: string | undefined
  deliveryStatus?: string | undefined
  taluk?: string | undefined
  circle?: string | undefined
  district?: string | undefined
  division?: string | undefined
  region?: string | undefined
  block?: string | undefined
  state?: string | undefined
  country?: string | undefined
}

export type PostalPinCodeLookupResponse = {
  status: string
  message: string
  upstreamCount?: number | undefined
  postOffices: PostalPinCodePostOffice[]
}

export class PostalPinCodeClient {
  constructor(private readonly options: { fetchImpl?: FetchImpl | undefined } = {}) {}

  async lookupPincode(input: NormalizedPostalPinCodePincodeInput): Promise<PostalPinCodeLookupResponse> {
    const url = new URL(`/pincode/${encodeURIComponent(input.pincode)}`, 'https://api.postalpincode.in')
    return this.fetchLookup(url, input.limit)
  }

  async lookupPostOffice(input: NormalizedPostalPinCodePostOfficeInput): Promise<PostalPinCodeLookupResponse> {
    const url = new URL(`/postoffice/${encodeURIComponent(input.name)}`, 'https://api.postalpincode.in')
    return this.fetchLookup(url, input.limit)
  }

  private async fetchLookup(url: URL, limit: number): Promise<PostalPinCodeLookupResponse> {
    const fetchImpl = this.options.fetchImpl ?? fetch
    const response = await fetchImpl(url, {
      headers: {
        accept: 'application/json',
      },
    })
    const text = await readResponseText(response)
    let parsed: unknown
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      throw new RuntimeFailure('OPEN_API_FAILED', 'PostalPinCode returned non-JSON content.', {
        status: response.status,
        preview: text.slice(0, 120),
      })
    }
    if (!response.ok) {
      throw new RuntimeFailure('OPEN_API_FAILED', `PostalPinCode request failed with HTTP ${response.status}.`, {
        status: response.status,
        response: parsed,
      })
    }
    return parseLookupResponse(parsed, limit)
  }
}

export function normalizePostalPinCodePincodeInput(input: PostalPinCodePincodeInput = {}): NormalizedPostalPinCodePincodeInput {
  return {
    pincode: normalizePincode(input.pincode),
    limit: normalizeLimit(input.limit),
  }
}

export function normalizePostalPinCodePostOfficeInput(input: PostalPinCodePostOfficeInput = {}): NormalizedPostalPinCodePostOfficeInput {
  return {
    name: normalizePostOfficeName(input.name),
    limit: normalizeLimit(input.limit),
  }
}

function parseLookupResponse(value: unknown, limit: number): PostalPinCodeLookupResponse {
  const first = Array.isArray(value) ? value[0] : value
  if (!isRecord(first)) {
    throw new RuntimeFailure('OPEN_API_FAILED', 'PostalPinCode response had an unexpected schema.')
  }
  const status = readString(first.Status) ?? 'unknown'
  const message = readString(first.Message) ?? ''
  const rawPostOffices = Array.isArray(first.PostOffice) ? first.PostOffice : []
  const postOffices = rawPostOffices.map(parsePostOffice).filter((entry): entry is PostalPinCodePostOffice => entry !== undefined)
  return {
    status,
    message,
    upstreamCount: readCount(message) ?? postOffices.length,
    postOffices: postOffices.slice(0, limit),
  }
}

function parsePostOffice(value: unknown): PostalPinCodePostOffice | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const name = readString(value.Name)
  if (name === undefined) {
    return undefined
  }
  return {
    name,
    pincode: readString(value.Pincode) ?? readString(value.PINCode),
    description: readString(value.Description),
    branchType: readString(value.BranchType),
    deliveryStatus: readString(value.DeliveryStatus),
    taluk: readString(value.Taluk),
    circle: readString(value.Circle),
    district: readString(value.District),
    division: readString(value.Division),
    region: readString(value.Region),
    block: readString(value.Block),
    state: readString(value.State),
    country: readString(value.Country),
  }
}

function normalizePincode(value: string | undefined): string {
  const normalized = (value ?? POSTAL_PIN_CODE_DEFAULT_PINCODE).trim()
  if (!/^\d{6}$/u.test(normalized)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'PostalPinCode --pincode must be exactly 6 digits.', { pincode: value })
  }
  return normalized
}

function normalizePostOfficeName(value: string | undefined): string {
  const normalized = (value ?? POSTAL_PIN_CODE_DEFAULT_POST_OFFICE).trim().replace(/\s+/gu, ' ')
  if (normalized.length < 3 || normalized.length > 80) {
    throw new RuntimeFailure('INVALID_ARGUMENT', 'PostalPinCode --name must be 3 to 80 characters.', { name: value })
  }
  return normalized
}

function normalizeLimit(value: number | undefined): number {
  const normalized = value ?? POSTAL_PIN_CODE_DEFAULT_LIMIT
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > POSTAL_PIN_CODE_MAX_LIMIT) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `PostalPinCode --limit must be an integer from 1 to ${POSTAL_PIN_CODE_MAX_LIMIT}.`, { limit: value })
  }
  return normalized
}

async function readResponseText(response: Response): Promise<string> {
  if (response.body === null) {
    return response.text()
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      totalBytes += value.byteLength
      if (totalBytes > POSTAL_PIN_CODE_MAX_RESPONSE_BYTES) {
        await reader.cancel()
        throw new RuntimeFailure('OPEN_API_FAILED', 'PostalPinCode response was too large; narrow the branch-name query.', {
          maxBytes: POSTAL_PIN_CODE_MAX_RESPONSE_BYTES,
        })
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const body = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(body)
}

function readCount(message: string): number | undefined {
  const match = message.match(/found:\s*(\d+)/iu)
  if (match === null) {
    return undefined
  }
  const parsed = Number(match[1])
  return Number.isInteger(parsed) ? parsed : undefined
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
