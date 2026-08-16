/**
 * The DOM layout controller: extends the web shell's three-column frame
 * (`[data-dsh-frame]`, a grid) with two trailing grid tracks — the preview
 * region and the explorer column — by mirroring the shell's own inline
 * grid-template-columns string and re-appending the two panel tracks on every
 * shell update (MutationObserver, same frame before paint). Also owns the
 * absolute drag handles (12px explorer / 20px preview hit zones), the
 * floating expand button, and the collapse-as-width-0 keep-mounted behavior.
 *
 * The shell's inline style is the source of truth for the sidebar and details
 * tracks; this controller never guesses their widths. Handles are out-of-flow
 * (absolute), so appending tracks never disturbs the shell's own children.
 *
 * AionUi Layout architecture (Apache-2.0, re-implemented): the explorer
 * column collapses to width 0 while staying mounted; the preview region keeps
 * a 1px left border only (no outer margins — gaps would expose the window
 * background, jarring in dark mode).
 * @module dsh-aionui-panel/client/layout
 */
import type { LayoutStore } from './store.ts';
/** Read the current frame element (undefined while the shell is not mounted). */
export declare function getFrameElement(): HTMLElement | null;
/**
 * Parse an inline grid-template-columns string into its tracks. Handles
 * "minmax(0, 1fr)" (spaces inside parens must not split). Empty on failure.
 */
export declare function parseGridTracks(input: string): string[];
/** Extract a px width from one track (0 for fr/minmax/non-px tracks). */
export declare function trackPx(track: string): number;
/** One drag handle's geometry (hit zone + visual line) — pure CSS in the module. */
export declare const EXPLORER_HANDLE_WIDTH = 12;
export declare const PREVIEW_HANDLE_WIDTH = 20;
/** The layout controller: frame sync, handles, floating button, width math. */
export declare class PanelLayoutController {
    private readonly layout;
    private frame;
    private previewCol;
    private explorerCol;
    private explorerHandle;
    private previewHandle;
    private floatingButton;
    private styleObserver;
    private sizeObserver;
    private waitObserver;
    private frameWidth;
    /** The shell's own 3 tracks (sidebar, center, details) — mirror of its inline style. */
    private shellTracks;
    private instantTimer;
    private disposers;
    constructor(layout: LayoutStore);
    /** Start watching for the frame and attach once it appears. */
    mount(): void;
    /** Attach to the frame: columns, handles, observers, store subscription. */
    private attach;
    /** Create one drag handle element with its pointer wiring. */
    private createHandle;
    /** Toggle explorer collapse (width 0, kept mounted; no transition). */
    toggleExplorer(): void;
    /** Toggle the preview region (open = tabs exist; close keeps tabs). */
    setPreviewOpen(open: boolean): void;
    /** Apply one store update with transitions disabled for exactly one frame. */
    private instant;
    /** Re-write the frame grid and reposition handles + floating button. */
    private applyGrid;
    /** Detach everything (plugin unload). */
    dispose(): void;
}
//# sourceMappingURL=layout.d.ts.map