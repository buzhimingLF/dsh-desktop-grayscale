/**
 * Board controller: the single owner of task-ledger state and view state.
 *
 * It keeps the ledger in memory, persists every mutation through the
 * {@link TaskStore}, drives real executions through the
 * {@link ExecutionService}, and closes the board view whenever the user
 * navigates to a session (the sessions-list `current` selection changes).
 * Framework-free (structural runtime faces) so the whole orchestration is
 * unit-testable with fakes.
 *
 * The per use-case domain transitions (create/update/delete/schedule) live in
 * dedicated modules under core/use-cases and are applied here; the controller
 * owns only the orchestration seam (state, persistence, notify, execution,
 * navigation, reconciliation).
 */
import { ExecutionService } from './execution.ts';
import type { TaskStore } from './store.ts';
import { type NewTaskInput, type TaskRecord, type TaskStatus } from './tasks.ts';
import { type TaskUpdatePatch } from './use-cases/task-update.ts';
/** The sessions face the controller needs for navigation awareness. */
export interface SessionsControllerFace {
    list: {
        getSnapshot(): {
            current: string | undefined;
        };
        subscribe(fn: () => void): () => void;
    };
    /** Select a session as current (navigates the conversation view). */
    open(id: string): void;
}
/** Controller dependencies (all swappable in tests). */
export interface ControllerDeps {
    store: TaskStore;
    exec: ExecutionService;
    sessions: SessionsControllerFace;
    /** Clock; defaults to Date.now. */
    now?: () => number;
    /** Id minting; defaults to a random-uuid. */
    uuid?: () => string;
    /** Debounce (ms) for session-list-changed reconciles; defaults to 350. */
    reconcileDebounceMs?: number;
}
/** One workspace option the execution-target pickers offer. */
export interface ExecutionWorkspaceOption {
    workspaceId: string;
    /** Display label (workspace title; the wiring falls back to the path). */
    title: string;
}
/** One agent-preset option the execution-target pickers offer. */
export interface ExecutionPresetOption {
    id: string;
    name?: string;
    description?: string;
    /** Why this preset cannot compose a session; the pickers disable it. */
    broken?: string;
    isDefault: boolean;
}
/** The execution-target option sets the UI feeds into the controller. */
export interface ExecutionOptionsSnapshot {
    workspaces: readonly ExecutionWorkspaceOption[];
    presets: readonly ExecutionPresetOption[];
}
/** Immutable controller snapshot for UI subscriptions. */
export interface ControllerSnapshot {
    tasks: readonly TaskRecord[];
    boardOpen: boolean;
    selectedTaskId: string | undefined;
    /** Picker option sets (workspace list + agent-preset roster). */
    executionOptions: ExecutionOptionsSnapshot;
}
/** The selected task (resolved from the ledger), or undefined. */
export declare function selectedTaskOf(snapshot: ControllerSnapshot): TaskRecord | undefined;
/**
 * Board controller (see module doc). All mutations bump the snapshot and
 * persist through the store; UI and DOM mounts subscribe and re-render.
 */
export declare class BoardController {
    private readonly deps;
    private tasks;
    private boardOpen;
    private selectedTaskId;
    private executionOptions;
    private listeners;
    private disposers;
    private readonly now;
    private readonly uuid;
    /** @param deps - store, execution service, and the sessions navigation face. */
    constructor(deps: ControllerDeps);
    /** Load the persisted ledger and start the navigation/status subscriptions. */
    start(): void;
    /** Stop all subscriptions and drop retained state (idempotent). */
    dispose(): void;
    getSnapshot(): ControllerSnapshot;
    subscribe(fn: () => void): () => void;
    openBoard(): void;
    closeBoard(): void;
    toggleBoard(): void;
    openTask(id: string): void;
    closeTask(): void;
    createTask(input: NewTaskInput): TaskRecord | undefined;
    updateTask(id: string, patch: TaskUpdatePatch): void;
    /**
     * Replace (a part of) the picker option sets the UI feeds (workspace list
     * and agent-preset roster come from the runtime, not the ledger).
     */
    setExecutionOptions(patch: Partial<ExecutionOptionsSnapshot>): void;
    moveTask(id: string, status: TaskStatus): void;
    deleteTask(id: string): void;
    /**
     * Update a task's schedule rule. A blank or invalid cron expression is
     * rejected (returns false, state untouched). When the rule ends up enabled
     * the next run instant is computed immediately; a disabled rule carries no
     * next-run instant. Delegates the domain transition to the schedule use case.
     * @param id - the task to schedule.
     * @param patch - fields to change (absent fields keep their current value).
     * @returns true when applied, false when rejected (invalid cron / unknown task).
     */
    setSchedule(id: string, patch: {
        enabled?: boolean;
        cron?: string;
    }): boolean;
    /**
     * Roll a task's schedule forward (scheduler callback): persist the next due
     * instant and the trigger instant of this run. No-op when the task has no
     * schedule rule (it was deleted mid-tick, for example).
     */
    applyScheduleNextRun(id: string, nextRunAt: number | undefined, lastTriggeredAt: number | undefined): void;
    /**
     * Jump to an execution's session transcript. Selecting the session changes
     * `current`, which closes the board (the conversation view takes over).
     * @param sessionId - the execution session to open.
     */
    openSession(sessionId: string): void;
    /**
     * Execute a task for real: move it to 'running', open an execution record,
     * and hand off to the ExecutionService. A second call while the task is
     * already running is ignored.
     */
    runTask(id: string): Promise<boolean>;
    /** Re-run a settled task: move it back to 'todo' first, then execute. */
    rerunTask(id: string): Promise<void>;
    private handleExecutionEvent;
    /** Reconcile running tasks and close the board when the user navigates. */
    private onSessionsChanged;
    private lastCurrent;
    /** Execution ids launched on this page; they settle via their live watch, never list reconciliation. */
    private readonly activeExecutionIds;
    /** Debounce timer for {@link reconcileRunningTasks}. */
    private reconcileTimer;
    /** Whether a reconcile pass is underway (single-flight guard). */
    private reconcileInFlight;
    /**
     * Debounce + single-flight trigger for the running-task reconciliation.
     * Session-list notifications arrive in bursts (one per session status
     * change); both guards together keep a burst from reading the history API
     * once per running task.
     */
    private scheduleReconcile;
    /** Settle tasks left 'running' whose sessions already finished. */
    private reconcileRunningTasks;
    private persistAndNotify;
    private notify;
}
