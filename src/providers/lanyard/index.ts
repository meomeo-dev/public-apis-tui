import { z } from 'zod'
import { getLanyardPresence, type LanyardPresenceResult } from '../../application/usecases/lanyard.js'
import { LANYARD_DEFAULT_USER_ID, normalizeLanyardPresenceInput, type LanyardPresenceInput } from '../../infrastructure/openApis/lanyardClient.js'
import type { PublicApiOperationDefinition, PublicApiProviderModule } from '../providerTypes.js'

const presenceParamsSchema = z.object({
  userId: z.string().min(1).optional(),
}) satisfies z.ZodType<LanyardPresenceInput>

const presenceOperation: PublicApiOperationDefinition<LanyardPresenceInput> = {
  id: 'lanyard.presence',
  providerId: 'lanyard',
  name: 'Presence',
  commandPath: ['lanyard', 'presence'],
  rpcMethod: 'lanyard.presence',
  description: 'Read one public Discord presence from the Lanyard no-auth REST API.',
  category: 'social',
  options: [
    { name: 'userId', flag: '--user-id <id>', description: `Discord snowflake user id, default ${LANYARD_DEFAULT_USER_ID}`, exposure: 'primary', group: 'query', reason: 'The REST endpoint requires exactly one public Discord user id; this keeps CLI UX narrow and repeatable.', defaultValue: LANYARD_DEFAULT_USER_ID },
  ],
  paramsSchema: presenceParamsSchema,
  execute: params => getLanyardPresence(params),
  normalizeParams: params => presenceParamsSchema.parse(params),
  createCacheKeyParams: params => normalizeLanyardPresenceInput(params),
  resultKind: 'lanyard.presence',
  defaultFormat: 'text',
}

export const lanyardProvider: PublicApiProviderModule = {
  manifest: {
    id: 'lanyard',
    name: 'Lanyard',
    description: 'No-auth REST API for public Discord presence snapshots.',
    publicApisCategory: 'Social',
    homepageUrl: 'https://github.com/Phineas/lanyard',
    docsUrl: 'https://github.com/Phineas/lanyard',
    auth: { mode: 'none', notes: ['REST presence reads require no API keys, OAuth, cookies, browser sessions, or account preparation by the CLI; a user must already be visible to Lanyard.'] },
    tags: ['social', 'discord', 'presence', 'rest', 'no-auth'],
    freePlanNotes: ['Implementation uses the REST snapshot endpoint only; WebSocket subscriptions are intentionally excluded from this CLI/TUI loop.'],
  },
  operations: [presenceOperation],
  endpoints: [
    { id: 'lanyard-user-presence', method: 'GET', urlPattern: 'https://api.lanyard.rest/v1/users/*', category: 'public-api:social', evidenceStatus: 'confirmed', observedOn: '2026-05-04', sampleSources: ['https://github.com/Phineas/lanyard'], consumedBy: ['lanyard.presence'], description: 'Lanyard REST endpoint for one public Discord user presence snapshot.', notes: ['No authentication required for public presence reads.', 'Only works for users known to Lanyard.'] },
  ],
}

export type { LanyardPresenceResult }
