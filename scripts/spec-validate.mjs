import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import YAML from 'yaml'

const specsRoot = resolve('specs')
const files = listYamlFiles(specsRoot)

if (files.length === 0) {
  throw new Error('No spec files found under specs/.')
}

const failures = []
for (const file of files) {
  try {
    const document = YAML.parse(readFileSync(file, 'utf8'))
    if (!document || typeof document !== 'object') {
      failures.push(`${file}: expected YAML object`)
      continue
    }
    for (const field of ['id', 'version', 'status']) {
      if (!(field in document)) {
        failures.push(`${file}: missing ${field}`)
      }
    }
  } catch (error) {
    failures.push(`${file}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`spec:validate passed for ${files.length} spec file(s).`)

function listYamlFiles(dir) {
  const result = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stats = statSync(path)
    if (stats.isDirectory()) {
      result.push(...listYamlFiles(path))
    } else if (/\.ya?ml$/u.test(entry)) {
      result.push(path)
    }
  }
  return result
}
