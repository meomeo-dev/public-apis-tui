import { existsSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const newsFlashTemplateDirs = [
  'chroniclingamerica-flash',
  'currents-flash',
  'gnews-flash',
  'guardian-flash',
  'hackernews-flash',
  'hashnode-flash',
  'marketaux-flash',
  'mediastack-flash',
  'newsapi-flash',
  'newsdata-flash',
  'nytimes-flash',
  'spaceflightnews-flash',
  'thenews-flash',
]
const newsFlashTemplateFiles = [
  'README.md',
  'agent-env.sh',
  'claude-env.sh',
  'collect-news-once.mjs',
  'notify-news-flash-macos.sh',
  'provider-config.mjs',
  'render-news-flash-txt.mjs',
  'run-news-flash-cycle-notify.sh',
  'run-news-flash-cycle.sh',
  'summarize-news-flash-with-claude.mjs',
]
const newsFlashExpectedPackageFiles = [
  'experimental/public-apis-news-flash-monitor/README.md',
  'experimental/public-apis-news-flash-monitor/SKILL.md',
  ...newsFlashTemplateDirs.flatMap(dir => {
    return newsFlashTemplateFiles.map(file => {
      return `experimental/public-apis-news-flash-monitor/template/${dir}/${file}`
    })
  }),
]
const expectedPackageFiles = [
  '.env.example',
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'README.zh-CN.md',
  'docs/assets/apis-list-hero.png',
  'docs/assets/news-flash-briefing-txt.png',
  'docs/assets/news-flash-run-once.png',
  'docs/assets/ukpolice-street-crimes.png',
  'dist/src/cli.js',
  'package.json',
  ...newsFlashExpectedPackageFiles,
]
const failures = []

for (const file of expectedPackageFiles) {
  if (!existsSync(file)) {
    failures.push(`missing required package file: ${file}`)
  }
}

if (!packageJson.bin || typeof packageJson.bin !== 'object') {
  failures.push('package.json must define a bin object')
}

if (packageJson.private !== false) {
  failures.push('package.json private must be false before npm publish')
}

if (packageJson.publishConfig?.access !== 'public') {
  failures.push('package.json publishConfig.access must be public')
}

if (packageJson.license !== 'MIT') {
  failures.push('package.json license must be MIT')
}

if (
  packageJson.repository?.type !== 'git' ||
  packageJson.repository?.url !==
    'git+https://github.com/meomeo-dev/public-apis-tui.git'
) {
  failures.push('package.json repository must point to public GitHub repo')
}

if (
  packageJson.bugs?.url !==
    'https://github.com/meomeo-dev/public-apis-tui/issues'
) {
  failures.push('package.json bugs.url must point to public GitHub issues')
}

if (
  packageJson.homepage !==
    'https://github.com/meomeo-dev/public-apis-tui#readme'
) {
  failures.push('package.json homepage must point to public GitHub README')
}

const npmPackCommand = resolveNpmPackCommand([
  '--dry-run',
  '--json',
  '--ignore-scripts',
])
const pack = spawnSync(npmPackCommand.command, npmPackCommand.args, {
  encoding: 'utf8',
})

if (pack.status !== 0) {
  failures.push(
    `npm pack --dry-run failed: ${pack.error?.message || pack.stderr || pack.stdout}`,
  )
} else {
  const packed = JSON.parse(pack.stdout)[0]
  if (!packed || packed.entryCount <= 0) {
    failures.push('npm pack dry-run returned no entries')
  }

  const packedFiles = (packed?.files?.map(entry => entry.path) ?? []).sort()
  const expectedFiles = [...expectedPackageFiles].sort()
  const missingFiles = expectedFiles.filter(path => !packedFiles.includes(path))
  const unexpectedFiles = packedFiles.filter(path => !expectedFiles.includes(path))

  if (missingFiles.length > 0) {
    failures.push(`package is missing expected files: ${missingFiles.join(', ')}`)
  }

  if (unexpectedFiles.length > 0) {
    failures.push(`package includes unexpected files: ${unexpectedFiles.join(', ')}`)
  }

  const forbiddenPrefixes = [
    '.github/',
    '_tasks/',
    '_workflows/',
    'note-vault/',
    'scripts/',
    'specs/',
    'src/',
    'test/',
    'tmp/',
  ]
  const forbiddenPackageFiles = packedFiles.filter(path => {
    return forbiddenPrefixes.some(prefix => path.startsWith(prefix))
  })
  if (forbiddenPackageFiles.length > 0) {
    failures.push(
      `package includes repository-only files: ${forbiddenPackageFiles.join(', ')}`,
    )
  }

  const forbiddenExperimentalPaths = packedFiles.filter(path => {
    return (
      path.startsWith('experimental/') &&
      !newsFlashExpectedPackageFiles.includes(path)
    )
  })
  if (forbiddenExperimentalPaths.length > 0) {
    failures.push(
      'package includes non-runtime experimental files: ' +
        forbiddenExperimentalPaths.join(', '),
    )
  }

  const forbiddenRuntimeOutputs = packedFiles.filter(path => {
    return /\/(?:data|logs|summary|test)(?:\/|$)/u.test(path)
  })
  if (forbiddenRuntimeOutputs.length > 0) {
    failures.push(
      'package includes experimental runtime outputs: ' +
        forbiddenRuntimeOutputs.join(', '),
    )
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('package:verify passed.')

function resolveNpmPackCommand(args) {
  const npmExecPath = process.env.npm_execpath
  if (npmExecPath !== undefined && npmExecPath.trim() !== '') {
    return {
      command: process.execPath,
      args: [npmExecPath, 'pack', ...args],
    }
  }
  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    args: ['pack', ...args],
  }
}
