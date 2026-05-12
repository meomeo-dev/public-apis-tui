import { z } from 'zod'
import { getFipePrice, listFipeBrands, listFipeModels, listFipeYears, type FipeListResult, type FipePriceResult } from '../../application/usecases/fipe.js'
import {
  FIPE_DEFAULT_BRAND_CODE,
  FIPE_DEFAULT_LIMIT,
  FIPE_DEFAULT_MODEL_CODE,
  FIPE_DEFAULT_VEHICLE_TYPE,
  FIPE_DEFAULT_YEAR_CODE,
  FIPE_MAX_LIMIT,
  normalizeFipeListInput,
  normalizeFipeModelsInput,
  normalizeFipePriceInput,
  normalizeFipeYearsInput,
  type FipeListInput,
  type FipeModelsInput,
  type FipePriceInput,
  type FipeYearsInput,
} from '../../infrastructure/openApis/fipeClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const listParamsSchema = z.object({
  vehicleType: z.string().min(1).optional(),
  query: z.string().min(1).optional(),
  limit: z.coerce.number().int().optional(),
}) satisfies z.ZodType<FipeListInput>

const modelsParamsSchema = listParamsSchema.extend({
  brandCode: z.string().min(1).optional(),
}) satisfies z.ZodType<FipeModelsInput>

const yearsParamsSchema = modelsParamsSchema.extend({
  modelCode: z.string().min(1).optional(),
}) satisfies z.ZodType<FipeYearsInput>

const priceParamsSchema = z.object({
  vehicleType: z.string().min(1).optional(),
  brandCode: z.string().min(1).optional(),
  modelCode: z.string().min(1).optional(),
  yearCode: z.string().min(1).optional(),
}) satisfies z.ZodType<FipePriceInput>

const commonListOptions = [
  { name: 'vehicleType', flag: '--vehicle-type <carros|motos|caminhoes>', description: `Vehicle type, default ${FIPE_DEFAULT_VEHICLE_TYPE}`, exposure: 'primary' as const, group: 'filters' as const, reason: 'Fipe separates vehicle data by type in the documented path.', defaultValue: FIPE_DEFAULT_VEHICLE_TYPE },
  { name: 'query', flag: '--query <text>', description: 'Search code or name locally', exposure: 'primary' as const, group: 'query' as const, reason: 'Text search makes unpaginated Fipe lists usable in a terminal.' },
  { name: 'limit', flag: '--limit <count>', description: `Rows to show, default ${FIPE_DEFAULT_LIMIT}, cap ${FIPE_MAX_LIMIT}`, exposure: 'primary' as const, group: 'pagination' as const, reason: 'Bounds terminal output after local filtering.', valueType: 'integer' as const, defaultValue: String(FIPE_DEFAULT_LIMIT) },
]

const brandsOperation: PublicApiOperationDefinition<FipeListInput> = {
  id: 'fipe.brands',
  providerId: 'fipe',
  name: 'Brands',
  commandPath: ['fipe', 'brands'],
  rpcMethod: 'fipe.brands',
  description: 'List Brazilian Fipe vehicle brands by vehicle type.',
  category: 'vehicle',
  options: commonListOptions,
  paramsSchema: listParamsSchema,
  execute: params => listFipeBrands(params),
  normalizeParams: params => listParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeFipeListInput(params),
  resultKind: 'fipe.brands',
  defaultFormat: 'text',
}

const modelsOperation: PublicApiOperationDefinition<FipeModelsInput> = {
  id: 'fipe.models',
  providerId: 'fipe',
  name: 'Models',
  commandPath: ['fipe', 'models'],
  rpcMethod: 'fipe.models',
  description: 'List Fipe vehicle models for a brand.',
  category: 'vehicle',
  options: [
    { name: 'brandCode', flag: '--brand-code <code>', description: `Brand code, default ${FIPE_DEFAULT_BRAND_CODE} (VW)`, exposure: 'primary', group: 'query', reason: 'Brand code is the documented path parameter for model lookup.', defaultValue: FIPE_DEFAULT_BRAND_CODE },
    ...commonListOptions,
  ],
  paramsSchema: modelsParamsSchema,
  execute: params => listFipeModels(params),
  normalizeParams: params => modelsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeFipeModelsInput(params),
  resultKind: 'fipe.models',
  defaultFormat: 'text',
}

const yearsOperation: PublicApiOperationDefinition<FipeYearsInput> = {
  id: 'fipe.years',
  providerId: 'fipe',
  name: 'Years',
  commandPath: ['fipe', 'years'],
  rpcMethod: 'fipe.years',
  description: 'List Fipe model-year/fuel codes for a brand and model.',
  category: 'vehicle',
  options: [
    { name: 'brandCode', flag: '--brand-code <code>', description: `Brand code, default ${FIPE_DEFAULT_BRAND_CODE}`, exposure: 'primary', group: 'query', reason: 'Brand code scopes the documented model-year lookup.', defaultValue: FIPE_DEFAULT_BRAND_CODE },
    { name: 'modelCode', flag: '--model-code <code>', description: `Model code, default ${FIPE_DEFAULT_MODEL_CODE}`, exposure: 'primary', group: 'query', reason: 'Model code is the documented path parameter before year lookup.', defaultValue: FIPE_DEFAULT_MODEL_CODE },
    ...commonListOptions,
  ],
  paramsSchema: yearsParamsSchema,
  execute: params => listFipeYears(params),
  normalizeParams: params => yearsParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeFipeYearsInput(params),
  resultKind: 'fipe.years',
  defaultFormat: 'text',
}

const priceOperation: PublicApiOperationDefinition<FipePriceInput> = {
  id: 'fipe.price',
  providerId: 'fipe',
  name: 'Price',
  commandPath: ['fipe', 'price'],
  rpcMethod: 'fipe.price',
  description: 'Fetch a Brazilian Fipe reference price for one vehicle year.',
  category: 'vehicle',
  options: [
    { name: 'vehicleType', flag: '--vehicle-type <carros|motos|caminhoes>', description: `Vehicle type, default ${FIPE_DEFAULT_VEHICLE_TYPE}`, exposure: 'primary', group: 'filters', reason: 'Fipe separates price paths by vehicle type.', defaultValue: FIPE_DEFAULT_VEHICLE_TYPE },
    { name: 'brandCode', flag: '--brand-code <code>', description: `Brand code, default ${FIPE_DEFAULT_BRAND_CODE}`, exposure: 'primary', group: 'query', reason: 'Brand code is required by the documented price path.', defaultValue: FIPE_DEFAULT_BRAND_CODE },
    { name: 'modelCode', flag: '--model-code <code>', description: `Model code, default ${FIPE_DEFAULT_MODEL_CODE}`, exposure: 'primary', group: 'query', reason: 'Model code is required by the documented price path.', defaultValue: FIPE_DEFAULT_MODEL_CODE },
    { name: 'yearCode', flag: '--year-code <YYYY-fuel>', description: `Year/fuel code, default ${FIPE_DEFAULT_YEAR_CODE}`, exposure: 'primary', group: 'query', reason: 'Year/fuel code is the final documented price lookup key.', defaultValue: FIPE_DEFAULT_YEAR_CODE },
  ],
  paramsSchema: priceParamsSchema,
  execute: params => getFipePrice(params),
  normalizeParams: params => priceParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeFipePriceInput(params),
  resultKind: 'fipe.price',
  defaultFormat: 'text',
}

export const fipeProvider: PublicApiProviderModule = {
  manifest: {
    id: 'fipe',
    name: 'Brazilian Vehicles and Prices',
    description: 'Brazilian Fipe vehicle brand, model, year, and reference price lookups.',
    publicApisCategory: 'Vehicle',
    homepageUrl: 'https://deividfortuna.github.io/fipe/',
    docsUrl: 'https://deividfortuna.github.io/fipe/',
    auth: { mode: 'none', notes: ['Selected v1 endpoints require no API key, OAuth, cookies, account, or browser session.'] },
    tags: ['vehicle', 'brazil', 'prices', 'fipe', 'no-auth'],
    freePlanNotes: ['Live responses include anonymous x-ratelimit headers; use --persist and --offline to conserve daily quota.'],
  },
  operations: [brandsOperation, modelsOperation, yearsOperation, priceOperation],
  endpoints: [
    { id: 'fipe-brands', method: 'GET', urlPattern: 'https://parallelum.com.br/fipe/api/v1/{vehicleType}/marcas', category: 'public-api:vehicle', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://deividfortuna.github.io/fipe/'], consumedBy: ['fipe.brands'], description: 'Fipe vehicle brands by type.', notes: ['No API key/OAuth required.', 'Observed anonymous rate-limit headers.'] },
    { id: 'fipe-models', method: 'GET', urlPattern: 'https://parallelum.com.br/fipe/api/v1/{vehicleType}/marcas/{brandCode}/modelos', category: 'public-api:vehicle', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://deividfortuna.github.io/fipe/'], consumedBy: ['fipe.models'], description: 'Fipe vehicle models for one brand.', notes: ['No API key/OAuth required.'] },
    { id: 'fipe-years', method: 'GET', urlPattern: 'https://parallelum.com.br/fipe/api/v1/{vehicleType}/marcas/{brandCode}/modelos/{modelCode}/anos', category: 'public-api:vehicle', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://deividfortuna.github.io/fipe/'], consumedBy: ['fipe.years'], description: 'Fipe model-year/fuel codes for one model.', notes: ['No API key/OAuth required.'] },
    { id: 'fipe-price', method: 'GET', urlPattern: 'https://parallelum.com.br/fipe/api/v1/{vehicleType}/marcas/{brandCode}/modelos/{modelCode}/anos/{yearCode}', category: 'public-api:vehicle', evidenceStatus: 'confirmed', observedOn: '2026-05-05', sampleSources: ['https://deividfortuna.github.io/fipe/'], consumedBy: ['fipe.price'], description: 'Fipe reference price for one vehicle model year.', notes: ['No API key/OAuth required.'] },
  ],
}

export type { FipeListResult, FipePriceResult }
