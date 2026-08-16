import type { BoardController } from '../core/controller.ts';
/** The injected board container (kept in the DOM, hidden when inactive). */
export declare const BOARD_VIEW_SELECTOR = "[data-dsh-taskboard-view]";
/**
 * Mount the board React tree into the center column and bind its visibility
 * to the controller's boardOpen state.
 * @param controller - the board controller driving the view.
 * @returns disposer unmounting the tree and restoring the column.
 */
export declare function mountBoard(controller: BoardController): () => void;
