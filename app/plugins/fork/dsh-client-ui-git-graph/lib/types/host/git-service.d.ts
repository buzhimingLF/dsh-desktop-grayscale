/**
 * Host git service: workspace-scoped git operations through a runner seam
 * (production: the subprocess service; tests: a plain child_process runner).
 * Guards mirror ZCode's branchSwitcher semantics — unresolved conflicts,
 * in-progress operations, and branches checked out in another worktree are
 * rejected with stable codes before any mutation.
 * @module dsh-git-graph/host/git-service
 */
import type { Context } from '@deepseek-ai/cordis';
import { type BranchesView, type GitError, type GraphView, type RepoStatus, type SwitchResult } from '../core/types.ts';
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
/**
 * Build the argv for one git invocation, with the win32 binary variant.
 * Windows ships git as git.exe (git for Windows); a .cmd/.bat shim in PATH
 * would otherwise be the resolution target and Node's spawn cannot launch
 * a .cmd file directly (the dsh-subprocess seam applies no shell). Naming
 * git.exe bypasses any shim and always hits the native executable. cmd.exe
 * routing is deliberately NOT used: several git args carry %-format specs
 * (for-each-ref/log --format) that cmd would expand and corrupt.
 * @param platform - the process platform (process.platform in production; a test seam).
 * @param argv - the git subcommand args.
 * @returns the full spawn argv, starting with the platform git binary.
 */
export declare function gitSpawnArgv(platform: NodeJS.Platform, argv: readonly string[]): readonly string[];
/** The workspace-membership verdict type. */
export type WorkspaceVerdict = {
    ok: true;
    canonical: string;
} | {
    ok: false;
    error: GitError;
};
/**
 * Workspace-membership gate: canonicalize the requested path and require it
 * to equal a registered workspace path (the host's realpath canon). This is
 * the security boundary of the /git routes — the browser may only run git on
 * workspace roots.
 */
export type WorkspaceGate = (path: string) => Promise<WorkspaceVerdict>;
/**
 * Production runner over `ctx.subprocess`: one managed child per command,
 * bounded collect on both streams, tree-scoped teardown on abort.
 * @param ctx - context carrying the subprocess service.
 * @returns the runner.
 */
export declare function subprocessRunner(ctx: Context): GitRunner;
/**
 * Workspace-scoped git operations. Every public method first passes the
 * workspace gate, then resolves the repository root from the requested path
 * and rejects non-repositories with `null` (or a rejection for mutations).
 */
export declare class GitService {
    private readonly runner;
    private readonly gate;
    /**
     * @param runner - the spawn seam.
     * @param gate - workspace-membership gate (host: canonical path ∈ registered workspace paths).
     */
    constructor(runner: GitRunner, gate: WorkspaceGate);
    /** The repository snapshot the branch chip renders; null when not a repository. */
    status(path: string): Promise<RepoStatus | null>;
    /** Local branch list with the current branch marked (git for-each-ref refs/heads). */
    branches(path: string): Promise<BranchesView | null>;
    /**
     * Switch the workspace's checked-out branch: real `git switch --no-guess`
     * on disk, affecting every session in the workspace (never a per-session
     * override). Guards run before the mutation; switch failures classify onto
     * the stable error codes.
     * @param path - workspace root.
     * @param branch - existing local branch name.
     */
    switchBranch(path: string, branch: string): Promise<SwitchResult>;
    /**
     * Create a branch from the current HEAD and switch to it
     * (`git switch --no-guess -c <name>`). The authoritative name gate is
     * `git check-ref-format --branch`; duplicates are rejected up front.
     * @param path - workspace root.
     * @param name - proposed branch name.
     */
    createBranch(path: string, name: string): Promise<SwitchResult>;
    /** Topo-ordered commit graph across branches/tags/remotes (read-only). */
    graph(path: string, limit?: number): Promise<GraphView | null>;
    /** Repository root of a canonical path, or null when not inside a git repository. */
    private repoRoot;
    /** Whether any git operation marker is present in the repository. */
    private operationInProgress;
    /**
     * The pre-switch guards (ZCode branchSwitcher semantics): unresolved
     * conflicts, in-progress operations, and a target already checked out in
     * another worktree.
     * @param root - repository root.
     * @param target - target branch; undefined for create (worktree check skipped).
     * @returns the rejection, or null when the switch may proceed.
     */
    private guardBlock;
}
//# sourceMappingURL=git-service.d.ts.map