import type { BoardController } from '../../core/controller.ts';
/** New-task form overlay. */
export declare function NewTaskModal({ controller, onClose }: {
    controller: BoardController;
    onClose: () => void;
}): import("react").JSX.Element;
