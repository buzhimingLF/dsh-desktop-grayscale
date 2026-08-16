/**
 * Browser client for the host /aionui-panel/* routes: typed JSON envelope
 * calls plus the SSE change subscription. Same-origin relative fetch (the
 * page and the routes share the webserver).
 * @module dsh-aionui-panel/client/api
 */
/** Transport failure (fetch threw or the response was not JSON). */
const TRANSPORT_ERROR = { code: 'internal', message: 'panel route unavailable' };
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
/** Typed panel operations over the wire. */
export class PanelApi {
    /** List one directory of the project root (rel path; '' = root). */
    list(root, path) {
        return post('/aionui-panel/list', { root, path });
    }
    /** Read one file (text or image data URL). */
    read(root, path, asImage) {
        return post('/aionui-panel/read', { root, path, asImage });
    }
    /** Write text content back with an optional mtime conflict base. */
    write(root, path, content, baseMtime) {
        return post('/aionui-panel/write', { root, path, content, baseMtime });
    }
    /** Filename search under the root. */
    search(root, query) {
        return post('/aionui-panel/search', { root, query });
    }
    /** Delete a path (untracked discard). */
    delete(root, path) {
        return post('/aionui-panel/delete', { root, path });
    }
    /** The repo status view; null when the root is not a repository. */
    gitStatus(root) {
        return post('/aionui-panel/git-status', { root });
    }
    /** The unified diff text of one path (staged = index vs HEAD). */
    gitDiff(root, path, staged) {
        return post('/aionui-panel/git-diff', { root, path, staged });
    }
    /** Stage paths. */
    gitStage(root, paths) {
        return post('/aionui-panel/git-stage', { root, paths });
    }
    /** Unstage paths. */
    gitUnstage(root, paths) {
        return post('/aionui-panel/git-unstage', { root, paths });
    }
    /** Discard paths (worktree side; untracked paths are deleted). */
    gitDiscard(root, paths) {
        return post('/aionui-panel/git-discard', { root, paths });
    }
}
/**
 * Subscribe to host-pushed changes for one project root (fs watch events and
 * git status polls). Reconnects are handled by the EventSource; the caller
 * re-subscribes when the root changes.
 * @param root - project root to watch.
 * @param onChange - fired on every pushed change.
 * @returns the disposer closing the stream.
 */
export function subscribePanelEvents(root, onChange) {
    const source = new EventSource(`/aionui-panel/events?root=${encodeURIComponent(root)}`);
    source.addEventListener('change', (raw) => {
        try {
            const event = JSON.parse(raw.data);
            onChange(event);
        }
        catch {
            // malformed push; ignore
        }
    });
    return () => { source.close(); };
}
