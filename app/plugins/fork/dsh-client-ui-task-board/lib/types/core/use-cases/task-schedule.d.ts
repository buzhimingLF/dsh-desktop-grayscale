import { type TaskRecord } from '../tasks.ts';
/** Fields the schedule use case may change on a rule. */
export interface SetSchedulePatch {
    enabled?: boolean;
    cron?: string;
}
/** Result of arming/disarming a rule. */
export interface SetScheduleResult {
    /** The next ledger; unchanged reference when rejected. */
    tasks: readonly TaskRecord[];
    /** Whether the rule was applied (false on unknown task / invalid cron). */
    applied: boolean;
}
/**
 * Set a task's schedule rule. A blank or invalid cron is rejected (state
 * untouched); an enabled rule computes the next run instant immediately, a
 * disabled or invalid one carries no next-run instant.
 * @param tasks - current ledger.
 * @param id - the task to schedule.
 * @param patch - rule fields to change (absent fields keep their current value).
 * @param now - clock instant (ms epoch).
 */
export declare function applySetSchedule(tasks: readonly TaskRecord[], id: string, patch: SetSchedulePatch, now: number): SetScheduleResult;
/**
 * Roll a task's schedule rule forward (scheduler callback): persist the next
 * due instant and the trigger instant. No-op for tasks without a rule (deleted
 * mid-tick, for example).
 * @param tasks - current ledger.
 * @param id - the task to roll forward.
 * @param nextRunAt - next due instant (may be undefined to clear).
 * @param lastTriggeredAt - the trigger instant of this run.
 * @param now - clock instant (ms epoch).
 */
export declare function applyScheduleNextRun(tasks: readonly TaskRecord[], id: string, nextRunAt: number | undefined, lastTriggeredAt: number | undefined, now: number): readonly TaskRecord[];
