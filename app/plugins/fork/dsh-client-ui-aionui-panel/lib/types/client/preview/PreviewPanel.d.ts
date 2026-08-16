/**
 * The preview panel root: tab strip + toolbar + content router, the tab
 * context menu (close left/right/others/all), the dirty-close confirmation
 * (the single entry for every batch close — middle-click included), and the
 * panel collapse button. View mode and split live here so the toolbar and the
 * content share one source; both reset when the displayed file changes.
 * @module dsh-aionui-panel/client/preview/PreviewPanel
 */
import type { JSX } from 'react';
import type { PanelStores } from '../store.ts';
/** The preview panel (mounted in the preview grid column). */
export declare function PreviewPanel({ stores }: {
    stores: PanelStores;
}): JSX.Element;
//# sourceMappingURL=PreviewPanel.d.ts.map