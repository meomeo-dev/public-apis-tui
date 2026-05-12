import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export function findNearestPackageRoot(startDir: string, maxDepth = 8): string {
  let currentDir = startDir
  for (let depth = 0; depth < maxDepth; depth += 1) {
    if (existsSync(resolve(currentDir, 'package.json'))) {
      return currentDir
    }

    const parentDir = dirname(currentDir)
    if (parentDir === currentDir) {
      break
    }
    currentDir = parentDir
  }

  return process.cwd()
}
