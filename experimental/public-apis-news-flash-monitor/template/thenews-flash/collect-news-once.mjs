import { access, appendFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { clearTimeout, setTimeout } from 'node:timers'
import { providerConfig } from './provider-config.mjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const defaultRepo = resolve(scriptDir, '../../../..')
const repoEnv = process.env.PUBLIC_APIS_CLI_REPO ?? process.env.PUBLIC_APIS_TUI_REPO
const repo = repoEnv ? resolve(repoEnv) : defaultRepo
const outDir = resolve(process.argv[2] ?? join(process.cwd(), 'data'))
const timeoutMs = Number(process.env.COLLECT_TIMEOUT_MS ?? 45_000)
await mkdir(outDir, { recursive: true })

function publicApisArgs() {
  return [
    'apis', 'run', providerConfig.operation,
    '--online', '--no-persist', '--format', 'json',
    '--', ...providerConfig.cliOptions(process.env),
  ]
}

async function canRead(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function createPublicApisCommand() {
  if (process.env.PUBLIC_APIS_CLI_BIN) {
    return {
      command: process.env.PUBLIC_APIS_CLI_BIN,
      args: publicApisArgs(),
    }
  }
  const bundledCli = resolve(repo, 'dist/src/cli.js')
  if (await canRead(bundledCli)) {
    return {
      command: process.execPath,
      args: [bundledCli, ...publicApisArgs()],
    }
  }
  return {
    command: 'npm',
    args: ['run', '--silent', 'dev', '--', ...publicApisArgs()],
  }
}

async function runPublicApis() {
  const { command, args } = await createPublicApisCommand()
  return await new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: repo,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += String(chunk) })
    child.stderr.on('data', chunk => { stderr += String(chunk) })
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(
        `public-apis timed out after ${timeoutMs}ms using ${command}`,
      ))
    }, timeoutMs)
    child.on('error', error => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', code => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(new Error(
          `public-apis exited ${code} using ${command}\n${stderr}`,
        ))
        return
      }
      resolvePromise(stdout)
    })
  })
}

const collectedAt = new Date().toISOString()
const record = {
  collected_at: collectedAt,
  kind: 'news-cycle-poll',
  provider: providerConfig.id,
  operation: providerConfig.operation,
  query: providerConfig.query(process.env),
  ok: false,
  item_count: 0,
  items: [],
  pagination: null,
  error: null,
}

try {
  const stdout = await runPublicApis()
  const result = JSON.parse(stdout)
  const items = providerConfig.normalize(result)
  record.ok = true
  record.item_count = items.length
  record.items = items
  record.pagination = providerConfig.pagination(result)
} catch (error) {
  record.error = error instanceof Error ? error.message : String(error)
}

const fallbackRunId = collectedAt.replace(/[^0-9TZ]/gu, '')
const runId = String(process.env.NEWS_FLASH_RUN_ID ?? fallbackRunId)
  .replace(/[^A-Za-z0-9_.-]/gu, '_')
const safeOperation = providerConfig.operation.replace(/[^a-z0-9_.-]/gi, '_')
const jsonlPath = join(outDir, `${safeOperation}-flash-${runId}.jsonl`)
await appendFile(jsonlPath, `${JSON.stringify(record)}\n`)
await writeFile(
  join(outDir, 'latest-news.json'),
  JSON.stringify(record, null, 2) + '\n',
)
console.log(JSON.stringify({ jsonlPath, record }, null, 2))
