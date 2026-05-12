import {
  clearOperationResults,
  ensurePublicApiStore,
  listOperationResults,
  type OperationResultSummary,
} from '../../infrastructure/persistence/publicApiStore.js'
import { defaultPublicApiRegistry, getPublicApiOperation, type PublicApiRegistry } from '../../providers/providerRegistry.js'

export type PublicApiCacheListInput = {
  providerId: string
  operationId?: string | undefined
  limit?: number | undefined
}

export type PublicApiCacheListResult = {
  kind: 'publicApis.cache.list'
  providerId: string
  operationId?: string | undefined
  limit: number
  entries: OperationResultSummary[]
}

export type PublicApiCacheClearInput = {
  providerId: string
  operationId?: string | undefined
}

export type PublicApiCacheClearResult = {
  kind: 'publicApis.cache.clear'
  providerId: string
  operationId?: string | undefined
  cleared: number
}

export async function listPublicApiCache(input: PublicApiCacheListInput): Promise<PublicApiCacheListResult> {
  const limit = normalizeLimit(input.limit)
  const database = await ensurePublicApiStore(input.providerId)
  try {
    return {
      kind: 'publicApis.cache.list',
      providerId: input.providerId,
      ...(input.operationId !== undefined ? { operationId: input.operationId } : {}),
      limit,
      entries: listOperationResults(database, {
        providerId: input.providerId,
        operationId: input.operationId,
        limit,
      }),
    }
  } finally {
    database.close()
  }
}

export async function clearPublicApiCache(input: PublicApiCacheClearInput): Promise<PublicApiCacheClearResult> {
  const database = await ensurePublicApiStore(input.providerId)
  try {
    return {
      kind: 'publicApis.cache.clear',
      providerId: input.providerId,
      ...(input.operationId !== undefined ? { operationId: input.operationId } : {}),
      cleared: clearOperationResults(database, input),
    }
  } finally {
    database.close()
  }
}

export function resolveCacheTarget(
  providerOrOperation: string,
  registry: PublicApiRegistry = defaultPublicApiRegistry,
): { providerId: string; operationId?: string | undefined } {
  const operation = registry.operations.find(entry => entry.id === providerOrOperation || entry.rpcMethod === providerOrOperation)
  if (operation !== undefined) {
    return {
      providerId: operation.providerId,
      operationId: operation.id,
    }
  }

  getPublicApiOperationOrProvider(providerOrOperation, registry)
  return { providerId: providerOrOperation }
}

function getPublicApiOperationOrProvider(providerOrOperation: string, registry: PublicApiRegistry): void {
  if (registry.manifests.some(provider => provider.id === providerOrOperation)) {
    return
  }

  getPublicApiOperation(registry, providerOrOperation)
}

function normalizeLimit(value: number | undefined): number {
  if (value === undefined) {
    return 50
  }
  if (!Number.isInteger(value) || value < 1 || value > 500) {
    return 50
  }
  return value
}
