/**
 * Browser client for the host /git/* routes: typed JSON envelope calls plus
 * the SSE change subscription. Same-origin relative fetch (the page and the
 * routes share the webserver).
 * @module dsh-git-graph/client/api
 */
/** Transport failure (fetch threw or the response was not JSON). */
const TRANSPORT_ERROR = { code: 'internal', message: 'git route unavailable' };
/** POST one JSON payload and decode the envelope; never throws. */
async function post(path, payload) {
    let response;
    try {
        response = await fetch(path, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
        });
    }
    catch {
        return { ok: false, error: TRANSPORT_ERROR };
    }
    try {
        const envelope = await response.json();
        if (typeof envelope !== 'object' || envelope === null)
            return { ok: false, error: TRANSPORT_ERROR };
        const record = envelope;
        if (record.ok === true)
            return { ok: true, value: record.value };
        return { ok: false, error: record.error ?? TRANSPORT_ERROR };
    }
    catch {
        return { ok: false, error: TRANSPORT_ERROR };
    }
}
/** Typed git operations over the wire. */
export class GitApi {
    /** The repository snapshot (null: not a git repository / not a workspace). */
    status(path) {
        return post('/git/status', { path });
    }
    /** Local branch list with the current branch marked. */
    branches(path) {
        return post('/git/branches', { path });
    }
    /** Workspace-level `git switch --no-guess <branch>` (host guards first). */
    switchBranch(path, branch) {
        return post('/git/switch', { path, branch });
    }
    /** `git switch --no-guess -c <name>` from the current HEAD. */
    createBranch(path, name) {
        return post('/git/create-branch', { path, name });
    }
    /** Topo-ordered commit graph across branches/tags/remotes. */
    graph(path, limit) {
        return post('/git/graph', limit === undefined ? { path } : { path, limit });
    }
}
/**
 * Subscribe to host-pushed branch-state changes for one workspace path (the
 * host polls the workspace while a subscriber is connected). Reconnects are
 * handled by the EventSource; the caller re-subscribes when the path changes.
 * @param path - workspace root to watch.
 * @param onChange - fired on every pushed change.
 * @returns the disposer closing the stream.
 */
export function subscribeChanges(path, onChange) {
    const source = new EventSource(`/git/events?path=${encodeURIComponent(path)}`);
    source.addEventListener('change', () => { onChange(); });
    return () => { source.close(); };
}
