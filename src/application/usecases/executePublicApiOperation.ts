import { readPublicApiProviderConfig } from '../../infrastructure/persistence/publicApiConfig.js'
import {
  createQueryKey,
  createQuerySummary,
  ensurePublicApiStore,
  readOperationResult,
  saveOperationResult,
} from '../../infrastructure/persistence/publicApiStore.js'
import type { PublicApiExecutionMode, PublicApiOperationDefinition } from '../../providers/providerTypes.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'

export type ExecutePublicApiOperationInput = {
  operation: PublicApiOperationDefinition
  params: Record<string, unknown>
  mode?: PublicApiExecutionMode | undefined
  persist?: boolean | undefined
}

export async function executePublicApiOperation(input: ExecutePublicApiOperationInput): Promise<unknown> {
  const operationParams = input.operation.normalizeParams?.(input.params) ?? input.operation.paramsSchema.parse(input.params)
  const config = await readPublicApiProviderConfig(input.operation.providerId)
  const mode = input.mode ?? config.persistence.defaultMode
  const persist = input.persist ?? config.persistence.enabled
  const cacheKeyParams = input.operation.createCacheKeyParams?.(operationParams) ?? operationParams
  const queryKey = createQueryKey(cacheKeyParams)

  if (mode === 'offline') {
    const database = await ensurePublicApiStore(input.operation.providerId)
    try {
      const cached = readOperationResult(database, {
        providerId: input.operation.providerId,
        operationId: input.operation.id,
        queryKey,
      })
      if (cached === undefined) {
        throw new RuntimeFailure('OPEN_API_FAILED', `No offline cache for ${input.operation.id}.`, {
          providerId: input.operation.providerId,
          operationId: input.operation.id,
          mode,
          recovery: `Run ${input.operation.commandPath.join(' ')} --online --persist with the same query first.`,
        })
      }

      return markResultMode(JSON.parse(cached.resultJson), {
        mode,
        persisted: true,
        cachedAt: cached.fetchedAt,
      })
    } finally {
      database.close()
    }
  }

  const result = await input.operation.execute(operationParams)
  if (!persist) {
    return markResultMode(result, { mode, persisted: false })
  }

  const database = await ensurePublicApiStore(input.operation.providerId)
  const fetchedAt = new Date().toISOString()
  const persistedResult = input.operation.redactResultForPersistence?.(result) ?? result
  try {
    saveOperationResult(database, {
      providerId: input.operation.providerId,
      operationId: input.operation.id,
      queryKey,
      querySummary: createQuerySummary(cacheKeyParams),
      fetchedAt,
      resultJson: JSON.stringify(persistedResult),
    })
  } finally {
    database.close()
  }

  return markResultMode(result, {
    mode,
    persisted: true,
    cachedAt: fetchedAt,
  })
}

function markResultMode(
  result: unknown,
  meta: { mode: PublicApiExecutionMode; persisted: boolean; cachedAt?: string | undefined },
): unknown {
  if (result === null || typeof result !== 'object' || Array.isArray(result)) {
    return result
  }

  return {
    ...result,
    storage: {
      mode: meta.mode,
      persisted: meta.persisted,
      ...(meta.cachedAt !== undefined ? { cachedAt: meta.cachedAt } : {}),
    },
  }
}
