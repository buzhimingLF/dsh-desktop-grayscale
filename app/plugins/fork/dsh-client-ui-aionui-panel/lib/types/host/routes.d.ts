/**
 * /aionui-panel/* route layer: JSON envelope (ok/error with stable codes) for
 * the fs/git operations and one SSE stream (fs changes + git status changes)
 * per project root. The services own gating and parsing; this layer owns HTTP
 * shape and subscriber bookkeeping.
 * @module dsh-aionui-panel/host/routes
 */
import type { Context } from '@deepseek-ai/cordis';
import type { FsService } from './fs-service.ts';
import type { GitService } from './git-service.ts';
/**
 * Parse a single-range `bytes=start-end` header against the file size.
 * Returns null when no range was requested, 'invalid' for malformed or
 * unsatisfiable ranges (the caller answers 416), or the clamped start/end
 * (inclusive). Multi-range requests are treated as invalid — the panel only
 * ever serves single ranges. Suffix ranges (`bytes=-N`) select the last N
 * bytes. Range support added after human review on #242 (pdf seeking).
 */
export declare function parseRangeHeader(header: string | undefined, size: number): {
    start: number;
    end: number;
} | 'invalid' | null;
/**
 * Register the /aionui-panel routes (prefix for JSON, exact for the SSE
 * stream — longest-prefix-wins keeps them disjoint).
 * @param ctx - context carrying the webServer service.
 * @param fs - the gated filesystem service.
 * @param git - the gated git service.
 * @returns the route disposers.
 */
export declare function registerPanelRoutes(ctx: Context, fs: FsService, git: GitService): () => void;
//# sourceMappingURL=routes.d.ts.map