export type RoutingMode = 'inspect-first' | 'direct' | 'neutral'
export type RoutingStrategy = 'auto' | Exclude<RoutingMode, 'neutral'>
export const ROUTING_SECTION: 'routing-suite-guidance'
export function extractText(data: any): string
export function firstUserText(session: any): string
export function classifyTask(text: unknown): RoutingMode
export function resolveMode(strategy: RoutingStrategy, session: any): RoutingMode
export function applyRoutingToAssembly<T>(assembled: T, mode: RoutingMode): T
