/**
 * Update-task use case: apply an editable-field patch (title/description/
 * prompt plus the execution targets workspaceId/mode/permission) with a
 * fresh updatedAt. Pure ledger transition (no persistence or notify — the
 * controller orchestrates those).
 *
 * An explicit `undefined` in the patch clears the field (the task falls
 * back to the runtime default); an unknown permission string is ignored so
 * stale UI can never persist a value the execution service rejects.
 */
import { type TaskRecord } from '../tasks.ts';
/** Editable fields on a task (the update patch surface). */
export type TaskUpdatePatch = Partial<Pick<TaskRecord, 'title' | 'description' | 'prompt' | 'workspaceId' | 'mode' | 'permission'>>;
/**
 * Apply an update across the ledger. Tasks that do not match the id are left
 * untouched; the matched task receives the patch plus a fresh updatedAt.
 * @param tasks - current ledger.
 * @param id - the task to update.
 * @param patch - editable-field changes.
 * @param now - clock instant (ms epoch).
 */
export declare function applyUpdateTask(tasks: readonly TaskRecord[], id: string, patch: TaskUpdatePatch, now: number): readonly TaskRecord[];
