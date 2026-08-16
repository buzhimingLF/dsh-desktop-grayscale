/**
 * Minimal overlay primitives for the panel: a toast and a context menu,
 * rendered through plain DOM + portals so they can live outside the grid
 * columns (fixed positioning, high z-index).
 * @module dsh-aionui-panel/client/components/overlay
 */
import type { JSX } from 'react';
export declare function toast(message: string): void;
/** One context-menu entry. */
export interface MenuEntry {
    key: string;
    label: string;
    disabled?: boolean;
    danger?: boolean;
    onSelect: () => void;
}
export interface MenuState {
    x: number;
    y: number;
    entries: MenuEntry[];
}
/** The shared context-menu portal host (one at a time). */
export declare function ContextMenu({ state, onClose }: {
    state: MenuState | null;
    onClose: () => void;
}): JSX.Element | null;
/** A confirmation dialog (dirty-close confirm, discard confirm). */
export declare function ConfirmDialog({ title, body, confirmLabel, danger, onConfirm, onCancel, }: {
    title: string;
    body: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}): JSX.Element;
//# sourceMappingURL=overlay.d.ts.map