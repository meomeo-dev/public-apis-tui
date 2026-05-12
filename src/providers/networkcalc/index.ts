import { z } from 'zod'
import {
  calculateNetworkCalcSubnet,
  convertNetworkCalcBinary,
  type NetworkCalcBinaryResult,
  type NetworkCalcSubnetResult,
} from '../../application/usecases/networkCalc.js'
import {
  NETWORKCALC_DEFAULT_BINARY,
  NETWORKCALC_DEFAULT_BINARY_VALUE,
  NETWORKCALC_DEFAULT_CIDR,
  NETWORKCALC_DEFAULT_FROM_BASE,
  NETWORKCALC_DEFAULT_IP,
  NETWORKCALC_DEFAULT_TO_BASE,
  normalizeNetworkCalcBinaryInput,
  normalizeNetworkCalcSubnetInput,
  type NetworkCalcBinaryInput,
  type NetworkCalcSubnetInput,
} from '../../infrastructure/openApis/networkCalcClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const subnetParamsSchema = z.object({
  ip: z.string().optional(),
  cidr: z.number().int().optional(),
  binary: z.boolean().optional(),
}) satisfies z.ZodType<NetworkCalcSubnetInput>

const binaryParamsSchema = z.object({
  value: z.string().optional(),
  from: z.number().int().optional(),
  to: z.number().int().optional(),
}) satisfies z.ZodType<NetworkCalcBinaryInput>

const subnetOperation: PublicApiOperationDefinition<NetworkCalcSubnetInput> = {
  id: 'networkcalc.subnet',
  providerId: 'networkcalc',
  name: 'Subnet Calculator',
  commandPath: ['networkcalc', 'subnet'],
  rpcMethod: 'networkcalc.subnet',
  description: 'Calculate IPv4 subnet metadata with NetworkCalc no-auth JSON API.',
  category: 'development',
  options: [
    {
      name: 'ip',
      flag: '--ip <ipv4>',
      description: `IPv4 address, default ${NETWORKCALC_DEFAULT_IP}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The IPv4 address is the primary subnet calculation input.',
      defaultValue: NETWORKCALC_DEFAULT_IP,
    },
    {
      name: 'cidr',
      flag: '--cidr <bits>',
      description: `CIDR prefix length 0-32, default ${String(NETWORKCALC_DEFAULT_CIDR)}`,
      exposure: 'primary',
      group: 'query',
      reason: 'CIDR prefix length defines the subnet boundary and host range.',
      valueType: 'integer',
      defaultValue: String(NETWORKCALC_DEFAULT_CIDR),
    },
    {
      name: 'binary',
      flag: '--binary <true|false>',
      description: `Include binary address fields, default ${String(NETWORKCALC_DEFAULT_BINARY)}`,
      exposure: 'advanced',
      group: 'presentation',
      reason: 'Binary fields are useful for learning/debugging but secondary to subnet summary output.',
      valueType: 'boolean',
      defaultValue: String(NETWORKCALC_DEFAULT_BINARY),
    },
  ],
  paramsSchema: subnetParamsSchema,
  execute: params => calculateNetworkCalcSubnet(params),
  normalizeParams: params => subnetParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNetworkCalcSubnetInput(params),
  resultKind: 'networkcalc.subnet',
  defaultFormat: 'text',
}

const binaryOperation: PublicApiOperationDefinition<NetworkCalcBinaryInput> = {
  id: 'networkcalc.binary',
  providerId: 'networkcalc',
  name: 'Binary/Base Converter',
  commandPath: ['networkcalc', 'binary'],
  rpcMethod: 'networkcalc.binary',
  description: 'Convert values between binary, octal, decimal, and hexadecimal using NetworkCalc no-auth JSON API.',
  category: 'development',
  options: [
    {
      name: 'value',
      flag: '--value <digits>',
      description: `Input value, default ${NETWORKCALC_DEFAULT_BINARY_VALUE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The input digits are the primary conversion payload.',
      defaultValue: NETWORKCALC_DEFAULT_BINARY_VALUE,
    },
    {
      name: 'from',
      flag: '--from <2|8|10|16>',
      description: `Source base, default ${String(NETWORKCALC_DEFAULT_FROM_BASE)}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The source base determines how NetworkCalc parses the input digits.',
      valueType: 'integer',
      defaultValue: String(NETWORKCALC_DEFAULT_FROM_BASE),
    },
    {
      name: 'to',
      flag: '--to <2|8|10|16>',
      description: `Destination base, default ${String(NETWORKCALC_DEFAULT_TO_BASE)}`,
      exposure: 'primary',
      group: 'query',
      reason: 'The destination base determines the conversion result.',
      valueType: 'integer',
      defaultValue: String(NETWORKCALC_DEFAULT_TO_BASE),
    },
  ],
  paramsSchema: binaryParamsSchema,
  execute: params => convertNetworkCalcBinary(params),
  normalizeParams: params => binaryParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNetworkCalcBinaryInput(params),
  resultKind: 'networkcalc.binary',
  defaultFormat: 'text',
}

export const networkCalcProvider: PublicApiProviderModule = {
  manifest: {
    id: 'networkcalc',
    name: 'NetworkCalc',
    description: 'No-auth HTTPS JSON API for network calculators such as IPv4 subnet and base conversion.',
    publicApisCategory: 'Development',
    homepageUrl: 'https://networkcalc.com/',
    docsUrl: 'https://networkcalc.com/api/docs',
    auth: {
      mode: 'none',
      notes: ['Documented API endpoints are reachable without API keys, OAuth, cookies, browser sessions, or scraping.'],
    },
    tags: ['development', 'networking', 'subnet', 'binary', 'calculator', 'json', 'no-auth'],
    freePlanNotes: [
      'No public API key requirement or quota header was observed for the curated subnet and binary endpoints.',
      'Security-tool and DNS surfaces are intentionally not exposed in this provider to keep the CLI low-risk and deterministic.',
      'CLI input is bounded to IPv4 CIDR calculations and base conversion among 2, 8, 10, and 16.',
    ],
  },
  operations: [subnetOperation, binaryOperation],
  endpoints: [
    {
      id: 'networkcalc-ip-subnet',
      method: 'GET',
      urlPattern: 'https://networkcalc.com/api/ip/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'NetworkCalc IPv4 subnet calculator JSON endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: ['https://networkcalc.com/api/docs', 'https://networkcalc.com/api/ip/10.5.1.0/27?binary=true'],
      consumedBy: ['networkcalc subnet'],
      notes: ['No authentication required.', 'Returns application/json with status/meta/address fields.', 'CLI exposes bounded IPv4/CIDR inputs only.'],
    },
    {
      id: 'networkcalc-binary-converter',
      method: 'GET',
      urlPattern: 'https://networkcalc.com/api/binary/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'NetworkCalc binary/octal/decimal/hex converter JSON endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-08',
      sampleSources: ['https://networkcalc.com/api/docs', 'https://networkcalc.com/api/binary/1e7d6d?from=16&to=2'],
      consumedBy: ['networkcalc binary'],
      notes: ['No authentication required.', 'Returns application/json with status/original/converted/from/to fields.', 'CLI restricts bases to 2, 8, 10, and 16.'],
    },
  ],
}

export type { NetworkCalcBinaryResult, NetworkCalcSubnetResult }
