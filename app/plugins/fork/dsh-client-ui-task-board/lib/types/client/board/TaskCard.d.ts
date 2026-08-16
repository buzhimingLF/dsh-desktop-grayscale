import type { TaskRecord } from '../../core/tasks.ts';
/** Compact relative/absolute time label. */
export declare function formatTime(ms: number): string;
/** One card in a column. */
declare function TaskCardInner({ task, onClick }: {
    task: TaskRecord;
    onClick: () => void;
}): import("react").JSX.Element;
/** Memoized card: re-renders only when the card's own task record changes. */
export declare const TaskCard: import("react").MemoExoticComponent<typeof TaskCardInner>;
export {};
