import { readFile, writeFile } from 'node:fs/promises'
import {
  exportBrowserSession,
  importBrowserSession,
  withBrowserPage,
  type BrowserRuntimeOptions,
  type BrowserSessionSnapshot,
} from '../../infrastructure/browser/browserRuntime.js'

export type ExportSessionResult = {
  outputPath: string
  cookies: number
  origins: number
}

export type ImportSessionResult = {
  inputPath: string
  cookies: number
  origins: number
}

export async function exportSessionState(
  browserOptions: BrowserRuntimeOptions,
  outputPath: string,
): Promise<ExportSessionResult> {
  const snapshot = await withBrowserPage(browserOptions, async lease => exportBrowserSession(lease.page))
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
  return {
    outputPath,
    cookies: snapshot.cookies.length,
    origins: snapshot.origins.length,
  }
}

export async function importSessionState(
  browserOptions: BrowserRuntimeOptions,
  inputPath: string,
): Promise<ImportSessionResult> {
  const snapshot = parseSessionSnapshot(await readFile(inputPath, 'utf8'))
  await withBrowserPage(browserOptions, async lease => {
    await importBrowserSession(lease.page, snapshot)
  })
  return {
    inputPath,
    cookies: snapshot.cookies.length,
    origins: snapshot.origins.length,
  }
}

function parseSessionSnapshot(value: string): BrowserSessionSnapshot {
  const parsed = JSON.parse(value) as BrowserSessionSnapshot
  return {
    cookies: parsed.cookies ?? [],
    origins: parsed.origins ?? [],
  }
}
