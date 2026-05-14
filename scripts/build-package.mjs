import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { build } from 'esbuild'
import { minify } from 'terser'

const outfile = 'dist/src/cli.js'
const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
const banner = '#!/usr/bin/env node'

await mkdir('dist/src', { recursive: true })

const buildResult = await build({
  entryPoints: ['src/cli.ts'],
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  target: 'node24',
  outfile,
  banner: { js: banner },
  legalComments: 'none',
  minify: false,
  sourcemap: false,
  write: false,
  define: {
    __PACKAGE_NAME__: JSON.stringify(packageJson.name ?? 'public-apis-cli'),
    __PACKAGE_VERSION__: JSON.stringify(packageJson.version ?? '0.0.0'),
  },
})

const bundledCode = buildResult.outputFiles?.[0]?.text
if (bundledCode === undefined) {
  throw new Error('esbuild did not return bundled output.')
}

const codeWithoutDuplicateShebang = bundledCode.replace(/^#!.*\n#!.*\n/u, `${banner}\n`)
const minified = await minify(codeWithoutDuplicateShebang, {
  compress: {
    passes: 2,
  },
  mangle: {
    toplevel: true,
  },
  module: true,
  format: {
    comments: false,
    shebang: true,
  },
})

if (minified.code === undefined) {
  throw new Error('terser did not return minified output.')
}

await writeFile(outfile, `${minified.code}\n`, 'utf8')
await chmod(outfile, 0o755)
