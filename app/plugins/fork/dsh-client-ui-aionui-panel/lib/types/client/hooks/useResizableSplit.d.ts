/**
 * The panel system's single drag engine hook — a thin React wrapper over the
 * framework-free machinery in drag.ts (AionUi's useResizableSplit
 * architecture, re-implemented): px or ratio units, range-validated
 * localStorage persistence, double-click reset to the default width.
 * @module dsh-aionui-panel/client/hooks/useResizableSplit
 */
import type { PointerEvent as ReactPointerEvent } from 'react';
export interface UseResizableSplitOptions {
    /** Default width (px or percent). */
    defaultWidth?: number;
    /** Minimum (same unit). */
    minWidth?: number;
    /** Maximum (same unit). */
    maxWidth?: number;
    /** localStorage key (preference persistence). */
    storageKey?: string;
    /** 'px' for fixed pixel widths, 'ratio' for percents (default 'ratio'). */
    unit?: 'px' | 'ratio';
}
export interface DragHandleProps {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onDoubleClick: () => void;
}
/**
 * Resizable-split engine.
 * @param options - width contract + persistence key.
 * @returns current width, the committed setter, handle props, and the clamp.
 */
export declare function useResizableSplit(options?: UseResizableSplitOptions): {
    width: number;
    setWidth: (value: number) => void;
    handleProps: DragHandleProps;
    clamp: (value: number) => number;
    isPx: boolean;
};
//# sourceMappingURL=useResizableSplit.d.ts.map