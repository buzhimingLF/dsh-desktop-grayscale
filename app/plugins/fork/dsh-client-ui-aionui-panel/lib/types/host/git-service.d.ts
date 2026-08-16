/**
 * Host git service for the SCM tab: working-tree status (porcelain v1, -z),
 * stage/unstage/discard batches, all scoped to the gated project root and
 * executed through the managed subprocess seam. Parsing is pure and exported
 * for tests; the service only wraps the runner. Discard never touches the
 * staged side (the index is only ever rewritten by stage/unstage), matching
 * the "discard = worktree side" contract.
 * @module dsh-aionui-panel/host/git-service
 */
import type { Context } from '@deepseek-ai/cordis';
import type { GitBatchResult, GitChangeRow, GitFileState, GitStatusView, PanelError } from '../core/types.ts';
import { type WorkspaceGate } from './gate.ts';
/** One finished git invocation. */
export interface GitRunResult {
    exitCode: number | null;
    stdout: string;
    stderr: string;
}
/** The spawn seam the service runs git through (subprocess service in production). */
export interface GitRunner {
    run(argv: readonly string[], cwd: string): Promise<GitRunResult>;
}
/** Production runner over `ctx.subprocess`: one managed child per command. */
export declare function subprocessRunner(ctx: Context): GitRunner;
/** Map one porcelain letter to the row state (unknown letters stay unknown). */
export declare function porcelainState(letter: string): GitFileState;
/**
 * Parse `git status --porcelain=v1 -z` output into staged/unstaged/untracked
 * rows. With -z every entry is NUL-terminated; rename entries carry two paths
 * (old and new). Pure — exported for tests.
 * @param output - raw porcelain v1 -z output.
 * @returns the three change groups.
 */
export declare function parsePorcelain(output: string): {
    staged: GitChangeRow[];
    unstaged: GitChangeRow[];
    untracked: GitChangeRow[];
};
/** Parse the porcelain row set into the status view shape. */
export declare function parseStatusView(root: string, branch: string, output: string): GitStatusView;
/**
 * Workspace-scoped git operations. Gated methods pass the gate, resolve the
 * repository root, and reject non-repositories with a stable error; the
 * `Canonical` variants trust an already-gated canonical root (the SSE poll)
 * and skip the gate.
 * @param runner - the spawn seam.
 * @param gate - workspace-membership gate.
 * @param fsDelete - delete seam for untracked discard (host: FsService.delete).
 */
export declare class GitService {
    private readonly runner;
    private readonly gate;
    private readonly fsDelete;
    constructor(runner: GitRunner, gate: WorkspaceGate, fsDelete: (root: string, rel: string) => Promise<{
        ok: true;
    } | PanelError>);
    /** Cached one-shot git binary probe; never re-probes after the first call. */
    private availablePromise;
    /**
     * Cached repo-top-level resolution per canonical workspace, with a TTL so
     * running `git init` (positive self-heal) or deleting `.git` (negative
     * self-heal) is discovered by a later probe. Positive verdicts live 60s,
     * negative (null) verdicts 30s; exitCode 127 is never cached because it
     * means spawn/run failed rather than "not a repository".
     */
    private readonly repoCache;
    /**
     * Probe the git binary once (git --version) and cache the verdict for the
     * service lifetime. A machine without git then degrades every operation to
     * the stable "not a git repository" state after a single failed spawn,
     * instead of re-spawning ENOENT on every poll tick. The cache stays false
     * even if git is installed later; the host restart picks it up.
     */
    gitAvailable(): Promise<boolean>;
    /**
     * Resolve the repo top-level for one canonical root. Verdicts are cached
     * with a TTL: a positive repo path for 60s, a negative null for 30s. After
     * expiry the next call re-runs `rev-parse --show-toplevel`, so a repo
     * created or removed while the host is running is picked up later. An
     * exitCode 127 means the spawn/run itself failed; it returns null but is
     * deliberately not cached so the next call retries. Any other failure is
     * cached as a negative verdict for its TTL.
     */
    private repoOf;
    /**
     * Whether an already-gated canonical root is a git repository. Skips the
     * workspace gate so the SSE poll does not double-gate every 2s tick; the
     * underlying repoOf cache keeps rev-parse probes at TTL cadence.
     */
    isRepositoryCanonical(canonicalRoot: string): Promise<boolean>;
    /**
     * Whether a workspace root is a git repository. Gates the root first (POST
     * route entry point); the SSE poll should use `isRepositoryCanonical`.
     */
    isRepository(root: string): Promise<boolean>;
    /** Resolve the gated canonical root and the repository top-level. */
    private repo;
    /** Run one git invocation and classify failures. */
    private run;
    /** The repo status view; null when the root is not a repository. */
    status(root: string): Promise<GitStatusView | null | PanelError>;
    /**
     * The repo status view for an already-gated canonical root; null when it is
     * not a repository. Skips the workspace gate (SSE subscribers were gated at
     * connect) and reuses the same repoOf cache + status parsing as `status`.
     */
    statusCanonical(canonicalRoot: string): Promise<GitStatusView | null>;
    /** Run branch + porcelain status for one resolved repo and parse the view. */
    private statusAt;
    /** The repo root for the watch layer (null when not a repository). */
    repoRoot(root: string): Promise<string | null>;
    /**
     * The unified diff of one path ('' when there is no diff to show). Staged
     * paths diff the index against HEAD (`--cached`); unstaged paths diff the
     * worktree against the index. Untracked paths have no index/HEAD entry, so
     * they diff against /dev/null (the canonical new-file shape); its exit code
     * is 1 — differences exist — which is a success here, not a failure.
     */
    diff(root: string, path: string, staged: boolean): Promise<{
        content: string;
    } | PanelError>;
    /** Verify paths stay inside the repo root (defense in depth). */
    private pathsInside;
    /** Stage paths (git add). Batch result reflects the post-op status. */
    stage(root: string, paths: string[]): Promise<GitBatchResult | PanelError>;
    /** Unstage paths (git restore --staged). */
    unstage(root: string, paths: string[]): Promise<GitBatchResult | PanelError>;
    /**
     * Discard paths (worktree side only). Tracked paths are restored from the
     * index; untracked paths are deleted through the fs seam. The batch reports
     * applied/failed per path.
     */
    discard(root: string, paths: string[]): Promise<GitBatchResult | PanelError>;
    /** Shared batch plumbing: gate, repo resolve, path filter, run the op. */
    private batch;
}
//# sourceMappingURL=git-service.d.ts.map