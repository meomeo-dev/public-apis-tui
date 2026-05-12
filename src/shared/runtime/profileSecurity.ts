import { chmod, mkdir, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

export const OWNER_ONLY_DIRECTORY_MODE = 0o700

export type DirectoryHardeningResult = {
  path: string
  mode: number | undefined
  changed: boolean
  supported: boolean
}

export async function ensureOwnerOnlyDirectory(path: string): Promise<DirectoryHardeningResult> {
  await mkdir(path, { recursive: true, mode: OWNER_ONLY_DIRECTORY_MODE })

  if (process.platform === 'win32') {
    return {
      path,
      mode: undefined,
      changed: false,
      supported: false,
    }
  }

  const before = await stat(path)
  const beforeMode = before.mode & 0o777
  if (beforeMode !== OWNER_ONLY_DIRECTORY_MODE) {
    await chmod(path, OWNER_ONLY_DIRECTORY_MODE)
  }

  const after = await stat(path)
  return {
    path,
    mode: after.mode & 0o777,
    changed: beforeMode !== OWNER_ONLY_DIRECTORY_MODE,
    supported: true,
  }
}

export async function ensureOwnerOnlyDirectories(paths: string[]): Promise<DirectoryHardeningResult[]> {
  const results: DirectoryHardeningResult[] = []
  for (const path of paths) {
    results.push(await ensureOwnerOnlyDirectory(path))
  }
  return results
}

export async function hardenDirectoryTree(path: string): Promise<DirectoryHardeningResult[]> {
  const results: DirectoryHardeningResult[] = []
  await hardenDirectoryTreeInto(path, results)
  return results
}

async function hardenDirectoryTreeInto(path: string, results: DirectoryHardeningResult[]): Promise<void> {
  const info = await stat(path)
  if (!info.isDirectory()) {
    return
  }

  results.push(await ensureOwnerOnlyDirectory(path))
  const entries = await readdir(path, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await hardenDirectoryTreeInto(join(path, entry.name), results)
    }
  }
}
