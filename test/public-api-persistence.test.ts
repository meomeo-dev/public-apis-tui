import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { executePublicApiOperation } from '../src/application/usecases/executePublicApiOperation.js'
import {
  showPublicApiProviderConfig,
  writePublicApiProviderConfig,
} from '../src/infrastructure/persistence/publicApiConfig.js'
import { clearPublicApiCache, listPublicApiCache } from '../src/application/usecases/publicApiCache.js'
import { ensurePublicApiStore, readOperationResult } from '../src/infrastructure/persistence/publicApiStore.js'
import { defaultPublicApiRegistry } from '../src/providers/providerRegistry.js'

test('public API provider config persists under unified provider directory', async () => {
  await withPublicApisHome(async root => {
    const result = await writePublicApiProviderConfig({
      providerId: 'mediastack',
      persist: true,
      defaultMode: 'offline',
      secrets: { MEDIASTACK_API_KEY: 'test-secret' },
    })
    const shown = await showPublicApiProviderConfig('mediastack')

    assert.equal(result.config.persistence.enabled, true)
    assert.equal(shown.config.persistence.defaultMode, 'offline')
    assert.equal(result.config.secrets?.MEDIASTACK_API_KEY, '<redacted>')
    assert.equal(shown.config.secrets?.MEDIASTACK_API_KEY, '<redacted>')
    const rawConfig = JSON.parse(readFileSync(join(root, 'mediastack', 'config.json'), 'utf8')) as {
      secrets?: Record<string, string>
    }
    assert.equal(rawConfig.secrets?.MEDIASTACK_API_KEY, 'test-secret')
    assert.equal(shown.configFile, join(root, 'mediastack', 'config.json'))
    assert.equal(shown.databaseFile, join(root, 'mediastack', 'cache.sqlite'))
  })
})

test('public API provider config can remove local secrets', async () => {
  await withPublicApisHome(async () => {
    await writePublicApiProviderConfig({
      providerId: 'mediastack',
      secrets: { MEDIASTACK_API_KEY: 'test-secret' },
    })
    const result = await writePublicApiProviderConfig({
      providerId: 'mediastack',
      secrets: { MEDIASTACK_API_KEY: undefined },
    })

    assert.equal(result.config.secrets?.MEDIASTACK_API_KEY, undefined)
  })
})

test('public API store creates schema migrations table', async () => {
  await withPublicApisHome(async () => {
    const database = await ensurePublicApiStore('mediastack')
    try {
      const row = database.prepare('SELECT version FROM schema_migrations WHERE version = 1').get() as
        | { version: number }
        | undefined
      assert.equal(row?.version, 1)
    } finally {
      database.close()
    }
  })
})

test('public API operation can persist online results and replay offline', async () => {
  await withPublicApisHome(async () => {
    const operation = getMediastackNewsOperation()
    assert.ok(operation)
    let calls = 0
    const testOperation = {
      ...operation,
      execute: async () => {
        calls += 1
        return {
          kind: 'test.operation',
          payload: 'from online',
        }
      },
      resultKind: 'test.operation',
    }

    const online = await executePublicApiOperation({
      operation: testOperation,
      params: { keywords: 'cache-test', limit: 100 },
      mode: 'online',
      persist: true,
    }) as Record<string, unknown>

    const offline = await executePublicApiOperation({
      operation: testOperation,
      params: { limit: 100, keywords: 'cache-test' },
      mode: 'offline',
    }) as Record<string, unknown>

    assert.equal(calls, 1)
    assert.equal(online.storage instanceof Object, true)
    assert.equal((online.storage as Record<string, unknown>).persisted, true)
    assert.equal(offline.payload, 'from online')
    assert.equal((offline.storage as Record<string, unknown>).mode, 'offline')
  })
})

test('public API cache keys exclude provider-declared secret parameters', async () => {
  await withPublicApisHome(async () => {
    const operation = getMediastackNewsOperation()
    assert.ok(operation)
    const testOperation = {
      ...operation,
      execute: async () => ({
        kind: 'test.operation',
        payload: 'from online',
      }),
      resultKind: 'test.operation',
    }

    await executePublicApiOperation({
      operation: testOperation,
      params: { apiKey: 'secret-key', keywords: 'cache-test', limit: 100 },
      mode: 'online',
      persist: true,
    })

    const database = await ensurePublicApiStore('mediastack')
    try {
      const cached = readOperationResult(database, {
        providerId: 'mediastack',
        operationId: 'mediastack.news',
        queryKey: '{"keywords":"cache-test","limit":100}',
      })
      assert.ok(cached)
      assert.equal(cached.queryKey.includes('secret-key'), false)
      assert.equal(cached.querySummary?.includes('secret-key'), false)
    } finally {
      database.close()
    }
  })
})

test('public API cache can list and clear entries', async () => {
  await withPublicApisHome(async () => {
    const operation = getMediastackNewsOperation()
    assert.ok(operation)
    const testOperation = {
      ...operation,
      execute: async () => ({
        kind: 'test.operation',
        payload: 'from online',
      }),
      resultKind: 'test.operation',
    }

    await executePublicApiOperation({
      operation: testOperation,
      params: { keywords: 'cache-list', limit: 100 },
      mode: 'online',
      persist: true,
    })

    const listed = await listPublicApiCache({ providerId: 'mediastack', operationId: 'mediastack.news' })
    assert.equal(listed.entries.length, 1)
    assert.equal(listed.entries[0]?.querySummary, '{"keywords":"cache-list","limit":100}')

    const cleared = await clearPublicApiCache({ providerId: 'mediastack', operationId: 'mediastack.news' })
    assert.equal(cleared.cleared, 1)

    const relisted = await listPublicApiCache({ providerId: 'mediastack', operationId: 'mediastack.news' })
    assert.equal(relisted.entries.length, 0)
  })
})

async function withPublicApisHome(run: (root: string) => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'public-apis-store-'))
  const previousHome = process.env.PUBLIC_APIS_HOME_DIR
  try {
    process.env.PUBLIC_APIS_HOME_DIR = root
    await run(root)
  } finally {
    if (previousHome === undefined) {
      delete process.env.PUBLIC_APIS_HOME_DIR
    } else {
      process.env.PUBLIC_APIS_HOME_DIR = previousHome
    }
    rmSync(root, { recursive: true, force: true })
  }
}

function getMediastackNewsOperation() {
  const operation = defaultPublicApiRegistry.operations.find(entry => entry.id === 'mediastack.news')
  assert.ok(operation)
  return operation
}
