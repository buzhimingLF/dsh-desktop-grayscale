import type { BoardController } from '../../core/controller.ts';
import { type TaskRecord } from '../../core/tasks.ts';
/** Task detail overlay. */
export declare function TaskDetail({ controller, task }: {
    controller: BoardController;
    task: TaskRecord;
}): import("react").JSX.Element;
