/**
 * The preview tab strip: 36px bar, tabs capped at 180px (padding 0 10, gap 6,
 * 12px title), dirty dot (6px, primary), close glyph (16px box, 12px icon),
 * middle-click close, right-click menu (close left/right/others/all), the
 * 32px left/right overflow fade indicators (ResizeObserver + scroll), the
 * new-URL-tab plus, and the panel collapse button.
 * @module dsh-aionui-panel/client/preview/PreviewTabs
 */
import type { JSX } from 'react';
import type { PreviewTabState } from '../store.ts';
/** Tab width cap (AionUi measured). */
export declare const MAX_TAB_WIDTH_PX = 180;
/** Left/right overflow state. */
export interface TabFadeState {
    left: boolean;
    right: boolean;
}
/** The tab strip. */
export declare function PreviewTabs({ tabs, activeTabId, onSwitch, onClose, onContextMenu, onNewUrlTab, onClosePanel, }: {
    tabs: PreviewTabState[];
    activeTabId: string | null;
    onSwitch: (id: string) => void;
    onClose: (id: string) => void;
    onContextMenu: (event: React.MouseEvent, tab: PreviewTabState) => void;
    onNewUrlTab: () => void;
    onClosePanel: () => void;
}): JSX.Element;
//# sourceMappingURL=PreviewTabs.d.ts.map