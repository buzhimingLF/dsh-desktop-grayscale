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
import { realpath } from 'node:fs/promises';
import { GitService, subprocessRunner } from "./host/git-service.js";
import { registerGitRoutes } from "./host/routes.js";
/** Required services: the route registry, the managed subprocess seam, and the workspace registry. */
export const inject = ['webServer', 'subprocess', 'workspaceRegistry'];
/**
 * The workspace-membership gate: canonicalize the requested path and require
 * it to equal a registered workspace path. This is the security boundary of
 * the /git routes — the browser may only run git on workspace roots, never
 * arbitrary host directories.
 */
function createWorkspaceGate(ctx) {
    return async (path) => {
        let canonical;
        try {
            canonical = await realpath(path);
        }
        catch {
            return { ok: false, error: { code: 'workspace-unknown', message: 'path does not resolve on disk' } };
        }
        if (ctx.workspaceRegistry.list().some(workspace => workspace.path === canonical)) {
            return { ok: true, canonical };
        }
        return { ok: false, error: { code: 'workspace-unknown', message: 'path is not a registered workspace' } };
    };
}
/**
 * Mount the git service and its routes.
 * @param ctx - context carrying webServer, subprocess, and workspaceRegistry.
 */
export function apply(ctx) {
    const service = new GitService(subprocessRunner(ctx), createWorkspaceGate(ctx));
    ctx.effect(() => registerGitRoutes(ctx, service), 'dsh-git-graph: /git routes');
}
