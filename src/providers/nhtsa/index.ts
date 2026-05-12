import { z } from 'zod'
import { decodeNhtsaVin, getNhtsaMakesForVehicleType } from '../../application/usecases/nhtsa.js'
import {
  NHTSA_DEFAULT_MODEL_YEAR,
  NHTSA_DEFAULT_VEHICLE_TYPE,
  NHTSA_DEFAULT_VIN,
  NHTSA_MAKES_DEFAULT_LIMIT,
  NHTSA_MAKES_MAX_LIMIT,
  normalizeNhtsaDecodeVinInput,
  normalizeNhtsaMakesForTypeInput,
  type NhtsaDecodeVinInput,
  type NhtsaMakesForTypeInput,
} from '../../infrastructure/openApis/nhtsaClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const decodeVinParamsSchema = z.object({
  vin: z.string().optional(),
  modelYear: z.coerce.number().optional(),
}) satisfies z.ZodType<NhtsaDecodeVinInput>

const makesParamsSchema = z.object({
  vehicleType: z.string().optional(),
  limit: z.coerce.number().optional(),
}) satisfies z.ZodType<NhtsaMakesForTypeInput>

const decodeVinOperation: PublicApiOperationDefinition<NhtsaDecodeVinInput> = {
  id: 'nhtsa.decodeVin',
  providerId: 'nhtsa',
  name: 'Decode VIN',
  commandPath: ['nhtsa', 'decode-vin'],
  rpcMethod: 'nhtsa.decodeVin',
  description: 'Decode a VIN using NHTSA vPIC flat JSON output.',
  category: 'vehicle',
  options: [
    {
      name: 'vin',
      flag: '--vin <vin>',
      description: `VIN or partial VIN, default ${NHTSA_DEFAULT_VIN}`,
      exposure: 'primary',
      group: 'query',
      reason: 'VIN decode is the primary NHTSA vPIC workflow for vehicle identification and market/risk analysis.',
      defaultValue: NHTSA_DEFAULT_VIN,
    },
    {
      name: 'modelYear',
      flag: '--model-year <year>',
      description: `Model year for precise decoding, default ${NHTSA_DEFAULT_MODEL_YEAR}`,
      exposure: 'primary',
      group: 'query',
      reason: 'NHTSA recommends sending model year for current and older VIN ranges when known.',
      valueType: 'integer',
      defaultValue: String(NHTSA_DEFAULT_MODEL_YEAR),
    },
  ],
  paramsSchema: decodeVinParamsSchema,
  execute: params => decodeNhtsaVin(params),
  normalizeParams: params => decodeVinParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNhtsaDecodeVinInput(params),
  resultKind: 'nhtsa.decodeVin',
  defaultFormat: 'text',
}

const makesOperation: PublicApiOperationDefinition<NhtsaMakesForTypeInput> = {
  id: 'nhtsa.makesForType',
  providerId: 'nhtsa',
  name: 'Makes For Vehicle Type',
  commandPath: ['nhtsa', 'makes-for-type'],
  rpcMethod: 'nhtsa.makesForType',
  description: 'List makes for a vehicle type using NHTSA vPIC JSON output.',
  category: 'vehicle',
  options: [
    {
      name: 'vehicleType',
      flag: '--vehicle-type <type>',
      description: `Vehicle type search, default ${NHTSA_DEFAULT_VEHICLE_TYPE}`,
      exposure: 'primary',
      group: 'query',
      reason: 'Vehicle type is the documented route parameter and supports partial names such as car or truck.',
      defaultValue: NHTSA_DEFAULT_VEHICLE_TYPE,
    },
    {
      name: 'limit',
      flag: '--limit <count>',
      description: `Makes to return, default ${NHTSA_MAKES_DEFAULT_LIMIT}, cap ${NHTSA_MAKES_MAX_LIMIT}`,
      exposure: 'primary',
      group: 'pagination',
      reason: 'The endpoint has no page-size parameter; CLI limits display/cache payload while defaulting above observed passenger-car count.',
      valueType: 'integer',
      defaultValue: String(NHTSA_MAKES_DEFAULT_LIMIT),
    },
  ],
  paramsSchema: makesParamsSchema,
  execute: params => getNhtsaMakesForVehicleType(params),
  normalizeParams: params => makesParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeNhtsaMakesForTypeInput(params),
  resultKind: 'nhtsa.makesForType',
  defaultFormat: 'text',
}

export const nhtsaProvider: PublicApiProviderModule = {
  manifest: {
    id: 'nhtsa',
    name: 'NHTSA vPIC',
    description: 'No-auth HTTPS JSON vehicle Product Information Catalog APIs from NHTSA.',
    publicApisCategory: 'Vehicle',
    homepageUrl: 'https://vpic.nhtsa.dot.gov/api/',
    docsUrl: 'https://vpic.nhtsa.dot.gov/api/',
    auth: {
      mode: 'none',
      notes: ['NHTSA vPIC read APIs require no API key, OAuth, cookies, browser session, or account setup.'],
    },
    tags: ['vehicle', 'vin', 'government', 'market-research', 'risk-analysis', 'no-auth', 'json'],
    freePlanNotes: [
      'Official docs mention automated traffic rate control but no API key requirement.',
      'Decode VIN flat output and makes-for-vehicle-type provide high-value terminal workflows with bounded JSON.',
      'Batch VIN decoding is intentionally excluded for this first pass to avoid quota-heavy POST workflows.',
    ],
  },
  operations: [decodeVinOperation, makesOperation],
  endpoints: [
    {
      id: 'nhtsa-decode-vin-values',
      method: 'GET',
      urlPattern: 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'NHTSA vPIC flat VIN decoder JSON endpoint.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://vpic.nhtsa.dot.gov/api/', 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/1HGCM82633A004352?format=json&modelyear=2003'],
      consumedBy: ['nhtsa decode-vin'],
      notes: ['No authentication required.', 'NHTSA recommends modelyear when known.'],
    },
    {
      id: 'nhtsa-makes-for-vehicle-type',
      method: 'GET',
      urlPattern: 'https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/*',
      category: 'open-api',
      evidenceStatus: 'confirmed',
      description: 'NHTSA vPIC endpoint returning makes for a vehicle type.',
      siteIds: ['public-apis-tui'],
      observedOn: '2026-05-04',
      sampleSources: ['https://vpic.nhtsa.dot.gov/api/', 'https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/car?format=json'],
      consumedBy: ['nhtsa makes-for-type'],
      notes: ['No authentication required.', 'Vehicle type route parameter accepts partial names.'],
    },
  ],
}
