/**
 * Execution service: runs a task through dsh's real session machinery.
 *
 * The board's "run" button must make dsh actually work, not fake a status:
 * the service connects a real session (workspace blank-session reuse or
 * `session.create` on the host via the workspaces service), renames it to
 * the task title, sends the task prompt with `session.prompt`, and then
 * watches the session's conversation snapshot until its turn settles. The
 * task board controller consumes {@link ExecutionEvent}s to move the card
 * running → done/failed and to keep the execution record.
 *
 * Deliberately framework-free: the runtime faces are declared structurally
 * (a narrow slice of the real `ctx.sessions` / `ctx.workspaces` contracts)
 * so tests drive it with plain fakes.
 */
import type { ExecutionRecord, TaskRecord } from './tasks.ts';
/** One list-row summary the execution service reads (the narrow slice of a SessionSummary). */
export interface ExecutionSessionSummary {
    running: boolean;
    completed?: boolean;
    /** Empty-log bit: the preset can only be recomposed while the session is blank. */
    blank?: boolean;
    /** The preset the session currently runs (absent on deployments without presets). */
    agentPreset?: string;
}
/** The narrow sessions face the service needs. */
export interface SessionsExecutionFace {
    list: {
        getSnapshot(): {
            /** Baseline arrival lifecycle — 'pending' until the host list has loaded. */
            phase: 'pending' | 'ready';
            byId: Record<string, ExecutionSessionSummary>;
        };
        subscribe(fn: () => void): () => void;
    };
    binding(id: string): {
        session: SessionDriver;
    } | undefined;
    /** Record a host-confirmed preset switch so the list label moves immediately. */
    noteAgentPreset?(sessionId: string, agentPreset: string): void;
}
/** The narrow agent-preset wire face the service needs (`agentPreset.select`). */
export interface PresetsExecutionFace {
    /** Recompose a blank session's agent from a preset. */
    select(sessionId: string, agentPreset: string): Promise<{
        ok: true;
    } | {
        ok: false;
        error: unknown;
    }>;
}
/** The narrow workspaces face the service needs. */
export interface WorkspacesExecutionFace {
    list: {
        getSnapshot(): {
            items: readonly {
                workspaceId: string;
            }[];
            recentWorkspaceId: string | undefined;
        };
    };
    connectWorkspace(workspaceId: string): Promise<string>;
}
/** One raw session-history event narrowed to the failure signal reconcile needs. */
export interface ExecutionHistoryEvent {
    type: string;
    data?: unknown;
}
/** Optional raw-history face used to detect failures of never-opened sessions. */
export interface HistoryExecutionFace {
    loadTail(sessionId: string): Promise<{
        events: readonly ExecutionHistoryEvent[];
    } | undefined>;
}
/** The behavior verbs the service invokes on an execution session. */
export interface SessionDriver {
    rename(title: string): Promise<unknown>;
    prompt(content: readonly unknown[], mode: 'queue'): Promise<{
        ok: true;
    } | {
        ok: false;
        error: unknown;
    }>;
    /**
     * Admit one slash-command line against the session's agent (the
     * `/permission <id>` mechanism). `matched` reports whether a command
     * claimed the line.
     */
    command(line: string): Promise<{
        ok: true;
        matched: boolean;
    } | {
        ok: false;
        error: unknown;
    }>;
    getSnapshot(): {
        running: boolean;
        lastAgentError: string | null;
        turnEnds: ReadonlyMap<number, number>;
    };
    subscribe(fn: () => void): () => void;
}
/** Everything the service needs from the runtime. */
export interface ExecutionEnvironment {
    sessions: SessionsExecutionFace;
    workspaces: WorkspacesExecutionFace;
    /** Agent-preset wire face; absent on deployments without preset support. */
    presets?: PresetsExecutionFace;
    /** Raw-history reader for failure detection of never-opened sessions. */
    history?: HistoryExecutionFace;
}
/** Outcome events the service emits to the controller. */
export type ExecutionEvent = {
    kind: 'started';
    taskId: string;
    executionId: string;
    sessionId: string;
} | {
    kind: 'settled';
    taskId: string;
    executionId: string;
    outcome: 'succeeded' | 'failed' | 'cancelled';
    error?: string;
};
/**
 * Run one task to completion (or to a settled failure).
 *
 * @param task - the task being executed.
 * @param execution - the freshly opened execution record (id + start time).
 * @param onEvent - callback for started/settled events.
 * @returns resolves when the run settles (or fails to start); never rejects —
 *   every failure path is reported as a settled event.
 */
export declare class ExecutionService {
    private readonly env;
    /** @param env - the runtime faces (real or fake). */
    constructor(env: ExecutionEnvironment);
    run(task: TaskRecord, execution: ExecutionRecord, onEvent: (event: ExecutionEvent) => void): Promise<void>;
    /**
     * Recompose the execution session's agent from the task-pinned preset.
     * No-op when the task pins none or the session already runs it; fails the
     * run when the session is no longer blank, the preset face is missing, or
     * the wire refuses.
     */
    private applyMode;
    /**
     * Apply the task-pinned permission preset through the `/permission <id>`
     * slash command. No-op when the task pins none; fails the run when the
     * admission is rejected or no command claimed the line.
     */
    private applyPermission;
    /**
     * Inspect a reloaded/background task that was left 'running' and emit a
     * settled event when its session already finished.
     *
     * A session that was never opened keeps a cold conversation snapshot (the
     * runtime only maintains the window for the staged/current session), so the
     * settled outcome is decided by the strongest available signal, in order:
     * 1. the list summary — missing session → cancelled; still running → pending;
     * 2. a warm conversation snapshot → `lastAgentError` decides failed/succeeded;
     * 3. the raw history tail (when a history face is wired) — a `turn/end`
     *    error reason proves failure;
     * 4. otherwise a finished session counts as succeeded.
     *
     * @param task - a task whose latest execution has no endedAt.
     * @returns a settled event when the session state proves completion, else undefined.
     */
    reconcile(task: TaskRecord): Promise<ExecutionEvent | undefined>;
    /** Best-effort failure probe over the raw history tail (false when unavailable). */
    private historyShowsFailure;
    private connectSession;
    private driverOf;
    private sendPrompt;
    /**
     * Subscribe to the execution session and settle the run once the accepted
     * turn completes (turn counter advanced past the acceptance baseline and
     * the session is no longer running). Never settles while the session is
     * still running; unsubscribes on settle.
     */
    private watchForSettlement;
}
