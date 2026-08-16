/**
 * Browser client for the host /aionui-panel/* routes: typed JSON envelope
 * calls plus the SSE change subscription. Same-origin relative fetch (the
 * page and the routes share the webserver).
 * @module dsh-aionui-panel/client/api
 */
import type { DirListing, FileRead, GitBatchResult, GitStatusView, PanelEnvelope, SearchView } from '../core/types.ts';
/** Typed panel operations over the wire. */
export declare class PanelApi {
    /** List one directory of the project root (rel path; '' = root). */
    list(root: string, path: string): Promise<PanelEnvelope<DirListing>>;
    /** Read one file (text or image data URL). */
    read(root: string, path: string, asImage: boolean): Promise<PanelEnvelope<FileRead>>;
    /** Write text content back with an optional mtime conflict base. */
    write(root: string, path: string, content: string, baseMtime?: number): Promise<PanelEnvelope<{
        mtime: number;
    }>>;
    /** Filename search under the root. */
    search(root: string, query: string): Promise<PanelEnvelope<SearchView>>;
    /** Delete a path (untracked discard). */
    delete(root: string, path: string): Promise<PanelEnvelope<{
        ok: true;
    }>>;
    /** The repo status view; null when the root is not a repository. */
    gitStatus(root: string): Promise<PanelEnvelope<GitStatusView | null>>;
    /** The unified diff text of one path (staged = index vs HEAD). */
    gitDiff(root: string, path: string, staged: boolean): Promise<PanelEnvelope<{
        content: string;
    }>>;
    /** Stage paths. */
    gitStage(root: string, paths: string[]): Promise<PanelEnvelope<GitBatchResult>>;
    /** Unstage paths. */
    gitUnstage(root: string, paths: string[]): Promise<PanelEnvelope<GitBatchResult>>;
    /** Discard paths (worktree side; untracked paths are deleted). */
    gitDiscard(root: string, paths: string[]): Promise<PanelEnvelope<GitBatchResult>>;
}
/** One SSE change event pushed by the host. */
export type PanelChangeEvent = {
    kind: 'fs';
} | {
    kind: 'git';
    status: GitStatusView;
} | {
    kind: 'gitUnavailable';
};
/**
 * Subscribe to host-pushed changes for one project root (fs watch events and
 * git status polls). Reconnects are handled by the EventSource; the caller
 * re-subscribes when the root changes.
 * @param root - project root to watch.
 * @param onChange - fired on every pushed change.
 * @returns the disposer closing the stream.
 */
export declare function subscribePanelEvents(root: string, onChange: (event: PanelChangeEvent) => void): () => void;
//# sourceMappingURL=api.d.ts.map