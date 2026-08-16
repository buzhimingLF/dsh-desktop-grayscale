/**
 * DOM mounting: two React roots rendered into the panel columns the layout
 * controller appends to the frame grid. The roots wait for their columns
 * (the shell mounts asynchronously), and everything is wrapped so a DOM
 * failure degrades the panels, never the GUI boot.
 * @module dsh-aionui-panel/client/mount
 */
import type { PanelStores } from './store.ts';
/**
 * Mount both panel roots.
 * @param stores - the panel store bundle.
 * @param onToggleExplorer - collapse toggle (owned by the layout controller).
 * @returns a disposer unmounting both trees.
 */
export declare function mountPanels(stores: PanelStores, onToggleExplorer: () => void): () => void;
//# sourceMappingURL=mount.d.ts.map