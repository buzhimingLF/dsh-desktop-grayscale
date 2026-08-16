/**
 * Framework-free drag machinery shared by the React hook (useResizableSplit)
 * and the DOM layout controller: one pointer-down handler that owns capture,
 * the rAF-flush loop, the e.buttons === 0 fallback, every end path, and the
 * drag styles. Pure DOM — no React, so both callers run the exact same
 * smoothness core (AionUi's useResizableSplit architecture, re-implemented).
 * @module dsh-aionui-panel/client/drag
 */
export interface DragStartOptions {
    /** Drag left = grow (handle on the left edge of its container). */
    reverse: boolean;
    /** Width at drag start (read at pointer-down time). */
    getStartWidth: () => number;
    /** Clamped width from the raw delta (px mode adds deltaX directly). */
    compute: (startWidth: number, deltaX: number) => number;
    /** Per-frame flush (rAF-merged; called at most once per frame). */
    onFrame: (width: number) => void;
    /** Final commit (also fired on every end path). */
    onEnd: (width: number) => void;
}
/**
 * Handle one pointer-down: wire capture + window listeners, run the rAF
 * loop, and end on any of the five termination paths. Call from a
 * onPointerDown handler (React or plain DOM).
 * @param event - the raw pointerdown event.
 * @param el - the handle element (capture target + reverse marker source).
 * @param opts - drag behavior.
 * @returns a disposer (idempotent; also called internally on end).
 */
export declare function handlePointerDragStart(event: PointerEvent, el: HTMLElement, opts: DragStartOptions): () => void;
//# sourceMappingURL=drag.d.ts.map