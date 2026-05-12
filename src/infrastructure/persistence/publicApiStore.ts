import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { DatabaseSync } from 'node:sqlite'
import { resolvePublicApiProviderStoragePaths } from '../../shared/runtime/appPaths.js'

export const PUBLIC_API_STORE_SCHEMA_VERSION = 2

export type PersistedOperationResult = {
  providerId: string
  operationId: string
  queryKey: string
  querySummary?: string | undefined
  fetchedAt: string
  resultJson: string
}

export type OperationResultSummary = {
  providerId: string
  operationId: string
  queryKey: string
  querySummary?: string | undefined
  fetchedAt: string
  resultBytes: number
}

export async function ensurePublicApiStore(providerId: string): Promise<DatabaseSync> {
  const paths = resolvePublicApiProviderStoragePaths(providerId)
  await mkdir(dirname(paths.databaseFile), { recursive: true, mode: 0o700 })
  const { DatabaseSync } = await import('node:sqlite')
  const database = new DatabaseSync(paths.databaseFile)
  migratePublicApiStore(database)
  return database
}

export function migratePublicApiStore(database: DatabaseSync): void {
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS operation_results (
      provider_id TEXT NOT NULL,
      operation_id TEXT NOT NULL,
      query_key TEXT NOT NULL,
      query_summary TEXT,
      fetched_at TEXT NOT NULL,
      result_json TEXT NOT NULL,
      PRIMARY KEY (provider_id, operation_id, query_key)
    );
    CREATE INDEX IF NOT EXISTS operation_results_provider_operation_idx
      ON operation_results(provider_id, operation_id, fetched_at DESC);
  `)
  applyMigration(database, 1, () => undefined)
  applyMigration(database, 2, () => {
    const columns = database.prepare('PRAGMA table_info(operation_results)').all() as Array<{ name: string }>
    if (!columns.some(column => column.name === 'query_summary')) {
      database.exec('ALTER TABLE operation_results ADD COLUMN query_summary TEXT')
    }
  })
}

export function saveOperationResult(
  database: DatabaseSync,
  input: PersistedOperationResult,
): void {
  database.prepare(`
    INSERT INTO operation_results (provider_id, operation_id, query_key, query_summary, fetched_at, result_json)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider_id, operation_id, query_key)
    DO UPDATE SET query_summary = excluded.query_summary, fetched_at = excluded.fetched_at, result_json = excluded.result_json
  `).run(input.providerId, input.operationId, input.queryKey, input.querySummary ?? null, input.fetchedAt, input.resultJson)
}

export function readOperationResult(
  database: DatabaseSync,
  input: { providerId: string; operationId: string; queryKey: string },
): PersistedOperationResult | undefined {
  const row = database.prepare(`
    SELECT provider_id, operation_id, query_key, query_summary, fetched_at, result_json
    FROM operation_results
    WHERE provider_id = ? AND operation_id = ? AND query_key = ?
  `).get(input.providerId, input.operationId, input.queryKey) as
    | {
      provider_id: string
      operation_id: string
      query_key: string
      query_summary: string | null
      fetched_at: string
      result_json: string
    }
    | undefined

  return row === undefined
    ? undefined
    : {
      providerId: row.provider_id,
      operationId: row.operation_id,
      queryKey: row.query_key,
      ...(row.query_summary !== null ? { querySummary: row.query_summary } : {}),
      fetchedAt: row.fetched_at,
      resultJson: row.result_json,
    }
}

export function listOperationResults(
  database: DatabaseSync,
  input: { providerId: string; operationId?: string | undefined; limit?: number | undefined },
): OperationResultSummary[] {
  const limit = normalizeListLimit(input.limit)
  const rows = input.operationId === undefined
    ? database.prepare(`
      SELECT provider_id, operation_id, query_key, query_summary, fetched_at, length(result_json) AS result_bytes
      FROM operation_results
      WHERE provider_id = ?
      ORDER BY fetched_at DESC
      LIMIT ?
    `).all(input.providerId, limit)
    : database.prepare(`
      SELECT provider_id, operation_id, query_key, query_summary, fetched_at, length(result_json) AS result_bytes
      FROM operation_results
      WHERE provider_id = ? AND operation_id = ?
      ORDER BY fetched_at DESC
      LIMIT ?
    `).all(input.providerId, input.operationId, limit)

  return (rows as Array<{
    provider_id: string
    operation_id: string
    query_key: string
    query_summary: string | null
    fetched_at: string
    result_bytes: number
  }>).map(row => ({
    providerId: row.provider_id,
    operationId: row.operation_id,
    queryKey: row.query_key,
    ...(row.query_summary !== null ? { querySummary: row.query_summary } : {}),
    fetchedAt: row.fetched_at,
    resultBytes: row.result_bytes,
  }))
}

export function clearOperationResults(
  database: DatabaseSync,
  input: { providerId: string; operationId?: string | undefined },
): number {
  const result = input.operationId === undefined
    ? database.prepare('DELETE FROM operation_results WHERE provider_id = ?').run(input.providerId)
    : database.prepare('DELETE FROM operation_results WHERE provider_id = ? AND operation_id = ?').run(input.providerId, input.operationId)
  return Number(result.changes)
}

export function createQueryKey(value: unknown): string {
  return JSON.stringify(sortJsonValue(redactSecretFields(value)))
}

export function createQuerySummary(value: unknown): string {
  const sorted = sortJsonValue(redactSecretFields(value))
  const serialized = JSON.stringify(sorted)
  return serialized.length > 240 ? `${serialized.slice(0, 239)}…` : serialized
}

function applyMigration(database: DatabaseSync, version: number, run: () => void): void {
  const existing = database.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(version)
  if (existing !== undefined) {
    return
  }

  run()
  database.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(version, new Date().toISOString())
}

function normalizeListLimit(value: number | undefined): number {
  if (value === undefined) {
    return 50
  }
  if (!Number.isInteger(value) || value < 1 || value > 500) {
    return 50
  }
  return value
}

function redactSecretFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSecretFields)
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        isSecretField(key) ? '[redacted]' : redactSecretFields(entryValue),
      ]),
    )
  }
  return value
}

function isSecretField(key: string): boolean {
  return /(?:api[-_]?key|access[-_]?key|token|secret|password|authorization|cookie)/iu.test(key)
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue)
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, sortJsonValue(entryValue)]),
    )
  }
  return value
}
