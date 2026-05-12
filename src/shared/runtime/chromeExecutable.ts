import { existsSync } from 'node:fs'

const macChromePaths = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
]

const linuxChromePaths = [
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
]

const windowsChromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]

export function resolveChromeExecutablePath(explicitPath: string | undefined): string | undefined {
  if (explicitPath !== undefined && explicitPath.trim() !== '') {
    return explicitPath
  }

  if (process.env.CHROME_PATH !== undefined && process.env.CHROME_PATH.trim() !== '') {
    return process.env.CHROME_PATH
  }

  for (const candidate of platformCandidates()) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return undefined
}

function platformCandidates(): string[] {
  switch (process.platform) {
    case 'darwin':
      return macChromePaths
    case 'linux':
      return linuxChromePaths
    case 'win32':
      return windowsChromePaths
    default:
      return []
  }
}
