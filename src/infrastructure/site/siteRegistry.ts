import { z } from 'zod'
import { GenericSiteAdapter } from './genericSiteAdapter.js'
import type {
  AuthProfileConfig,
  SiteAdapter,
  SiteConfig,
  SiteRegistryConfig,
  WorkflowConfig,
} from './siteAdapter.js'

const authProfileSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  userDataDir: z.string().min(1).optional(),
  profileDirectory: z.string().min(1).optional(),
  profile: z.object({
    userAgent: z.string().min(1).optional(),
    locale: z.string().min(1).optional(),
    timezoneId: z.string().min(1).optional(),
    viewport: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      deviceScaleFactor: z.number().positive().optional(),
      isMobile: z.boolean().optional(),
      hasTouch: z.boolean().optional(),
      isLandscape: z.boolean().optional(),
    }).optional(),
    geolocation: z.object({
      latitude: z.number(),
      longitude: z.number(),
      accuracy: z.number().nonnegative().optional(),
    }).optional(),
    extraHeaders: z.record(z.string(), z.string()).optional(),
    proxyServer: z.string().min(1).optional(),
    interaction: z.object({
      hoverBeforeClick: z.boolean().optional(),
      scrollIntoView: z.boolean().optional(),
      clickDelayMs: z.number().int().nonnegative().optional(),
      typeDelayMs: z.number().int().nonnegative().optional(),
      pressDelayMs: z.number().int().nonnegative().optional(),
    }).optional(),
  }).optional(),
  notes: z.array(z.string().min(1)).optional(),
}) satisfies z.ZodType<AuthProfileConfig>

const siteConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  baseUrl: z.string().url(),
  selectors: z.object({
    ready: z.string().min(1),
    searchInput: z.string().min(1).optional(),
    resultItems: z.string().min(1).optional(),
  }),
  auth: z.object({
    mode: z.enum(['none', 'optional', 'required']),
    profileId: z.string().min(1).optional(),
    loginUrl: z.string().url().optional(),
    checkSelector: z.string().min(1).optional(),
    notes: z.array(z.string().min(1)).optional(),
  }),
  roles: z.array(z.string().min(1)),
}) satisfies z.ZodType<SiteConfig>

const workflowSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  steps: z.array(
    z.object({
      id: z.string().min(1),
      siteId: z.string().min(1),
      kind: z.enum(['inspect', 'search', 'open']),
      description: z.string().min(1),
      authProfileId: z.string().min(1).optional(),
    }),
  ),
}) satisfies z.ZodType<WorkflowConfig>

const registrySchema = z.object({
  defaultSiteId: z.string().min(1),
  authProfiles: z.array(authProfileSchema),
  sites: z.array(siteConfigSchema).min(1),
  workflows: z.array(workflowSchema),
}) satisfies z.ZodType<SiteRegistryConfig>

export const defaultSiteConfig = siteConfigSchema.parse({
  id: 'public-apis-tui',
  name: 'Public APIs',
  baseUrl: 'https://github.com/public-apis/public-apis',
  selectors: {
    ready: 'body',
  },
  auth: {
    mode: 'none',
  },
  roles: ['registry', 'open-api-catalog'],
})

export const defaultSiteRegistryConfig = registrySchema.parse({
  defaultSiteId: defaultSiteConfig.id,
  authProfiles: [],
  sites: [defaultSiteConfig],
  workflows: [
    {
      id: 'mediastack-open-api-start',
      name: 'Mediastack open API start',
      description: 'Use the public-apis registry as project context, then call Mediastack through its documented REST API.',
      steps: [
        {
          id: 'inspect-public-apis-registry',
          siteId: defaultSiteConfig.id,
          kind: 'inspect',
          description: 'Inspect the public-apis repository page only as catalog context.',
        },
        {
          id: 'call-mediastack-news-api',
          siteId: defaultSiteConfig.id,
          kind: 'search',
          description: 'Call Mediastack /v1/news through the CLI without browser clickstream data.',
        },
      ],
    },
  ],
})

export function createSiteAdapter(config: SiteConfig = defaultSiteConfig): SiteAdapter {
  return new GenericSiteAdapter(siteConfigSchema.parse(config))
}

export function createSiteRegistry(config: SiteRegistryConfig = defaultSiteRegistryConfig): SiteRegistry {
  return new SiteRegistry(registrySchema.parse(config))
}

export function loadSiteRegistryFromEnv(): SiteRegistry {
  const defaultSite = siteConfigSchema.parse({
    id: process.env.SITE_ID ?? defaultSiteConfig.id,
    name: process.env.SITE_NAME ?? defaultSiteConfig.name,
    baseUrl: process.env.SITE_BASE_URL ?? defaultSiteConfig.baseUrl,
    selectors: {
      ready: process.env.SITE_READY_SELECTOR ?? defaultSiteConfig.selectors.ready,
      searchInput: process.env.SITE_SEARCH_INPUT_SELECTOR,
      resultItems: process.env.SITE_RESULT_ITEMS_SELECTOR,
    },
    auth: {
      mode: parseAuthMode(process.env.SITE_AUTH_MODE) ?? defaultSiteConfig.auth.mode,
      profileId: process.env.SITE_AUTH_PROFILE_ID,
      loginUrl: process.env.SITE_LOGIN_URL,
      checkSelector: process.env.SITE_AUTH_CHECK_SELECTOR,
    },
    roles: parseCsv(process.env.SITE_ROLES) ?? defaultSiteConfig.roles,
  })

  const registry = registrySchema.parse({
    ...defaultSiteRegistryConfig,
    defaultSiteId: defaultSite.id,
    authProfiles: loadAuthProfilesFromEnv(),
    sites: [defaultSite],
    workflows: [
      {
        id: 'configured-open-api-context',
        name: 'Configured open API context',
        description: 'Open the configured catalog context and keep API calls on documented REST surfaces.',
        steps: [
          {
            id: 'inspect-configured-context',
            siteId: defaultSite.id,
            kind: 'inspect',
            description: 'Inspect the configured catalog context page.',
            authProfileId: defaultSite.auth.profileId,
          },
        ],
      },
    ],
  })

  return createSiteRegistry(registry)
}

export class SiteRegistry {
  readonly config: SiteRegistryConfig
  private readonly sitesById: Map<string, SiteConfig>
  private readonly authProfilesById: Map<string, AuthProfileConfig>

  constructor(config: SiteRegistryConfig) {
    this.config = registrySchema.parse(config)
    this.sitesById = new Map(this.config.sites.map(site => [site.id, site]))
    this.authProfilesById = new Map(this.config.authProfiles.map(profile => [profile.id, profile]))
    validateRegistryReferences(this.config, this.sitesById, this.authProfilesById)
  }

  get defaultSite(): SiteConfig {
    return this.getSite(this.config.defaultSiteId)
  }

  getSite(siteId: string): SiteConfig {
    const site = this.sitesById.get(siteId)
    if (site === undefined) {
      throw new Error(`Unknown site id: ${siteId}`)
    }
    return site
  }

  getAuthProfile(profileId: string): AuthProfileConfig {
    const profile = this.authProfilesById.get(profileId)
    if (profile === undefined) {
      throw new Error(`Unknown auth profile id: ${profileId}`)
    }
    return profile
  }

  listSitesForAuthProfile(profileId: string): SiteConfig[] {
    return this.config.sites.filter(site => site.auth.profileId === profileId)
  }

  createAdapter(siteId = this.config.defaultSiteId): SiteAdapter {
    return createSiteAdapter(this.getSite(siteId))
  }
}

function validateRegistryReferences(
  config: SiteRegistryConfig,
  sitesById: Map<string, SiteConfig>,
  authProfilesById: Map<string, AuthProfileConfig>,
): void {
  if (!sitesById.has(config.defaultSiteId)) {
    throw new Error(`Default site does not exist: ${config.defaultSiteId}`)
  }

  for (const site of config.sites) {
    if (site.auth.profileId !== undefined && !authProfilesById.has(site.auth.profileId)) {
      throw new Error(`Site ${site.id} references unknown auth profile: ${site.auth.profileId}`)
    }
  }

  for (const workflow of config.workflows) {
    for (const step of workflow.steps) {
      if (!sitesById.has(step.siteId)) {
        throw new Error(`Workflow ${workflow.id} references unknown site: ${step.siteId}`)
      }
      if (step.authProfileId !== undefined && !authProfilesById.has(step.authProfileId)) {
        throw new Error(`Workflow ${workflow.id} references unknown auth profile: ${step.authProfileId}`)
      }
    }
  }
}

function parseAuthMode(value: string | undefined): SiteConfig['auth']['mode'] | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }

  if (value === 'none' || value === 'optional' || value === 'required') {
    return value
  }

  throw new Error(`Unsupported SITE_AUTH_MODE: ${value}`)
}

function parseCsv(value: string | undefined): string[] | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined
  }

  return value.split(',').map(entry => entry.trim()).filter(Boolean)
}

function loadAuthProfilesFromEnv(): AuthProfileConfig[] {
  const profileId = process.env.SITE_AUTH_PROFILE_ID
  if (profileId === undefined || profileId.trim() === '') {
    return defaultSiteRegistryConfig.authProfiles
  }

  return [
    {
      id: profileId,
      label: process.env.SITE_AUTH_PROFILE_LABEL ?? profileId,
      userDataDir: process.env.SITE_AUTH_USER_DATA_DIR,
      profileDirectory: process.env.SITE_AUTH_PROFILE_DIRECTORY,
      notes: parseCsv(process.env.SITE_AUTH_NOTES),
    },
  ]
}
