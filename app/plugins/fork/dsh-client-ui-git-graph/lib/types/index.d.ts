/**
 * @linxin666/dsh-client-ui-git-graph — host half: the workspace-gated git
 * service and its /git/* HTTP routes (JSON operations + SSE change stream)
 * on the shared webserver. The browser half (exports "./client") is served
 * by client-modules from the same package's dsh.client declaration.
 *
 * The host half owns no model-visible surface: git switch/create are UI-
 * triggered host operations on the workspace disk tree, never tool calls.
 * @module @linxin666/dsh-client-ui-git-graph
 */
import type { Context } from '@deepseek-ai/cordis';
/** Required services: the route registry, the managed subprocess seam, and the workspace registry. */
export declare const inject: string[];
/**
 * Mount the git service and its routes.
 * @param ctx - context carrying webServer, subprocess, and workspaceRegistry.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map