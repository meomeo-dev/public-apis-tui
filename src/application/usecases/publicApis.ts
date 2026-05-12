import {
  defaultPublicApiRegistry,
  listPublicApiEndpoints,
  type PublicApiRegistry,
} from '../../providers/providerRegistry.js'
import type {
  PublicApiOperationOptionExposure,
  PublicApiOperationOptionGroup,
  PublicApiProviderManifest,
} from '../../providers/providerTypes.js'
import { listPublicApiCliOptions } from '../../providers/providerTypes.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type PublicApiOperationOptionSummary = {
  name: string
  flag: string
  description: string
  exposure: PublicApiOperationOptionExposure
  group: PublicApiOperationOptionGroup
  reason: string
  valueType: 'string' | 'integer' | 'boolean'
  defaultValue?: string | undefined
}

export type PublicApiOperationSummary = {
  id: string
  providerId: string
  providerName: string
  command: string
  rpcMethod: string
  description: string
  category: string
  resultKind: string
  defaultFormat: 'json' | 'text'
  cli: {
    optionCount: number
    exposedOptionCount: number
    hiddenOptionCount: number
    options: PublicApiOperationOptionSummary[]
  }
}

export type PublicApisListResult = {
  kind: 'publicApis.list'
  providerCount: number
  operationCount: number
  providers: PublicApiProviderManifest[]
  operations: PublicApiOperationSummary[]
}

export type PublicApisInfoResult = {
  kind: 'publicApis.info'
  provider: PublicApiProviderManifest
  operations: PublicApiOperationSummary[]
  endpoints: ReturnType<typeof listPublicApiEndpoints>
}

export function listPublicApis(registry: PublicApiRegistry = defaultPublicApiRegistry): PublicApisListResult {
  return {
    kind: 'publicApis.list',
    providerCount: registry.providers.length,
    operationCount: registry.operations.length,
    providers: registry.manifests,
    operations: summarizeOperations(registry),
  }
}

export function describePublicApiProvider(
  providerIdOrOperationId: string,
  registry: PublicApiRegistry = defaultPublicApiRegistry,
): PublicApisInfoResult {
  const operation = registry.operations.find(entry => entry.id === providerIdOrOperationId)
  const commandProviderOperation = operation ?? registry.operations.find(entry => entry.commandPath[0] === providerIdOrOperationId)
  const providerId = commandProviderOperation?.providerId ?? providerIdOrOperationId
  const resolvedProvider = registry.providers.find(entry => entry.manifest.id === providerId)
  if (resolvedProvider === undefined) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Unknown public API provider or operation: ${providerIdOrOperationId}`, {
      providerOrOperation: providerIdOrOperationId,
      supportedProviders: registry.manifests.map(entry => entry.id),
      supportedOperations: registry.operations.map(entry => entry.id),
    })
  }

  return {
    kind: 'publicApis.info',
    provider: resolvedProvider.manifest,
    operations: summarizeOperations(registry).filter(entry => entry.providerId === resolvedProvider.manifest.id),
    endpoints: resolvedProvider.endpoints,
  }
}

function summarizeOperations(registry: PublicApiRegistry): PublicApiOperationSummary[] {
  return registry.operations.map(operation => {
    const provider = registry.manifests.find(entry => entry.id === operation.providerId)
    return {
      id: operation.id,
      providerId: operation.providerId,
      providerName: provider?.name ?? operation.providerId,
      command: operation.commandPath.join(' '),
      rpcMethod: operation.rpcMethod,
      description: operation.description,
      category: operation.category,
      resultKind: operation.resultKind,
      defaultFormat: operation.defaultFormat,
      cli: {
        optionCount: operation.options.length,
        exposedOptionCount: listPublicApiCliOptions(operation.options).length,
        hiddenOptionCount: operation.options.filter(option => option.exposure === 'hidden').length,
        options: listPublicApiCliOptions(operation.options).map(option => ({
          name: option.name,
          flag: option.flag,
          description: option.description,
          exposure: option.exposure,
          group: option.group,
          reason: option.reason,
          valueType: option.valueType ?? 'string',
          ...(option.defaultValue !== undefined ? { defaultValue: option.defaultValue } : {}),
        })),
      },
    }
  })
}
