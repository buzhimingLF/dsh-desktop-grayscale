/**
 * /git/* route layer: JSON envelope (ok/error with stable codes) for the
 * query/mutation operations and an SSE stream for external branch changes.
 * The service itself owns workspace gating and the git guards; this layer
 * owns HTTP shape and the SSE subscriber bookkeeping.
 * @module dsh-git-graph/host/routes
 */
import type { Context } from '@deepseek-ai/cordis';
import { type GitError } from '../core/types.ts';
import type { GitService } from './git-service.ts';
/** Envelope every /git JSON response carries. */
export type GitEnvelope<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: GitError;
};
/**
 * Register the /git routes (prefix for the JSON operations, exact for the
 * SSE stream — longest-prefix-wins keeps them disjoint).
 * @param ctx - context carrying the webServer service.
 * @param service - the workspace-gated git service.
 * @returns the route disposers.
 */
export declare function registerGitRoutes(ctx: Context, service: GitService): () => void;
//# sourceMappingURL=routes.d.ts.map