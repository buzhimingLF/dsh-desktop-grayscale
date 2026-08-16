import type { TaskRecord } from './tasks.ts';
/** Everything the scheduler needs from its host (the board controller). */
export interface SchedulerDeps {
    /** Read the current task ledger (the controller snapshot). */
    tasks(): readonly TaskRecord[];
    /** Clock; defaults to Date.now in the controller wiring. */
    now(): number;
    /** Trigger one task's real execution (the controller's runTask); resolves
     *  true when the run was accepted, false when rejected (e.g. the task is
     *  already running). */
    runTask(id: string): Promise<boolean>;
    /** Persist a rolled-forward schedule (next due + this trigger instant). */
    applySchedule(id: string, nextRunAt: number | undefined, lastTriggeredAt: number | undefined): void;
    /** Tick cadence; defaults to 60_000 ms. */
    tickMs?: number;
    /**
     * Gate: while false the tick no-ops (e.g. the session list baseline has not
     * arrived on page load, so executions would fail). Defaults to always ready.
     */
    ready?: () => boolean;
    /** Environment listeners for tab-visibility recovery (browser only). */
    environment?: {
        addEventListener(type: 'visibilitychange', listener: () => void): void;
        removeEventListener(type: 'visibilitychange', listener: () => void): void;
    };
}
/**
 * The schedule heartbeat (see module doc). `tick` is public so tests and
 * callers can drive a check without waiting for the interval.
 */
export declare class SchedulerService {
    private readonly deps;
    private timer;
    private environmentListener;
    private disposed;
    private started;
    /** @param deps - tasks/clock/trigger/apply faces (see {@link SchedulerDeps}). */
    constructor(deps: SchedulerDeps);
    /**
     * Start ticking: one immediate check (catch-up after reload) + the interval.
     * Single-instance: a second start while already armed is a no-op, so a
     * re-entrant mount can never stack a duplicate timer.
     */
    start(): void;
    /**
     * Stop ticking and drop listeners (idempotent). Preferred shutdown verb for
     * callers that treat the scheduler as a controlled ticker; `dispose` is an
     * alias.
     */
    stop(): void;
    /** Stop ticking and drop listeners (idempotent). */
    dispose(): void;
    /**
     * Check every enabled schedule and trigger the due ones. Idempotent per
     * task per tick: the schedule is rolled forward only after runTask accepts
     * the run, so a rejected run keeps its due slot and is retried on the next
     * tick instead of being silently dropped.
     */
    tick(): Promise<void>;
}
