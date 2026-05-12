import {
  NetworkCalcClient,
  type NetworkCalcBinaryInput,
  type NetworkCalcSubnetInput,
  normalizeNetworkCalcBinaryInput,
  normalizeNetworkCalcSubnetInput,
} from '../../infrastructure/openApis/networkCalcClient.js'

export type NetworkCalcApiMetadata = {
  providerId: 'networkcalc'
  providerName: 'NetworkCalc'
  endpoint: string
  documentation: string
  authentication: 'none'
  usesBrowserClickstream: false
  transport: 'https'
  rateLimit: string
  limitPolicy: string
}

export type NetworkCalcSubnetResult = {
  kind: 'networkcalc.subnet'
  api: NetworkCalcApiMetadata & {
    endpoint: 'GET /api/ip/{ip}/{cidr}'
    documentedParameters: string[]
  }
  query: ReturnType<typeof normalizeNetworkCalcSubnetInput>
  storage: {
    mode: 'online'
    persisted: false
  }
  meta: {
    permalink?: string | undefined
    nextAddressUrl?: string | undefined
  }
  address: Record<string, unknown>
}

export type NetworkCalcBinaryResult = {
  kind: 'networkcalc.binary'
  api: NetworkCalcApiMetadata & {
    endpoint: 'GET /api/binary/{value}'
    supportedBases: number[]
  }
  query: ReturnType<typeof normalizeNetworkCalcBinaryInput>
  storage: {
    mode: 'online'
    persisted: false
  }
  conversion: {
    original: string
    converted: string
    from: number
    to: number
  }
}

export async function calculateNetworkCalcSubnet(input: NetworkCalcSubnetInput = {}): Promise<NetworkCalcSubnetResult> {
  const query = normalizeNetworkCalcSubnetInput(input)
  const response = await new NetworkCalcClient().subnet(query)
  return {
    kind: 'networkcalc.subnet',
    api: {
      providerId: 'networkcalc',
      providerName: 'NetworkCalc',
      endpoint: 'GET /api/ip/{ip}/{cidr}',
      documentation: 'https://networkcalc.com/api/docs',
      authentication: 'none',
      usesBrowserClickstream: false,
      transport: 'https',
      rateLimit: 'No public rate limit documented; use persistence for repeated probes.',
      limitPolicy: 'CLI exposes only IPv4 CIDR subnet calculation and optional binary fields.',
      documentedParameters: ['ip', 'cidr', 'binary'],
    },
    query,
    storage: { mode: 'online', persisted: false },
    meta: {
      ...(typeof response.meta?.permalink === 'string' ? { permalink: response.meta.permalink } : {}),
      ...(typeof response.meta?.next_address === 'string' ? { nextAddressUrl: response.meta.next_address } : {}),
    },
    address: response.address ?? {},
  }
}

export async function convertNetworkCalcBinary(input: NetworkCalcBinaryInput = {}): Promise<NetworkCalcBinaryResult> {
  const query = normalizeNetworkCalcBinaryInput(input)
  const response = await new NetworkCalcClient().binary(query)
  return {
    kind: 'networkcalc.binary',
    api: {
      providerId: 'networkcalc',
      providerName: 'NetworkCalc',
      endpoint: 'GET /api/binary/{value}',
      documentation: 'https://networkcalc.com/api/docs',
      authentication: 'none',
      usesBrowserClickstream: false,
      transport: 'https',
      rateLimit: 'No public rate limit documented; use persistence for repeated probes.',
      limitPolicy: 'CLI allows base conversion only between 2, 8, 10, and 16 with 128-character input cap.',
      supportedBases: [2, 8, 10, 16],
    },
    query,
    storage: { mode: 'online', persisted: false },
    conversion: {
      original: response.original ?? query.value,
      converted: response.converted ?? '',
      from: Number(response.from ?? query.from),
      to: Number(response.to ?? query.to),
    },
  }
}
