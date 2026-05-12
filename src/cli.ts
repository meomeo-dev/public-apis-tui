#!/usr/bin/env node
process.env.NODE_NO_WARNINGS ??= '1'
const emitWarning = process.emitWarning.bind(process)
process.emitWarning = ((warning: string | Error, ...args: unknown[]) => {
  const warningText = warning instanceof Error ? warning.message : warning
  if (warningText.includes('SQLite is an experimental feature')) {
    return
  }

  emitWarning(warning as string, ...(args as [string?, string?, (() => void)?]))
}) as typeof process.emitWarning

const { createProgram, readPackageMetadata } = await import('./interfaces/cli/program.js')

await createProgram(readPackageMetadata()).parseAsync(process.argv)
