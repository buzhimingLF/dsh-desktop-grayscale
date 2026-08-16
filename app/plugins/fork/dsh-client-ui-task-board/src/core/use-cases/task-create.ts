/**
 * Create-task use case: mint a new task from user input, rejecting a blank
 * title. Pure ledger transition (no persistence or notify — the controller
 * orchestrates those), so it is unit-testable without any runtime face.
 */
import { createTask, type NewTaskInput, type TaskRecord } from '../tasks.ts'

/** Result of a create transition: the new task (when accepted) + the next ledger. */
export interface CreateTaskResult {
  /** The minted task, or undefined when the input was rejected (blank title). */
  task: TaskRecord | undefined
  /** The next ledger; identical reference when rejected. */
  tasks: readonly TaskRecord[]
}

/**
 * Apply a create against the current ledger. Returns the new task and the
 * appended ledger, or the unchanged ledger when the title is blank.
 * @param tasks - current ledger.
 * @param input - raw user input (title/description/prompt).
 * @param now - clock instant (ms epoch).
 * @param id - minted task id.
 */
export function applyCreateTask(
  tasks: readonly TaskRecord[],
  input: NewTaskInput,
  now: number,
  id: string,
): CreateTaskResult {
  if (input.title.trim() === '') return { task: undefined, tasks }
  const task = createTask(input, now, id)
  return { task, tasks: [...tasks, task] }
}
