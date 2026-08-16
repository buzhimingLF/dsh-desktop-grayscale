/**
 * Task board domain model: task lifecycle statuses, the task record shape,
 * and the pure transition functions the controller and tests share.
 * Framework-free (no cordis, no runtime imports) so the state machine is
 * unit-testable in isolation.
 */
/** Task lifecycle status, one per kanban column. */
export type TaskStatus = 'backlog' | 'todo' | 'running' | 'done' | 'failed';
/**
 * One real execution attempt: the run's own id, the dsh session that ran it
 * (filled once the session is created), and the settled outcome once the
 * session's turn ended.
 */
export interface ExecutionRecord {
    /** Execution attempt id (uuid). */
    id: string;
    /** The dsh session that ran this attempt; absent until creation resolves. */
    sessionId: string | undefined;
    /** When the run started (ms epoch). */
    startedAt: number;
    /** When the run settled; absent while still running. */
    endedAt: number | undefined;
    /** Outcome once settled. */
    result: 'succeeded' | 'failed' | 'cancelled' | undefined;
    /** Human failure text when the run failed (prompt rejection or agent error). */
    error: string | undefined;
}
/**
 * A scheduled-run rule attached to a task. The browser-side scheduler ticks
 * every minute and triggers the task when `nextRunAt` is due; the rule is
 * persisted with the task (localStorage), so scheduling survives refreshes.
 */
export interface ScheduleRule {
    /** Whether the schedule is armed. */
    enabled: boolean;
    /** 5-field cron expression: `分 时 日 月 周`. */
    cron: string;
    /** Next due instant (ms epoch); maintained by the scheduler/controller. */
    nextRunAt: number | undefined;
    /** Instant of the latest scheduled trigger (ms epoch). */
    lastTriggeredAt: number | undefined;
}
/** One task on the board. */
export interface TaskRecord {
    /** Stable task id (uuid). */
    id: string;
    /** Short display title. */
    title: string;
    /** Longer human description shown in the detail view. */
    description: string;
    /** The prompt sent to dsh when this task is executed. */
    prompt: string;
    /** Current column. */
    status: TaskStatus;
    /** Creation instant (ms epoch). */
    createdAt: number;
    /** Last mutation instant (ms epoch). */
    updatedAt: number;
    /** Every execution attempt, most recent last. */
    executions: ExecutionRecord[];
    /** Optional scheduled-run rule (absent on tasks without a schedule). */
    schedule?: ScheduleRule;
    /**
     * Workspace the execution must run in (a workspace-list id); absent means
     * the recent-workspace fallback at execution time.
     */
    workspaceId?: string;
    /**
     * Agent preset the execution session must be composed from (an
     * `agentPreset.list` id); absent means the deployment default.
     */
    mode?: string;
    /**
     * Permission preset applied to the execution session through the
     * `/permission <id>` slash command; absent leaves the session default.
     */
    permission?: TaskPermission;
}
/** Permission presets a task may pin on its execution session (the `/permission <id>` ids). */
export declare const TASK_PERMISSIONS: readonly ["read-only", "workspace-write", "danger-full-access"];
/** One permission preset id. */
export type TaskPermission = typeof TASK_PERMISSIONS[number];
/** Whether an unknown value is a known permission preset id. */
export declare function isTaskPermission(value: unknown): value is TaskPermission;
/** Input for creating a task. */
export interface NewTaskInput {
    title: string;
    description: string;
    prompt: string;
    /** Workspace the execution must run in; empty/absent = the recent workspace. */
    workspaceId?: string;
    /** Agent preset the execution session must be composed from; empty/absent = deployment default. */
    mode?: string;
    /** Permission preset applied to the execution session; absent = session default. */
    permission?: TaskPermission;
}
/** The five kanban columns, in display order. */
export declare const COLUMNS: readonly {
    status: TaskStatus;
    label: string;
}[];
/** Statuses a user may move a card to manually (execution states are owned by the runner). */
export declare const MANUAL_STATUSES: readonly TaskStatus[];
/** Statuses the runner may move a card to from 'running'. */
export declare const RUNNER_SETTLE_STATUSES: readonly TaskStatus[];
/** All valid statuses (closed union guard). */
export declare const ALL_STATUSES: readonly TaskStatus[];
/** Brand an unknown string as a status; undefined when it is not one. */
export declare function isTaskStatus(value: unknown): value is TaskStatus;
/** Whether a manual move target is allowed from the given status. */
export declare function canMoveManually(_from: TaskStatus, to: TaskStatus): boolean;
/** Create a task from user input. */
export declare function createTask(input: NewTaskInput, now: number, id: string): TaskRecord;
/** Clone a task with an updated status and a fresh updatedAt. */
export declare function withStatus(task: TaskRecord, status: TaskStatus, now: number): TaskRecord;
/**
 * Merge a schedule patch into a task's schedule rule (creating it when
 * absent), with a fresh updatedAt. Keys present in the patch overwrite the
 * current value — including explicit `undefined`, which clears a field (used
 * to disarm `nextRunAt`); absent keys keep their current value.
 */
export declare function withSchedule(task: TaskRecord, patch: Partial<ScheduleRule>, now: number): TaskRecord;
/**
 * Open a fresh execution on a task: move it to 'running' and append a
 * running execution record. Returns the new task and the new execution.
 */
export declare function startExecution(task: TaskRecord, now: number, executionId: string): {
    task: TaskRecord;
    execution: ExecutionRecord;
};
/**
 * Settle a running execution: record the outcome and move the task into the
 * matching column. No-op (returns the input task) when the execution is not
 * the task's latest or is already settled.
 */
export declare function settleExecution(task: TaskRecord, executionId: string, outcome: 'succeeded' | 'failed' | 'cancelled', now: number, error: string | undefined): TaskRecord;
/** A settled-execution summary string for the detail view. */
export declare function executionLabel(execution: ExecutionRecord): string;
