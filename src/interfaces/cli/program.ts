import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command, Help, Option } from 'commander'
import { loginAuthProfile, logoutAuthProfile, cloneAuthProfile } from '../../application/usecases/authProfiles.js'
import { listBrowserSessions, stopBrowserSession } from '../../application/usecases/browserSessions.js'
import { describeSystem } from '../../application/usecases/describeSystem.js'
import { executePublicApiOperation } from '../../application/usecases/executePublicApiOperation.js'
import { clearPublicApiCache, listPublicApiCache, resolveCacheTarget } from '../../application/usecases/publicApiCache.js'
import { resolveBrowserOptionsForDefaultSite, resolveBrowserOptionsForSite } from '../../application/usecases/browserOptions.js'
import { inspectNetwork } from '../../application/usecases/inspectNetwork.js'
import { listEndpoints } from '../../application/usecases/listEndpoints.js'
import {
  doctorNewsFlashMonitor,
  getNewsFlashStatus,
  installNewsFlashMonitor,
  listNewsFlashProviders,
  NEWS_FLASH_PROVIDER_PARAMETERS,
  type NewsFlashProvider,
  parseNewsFlashProvider,
  parseOptionalNewsFlashProvider,
  runNewsFlashOnce,
  uninstallNewsFlashMonitor,
} from '../../application/usecases/experimentalNewsFlash.js'
import { showManagedProfile } from '../../application/usecases/profileManagement.js'
import { describePublicApiProvider, listPublicApis } from '../../application/usecases/publicApis.js'
import { showPublicApiProviderConfig, writePublicApiProviderConfig } from '../../infrastructure/persistence/publicApiConfig.js'
import { exportSessionState, importSessionState } from '../../application/usecases/sessionState.js'
import { defaultEndpointCatalog } from '../../infrastructure/network/endpointCatalog.js'
import { inspectHome } from '../../application/usecases/inspectHome.js'
import { searchSite } from '../../application/usecases/searchSite.js'
import { defaultPublicApiRegistry } from '../../providers/providerRegistry.js'
import {
  getPublicApiOperationOptionGroupLabel,
  listPublicApiCliOptions,
  type PublicApiOperationDefinition,
  type PublicApiOperationOption,
} from '../../providers/providerTypes.js'
import { loadSiteRegistryFromEnv } from '../../infrastructure/site/siteRegistry.js'
import { RuntimeFailure } from '../../shared/errors/runtimeFailure.js'
import { serializeError } from '../../shared/errors/runtimeFailure.js'
import { findNearestPackageRoot } from '../../shared/runtime/projectRoot.js'
import { parseBrowserOptions, parseOutputFormat, type CommonCliOptions } from './options.js'
import { printError, printResult } from './output.js'
import { runJsonRpcServer } from '../rpc/jsonRpcServer.js'

export type PackageMetadata = {
  name: string
  version: string
}

declare const __PACKAGE_NAME__: string | undefined
declare const __PACKAGE_VERSION__: string | undefined

export function createProgram(metadata: PackageMetadata): Command {
  const program = new Command()
  const registry = loadSiteRegistryFromEnv()
  const endpointCatalog = defaultEndpointCatalog
  const publicApiRegistry = defaultPublicApiRegistry

  program
    .name('public-apis')
    .description('CLI for exploring documented public-apis integrations.')
    .version(metadata.version)
    .enablePositionalOptions()
    .showHelpAfterError()

  addCommonOptions(program)

  program
    .command('version')
    .description('Print the current public-apis CLI version.')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async options => {
      await runCliAction(options, async () => ({
        kind: 'package.version',
        name: metadata.name,
        version: metadata.version,
      }))
    })

  program
    .command('describe', { hidden: true })
    .description('Describe configured sites, session profiles, workflows, CLI commands, and RPC methods.')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async options => {
      await runCliAction(options, async () => describeSystem(metadata.name, metadata.version, registry.config))
    })

  program
    .command('sites', { hidden: true })
    .description('List configured sites and their session requirements.')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async options => {
      await runCliAction(options, async () => ({
        defaultSiteId: registry.config.defaultSiteId,
        sites: registry.config.sites,
        authProfiles: registry.config.authProfiles,
      }))
    })

  program
    .command('workflows', { hidden: true })
    .description('List configured cross-site workflow plans.')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async options => {
      await runCliAction(options, async () => ({ workflows: registry.config.workflows }))
    })

  const apis = program
    .command('apis')
    .description('Discover configured public-apis providers and operations.')

  apis
    .command('list')
    .description('List public API providers and operations available in this CLI.')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async options => {
      await runCliAction(options, async () => listPublicApis(publicApiRegistry))
    })

  apis
    .command('info')
    .description('Describe one public API provider or operation.')
    .argument('<providerOrOperation>', 'Provider id such as mediastack, or operation id such as mediastack.news')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async (providerOrOperation: string, options) => {
      await runCliAction(options, async () => describePublicApiProvider(providerOrOperation, publicApiRegistry))
    })

  apis
    .command('config')
    .description('Show or update one public API provider config.')
    .argument('<provider>', 'Provider id such as mediastack')
    .option('--persist', 'Enable persistence for this provider')
    .option('--no-persist', 'Disable persistence for this provider')
    .option('--default-mode <mode>', 'Default execution mode: online or offline')
    .option('--set-secret <name=value...>', 'Store provider secret values in the local provider config file')
    .option('--unset-secret <name...>', 'Remove provider secret values from the local provider config file')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async (providerId: string, options) => {
      await runCliAction(options, async () => {
        const defaultMode = parseExecutionMode(options.defaultMode)
        const secrets = parseSecretMutations(options.setSecret, options.unsetSecret)
        if (options.persist !== undefined || defaultMode !== undefined || secrets !== undefined) {
          return writePublicApiProviderConfig({
            providerId,
            persist: options.persist,
            defaultMode,
            secrets,
          })
        }
        return showPublicApiProviderConfig(providerId)
      })
    })

  const runOperationCommand = apis
    .command('run')
    .description('Run one public API operation through the scalable registry entrypoint.')
    .argument('<operation>', 'Operation id or RPC method, e.g. mediastack.news')
    .allowUnknownOption()
    .allowExcessArguments()
    .option('--online', 'Fetch from the live public API instead of offline cache')
    .option('--offline', 'Read from the local SQLite cache and do not call the public API')
    .option('--persist', 'Persist this result to the provider SQLite cache')
    .option('--no-persist', 'Do not persist this result even if provider config enables persistence')
    .option('--format <format>', 'Output format: json or text')

  runOperationCommand.configureHelp({
    formatHelp: (command, helper) => formatPublicApiRunHelp(command, helper, publicApiRegistry.operations),
  })

  runOperationCommand.action(async (operationId: string, options, command: Command) => {
      await runCliAction(options, async () => {
        const operation = publicApiRegistry.operations.find(entry => entry.id === operationId || entry.rpcMethod === operationId)
        if (operation === undefined) {
          throw new RuntimeFailure('INVALID_ARGUMENT', `Unknown public API operation: ${operationId}`, {
            operationId,
            supported: publicApiRegistry.operations.map(entry => entry.id),
          })
        }
        const rawParams = parseUnknownOperationOptions(command.args.slice(1), listPublicApiCliOptions(operation.options), operation.id)
        return executePublicApiOperation({
          operation,
          params: rawParams,
          mode: parseExecutionModeFlags(options),
          persist: options.persist,
        })
      }, { defaultFormat: publicApiRegistry.operations.find(entry => entry.id === operationId || entry.rpcMethod === operationId)?.defaultFormat })
    })

  const cache = apis
    .command('cache')
    .description('Inspect and clear local SQLite cache entries for public APIs.')

  cache
    .command('list')
    .description('List cached public API operation results.')
    .argument('<providerOrOperation>', 'Provider id such as mediastack, or operation id such as mediastack.news')
    .option('--limit <count>', 'Maximum cache entries to show, 1-500', '50')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async (providerOrOperation: string, options) => {
      await runCliAction(options, async () => {
        const target = resolveCacheTarget(providerOrOperation, publicApiRegistry)
        return listPublicApiCache({
          ...target,
          limit: parseIntegerOption(String(options.limit), 'limit'),
        })
      })
    })

  cache
    .command('clear')
    .description('Clear cached public API results for one provider or operation.')
    .argument('<providerOrOperation>', 'Provider id such as mediastack, or operation id such as mediastack.news')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async (providerOrOperation: string, options) => {
      await runCliAction(options, async () => {
        const target = resolveCacheTarget(providerOrOperation, publicApiRegistry)
        return clearPublicApiCache(target)
      })
    })

  addPublicApiOperationCommands(program, publicApiRegistry.operations)

  const experimental = program
    .command('experimental')
    .description('Experimental utilities that are not part of the stable public API runtime.')

  const newsFlash = experimental
    .command('news-flash')
    .description('Manage experimental scheduled news flash monitors.')
    .addHelpText('after', [
      '',
      'Workflow:',
      '  1. providers   See available templates and required keys',
      '  2. doctor      Check local tools, shell env, credentials, and notifier',
      '  3. run-once    Execute one real cycle and show a notification',
      '  4. install     Install the monitor as a macOS LaunchAgent',
      '  5. status      Inspect installed schedule and latest briefing',
      '  6. uninstall   Unload and remove the LaunchAgent when done',
      '',
      'Common examples:',
      '  public-apis experimental news-flash providers',
      '  public-apis experimental news-flash doctor --provider spaceflightnews',
      '  public-apis experimental news-flash run-once --provider hackernews',
      '  public-apis experimental news-flash install --provider spaceflightnews --interval-minutes 30',
      '  public-apis experimental news-flash status',
      '  public-apis experimental news-flash uninstall --provider spaceflightnews',
      '',
      'Tip: if you typed "instal", use "install --help" to see installer options.',
    ].join('\n'))

  newsFlash
    .command('providers')
    .alias('list')
    .description('List available news flash providers, source operations, and required environment variables.')
    .option(
      '--repo-root <path>',
      'public-apis-cli repository root; defaults to current package root',
    )
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async options => {
      await runCliAction(options, async () => listNewsFlashProviders(resolveRepoRootOption(options.repoRoot)))
    })

  addNewsFlashProviderParameterOptions(newsFlash
    .command('doctor')
    .description('Check whether a provider can run before doing the real smoke run or install.')
    .requiredOption('--provider <provider>', 'Provider template: spaceflightnews, hackernews, hashnode, newsapi, or gnews')
    .option(
      '--repo-root <path>',
      'public-apis-cli repository root; defaults to current package root',
    )
    .option('--shell <path>', 'Shell used to load startup files; defaults to $SHELL')
    .option('--interval-minutes <minutes>', 'Schedule interval to validate in minutes', '30')
    .option('--format <format>', 'Output format: json or text', 'text'))
    .action(async options => {
      const provider = parseNewsFlashProvider(String(options.provider))
      await runCliAction(options, async () => doctorNewsFlashMonitor({
        provider,
        repoRoot: resolveRepoRootOption(options.repoRoot),
        intervalMinutes: parseIntegerOption(String(options.intervalMinutes), 'interval-minutes'),
        providerEnv: parseNewsFlashProviderEnv(options, provider),
        shellPath: options.shell,
      }))
    })

  addNewsFlashProviderParameterOptions(newsFlash
    .command('run-once')
    .alias('test')
    .description('Run one real provider cycle, summarize with Claude, render TXT, and send the notification.')
    .requiredOption('--provider <provider>', 'Provider template: spaceflightnews, hackernews, hashnode, newsapi, or gnews')
    .option(
      '--repo-root <path>',
      'public-apis-cli repository root; defaults to current package root',
    )
    .option('--shell <path>', 'Shell used to load startup files; defaults to $SHELL')
    .option('--interval-minutes <minutes>', 'Schedule interval to validate in minutes', '30')
    .option('--run-timeout-ms <ms>', 'Run timeout in milliseconds', '240000')
    .option('--format <format>', 'Output format: json or text', 'text'))
    .action(async options => {
      const provider = parseNewsFlashProvider(String(options.provider))
      await runCliAction(options, async () => runNewsFlashOnce({
        provider,
        repoRoot: resolveRepoRootOption(options.repoRoot),
        intervalMinutes: parseIntegerOption(String(options.intervalMinutes), 'interval-minutes'),
        providerEnv: parseNewsFlashProviderEnv(options, provider),
        shellPath: options.shell,
        runTimeoutMs: parseIntegerOption(String(options.runTimeoutMs), 'run-timeout-ms'),
      }))
    })

  addNewsFlashProviderParameterOptions(newsFlash
    .command('install')
    .alias('instal')
    .description('Preflight, smoke-test, and install one news flash template as a macOS LaunchAgent.')
    .requiredOption('--provider <provider>', 'Provider template: spaceflightnews, hackernews, hashnode, newsapi, or gnews')
    .option('--interval-minutes <minutes>', 'LaunchAgent interval in minutes', '30')
    .option(
      '--label <label>',
      [
        'LaunchAgent label; defaults to',
        'com.public-apis-cli.experimental.news-flash.<provider>',
      ].join(' '),
    )
    .option(
      '--repo-root <path>',
      'public-apis-cli repository root; defaults to current package root',
    )
    .option('--shell <path>', 'Shell used to load startup files for preflight, smoke run, and LaunchAgent; defaults to $SHELL')
    .option('--run-timeout-ms <ms>', 'Smoke-run timeout in milliseconds', '240000')
    .option('--dry-run', 'Run preflight and smoke test but do not write or load the LaunchAgent')
    .option('--skip-load', 'Write the plist but do not call launchctl bootstrap')
    .option('--format <format>', 'Output format: json or text', 'text'))
    .action(async options => {
      const provider = parseNewsFlashProvider(String(options.provider))
      await runCliAction(options, async () => installNewsFlashMonitor({
        provider,
        repoRoot: resolveRepoRootOption(options.repoRoot),
        intervalMinutes: parseIntegerOption(String(options.intervalMinutes), 'interval-minutes'),
        providerEnv: parseNewsFlashProviderEnv(options, provider),
        label: options.label,
        shellPath: options.shell,
        dryRun: options.dryRun === true,
        skipLoad: options.skipLoad === true,
        runTimeoutMs: parseIntegerOption(String(options.runTimeoutMs), 'run-timeout-ms'),
      }))
    })

  newsFlash
    .command('status')
    .description('Show LaunchAgent installation state, loaded state, and latest briefing artifact paths.')
    .option('--provider <provider>', 'Limit status to one provider')
    .option(
      '--label <label>',
      [
        'LaunchAgent label; defaults to',
        'com.public-apis-cli.experimental.news-flash.<provider>',
      ].join(' '),
    )
    .option(
      '--repo-root <path>',
      'public-apis-cli repository root; defaults to current package root',
    )
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async options => {
      await runCliAction(options, async () => getNewsFlashStatus({
        provider: parseOptionalNewsFlashProvider(options.provider),
        repoRoot: resolveRepoRootOption(options.repoRoot),
        label: options.label,
      }))
    })

  newsFlash
    .command('uninstall')
    .alias('remove')
    .description('Unload and remove a news flash LaunchAgent plist.')
    .requiredOption('--provider <provider>', 'Provider template: spaceflightnews, hackernews, hashnode, newsapi, or gnews')
    .option(
      '--label <label>',
      [
        'LaunchAgent label; defaults to',
        'com.public-apis-cli.experimental.news-flash.<provider>',
      ].join(' '),
    )
    .option(
      '--repo-root <path>',
      'public-apis-cli repository root; defaults to current package root',
    )
    .option('--skip-unload', 'Remove the plist without calling launchctl bootout')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async options => {
      await runCliAction(options, async () => uninstallNewsFlashMonitor({
        provider: parseNewsFlashProvider(String(options.provider)),
        repoRoot: resolveRepoRootOption(options.repoRoot),
        label: options.label,
        skipUnload: options.skipUnload === true,
      }))
    })

  const auth = program
    .command('auth', { hidden: true })
    .description('Manage dedicated local auth profiles for approved sites.')

  auth
    .command('login')
    .description('Open a dedicated local Chrome profile and wait until site login is reusable.')
    .option('--site <siteId>', 'Site id whose auth profile should be prepared')
    .option('--auth-profile <profileId>', 'Explicit auth profile id to prepare')
    .option('--url <url>', 'Override login URL; defaults to site auth.loginUrl or baseUrl')
    .option('--force', 'Remove the existing dedicated local auth profile before opening login')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async options => {
      await runCliAction(options, async () =>
        loginAuthProfile(registry, {
          siteId: options.site,
          authProfileId: options.authProfile,
          browserOptions: parseBrowserOptions(program.optsWithGlobals()),
          url: options.url,
          force: options.force === true,
        }),
      )
    })

  auth
    .command('logout')
    .description('Remove the dedicated local auth profile for one approved site/profile.')
    .option('--site <siteId>', 'Site id whose auth profile should be cleared')
    .option('--auth-profile <profileId>', 'Explicit auth profile id to clear')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async options => {
      await runCliAction(options, async () =>
        logoutAuthProfile(registry, {
          siteId: options.site,
          authProfileId: options.authProfile,
        }),
      )
    })

  const profile = program
    .command('profile', { hidden: true })
    .description('Inspect or prepare dedicated local browser profiles.')

  profile
    .command('show')
    .description('Show the resolved local managed auth profile paths for one site/profile.')
    .option('--site <siteId>', 'Site id whose managed profile should be shown')
    .option('--auth-profile <profileId>', 'Explicit auth profile id to inspect')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async options => {
      await runCliAction(options, async () =>
        showManagedProfile(registry, {
          siteId: options.site,
          authProfileId: options.authProfile,
        }),
      )
    })

  profile
    .command('clone')
    .description('Clone a local Chrome user-data-dir into one managed auth profile.')
    .argument('<sourceUserDataDir>', 'Source Chrome user-data-dir root to clone from')
    .option('--site <siteId>', 'Target site id whose auth profile should receive the clone')
    .option('--auth-profile <profileId>', 'Explicit target auth profile id')
    .option('--source-profile-directory <name>', 'Source Chrome profile directory inside the user-data-dir, e.g. Default or Profile 4')
    .option('--force', 'Remove the existing dedicated local target profile before cloning')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async (sourceUserDataDir: string, options) => {
      await runCliAction(options, async () =>
        cloneAuthProfile(registry, {
          siteId: options.site,
          authProfileId: options.authProfile,
          sourceUserDataDir,
          sourceProfileDirectory: options.sourceProfileDirectory,
          force: options.force === true,
        }),
      )
    })

  const browser = program
    .command('browser', { hidden: true })
    .description('Manage named local Chrome sessions started with --session.')

  browser
    .command('list')
    .description('List registered managed Chrome sessions and liveness status.')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async options => {
      await runCliAction(options, async () => listBrowserSessions())
    })

  browser
    .command('stop')
    .description('Stop one registered managed Chrome session.')
    .argument('<session>', 'Managed browser session id to stop')
    .option('--force', 'Use SIGKILL if graceful shutdown is not available')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async (session: string, options) => {
      await runCliAction(options, async () =>
        stopBrowserSession(session, {
          force: options.force === true,
          timeoutMs: parseBrowserOptions(program.optsWithGlobals()).timeoutMs,
        }),
      )
    })

  program
    .command('endpoints', { hidden: true })
    .description('List known endpoint metadata and evidence status.')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async options => {
      await runCliAction(options, async () => listEndpoints(endpointCatalog))
    })

  program
    .command('inspect-home', { hidden: true })
    .description('Open a target site and verify its ready selector.')
    .option('--site <siteId>', 'Site id to inspect; defaults to the registry default site')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async options => {
      await runCliAction(options, async () => {
        const adapter = registry.createAdapter(options.site)
        return inspectHome(
          adapter,
          resolveBrowserOptionsForSite(registry, parseBrowserOptions(program.optsWithGlobals()), options.site, {
            required: true,
          }),
        )
      })
    })

  program
    .command('inspect-network', { hidden: true })
    .description('Open a target site and record redacted network metadata.')
    .option('--site <siteId>', 'Site id to inspect; defaults to the registry default site')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async options => {
      await runCliAction(options, async () => {
        const adapter = registry.createAdapter(options.site)
        return inspectNetwork(
          adapter,
          resolveBrowserOptionsForSite(registry, parseBrowserOptions(program.optsWithGlobals()), options.site, {
            required: true,
          }),
          endpointCatalog,
        )
      })
    })

  program
    .command('search', { hidden: true })
    .description('Run the generic search action for adapters that define a search input selector.')
    .argument('<query>', 'Search query')
    .option('--site <siteId>', 'Site id to search; defaults to the registry default site')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async (query: string, options) => {
      await runCliAction(options, async () => {
        const adapter = registry.createAdapter(options.site)
        return searchSite(
          adapter,
          resolveBrowserOptionsForSite(registry, parseBrowserOptions(program.optsWithGlobals()), options.site, {
            required: true,
          }),
          query,
        )
      })
    })

  program
    .command('session-export', { hidden: true })
    .description('Export cookies and localStorage from the current browser session to a JSON file.')
    .argument('<path>', 'Output JSON file path')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async (path: string, options) => {
      await runCliAction(options, async () =>
        exportSessionState(resolveBrowserOptionsForDefaultSite(registry, parseBrowserOptions(program.optsWithGlobals())), path),
      )
    })

  program
    .command('session-import', { hidden: true })
    .description('Import cookies and localStorage from a JSON file into the current browser session.')
    .argument('<path>', 'Input JSON file path')
    .option('--format <format>', 'Output format: json or text', 'text')
    .action(async (path: string, options) => {
      await runCliAction(options, async () =>
        importSessionState(resolveBrowserOptionsForDefaultSite(registry, parseBrowserOptions(program.optsWithGlobals())), path),
      )
    })

  program
    .command('rpc')
    .description('Run a JSON-RPC 2.0 server over stdin/stdout, one request per line.')
    .action(async () => {
      await runJsonRpcServer({
        packageName: metadata.name,
        packageVersion: metadata.version,
        registry,
        endpointCatalog,
        browserOptions: resolveBrowserOptionsForDefaultSite(registry, parseBrowserOptions(program.optsWithGlobals())),
      })
    })

  return program
}

function addPublicApiOperationCommands(program: Command, operations: PublicApiOperationDefinition[]): void {
  const providerCommands = new Map<string, Command>()
  for (const operation of operations) {
    const [providerCommandName, operationCommandName] = operation.commandPath
    if (providerCommandName === undefined || operationCommandName === undefined) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `Operation ${operation.id} must define provider and operation command path.`)
    }

    const providerCommand = providerCommands.get(providerCommandName)
      ?? program.command(providerCommandName, { hidden: true }).description(`Explore ${operation.providerId} public API operations.`)
    providerCommands.set(providerCommandName, providerCommand)

    const command = providerCommand.command(operationCommandName).description(operation.description)
    for (const option of listPublicApiCliOptions(operation.options)) {
      command.addOption(createCliOperationOption(option))
    }
    command
      .option('--online', 'Fetch from the live public API instead of offline cache')
      .option('--offline', 'Read from the local SQLite cache and do not call the public API')
      .option('--persist', 'Persist this result to the provider SQLite cache')
      .option('--no-persist', 'Do not persist this result even if provider config enables persistence')
    command.option('--format <format>', 'Output format: json or text', operation.defaultFormat)
    command.action(async options => {
      await runCliAction(options, async () =>
        executePublicApiOperation({
          operation,
          params: parseOperationOptions(options, listPublicApiCliOptions(operation.options)),
          mode: parseExecutionModeFlags(options),
          persist: options.persist,
        }),
      )
    })
  }
}

function formatPublicApiRunHelp(
  command: Command,
  helper: Help,
  operations: PublicApiOperationDefinition[],
): string {
  const baseHelp = Help.prototype.formatHelp.call(helper, command, helper)
  const operationId = readHelpOperationId(command.args)
  if (operationId === undefined) {
    return [
      baseHelp.trimEnd(),
      '',
      'Operation Help:',
      '  public-apis apis run <operation> --help',
      '  public-apis apis run mediastack.news --help',
      '',
    ].join('\n')
  }

  const operation = operations.find(entry => entry.id === operationId || entry.rpcMethod === operationId)
  if (operation === undefined) {
    return [
      baseHelp.trimEnd(),
      '',
      `Unknown operation: ${operationId}`,
      `Supported operations: ${operations.map(entry => entry.id).join(', ')}`,
      '',
    ].join('\n')
  }

  const operationHelp = createOperationHelpCommand(operation).helpInformation().trimEnd()
  return [
    baseHelp.trimEnd(),
    '',
    operationHelp,
    '',
    'Example:',
    `  ${formatPublicApiRunExample(operation)}`,
    '',
  ].join('\n')
}

function readHelpOperationId(args: string[]): string | undefined {
  return args.find(arg => !arg.startsWith('-'))
}

function createOperationHelpCommand(operation: PublicApiOperationDefinition): Command {
  const command = new Command(operation.id)
    .description(operation.description)
    .showHelpAfterError()

  for (const option of listPublicApiCliOptions(operation.options)) {
    command.addOption(createCliOperationOption(option))
  }

  return command
}

function createCliOperationOption(option: PublicApiOperationOption): Option {
  return new Option(option.flag, option.description)
    .default(option.defaultValue)
    .helpGroup(getPublicApiOperationOptionGroupLabel(option.group))
}

function formatPublicApiRunExample(operation: PublicApiOperationDefinition): string {
  const exampleOption = selectExampleOperationOption(listPublicApiCliOptions(operation.options))
  if (exampleOption === undefined) {
    return `public-apis apis run ${operation.id}`
  }

  return `public-apis apis run ${operation.id} -- ${exampleOption.flag.replace(/ <.*$/u, ' value')}`
}

function selectExampleOperationOption(options: PublicApiOperationOption[]): PublicApiOperationOption | undefined {
  return options.find(option => option.exposure === 'primary' && option.group !== 'authentication')
    ?? options.find(option => option.exposure === 'primary')
    ?? options.find(option => option.group !== 'authentication')
    ?? options[0]
}

function addNewsFlashProviderParameterOptions(command: Command): Command {
  for (const parameter of NEWS_FLASH_PROVIDER_PARAMETERS) {
    const option = new Option(parameter.option, parameter.description)
    if (parameter.defaultValue !== undefined) {
      option.default(undefined, `template default ${parameter.defaultValue}`)
    }
    if (parameter.choices !== undefined) {
      option.choices(parameter.choices)
    } else if (parameter.valueType === 'integer') {
      option.argParser(value => String(parseIntegerOption(value, readNewsFlashOptionFlag(parameter.option))))
    }
    option.helpGroup('Provider Parameters:')
    command.addOption(option)
  }
  command.configureHelp({
    visibleOptions: cmd => filterNewsFlashHelpOptions(cmd, readHelpNewsFlashProvider(process.argv)),
  })
  command.addHelpText('after', context => formatNewsFlashProviderParameterHelp(readHelpNewsFlashProvider(process.argv), context.command.name()))
  return command
}

function parseNewsFlashProviderEnv(options: Record<string, unknown>, provider: NewsFlashProvider): Record<string, string> {
  const providerEnv: Record<string, string> = {}
  const supportedEnvNames = new Set(NEWS_FLASH_PROVIDER_PARAMETERS.filter(parameter => parameter.providers.includes(provider)).map(parameter => parameter.env))
  for (const parameter of NEWS_FLASH_PROVIDER_PARAMETERS) {
    const optionName = readNewsFlashOptionName(parameter.option)
    const value = options[optionName]
    if (typeof value === 'string' && value.trim() !== '') {
      if (!parameter.providers.includes(provider)) {
        throw new RuntimeFailure('INVALID_ARGUMENT', `Option ${readNewsFlashOptionFlag(parameter.option)} is not supported for ${provider}.`, {
          provider,
          supported: [...supportedEnvNames].sort(),
        })
      }
      providerEnv[parameter.env] = value.trim()
    }
  }
  return providerEnv
}

function filterNewsFlashHelpOptions(command: Command, provider: NewsFlashProvider | undefined): Option[] {
  const defaultHelp = new Help()
  const visibleOptions = defaultHelp.visibleOptions(command)
  if (provider === undefined) return visibleOptions
  const unsupportedOptionFlags = new Set(
    NEWS_FLASH_PROVIDER_PARAMETERS
      .filter(parameter => !parameter.providers.includes(provider))
      .map(parameter => readNewsFlashOptionFlag(parameter.option)),
  )
  return visibleOptions.filter(option => option.long === undefined || !unsupportedOptionFlags.has(option.long))
}

function readHelpNewsFlashProvider(argv: readonly string[]): NewsFlashProvider | undefined {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--provider') {
      const value = argv[index + 1]
      return value === undefined || value.startsWith('-') ? undefined : parseOptionalNewsFlashProvider(value)
    }
    if (arg?.startsWith('--provider=')) {
      return parseOptionalNewsFlashProvider(arg.slice('--provider='.length))
    }
  }
  return undefined
}

function readNewsFlashOptionFlag(option: string): string {
  return option.split(/\s+/u)[0] ?? option
}

function readNewsFlashOptionName(option: string): string {
  return readNewsFlashOptionFlag(option)
    .replace(/^--/u, '')
    .replace(/-([a-z])/gu, (_, letter: string) => letter.toUpperCase())
}

function formatNewsFlashProviderParameterHelp(provider: NewsFlashProvider | undefined, commandName: string): string {
  const examples = provider === undefined
    ? [
        '  public-apis experimental news-flash run-once --provider hackernews --hackernews-list new --hackernews-limit 5',
        '  public-apis experimental news-flash install --provider spaceflightnews --spaceflightnews-search artemis --spaceflightnews-limit 8',
        '  public-apis experimental news-flash install --provider newsapi --newsapi-country us --newsapi-category technology',
        '  public-apis experimental news-flash run-once --provider gnews --gnews-query AI --gnews-language en',
      ]
    : [`  public-apis experimental news-flash ${commandName} --provider ${provider} ${formatNewsFlashProviderExampleArgs(provider)}`]
  return [
    '',
    provider === undefined ? 'Provider parameter examples:' : `Provider parameter example for ${provider}:`,
    ...examples,
    '',
    'Install persists these provider parameters into the LaunchAgent command.',
  ].join('\n')
}

function formatNewsFlashProviderExampleArgs(provider: NewsFlashProvider): string {
  if (provider === 'hackernews') return '--hackernews-list new --hackernews-limit 5'
  if (provider === 'spaceflightnews') return '--spaceflightnews-search artemis --spaceflightnews-limit 8'
  if (provider === 'newsapi') return '--newsapi-country us --newsapi-category technology'
  if (provider === 'gnews') return '--gnews-query AI --gnews-language en'
  return '--hashnode-host blog.developerdao.com --hashnode-first 5'
}

function parseUnknownOperationOptions(rawArgs: string[], operationOptions: PublicApiOperationOption[], operationLabel = operationOptions.map(entry => entry.name).join(', ')): Record<string, unknown> {
  const parsed: Record<string, unknown> = {}
  const optionByFlag = new Map(operationOptions.flatMap(option => readLongFlags(option.flag).map(flag => [flag, option] as const)))
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index]
    if (arg === undefined) {
      continue
    }
    if (!arg.startsWith('--')) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `Unexpected positional argument for operation parameters: ${arg}`)
    }

    const [flag, inlineValue] = arg.split('=', 2)
    if (flag === undefined) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `Unsupported empty option for ${operationLabel}`)
    }
    const option = optionByFlag.get(flag)
    if (option === undefined) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `Unsupported option for ${operationLabel}: ${flag}`, {
        supported: [...optionByFlag.keys()],
      })
    }

    if (option.valueType === 'boolean') {
      if (inlineValue !== undefined) {
        parsed[option.name] = parseBooleanOption(inlineValue, option.name)
        continue
      }
      const nextValue = rawArgs[index + 1]
      if (nextValue !== undefined && !nextValue.startsWith('--')) {
        parsed[option.name] = parseBooleanOption(nextValue, option.name)
        index += 1
        continue
      }
      parsed[option.name] = true
      continue
    }

    const value = inlineValue ?? rawArgs[index + 1]
    if (value === undefined || value.startsWith('--')) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `Missing value for ${flag}`, { option: flag })
    }
    if (inlineValue === undefined) {
      index += 1
    }
    parsed[option.name] = option.valueType === 'integer'
      ? parseIntegerOption(value, option.name)
      : value.trim()
  }

  return parsed
}

function readLongFlags(flagDefinition: string): string[] {
  return flagDefinition
    .split(/[ ,|]+/u)
    .filter(part => part.startsWith('--'))
    .map(part => part.replace(/(?:\s*<.*|\s*\[.*)$/u, ''))
}

function parseExecutionModeFlags(options: { online?: boolean | undefined; offline?: boolean | undefined }) {
  if (options.online === true && options.offline === true) {
    throw new RuntimeFailure('INVALID_ARGUMENT', '--online cannot be combined with --offline.')
  }

  if (options.offline === true) {
    return 'offline'
  }
  if (options.online === true) {
    return 'online'
  }
  return undefined
}

function parseExecutionMode(value: string | undefined): 'online' | 'offline' | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }
  if (value === 'online' || value === 'offline') {
    return value
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', `Unsupported execution mode: ${value}`, {
    supported: ['online', 'offline'],
  })
}

function parseSecretMutations(
  setSecret: string[] | string | undefined,
  unsetSecret: string[] | string | undefined,
): Record<string, string | undefined> | undefined {
  const secrets: Record<string, string | undefined> = {}
  for (const entry of normalizeOptionValues(setSecret)) {
    const separatorIndex = entry.indexOf('=')
    if (separatorIndex <= 0) {
      throw new RuntimeFailure('INVALID_ARGUMENT', `Invalid --set-secret value: ${entry}`, {
        remediation: 'Use --set-secret NAME=value.',
      })
    }
    const name = entry.slice(0, separatorIndex)
    const value = entry.slice(separatorIndex + 1)
    secrets[name] = value
  }
  for (const name of normalizeOptionValues(unsetSecret)) {
    secrets[name] = undefined
  }
  return Object.keys(secrets).length > 0 ? secrets : undefined
}

function normalizeOptionValues(value: string[] | string | undefined): string[] {
  if (value === undefined) {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

function parseOperationOptions(
  options: Record<string, unknown>,
  operationOptions: PublicApiOperationOption[],
): Record<string, unknown> {
  const parsed: Record<string, unknown> = {}
  for (const option of operationOptions) {
    const value = options[option.name]
    if (typeof value !== 'string' && typeof value !== 'boolean') {
      continue
    }
    if (typeof value === 'string' && value.trim() === '') {
      continue
    }

    if (option.valueType === 'integer') {
      parsed[option.name] = parseIntegerOption(String(value), option.name)
    } else if (option.valueType === 'boolean') {
      parsed[option.name] = typeof value === 'boolean' ? value : parseBooleanOption(String(value), option.name)
    } else {
      parsed[option.name] = typeof value === 'string' ? value.trim() : value
    }
  }

  return parsed
}

function parseIntegerOption(value: string, label: string): number {
  const parsed = Number(value)
  if (!Number.isInteger(parsed)) {
    throw new RuntimeFailure('INVALID_ARGUMENT', `Expected integer for ${label}, got: ${value}`, {
      option: label,
      value,
    })
  }

  return parsed
}

function parseBooleanOption(value: string, label: string): boolean {
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }
  throw new RuntimeFailure('INVALID_ARGUMENT', `Expected boolean for ${label}, got: ${value}`, {
    option: label,
    value,
    supported: ['true', 'false'],
  })
}

function addCommonOptions(program: Command): void {
  addHiddenOption(
    program,
    '--cdp-url <url>',
    'Attach to an existing Chrome CDP endpoint, e.g. ' +
      'http://127.0.0.1:9222',
  )
  addHiddenOption(program, '--session <slug>', 'Use or create a named persistent local Chrome session')
  addHiddenOption(
    program,
    '--chrome-path <path>',
    'Chrome/Chromium executable path for launching a managed browser',
  )
  addHiddenOption(program, '--user-data-dir <path>', 'User data directory for launched browser profile')
  addHiddenOption(
    program,
    '--chrome-profile-directory <name>',
    'Chrome profile directory inside the chosen user-data-dir, e.g. ' +
      'Default or Profile 4',
  )
  addHiddenOption(
    program,
    '--auth-profile <profileId>',
    'Explicit auth profile id to use instead of the site default',
  )
  addHiddenOption(
    program,
    '--proxy-server <server>',
    'Proxy server for launched browser sessions, e.g. http://127.0.0.1:8080',
  )
  addHiddenOption(program, '--user-agent <ua>', 'Override browser user agent string')
  addHiddenOption(program, '--locale <locale>', 'Preferred locale/languages, e.g. en-US,en')
  addHiddenOption(
    program,
    '--timezone-id <tz>',
    'Emulated IANA timezone id, e.g. America/Los_Angeles',
  )
  addHiddenOption(program, '--viewport <viewport>', 'Viewport as WIDTHxHEIGHT or WIDTHxHEIGHT@DEVICE_SCALE')
  addHiddenOption(program, '--geolocation <coords>', 'Geolocation as LATITUDE,LONGITUDE[,ACCURACY]')
  addHiddenOption(program, '--extra-headers <json>', 'Extra HTTP headers as a JSON object string')
  addHiddenOption(
    program,
    '--interaction-hover-before-click',
    'Hover the target element before clicking or focusing it',
  )
  addHiddenOption(
    program,
    '--interaction-scroll-into-view',
    'Scroll target elements into view before clicking or typing',
  )
  addHiddenOption(
    program,
    '--interaction-click-delay-ms <ms>',
    'Delay mouseup during click actions by the given milliseconds',
  )
  addHiddenOption(
    program,
    '--interaction-type-delay-ms <ms>',
    'Delay between typed characters by the given milliseconds',
  )
  addHiddenOption(
    program,
    '--interaction-press-delay-ms <ms>',
    'Delay between keydown and keyup for key press actions',
  )
  addHiddenOption(program, '--headed', 'Launch Chrome headed when --cdp-url is not provided')
  addHiddenOption(program, '--headless', 'Launch Chrome headless when --cdp-url is not provided')
  addHiddenOption(program, '--timeout-ms <ms>', 'Browser operation timeout in milliseconds', '60000')
}

function addHiddenOption(
  command: Command,
  flags: string,
  description: string,
  defaultValue?: string,
): void {
  const option = new Option(flags, description).hideHelp()
  if (defaultValue !== undefined) {
    option.default(defaultValue)
  }
  command.addOption(option)
}

function resolveRepoRootOption(value: string | undefined): string {
  return resolve(value ?? findNearestPackageRoot(dirname(fileURLToPath(import.meta.url))))
}

async function runCliAction(
  options: CommonCliOptions,
  action: () => Promise<unknown>,
  runtimeOptions: { defaultFormat?: 'json' | 'text' | undefined } = {},
): Promise<void> {
  try {
    const format = parseOutputFormat(options.format ?? runtimeOptions.defaultFormat ?? 'text')
    const result = await action()
    printResult(result, format)
  } catch (error) {
    const serialized = serializeError(error)
    printError(serialized)
    process.exitCode = 1
  }
}

export function readPackageMetadata(): PackageMetadata {
  if (typeof __PACKAGE_NAME__ === 'string' && typeof __PACKAGE_VERSION__ === 'string') {
    return {
      name: __PACKAGE_NAME__,
      version: __PACKAGE_VERSION__,
    }
  }

  const currentFile = fileURLToPath(import.meta.url)
  const packageRoot = findNearestPackageRoot(dirname(currentFile))
  const packageJsonPath = resolve(packageRoot, 'package.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as Partial<PackageMetadata>
  return {
    name: packageJson.name ?? 'public-apis-cli',
    version: packageJson.version ?? '0.0.0',
  }
}
