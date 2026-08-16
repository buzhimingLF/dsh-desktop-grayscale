import z from 'schemastery'
import { applyRoutingToAssembly, resolveMode } from './router.mjs'

export const name = 'dsh-routing-suite'
export const inject = ['systemPrompt', 'webServer']

export const routingPreset = 'routing-suite'

export function selectedPreset(session: any): string | undefined {
  const events = Array.isArray(session?.events) ? session.events : []
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type === 'agent-preset/selected' && typeof event.data?.agentPreset === 'string') {
      return event.data.agentPreset
    }
  }
  return typeof session?.header?.agentPreset === 'string' ? session.header.agentPreset : undefined
}

export interface Config {
  /** Enable task-aware routing guidance. */
  enabled: boolean
  /** Automatic classification is recommended; fixed strategies are available for predictable behavior. */
  strategy: 'auto' | 'inspect-first' | 'direct'
}

export const Config = z.object({
  enabled: z.boolean().default(true),
  strategy: z.union(['auto', 'inspect-first', 'direct'] as const).default('auto'),
}) as unknown as Config

export function apply(ctx: any, config: Config): void {
  const enabled = config.enabled ?? true
  const strategy = config.strategy ?? 'auto'

  ctx.on('system-prompt/assemble', async (_assembly: unknown, context: any, next: () => Promise<any>) => {
    const assembled = await next()
    if (!enabled) return assembled
    const session = context?.agent?.session
    if (!session || selectedPreset(session) !== routingPreset) return assembled
    return applyRoutingToAssembly(assembled, resolveMode(strategy, session))
  })

  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/routing-suite/api',
    handler: async (req: any, res: any) => {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const path = url.pathname.replace(/^\/routing-suite\/api/, '') || '/'
      res.setHeader('content-type', 'application/json; charset=utf-8')
      if (req.method === 'GET' && path === '/status') {
        res.statusCode = 200
        res.end(JSON.stringify({ ok: true, enabled, strategy, preset: routingPreset }))
        return
      }
      res.statusCode = 404
      res.end(JSON.stringify({ ok: false, error: 'not found' }))
    },
  }), 'routing-suite: read-only status API')
}
