import type { z } from 'zod'
import type { EndpointCatalogRecord } from '../infrastructure/network/endpointCatalog.js'

export type PublicApiAuthMode = 'none' | 'api-key' | 'oauth' | 'unknown'

export type PublicApiProviderManifest = {
  id: string
  name: string
  description: string
  publicApisCategory: string
  homepageUrl: string
  docsUrl: string
  auth: {
    mode: PublicApiAuthMode
    envVars?: string[] | undefined
    notes?: string[] | undefined
  }
  tags: string[]
  freePlanNotes?: string[] | undefined
}

export type PublicApiOperationOptionExposure = 'primary' | 'advanced' | 'hidden'

export type PublicApiOperationOptionGroup =
  | 'authentication'
  | 'query'
  | 'filters'
  | 'pagination'
  | 'content'
  | 'presentation'
  | 'transport'
  | 'debug'

export type PublicApiOperationOption = {
  name: string
  flag: string
  description: string
  exposure: PublicApiOperationOptionExposure
  group: PublicApiOperationOptionGroup
  reason: string
  valueType?: 'string' | 'integer' | 'boolean' | undefined
  valueLabel?: string | undefined
  defaultValue?: string | undefined
}

export const publicApiOperationOptionGroupLabels: Record<PublicApiOperationOptionGroup, string> = {
  authentication: 'Authentication Options:',
  query: 'Query Options:',
  filters: 'Filter Options:',
  pagination: 'Pagination Options:',
  content: 'Content Options:',
  presentation: 'Presentation Options:',
  transport: 'Transport Options:',
  debug: 'Debug Options:',
}

export function isPublicApiCliOptionVisible(option: PublicApiOperationOption): boolean {
  return option.exposure !== 'hidden'
}

export function listPublicApiCliOptions(options: PublicApiOperationOption[]): PublicApiOperationOption[] {
  return options.filter(isPublicApiCliOptionVisible)
}

export function getPublicApiOperationOptionGroupLabel(group: PublicApiOperationOptionGroup): string {
  return publicApiOperationOptionGroupLabels[group]
}

export type PublicApiExecutionMode = 'online' | 'offline'

export type PublicApiPersistenceInput = {
  mode?: PublicApiExecutionMode | undefined
  persist?: boolean | undefined
}

export type PublicApiOperationDefinition<TParams extends Record<string, unknown> = Record<string, unknown>> = {
  id: string
  providerId: string
  name: string
  commandPath: string[]
  rpcMethod: string
  description: string
  category: string
  options: PublicApiOperationOption[]
  paramsSchema: z.ZodType<TParams>
  execute(params: TParams): Promise<unknown>
  normalizeParams?(params: Record<string, unknown>): TParams
  createCacheKeyParams?(params: TParams): Record<string, unknown>
  redactResultForPersistence?(result: unknown): unknown
  resultKind: string
  defaultFormat: 'json' | 'text'
}

export type PublicApiProviderModule = {
  manifest: PublicApiProviderManifest
  operations: PublicApiOperationDefinition[]
  endpoints: EndpointCatalogRecord[]
}
