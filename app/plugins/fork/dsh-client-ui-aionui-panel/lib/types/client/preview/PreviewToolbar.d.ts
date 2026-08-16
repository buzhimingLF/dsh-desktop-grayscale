/**
 * The preview toolbar: 32px bar (padding 0 10). Left: source/preview toggle
 * (markdown/html), split-screen toggle (editable types), download. Right: the
 * refresh button (4-state: hidden/disabled/idle/updated — never a dead
 * button) and save (editable + dirty, Cmd/Ctrl+S too).
 * @module dsh-aionui-panel/client/preview/PreviewToolbar
 */
import type { JSX } from 'react';
import type { PreviewContentType } from '../../core/types.ts';
/** Refresh button states (AionUi's 4-state machine). */
export type RefreshState = 'hidden' | 'disabled' | 'idle' | 'updated';
/** Derive the refresh state for one tab. */
export declare function refreshStateFor(contentType: PreviewContentType, hasContent: boolean, loading: boolean, updated: boolean): RefreshState;
/** Download the current tab's content as a file. */
export declare function downloadTab(tab: {
    title: string;
    content: string | null;
    contentType: PreviewContentType;
}): void;
/** The toolbar. */
export declare function PreviewToolbar({ contentType, hasContent, loading, dirty, updated, viewMode, canToggleView, split, canSplit, onViewModeChange, onSplitChange, onRefresh, onSave, onDownload, }: {
    contentType: PreviewContentType;
    hasContent: boolean;
    loading: boolean;
    dirty: boolean;
    updated: boolean;
    viewMode: 'source' | 'preview';
    canToggleView: boolean;
    split: boolean;
    canSplit: boolean;
    onViewModeChange: (mode: 'source' | 'preview') => void;
    onSplitChange: (split: boolean) => void;
    onRefresh: () => void;
    onSave: () => void;
    onDownload: () => void;
}): JSX.Element;
//# sourceMappingURL=PreviewToolbar.d.ts.map