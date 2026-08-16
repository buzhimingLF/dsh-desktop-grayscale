/**
 * Framework-free state core of the panel system: four small stores (layout,
 * explorer, scm, preview) built on a minimal subscribe/getSnapshot primitive
 * so every decision lives outside React (StrictMode-safe: update reducers are
 * pure; async work — fetches, persistence — runs in the action layer).
 *
 * AionUi's right-panel architecture (Apache-2.0, re-implemented): the width
 * clamps below are the exact ordered pair that keeps the chat area >= 360px
 * at all times (see the research report's section 4.2).
 * @module dsh-aionui-panel/client/store
 */
import type { FsEntry, GitStatusView, PreviewContentType, SearchHit } from '../core/types.ts';
import type { PanelApi } from './api.ts';
/** A minimal external store usable with useSyncExternalStore. */
export interface StateHandle<S> {
    getSnapshot: () => S;
    subscribe: (listener: () => void) => () => void;
    /** Pure update: fn receives the previous state and returns the next. */
    update: (fn: (prev: S) => S) => void;
}
/** Create a state handle with an immutable snapshot (new object per update). */
export declare function createState<S>(initial: S): StateHandle<S>;
/** Chat-area floor the two clamps guarantee (never below this). */
export declare const MIN_CHAT_PANEL_PX = 360;
/** Preview region width contract. */
export declare const MIN_PREVIEW_PANEL_PX = 340;
export declare const DEFAULT_PREVIEW_REGION_PX = 480;
export declare const MAX_PREVIEW_REGION_PX = 1200;
/** Explorer (workspace) width contract. */
export declare const MIN_WORKSPACE_PANEL_PX = 220;
export declare const MAX_WORKSPACE_PANEL_PX = 500;
export declare const DEFAULT_WORKSPACE_PANEL_PX = 260;
/** Preview region horizontal chrome (margins + borders) the clamps subtract. */
export declare const PREVIEW_REGION_CHROME_PX = 24;
/** Storage keys (AionUi contract, verbatim). */
export declare const KEY_EXPLORER_WIDTH = "chat-workspace-width-px";
export declare const KEY_PREVIEW_WIDTH = "chat-preview-width-px";
export declare const KEY_COLLAPSE = "project-panel-collapse:";
export declare const KEY_EXPLORER_UI = "explorer-ui:";
export declare const KEY_SCM_UI = "scm-ui:";
/**
 * Explorer clamp (runs first): reserve chat's floor plus the preview region
 * (min + chrome) when open, so the explorer never grows into the preview's
 * space; floor at the explorer minimum so a narrow container cannot squeeze
 * it to nothing.
 */
export declare function clampExplorerWidth(requested: number, available: number, previewOpen: boolean): number;
/**
 * Preview clamp (runs after the explorer clamp): reserve chat's floor plus
 * the already-clamped explorer width plus the region chrome. The ordered pair
 * guarantees chat = available - explorer - preview >= 360.
 */
export declare function clampPreviewWidth(requested: number, available: number, explorerWidth: number): number;
/** Layout panel state (project-scoped). */
export interface LayoutState {
    /** The project root ('' when no project is bound). */
    root: string;
    /** Requested explorer width (persisted; clamped on render). */
    explorerWidth: number;
    /** Requested preview width (persisted; clamped on render). */
    previewWidth: number;
    /** Explorer collapsed (width 0, kept mounted). */
    explorerCollapsed: boolean;
    /** Preview region visible. */
    previewOpen: boolean;
    /** Measured available width of the [content | panels] row. */
    availableWidth: number;
    /** True while a panel drag is in flight (disables transitions). */
    dragging: boolean;
}
/** The layout store plus its pure width math. */
export interface LayoutStore extends StateHandle<LayoutState> {
    /** Effective explorer width after the ordered clamp. */
    explorerWidthPx: (state: LayoutState) => number;
    /** Effective preview width after the ordered clamp. */
    previewWidthPx: (state: LayoutState) => number;
    /** Persist a clamped shrink when the stored width no longer fits. */
    shrinkToFit: (state: LayoutState) => void;
}
/** Storage key of the collapse preference for one root. */
export declare const collapseKey: (root: string) => string;
/** Create the layout store (reads persisted widths on init). */
export declare function createLayoutStore(): LayoutStore;
/** Switch the layout to a project root (restores collapse + widths). */
export declare function layoutSetRoot(store: LayoutStore, root: string, previewOpen: boolean): void;
/** Explorer panel state. */
export interface ExplorerState {
    root: string;
    /** rel path -> listing cache ('' = root). */
    dirs: Record<string, FsEntry[]>;
    /** Expanded dir rel paths (order = display order). */
    expanded: string[];
    /** Selected node rel path (null = none). */
    selected: string | null;
    /** Dirs currently fetching. */
    loading: string[];
    /** Active tab: files | changes. */
    activeTab: 'files' | 'changes';
    /** Filename search state. */
    search: {
        query: string;
        status: 'idle' | 'searching' | 'done' | 'error';
        hits: SearchHit[];
        truncated: boolean;
    };
    /** Bumped on every fs change event (drives refetch + re-render). */
    version: number;
}
/** The explorer store with its async actions. */
export interface ExplorerStore extends StateHandle<ExplorerState> {
    setRoot: (root: string) => void;
    setActiveTab: (tab: 'files' | 'changes') => void;
    toggleDir: (rel: string) => void;
    select: (rel: string | null) => void;
    reveal: (rel: string) => void;
    setSearchQuery: (query: string) => void;
    cancelSearch: () => void;
    /** Refetch every expanded dir + active search after a host change event. */
    handleFsChange: () => void;
}
/** Read the persisted explorer UI state for a root (range-guarded). */
export declare function readExplorerUi(root: string): {
    expanded: string[];
    selected: string | null;
};
/** Create the explorer store (per-root persistence, debounced writes). */
export declare function createExplorerStore(api: PanelApi): ExplorerStore;
/** SCM panel state. */
export interface ScmState {
    root: string;
    /** null: not a git repository (or still loading). */
    status: GitStatusView | null;
    /** True when the host reported git is not installed (SSE gitUnavailable). */
    gitMissing: boolean;
    loading: boolean;
    /** Paths with an action in flight. */
    busy: string[];
    /** Paths the last action reported failed. */
    failed: string[];
    /** list | tree. */
    viewMode: 'list' | 'tree';
    /** Section collapse map (repositories | changes). */
    sectionCollapsed: Record<string, boolean>;
    /** Tree-view expanded dir keys. */
    treeExpanded: string[];
    /** Path of the last row opened in the preview panel (null = none). */
    selected: string | null;
}
/** The scm store with its async actions. */
export interface ScmStore extends StateHandle<ScmState> {
    setRoot: (root: string) => void;
    refresh: () => Promise<void>;
    stage: (paths: string[]) => Promise<void>;
    unstage: (paths: string[]) => Promise<void>;
    discard: (paths: string[]) => Promise<void>;
    discardAll: () => Promise<void>;
    setViewMode: (mode: 'list' | 'tree') => void;
    setSectionCollapsed: (id: string, collapsed: boolean) => void;
    setTreeExpanded: (keys: string[]) => void;
    setFailed: (paths: string[]) => void;
    select: (path: string | null) => void;
}
/** Read the persisted scm UI state for a root (guarded). */
export declare function readScmUi(root: string): {
    viewMode: 'list' | 'tree';
    sectionCollapsed: Record<string, boolean>;
    treeExpanded: string[];
    selected: string | null;
};
/** Create the scm store (host status is the only truth — no optimistic rows). */
export declare function createScmStore(api: PanelApi): ScmStore;
/** One preview tab. */
export interface PreviewTabState {
    id: string;
    title: string;
    root: string;
    path: string;
    contentType: PreviewContentType;
    /** Diff tabs (opened from the SCM panel): content is the path's git diff. */
    diff?: {
        staged: boolean;
    };
    /** URL tabs: bumped by reloadTab to re-navigate the preview frame. */
    reloadNonce?: number;
    /** null: content not loaded yet. */
    content: string | null;
    /** Image dimensions for image tabs. */
    image?: {
        width: number;
        height: number;
    };
    dirty: boolean;
    /** mtime the loaded/saved content is based on (write-conflict base). */
    mtime?: number;
    /** Disk is newer than the loaded content (refresh affordance). */
    updated: boolean;
    loading: boolean;
    truncated: boolean;
    error: string | null;
    savedAt: number;
}
/** Preview panel state. */
export interface PreviewState {
    root: string;
    open: boolean;
    tabs: PreviewTabState[];
    activeTabId: string | null;
    /** Bumped on every fs change event (drives staleness checks). */
    version: number;
}
/** The preview store with its async actions. */
export interface PreviewStore extends StateHandle<PreviewState> {
    setRoot: (root: string) => void;
    openFile: (root: string, path: string) => void;
    openDiff: (root: string, path: string, staged: boolean) => void;
    switchTab: (id: string) => void;
    closeTabs: (ids: string[]) => void;
    updateContent: (id: string, content: string) => void;
    saveTab: (id: string) => Promise<void>;
    reloadTab: (id: string) => Promise<void>;
    setOpen: (open: boolean) => void;
    handleFsChange: () => void;
    handleGitChange: (root: string) => void;
}
/** Persisted tab meta (content is re-fetched on restore). */
interface PersistedTab {
    id: string;
    title: string;
    root: string;
    path: string;
    contentType: PreviewContentType;
    diff?: {
        staged: boolean;
    };
    savedAt: number;
}
/** Read persisted tabs for a root (guarded, content-less). */
export declare function readPreviewTabs(root: string): PersistedTab[];
/** Create the preview store (per-root tab persistence with LRU scopes). */
export declare function createPreviewStore(api: PanelApi): PreviewStore;
/** Convenience bundle: the four stores wired to one api. */
export interface PanelStores {
    layout: LayoutStore;
    explorer: ExplorerStore;
    scm: ScmStore;
    preview: PreviewStore;
}
/** PanelStores plus a pagehide flush hook. */
export interface PanelStoresWithFlush extends PanelStores {
    /** Flush every pending debounced persist immediately (pagehide/beforeunload). */
    flushNow: () => void;
}
/** Create the full store bundle. */
export declare function createPanelStores(api: PanelApi): PanelStoresWithFlush;
export {};
//# sourceMappingURL=store.d.ts.map