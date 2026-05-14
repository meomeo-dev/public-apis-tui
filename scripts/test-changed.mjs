import { existsSync } from 'node:fs'
import { isAbsolute, relative } from 'node:path'
import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const separatorIndex = args.indexOf('--')
const targetArgs = separatorIndex === -1 ? args : args.slice(0, separatorIndex)
const passthrough = separatorIndex === -1 ? [] : args.slice(separatorIndex + 1)
const explicitTargets = targetArgs.filter(arg => !arg.startsWith('-'))
const changedFiles = explicitTargets.length > 0
  ? explicitTargets
  : readChangedFiles()
const plan = buildTestPlan(changedFiles)

if (plan.steps.length === 0) {
  console.log('test:changed found no mapped test targets.')
  console.log('Run npm run test:all before merging broad or risky changes.')
  process.exit(0)
}

console.log('test:changed targets:')
for (const step of plan.steps) console.log(`- ${step.label}`)

for (const step of plan.steps) {
  const result = spawnSync(step.command, [
    ...step.args,
    ...(step.acceptsNodeFlags === true ? passthrough : []),
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
    stdio: 'inherit',
    shell: false,
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function readChangedFiles() {
  const base = readGit(['merge-base', 'HEAD', 'main']).trim() || 'HEAD'
  const outputs = [
    readGit(['diff', '--name-only', '--diff-filter=ACMR', base, '--']),
    readGit(['diff', '--name-only', '--diff-filter=ACMR', '--']),
    readGit(['diff', '--name-only', '--diff-filter=ACMR', '--cached', '--']),
  ]
  return [...new Set(outputs.flatMap(output => {
    return output.split(/\r?\n/u).map(line => line.trim()).filter(Boolean)
  }))]
}

function readGit(args) {
  const result = spawnSync('git', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return result.status === 0 ? result.stdout : ''
}

function buildTestPlan(files) {
  const normalizedFiles = files.map(normalizePath)
  const hasNewsFlashChange = normalizedFiles.some(isNewsFlashFile)
  const nodeTests = new Set()
  const nodePatternTests = new Map()
  const templateDirs = new Set()
  let needsTypecheck = false
  let needsSpecValidate = false
  let needsPackageVerify = false
  let needsContract = false

  for (const file of normalizedFiles) {
    if (file.endsWith('.ts') || file.endsWith('.d.ts')) needsTypecheck = true
    if (file.startsWith('specs/') && /\.ya?ml$/u.test(file)) {
      needsSpecValidate = true
    }
    if (isPackageSurface(file)) needsPackageVerify = true
    if (file.startsWith('test/contract/') && file.endsWith('.test.ts')) {
      needsContract = true
      continue
    }
    if (file === 'test/cli-program.test.ts' && hasNewsFlashChange) {
      addNodePatternTest(nodePatternTests, file, 'experimental news flash')
      continue
    }
    if (file === 'test/cli-output.test.ts' && hasNewsFlashChange) {
      addNodePatternTest(nodePatternTests, file, 'news flash')
      continue
    }
    if (file.startsWith('test/') && file.endsWith('.test.ts')) {
      nodeTests.add(file)
      continue
    }
    addMappedNodeTests(file, nodeTests, nodePatternTests, hasNewsFlashChange)
    addMappedTemplateTests(file, templateDirs)
  }

  const steps = []
  if (needsTypecheck) steps.push({
    label: 'typecheck',
    command: 'npm',
    args: ['run', 'typecheck'],
  })
  if (needsSpecValidate) steps.push({
    label: 'spec validation',
    command: 'npm',
    args: ['run', 'spec:validate'],
  })
  if (nodeTests.size > 0) steps.push({
    label: `node tests (${nodeTests.size})`,
    command: 'node',
    args: ['--import', 'tsx', '--test', ...[...nodeTests].sort()],
    acceptsNodeFlags: true,
  })
  for (const { file, pattern } of [...nodePatternTests.values()]) {
    steps.push({
      label: `node test slice (${file}: ${pattern})`,
      command: 'node',
      args: ['--import', 'tsx', '--test', '--test-name-pattern', pattern, file],
      acceptsNodeFlags: true,
    })
  }
  if (needsContract) steps.push({
    label: 'contract tests',
    command: 'npm',
    args: ['run', 'test:contract'],
  })
  for (const dir of [...templateDirs].sort()) {
    steps.push({
      label: `template tests (${dir})`,
      command: 'node',
      args: ['--test', `${dir}/test/*.test.mjs`],
      acceptsNodeFlags: true,
    })
  }
  if (needsPackageVerify) steps.push({
    label: 'package verify',
    command: 'npm',
    args: ['run', 'package:verify'],
  })

  return { steps }
}

function addMappedNodeTests(file, nodeTests, nodePatternTests, hasNewsFlashChange) {
  const mappings = mappedTestsForFile(file, hasNewsFlashChange)
  for (const mapping of mappings) {
    if (typeof mapping !== 'string') {
      if (existsSync(mapping.file)) {
        addNodePatternTest(nodePatternTests, mapping.file, mapping.pattern)
      }
      continue
    }
    const testFile = mapping
    if (existsSync(testFile)) nodeTests.add(testFile)
  }
}

function addNodePatternTest(nodePatternTests, file, pattern) {
  nodePatternTests.set(`${file}\0${pattern}`, { file, pattern })
}

function mappedTestsForFile(file, hasNewsFlashChange) {
  if (file === 'src/interfaces/cli/program.ts') {
    if (hasNewsFlashChange) {
      return [{ file: 'test/cli-program.test.ts', pattern: 'experimental news flash' }]
    }
    return ['test/cli-program.test.ts']
  }
  if (file === 'src/interfaces/cli/output.ts') {
    if (hasNewsFlashChange) {
      return [{ file: 'test/cli-output.test.ts', pattern: 'news flash' }]
    }
    return ['test/cli-output.test.ts']
  }
  if (file === 'src/interfaces/cli/options.ts') {
    return ['test/cli-options.test.ts', 'test/cli-program.test.ts']
  }
  if (file === 'src/interfaces/rpc/jsonRpcServer.ts') {
    return ['test/contract/json-rpc.test.ts']
  }
  if (file === 'src/application/usecases/experimentalNewsFlash.ts') {
    return [
      'test/experimental-news-flash.test.ts',
      { file: 'test/cli-program.test.ts', pattern: 'experimental news flash' },
      { file: 'test/cli-output.test.ts', pattern: 'news flash' },
    ]
  }
  const sourceName = sourceBaseName(file)
  if (sourceName === undefined) return []
  return [
    `test/${toKebab(sourceName)}.test.ts`,
    `test/${toKebab(sourceName)}-client.test.ts`,
  ]
}

function addMappedTemplateTests(file, templateDirs) {
  const match = /^experimental\/public-apis-news-flash-monitor\/template\/([^/]+)/u
    .exec(file)
  if (match === null) return
  const templateDir = `experimental/public-apis-news-flash-monitor/template/${match[1]}`
  if (existsSync(`${templateDir}/test`)) templateDirs.add(templateDir)
}

function sourceBaseName(file) {
  const match = /^src\/(?:application\/usecases|infrastructure\/openApis)\/(.+)\.ts$/u
    .exec(file)
  if (match !== null) return match[1].replace(/Client$/u, '')
  const providerMatch = /^src\/providers\/([^/]+)\/(?:client|index)\.ts$/u.exec(file)
  return providerMatch?.[1]
}

function toKebab(value) {
  return value
    .replaceAll(/([a-z0-9])([A-Z])/gu, '$1-$2')
    .replaceAll(/[_\s]+/gu, '-')
    .toLowerCase()
}

function isPackageSurface(file) {
  return file === 'package.json' ||
    file === 'README.md' ||
    file === 'README.zh-CN.md' ||
    file.startsWith('experimental/public-apis-news-flash-monitor/') ||
    file.startsWith('docs/assets/')
}

function isNewsFlashFile(file) {
  return file.includes('experimentalNewsFlash') ||
    file.includes('news-flash') ||
    file.includes('NewsFlash')
}

function normalizePath(path) {
  const normalized = path.replaceAll('\\', '/')
  if (!isAbsolute(path)) return normalized.replace(/^\.\//u, '')
  return relative(process.cwd(), path).replaceAll('\\', '/')
}
