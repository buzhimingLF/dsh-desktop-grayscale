import { jsx as _jsx } from "react/jsx-runtime";
/**
 * DOM mounting: two React roots rendered into the panel columns the layout
 * controller appends to the frame grid. The roots wait for their columns
 * (the shell mounts asynchronously), and everything is wrapped so a DOM
 * failure degrades the panels, never the GUI boot.
 * @module dsh-aionui-panel/client/mount
 */
import { createRoot } from 'react-dom/client';
import { ExplorerPanel } from "./components/ExplorerPanel.js";
import { PreviewPanel } from "./preview/PreviewPanel.js";
const EXPLORER_COL_SELECTOR = '[data-aionui-explorer-col]';
const PREVIEW_COL_SELECTOR = '[data-aionui-preview-col]';
/** Wait for one selector (the shell/frame mounts after boot settlement). */
function waitForElement(selector, onFound) {
    let disposed = false;
    let observer;
    const tryFind = () => {
        if (disposed)
            return;
        const el = document.querySelector(selector);
        if (el !== null) {
            observer?.disconnect();
            onFound(el);
        }
    };
    observer = new MutationObserver(() => { tryFind(); });
    observer.observe(document.body, { childList: true, subtree: true });
    tryFind();
    return () => {
        disposed = true;
        observer?.disconnect();
    };
}
/**
 * Mount both panel roots.
 * @param stores - the panel store bundle.
 * @param onToggleExplorer - collapse toggle (owned by the layout controller).
 * @returns a disposer unmounting both trees.
 */
export function mountPanels(stores, onToggleExplorer) {
    let explorerRoot;
    let previewRoot;
    const disposers = [];
    disposers.push(waitForElement(EXPLORER_COL_SELECTOR, (el) => {
        explorerRoot = createRoot(el);
        explorerRoot.render(_jsx(ExplorerPanel, { stores: stores, onToggleCollapse: onToggleExplorer }));
    }));
    disposers.push(waitForElement(PREVIEW_COL_SELECTOR, (el) => {
        previewRoot = createRoot(el);
        previewRoot.render(_jsx(PreviewPanel, { stores: stores }));
    }));
    return () => {
        for (const dispose of disposers)
            dispose();
        explorerRoot?.unmount();
        previewRoot?.unmount();
    };
}
