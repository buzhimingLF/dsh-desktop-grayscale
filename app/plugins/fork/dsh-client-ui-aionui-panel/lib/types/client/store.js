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
import { detectContentType, isTextType, pdfPreviewUrl, tabIdOf } from "./fileType.js";
import { createDebounced, evictPreviewScopes, readJson, readStoredNumber, writeJson, writeStoredNumber, } from "./persist.js";
// ─── state primitive ────────────────────────────────────────────────────────
/** Internal channel for the stored-layout flush used by pagehide flushing. */
const FLUSH_PERSIST = Symbol('flushPersist');
/** Create a state handle with an immutable snapshot (new object per update). */
export function createState(initial) {
    let state = initial;
    const listeners = new Set();
    return {
        getSnapshot: () => state,
        subscribe(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },
        update(fn) {
            const next = fn(state);
            if (next === state)
                return;
            state = next;
            for (const listener of listeners)
                listener();
        },
    };
}
// ─── layout: constants, clamps, store ───────────────────────────────────────
/** Chat-area floor the two clamps guarantee (never below this). */
export const MIN_CHAT_PANEL_PX = 360;
/** Preview region width contract. */
export const MIN_PREVIEW_PANEL_PX = 340;
export const DEFAULT_PREVIEW_REGION_PX = 480;
export const MAX_PREVIEW_REGION_PX = 1200;
/** Explorer (workspace) width contract. */
export const MIN_WORKSPACE_PANEL_PX = 220;
export const MAX_WORKSPACE_PANEL_PX = 500;
export const DEFAULT_WORKSPACE_PANEL_PX = 260;
/** Preview region horizontal chrome (margins + borders) the clamps subtract. */
export const PREVIEW_REGION_CHROME_PX = 24;
/** Storage keys (AionUi contract, verbatim). */
export const KEY_EXPLORER_WIDTH = 'chat-workspace-width-px';
export const KEY_PREVIEW_WIDTH = 'chat-preview-width-px';
export const KEY_COLLAPSE = 'project-panel-collapse:';
export const KEY_EXPLORER_UI = 'explorer-ui:';
export const KEY_SCM_UI = 'scm-ui:';
/**
 * Explorer clamp (runs first): reserve chat's floor plus the preview region
 * (min + chrome) when open, so the explorer never grows into the preview's
 * space; floor at the explorer minimum so a narrow container cannot squeeze
 * it to nothing.
 */
export function clampExplorerWidth(requested, available, previewOpen) {
    const reserve = MIN_CHAT_PANEL_PX + (previewOpen ? MIN_PREVIEW_PANEL_PX + PREVIEW_REGION_CHROME_PX : 0);
    const maxByContainer = Math.max(MIN_WORKSPACE_PANEL_PX, available - reserve);
    return Math.min(requested, maxByContainer);
}
/**
 * Preview clamp (runs after the explorer clamp): reserve chat's floor plus
 * the already-clamped explorer width plus the region chrome. The ordered pair
 * guarantees chat = available - explorer - preview >= 360.
 */
export function clampPreviewWidth(requested, available, explorerWidth) {
    const maxByContainer = Math.max(MIN_PREVIEW_PANEL_PX, available - MIN_CHAT_PANEL_PX - explorerWidth - PREVIEW_REGION_CHROME_PX);
    return Math.min(requested, maxByContainer);
}
/** Storage key of the collapse preference for one root. */
export const collapseKey = (root) => `${KEY_COLLAPSE}${root}`;
/** Create the layout store (reads persisted widths on init). */
export function createLayoutStore() {
    const handle = createState({
        root: '',
        explorerWidth: readStoredNumber(KEY_EXPLORER_WIDTH, MIN_WORKSPACE_PANEL_PX, MAX_WORKSPACE_PANEL_PX, DEFAULT_WORKSPACE_PANEL_PX),
        previewWidth: readStoredNumber(KEY_PREVIEW_WIDTH, MIN_PREVIEW_PANEL_PX, MAX_PREVIEW_REGION_PX, DEFAULT_PREVIEW_REGION_PX),
        explorerCollapsed: false,
        previewOpen: false,
        availableWidth: 0,
        dragging: false,
    });
    const store = Object.assign(handle, {
        explorerWidthPx(state) {
            return state.explorerCollapsed ? 0 : clampExplorerWidth(state.explorerWidth, state.availableWidth, state.previewOpen);
        },
        previewWidthPx(state) {
            if (!state.previewOpen)
                return 0;
            const explorer = state.explorerCollapsed ? 0 : clampExplorerWidth(state.explorerWidth, state.availableWidth, true);
            return clampPreviewWidth(state.previewWidth, state.availableWidth, explorer);
        },
        shrinkToFit(state) {
            if (state.availableWidth <= 0)
                return;
            const explorer = clampExplorerWidth(state.explorerWidth, state.availableWidth, state.previewOpen);
            if (state.explorerWidth > explorer && !state.explorerCollapsed) {
                writeStoredNumber(KEY_EXPLORER_WIDTH, explorer);
                handle.update((prev) => ({ ...prev, explorerWidth: explorer }));
            }
            const preview = clampPreviewWidth(state.previewWidth, state.availableWidth, explorer);
            if (state.previewOpen && state.previewWidth > preview) {
                writeStoredNumber(KEY_PREVIEW_WIDTH, preview);
                handle.update((prev) => ({ ...prev, previewWidth: preview }));
            }
        },
    });
    return store;
}
/** Switch the layout to a project root (restores collapse + widths). */
export function layoutSetRoot(store, root, previewOpen) {
    store.update((prev) => {
        if (prev.root === root && prev.previewOpen === previewOpen)
            return prev;
        let collapsed = prev.explorerCollapsed;
        if (prev.root !== root) {
            try {
                collapsed = localStorage.getItem(collapseKey(root)) === 'collapsed';
            }
            catch {
                collapsed = false;
            }
        }
        return { ...prev, root, explorerCollapsed: collapsed, previewOpen };
    });
}
/** Read the persisted explorer UI state for a root (range-guarded). */
export function readExplorerUi(root) {
    const stored = readJson(`${KEY_EXPLORER_UI}${root}`, {});
    const expanded = Array.isArray(stored.expanded)
        ? stored.expanded.filter((item) => typeof item === 'string')
        : [];
    const selected = typeof stored.selected === 'string' ? stored.selected : null;
    return { expanded, selected };
}
const EMPTY_SEARCH = { query: '', status: 'idle', hits: [], truncated: false };
/** Create the explorer store (per-root persistence, debounced writes). */
export function createExplorerStore(api) {
    const handle = createState({
        root: '',
        dirs: {},
        expanded: [],
        selected: null,
        loading: [],
        activeTab: 'files',
        search: { ...EMPTY_SEARCH },
        version: 0,
    });
    const persistDebounced = createDebounced();
    const searchDebounced = createDebounced();
    let fsVersion = 0;
    let persistRoot = '';
    let persistExpanded = [];
    let persistSelected = null;
    // The debounced write (schedulePersist queues this; flushNow runs it now).
    const persistWrite = () => {
        if (persistRoot !== '')
            writeJson(`${KEY_EXPLORER_UI}${persistRoot}`, { expanded: persistExpanded, selected: persistSelected });
    };
    const flushPersist = () => { persistDebounced.flush(); };
    const schedulePersist = (root, expanded, selected) => {
        if (root === '')
            return;
        persistRoot = root;
        persistExpanded = expanded;
        persistSelected = selected;
        persistDebounced.schedule(persistWrite);
    };
    /** Load one dir's listing into the cache (no-op when already present). */
    const ensureDir = async (root, rel) => {
        const state = handle.getSnapshot();
        if (state.root !== root || state.dirs[rel] !== undefined || state.loading.includes(rel))
            return;
        handle.update((prev) => ({ ...prev, loading: [...prev.loading, rel] }));
        const result = await api.list(root, rel);
        handle.update((prev) => {
            if (prev.root !== root)
                return prev;
            // A listing that landed after its dir collapsed must not re-populate
            // the cache (the expand/collapse race would resurrect stale children).
            if (rel !== '' && !prev.expanded.includes(rel)) {
                return { ...prev, loading: prev.loading.filter((item) => item !== rel) };
            }
            const dirs = { ...prev.dirs };
            if (result.ok)
                dirs[rel] = result.value.entries;
            else
                delete dirs[rel];
            return { ...prev, dirs, loading: prev.loading.filter((item) => item !== rel) };
        });
    };
    /** Drop cached subtrees under a collapsed dir (its own key included). */
    const dropSubtree = (dirs, rel) => {
        const prefix = rel === '' ? '' : `${rel}/`;
        const next = {};
        for (const key of Object.keys(dirs)) {
            if (rel !== '' && (key === rel || key.startsWith(prefix)))
                continue;
            next[key] = dirs[key];
        }
        return next;
    };
    /** A dir's ancestor chain ('' .. parent). */
    const ancestors = (rel) => {
        const out = [];
        const parts = rel.split('/').filter(Boolean);
        let acc = '';
        for (const part of parts) {
            acc = acc === '' ? part : `${acc}/${part}`;
            out.push(acc);
        }
        return out;
    };
    const store = Object.assign(handle, {
        setRoot(root) {
            handle.update((prev) => {
                if (prev.root === root)
                    return prev;
                const ui = readExplorerUi(root);
                return {
                    ...prev,
                    root,
                    dirs: {},
                    expanded: ui.expanded,
                    selected: ui.selected,
                    loading: [],
                    search: { ...EMPTY_SEARCH },
                };
            });
            void ensureDir(root, '');
        },
        setActiveTab(tab) {
            handle.update((prev) => (prev.activeTab === tab ? prev : { ...prev, activeTab: tab }));
        },
        toggleDir(rel) {
            const state = handle.getSnapshot();
            const isExpanded = state.expanded.includes(rel);
            if (isExpanded) {
                handle.update((prev) => ({
                    ...prev,
                    expanded: prev.expanded.filter((item) => item !== rel),
                    dirs: dropSubtree(prev.dirs, rel),
                }));
            }
            else {
                handle.update((prev) => ({ ...prev, expanded: [...prev.expanded, rel] }));
                void ensureDir(state.root, rel);
            }
            schedulePersist(state.root, isExpanded ? state.expanded.filter((item) => item !== rel) : [...state.expanded, rel], state.selected);
        },
        select(rel) {
            handle.update((prev) => (prev.selected === rel ? prev : { ...prev, selected: rel }));
            const state = handle.getSnapshot();
            schedulePersist(state.root, state.expanded, rel);
        },
        reveal(rel) {
            const state = handle.getSnapshot();
            const chain = ancestors(rel);
            const missing = chain.filter((item) => !state.expanded.includes(item));
            handle.update((prev) => {
                const expanded = [...prev.expanded];
                for (const item of missing) {
                    if (!expanded.includes(item))
                        expanded.push(item);
                }
                return { ...prev, expanded, selected: rel, search: { ...EMPTY_SEARCH } };
            });
            for (const item of missing)
                void ensureDir(state.root, item);
            schedulePersist(state.root, [...state.expanded, ...missing], rel);
        },
        setSearchQuery(query) {
            const trimmed = query.trim();
            handle.update((prev) => {
                if (trimmed === '' && prev.search.query === '')
                    return prev;
                return {
                    ...prev,
                    search: trimmed === ''
                        ? { ...EMPTY_SEARCH }
                        : { ...prev.search, query: trimmed, status: 'searching' },
                };
            });
            searchDebounced.dispose();
            if (trimmed === '')
                return;
            const root = handle.getSnapshot().root;
            searchDebounced.schedule(() => {
                void api.search(root, trimmed).then((result) => {
                    handle.update((prev) => {
                        if (prev.root !== root || prev.search.query !== trimmed)
                            return prev;
                        return {
                            ...prev,
                            search: result.ok
                                ? { query: trimmed, status: 'done', hits: result.value.hits, truncated: result.value.truncated }
                                : { ...prev.search, status: 'error', hits: [] },
                        };
                    });
                });
            });
        },
        cancelSearch() {
            searchDebounced.dispose();
            handle.update((prev) => (prev.search.query === '' ? prev : { ...prev, search: { ...EMPTY_SEARCH } }));
        },
        async handleFsChange() {
            const state = handle.getSnapshot();
            const root = state.root;
            if (root === '')
                return;
            const dirs = [...new Set(['', ...state.expanded])];
            const seq = ++fsVersion;
            const results = await Promise.allSettled(dirs.map((rel) => api.list(root, rel)));
            handle.update((prev) => {
                if (prev.root !== root || seq !== fsVersion)
                    return prev;
                const nextDirs = { ...prev.dirs };
                results.forEach((result, index) => {
                    const rel = dirs[index];
                    if (result.status !== 'fulfilled' || !result.value.ok)
                        return;
                    // A dir folded while the event burst was in flight must not be
                    // re-populated (the collapse would revive from a stale snapshot).
                    if (rel !== '' && !prev.expanded.includes(rel))
                        return;
                    nextDirs[rel] = result.value.value.entries;
                });
                return { ...prev, dirs: nextDirs, version: prev.version + 1 };
            });
            if (state.search.query !== '') {
                void api.search(root, state.search.query).then((result) => {
                    handle.update((prev) => {
                        if (prev.root !== root || prev.search.query !== state.search.query)
                            return prev;
                        return {
                            ...prev,
                            search: result.ok
                                ? { query: state.search.query, status: 'done', hits: result.value.hits, truncated: result.value.truncated }
                                : prev.search,
                        };
                    });
                });
            }
        },
    });
    store[FLUSH_PERSIST] = flushPersist;
    return store;
}
/** Read the persisted scm UI state for a root (guarded). */
export function readScmUi(root) {
    const stored = readJson(`${KEY_SCM_UI}${root}`, {});
    const viewMode = stored.viewMode === 'tree' ? 'tree' : 'list';
    const sectionCollapsed = typeof stored.sectionCollapsed === 'object' && stored.sectionCollapsed !== null
        ? Object.fromEntries(Object.entries(stored.sectionCollapsed).filter(([, v]) => typeof v === 'boolean'))
        : {};
    const treeExpanded = Array.isArray(stored.treeExpanded)
        ? stored.treeExpanded.filter((item) => typeof item === 'string')
        : [];
    const selected = typeof stored.selected === 'string' ? stored.selected : null;
    return { viewMode, sectionCollapsed, treeExpanded, selected };
}
/** Create the scm store (host status is the only truth — no optimistic rows). */
export function createScmStore(api) {
    const handle = createState({
        root: '',
        status: null,
        gitMissing: false,
        loading: false,
        busy: [],
        failed: [],
        viewMode: 'list',
        sectionCollapsed: {},
        treeExpanded: [],
        selected: null,
    });
    const persistDebounced = createDebounced();
    let persistState = null;
    let loadSeq = 0;
    const persistWrite = () => {
        if (persistState !== null && persistState.root !== '') {
            writeJson(`${KEY_SCM_UI}${persistState.root}`, {
                viewMode: persistState.viewMode,
                sectionCollapsed: persistState.sectionCollapsed,
                treeExpanded: persistState.treeExpanded,
                selected: persistState.selected,
            });
        }
    };
    const flushPersist = () => { persistDebounced.flush(); };
    const schedulePersist = (state) => {
        if (state.root === '')
            return;
        persistState = state;
        persistDebounced.schedule(persistWrite);
    };
    /** Fetch the status and land it (guarded against root switches + out-of-order). */
    const load = async (root, keepBusy = []) => {
        const seq = ++loadSeq;
        handle.update((prev) => ({ ...prev, loading: true }));
        const result = await api.gitStatus(root);
        handle.update((prev) => {
            // Only the newest in-flight load may land; a stale response must not
            // overwrite fresher state (focus refresh vs SSE push race).
            if (prev.root !== root || seq !== loadSeq)
                return prev;
            return {
                ...prev,
                status: result.ok ? result.value : prev.status,
                // A real repo view clears the missing-git banner; null keeps it.
                gitMissing: result.ok && result.value !== null ? false : prev.gitMissing,
                loading: false,
                busy: keepBusy,
            };
        });
    };
    const store = Object.assign(handle, {
        setRoot(root) {
            handle.update((prev) => {
                if (prev.root === root)
                    return prev;
                const ui = readScmUi(root);
                return {
                    ...prev,
                    root,
                    status: null,
                    gitMissing: false,
                    loading: true,
                    busy: [],
                    failed: [],
                    viewMode: ui.viewMode,
                    sectionCollapsed: ui.sectionCollapsed,
                    treeExpanded: ui.treeExpanded,
                    selected: ui.selected,
                };
            });
            void load(root);
        },
        async refresh() {
            const root = handle.getSnapshot().root;
            if (root !== '')
                await load(root);
        },
        async stage(paths) {
            const root = handle.getSnapshot().root;
            if (root === '' || paths.length === 0)
                return;
            handle.update((prev) => ({ ...prev, busy: [...prev.busy, ...paths] }));
            const result = await api.gitStage(root, paths);
            handle.update((prev) => ({
                ...prev,
                failed: result.ok && Array.isArray(result.value?.failed) ? result.value.failed : (result.ok ? [] : paths),
                busy: prev.busy.filter((item) => !paths.includes(item)),
            }));
            await load(root);
        },
        async unstage(paths) {
            const root = handle.getSnapshot().root;
            if (root === '' || paths.length === 0)
                return;
            handle.update((prev) => ({ ...prev, busy: [...prev.busy, ...paths] }));
            const result = await api.gitUnstage(root, paths);
            handle.update((prev) => ({
                ...prev,
                failed: result.ok && Array.isArray(result.value?.failed) ? result.value.failed : (result.ok ? [] : paths),
                busy: prev.busy.filter((item) => !paths.includes(item)),
            }));
            await load(root);
        },
        async discard(paths) {
            const root = handle.getSnapshot().root;
            if (root === '' || paths.length === 0)
                return;
            handle.update((prev) => ({ ...prev, busy: [...prev.busy, ...paths] }));
            const result = await api.gitDiscard(root, paths);
            handle.update((prev) => ({
                ...prev,
                failed: result.ok && Array.isArray(result.value?.failed) ? result.value.failed : (result.ok ? [] : paths),
                busy: prev.busy.filter((item) => !paths.includes(item)),
            }));
            await load(root);
        },
        async discardAll() {
            const state = handle.getSnapshot();
            const paths = [
                ...(state.status?.unstaged ?? []),
                ...(state.status?.untracked ?? []),
            ].map((row) => row.path);
            await this.discard(paths);
        },
        setViewMode(mode) {
            handle.update((prev) => (prev.viewMode === mode ? prev : { ...prev, viewMode: mode }));
            schedulePersist(handle.getSnapshot());
        },
        setSectionCollapsed(id, collapsed) {
            handle.update((prev) => ({ ...prev, sectionCollapsed: { ...prev.sectionCollapsed, [id]: collapsed } }));
            schedulePersist(handle.getSnapshot());
        },
        setTreeExpanded(keys) {
            handle.update((prev) => ({ ...prev, treeExpanded: keys }));
            schedulePersist(handle.getSnapshot());
        },
        setFailed(paths) {
            handle.update((prev) => ({ ...prev, failed: paths }));
        },
        select(path) {
            handle.update((prev) => (prev.selected === path ? prev : { ...prev, selected: path }));
            schedulePersist(handle.getSnapshot());
        },
    });
    store[FLUSH_PERSIST] = flushPersist;
    return store;
}
/** Read persisted tabs for a root (guarded, content-less). */
export function readPreviewTabs(root) {
    const stored = readJson(`preview-ui:${root}`, {});
    if (!Array.isArray(stored.tabs))
        return [];
    const out = [];
    for (const item of stored.tabs) {
        if (typeof item !== 'object' || item === null)
            continue;
        const record = item;
        if (typeof record.id !== 'string' || typeof record.path !== 'string')
            continue;
        const rawDiff = record.diff;
        const diff = typeof rawDiff === 'object' && rawDiff !== null
            && typeof rawDiff.staged === 'boolean'
            ? { staged: rawDiff.staged }
            : undefined;
        out.push({
            id: record.id,
            title: typeof record.title === 'string' ? record.title : record.path,
            root: typeof record.root === 'string' ? record.root : root,
            path: record.path,
            contentType: typeof record.contentType === 'string' ? record.contentType : 'text',
            diff,
            savedAt: typeof record.savedAt === 'number' ? record.savedAt : 0,
        });
    }
    return out;
}
/** Create the preview store (per-root tab persistence with LRU scopes). */
export function createPreviewStore(api) {
    const handle = createState({
        root: '',
        open: false,
        tabs: [],
        activeTabId: null,
        version: 0,
    });
    const persistDebounced = createDebounced();
    const persistWrite = () => {
        const current = handle.getSnapshot();
        if (current.root === '')
            return;
        const meta = current.tabs.map((tab) => ({
            id: tab.id,
            title: tab.title,
            root: tab.root,
            path: tab.path,
            contentType: tab.contentType,
            diff: tab.diff,
            savedAt: tab.savedAt,
        }));
        writeJson(`preview-ui:${current.root}`, { savedAt: Date.now(), tabs: meta });
        evictPreviewScopes(current.root);
    };
    const flushPersist = () => { persistDebounced.flush(); };
    const schedulePersist = (state) => {
        if (state.root === '')
            return;
        persistDebounced.schedule(persistWrite);
    };
    /** Load content for one tab (text or image data URL, or git diff). */
    const loadContent = async (root, id) => {
        const tab = handle.getSnapshot().tabs.find((item) => item.id === id);
        if (tab === undefined || tab.content !== null || tab.loading)
            return;
        handle.update((prev) => ({
            ...prev,
            tabs: prev.tabs.map((item) => (item.id === id ? { ...item, loading: true, error: null } : item)),
        }));
        // Pdf tabs never fetch through /read: the raw route streams the bytes
        // straight into the preview iframe, so the tab content is the route URL.
        if (tab.contentType === 'pdf') {
            handle.update((prev) => {
                if (prev.root !== root)
                    return prev;
                return {
                    ...prev,
                    tabs: prev.tabs.map((item) => (item.id === id
                        ? { ...item, loading: false, content: pdfPreviewUrl(root, item.path, Date.now()), updated: false }
                        : item)),
                };
            });
            return;
        }
        const asImage = tab.contentType === 'image';
        const result = tab.diff !== undefined
            ? await api.gitDiff(root, tab.path, tab.diff.staged)
            : await api.read(root, tab.path, asImage);
        handle.update((prev) => {
            if (prev.root !== root)
                return prev;
            return {
                ...prev,
                tabs: prev.tabs.map((item) => {
                    if (item.id !== id)
                        return item;
                    if (!result.ok) {
                        return { ...item, loading: false, error: result.error.message };
                    }
                    // The user started typing while the fetch was in flight: their newer
                    // content must not be overwritten by this (already stale) disk read.
                    if (item.dirty)
                        return { ...item, loading: false };
                    // read and gitDiff share the content field; only read carries the
                    // rest (image/mtime/truncated), so the union is read as its merge.
                    const loaded = result.value;
                    return {
                        ...item,
                        loading: false,
                        content: loaded.content,
                        image: loaded.image,
                        mtime: loaded.mtime,
                        truncated: loaded.truncated ?? false,
                        updated: false,
                    };
                }),
            };
        });
    };
    /** Touch a tab's savedAt (LRU order within the scope). */
    const touch = (id) => {
        handle.update((prev) => ({
            ...prev,
            tabs: prev.tabs.map((item) => (item.id === id ? { ...item, savedAt: Date.now() } : item)),
        }));
    };
    /**
     * Re-fetch every loaded diff tab of the root in place (fs/git change
     * events). In-flight or not-yet-loaded tabs are skipped — the next load or
     * event covers them; landing guards keep a newer edit from being clobbered.
     */
    const refreshDiffs = async (root) => {
        if (handle.getSnapshot().root !== root)
            return;
        const diffs = handle.getSnapshot().tabs
            .filter((tab) => tab.diff !== undefined);
        await Promise.all(diffs.map(async (tab) => {
            if (tab.content === null || tab.loading)
                return;
            const result = await api.gitDiff(root, tab.path, tab.diff.staged);
            handle.update((prev) => {
                if (prev.root !== root)
                    return prev;
                return {
                    ...prev,
                    tabs: prev.tabs.map((item) => {
                        if (item.id !== tab.id || !result.ok)
                            return item;
                        if (item.dirty || item.loading)
                            return item;
                        return { ...item, content: result.value.content, error: null };
                    }),
                };
            });
        }));
    };
    const store = Object.assign(handle, {
        setRoot(root) {
            handle.update((prev) => {
                if (prev.root === root)
                    return prev;
                const persisted = readPreviewTabs(root);
                const tabs = persisted.map((meta) => ({
                    id: meta.id,
                    title: meta.title,
                    root: meta.root,
                    path: meta.path,
                    contentType: meta.contentType,
                    diff: meta.diff,
                    content: null,
                    dirty: false,
                    updated: false,
                    loading: false,
                    truncated: false,
                    error: null,
                    savedAt: meta.savedAt,
                }));
                const activeTabId = tabs.length > 0 ? tabs[tabs.length - 1].id : null;
                return { ...prev, root, tabs, activeTabId, open: tabs.length > 0 };
            });
            const state = handle.getSnapshot();
            if (state.activeTabId !== null)
                void loadContent(root, state.activeTabId);
        },
        openFile(root, path) {
            const type = detectContentType(path);
            const id = tabIdOf(root, path, type);
            const existing = handle.getSnapshot().tabs.find((tab) => tab.id === id);
            if (existing !== undefined) {
                handle.update((prev) => ({
                    ...prev,
                    root,
                    open: true,
                    activeTabId: id,
                    tabs: prev.tabs.map((tab) => (tab.id === id ? { ...tab, savedAt: Date.now() } : tab)),
                }));
                void loadContent(root, id);
                schedulePersist(handle.getSnapshot());
                return;
            }
            handle.update((prev) => {
                if (prev.root !== root)
                    return prev;
                const tab = {
                    id,
                    title: path.split('/').pop() ?? path,
                    root,
                    path,
                    contentType: type,
                    content: null,
                    dirty: false,
                    updated: false,
                    loading: false,
                    truncated: false,
                    error: null,
                    savedAt: Date.now(),
                };
                return { ...prev, open: true, tabs: [...prev.tabs, tab], activeTabId: id };
            });
            void loadContent(root, id);
            schedulePersist(handle.getSnapshot());
        },
        openDiff(root, path, staged) {
            // A distinct id space (scm-diff: side + root + path) so the same file
            // can carry a diff tab AND a file tab, and staged/unstaged diffs of one
            // path are separate tabs — each reflects the side it was opened from.
            const id = `scm-diff:${staged ? 's' : 'u'}\u0000${root}\u0000${path}`;
            const existing = handle.getSnapshot().tabs.find((tab) => tab.id === id);
            if (existing !== undefined) {
                handle.update((prev) => ({
                    ...prev,
                    root,
                    open: true,
                    activeTabId: id,
                    tabs: prev.tabs.map((tab) => (tab.id === id ? { ...tab, savedAt: Date.now() } : tab)),
                }));
                void loadContent(root, id);
                schedulePersist(handle.getSnapshot());
                return;
            }
            handle.update((prev) => {
                if (prev.root !== root)
                    return prev;
                const tab = {
                    id,
                    title: path.split('/').pop() ?? path,
                    root,
                    path,
                    contentType: 'diff',
                    diff: { staged },
                    content: null,
                    dirty: false,
                    updated: false,
                    loading: false,
                    truncated: false,
                    error: null,
                    savedAt: Date.now(),
                };
                return { ...prev, open: true, tabs: [...prev.tabs, tab], activeTabId: id };
            });
            void loadContent(root, id);
            schedulePersist(handle.getSnapshot());
        },
        switchTab(id) {
            const state = handle.getSnapshot();
            if (state.activeTabId === id)
                return;
            handle.update((prev) => ({ ...prev, activeTabId: id }));
            touch(id);
            const tab = handle.getSnapshot().tabs.find((item) => item.id === id);
            if (tab !== undefined && tab.content === null)
                void loadContent(state.root, id);
            schedulePersist(handle.getSnapshot());
        },
        closeTabs(ids) {
            const state = handle.getSnapshot();
            const remaining = state.tabs.filter((tab) => !ids.includes(tab.id));
            const active = remaining.some((tab) => tab.id === state.activeTabId);
            const activeTabId = active
                ? state.activeTabId
                : remaining.length > 0
                    ? remaining[Math.min(state.tabs.findIndex((tab) => tab.id === state.activeTabId), remaining.length - 1)]?.id ?? remaining[remaining.length - 1].id
                    : null;
            handle.update((prev) => ({
                ...prev,
                tabs: remaining,
                activeTabId,
                open: remaining.length > 0 ? prev.open : false,
            }));
            schedulePersist(handle.getSnapshot());
        },
        updateContent(id, content) {
            handle.update((prev) => ({
                ...prev,
                tabs: prev.tabs.map((tab) => (tab.id === id ? { ...tab, content, dirty: true, updated: false } : tab)),
            }));
        },
        async saveTab(id) {
            const state = handle.getSnapshot();
            const tab = state.tabs.find((item) => item.id === id);
            if (tab === undefined || tab.content === null || !isTextType(tab.contentType) || tab.diff !== undefined)
                return;
            const sentContent = tab.content;
            handle.update((prev) => ({
                ...prev,
                tabs: prev.tabs.map((item) => (item.id === id ? { ...item, loading: true, error: null } : item)),
            }));
            const result = await api.write(state.root, tab.path, tab.content, tab.mtime);
            handle.update((prev) => {
                if (prev.root !== state.root)
                    return prev;
                return {
                    ...prev,
                    tabs: prev.tabs.map((item) => {
                        if (item.id !== id)
                            return item;
                        if (!result.ok) {
                            return {
                                ...item,
                                loading: false,
                                error: result.error.code === 'write-conflict'
                                    ? '文件已在磁盘上被修改，保存冲突：请刷新后重试'
                                    : result.error.message,
                            };
                        }
                        if (item.content !== sentContent) {
                            // The user kept typing while the save was in flight: the disk now
                            // holds the sent snapshot, but the tab's newer edits are unsaved.
                            // Refresh the write base so the next save is conflict-safe and
                            // keep the dirty flag so the UI still shows an unsaved edit.
                            return { ...item, loading: false, mtime: result.value.mtime, error: null };
                        }
                        return { ...item, loading: false, dirty: false, mtime: result.value.mtime, error: null };
                    }),
                };
            });
        },
        async reloadTab(id) {
            const state = handle.getSnapshot();
            const tab = state.tabs.find((item) => item.id === id);
            if (tab === undefined)
                return;
            if (tab.contentType === 'url') {
                // URL tabs own a live document inside the frame; reload bumps the
                // nonce so UrlViewer re-navigates the frame to its address.
                handle.update((prev) => ({
                    ...prev,
                    tabs: prev.tabs.map((item) => item.id === id ? { ...item, reloadNonce: (item.reloadNonce ?? 0) + 1 } : item),
                }));
                return;
            }
            if (tab.contentType === 'pdf') {
                // Streamed tab: re-point the iframe at the raw route with a fresh
                // nonce so the browser re-fetches the bytes (no /read round-trip).
                handle.update((prev) => ({
                    ...prev,
                    tabs: prev.tabs.map((item) => (item.id === id
                        ? { ...item, content: pdfPreviewUrl(state.root, item.path, Date.now()), updated: false, error: null }
                        : item)),
                }));
                return;
            }
            handle.update((prev) => ({
                ...prev,
                tabs: prev.tabs.map((item) => (item.id === id ? { ...item, loading: true } : item)),
            }));
            const result = tab.diff !== undefined
                ? await api.gitDiff(state.root, tab.path, tab.diff.staged)
                : await api.read(state.root, tab.path, tab.contentType === 'image');
            handle.update((prev) => {
                if (prev.root !== state.root)
                    return prev;
                return {
                    ...prev,
                    tabs: prev.tabs.map((item) => {
                        if (item.id !== id)
                            return item;
                        if (!result.ok)
                            return { ...item, loading: false, error: result.error.message };
                        const loaded = result.value;
                        return {
                            ...item,
                            loading: false,
                            content: loaded.content,
                            image: loaded.image,
                            mtime: loaded.mtime,
                            truncated: loaded.truncated ?? false,
                            updated: false,
                            dirty: false,
                            error: null,
                        };
                    }),
                };
            });
        },
        setOpen(open) {
            handle.update((prev) => (prev.open === open ? prev : { ...prev, open }));
        },
        async handleFsChange() {
            const state = handle.getSnapshot();
            if (state.root === '')
                return;
            handle.update((prev) => ({ ...prev, version: prev.version + 1 }));
            // Diff tabs are derived views: any fs change may alter them, so refresh
            // them in place (never mark "updated" — the refresh is automatic).
            await refreshDiffs(state.root);
            // Staleness probe for the ACTIVE file tab only (cheap; the fs watcher
            // debounces bursts). A newer disk mtime flips the tab to "updated".
            const active = handle.getSnapshot().tabs.find((tab) => tab.id === handle.getSnapshot().activeTabId);
            if (active === undefined || active.content === null || active.dirty || active.diff !== undefined || !isTextType(active.contentType))
                return;
            const result = await api.read(state.root, active.path, false);
            handle.update((prev) => {
                if (prev.root !== state.root)
                    return prev;
                return {
                    ...prev,
                    tabs: prev.tabs.map((tab) => {
                        if (tab.id !== active.id || tab.dirty)
                            return tab;
                        if (!result.ok)
                            return tab;
                        return { ...tab, updated: tab.mtime !== undefined && result.value.mtime > tab.mtime + 1 };
                    }),
                };
            });
        },
        async handleGitChange(root) {
            // A git push means the index/worktree moved (stage/unstage/discard or
            // external git): every open diff tab is stale by definition.
            await refreshDiffs(root);
        },
    });
    store[FLUSH_PERSIST] = flushPersist;
    return store;
}
/** Create the full store bundle. */
export function createPanelStores(api) {
    const layout = createLayoutStore();
    const explorer = createExplorerStore(api);
    const scm = createScmStore(api);
    const preview = createPreviewStore(api);
    const flushNow = () => {
        for (const store of [explorer, scm, preview]) {
            const flush = store[FLUSH_PERSIST];
            if (typeof flush === 'function')
                flush();
        }
    };
    const stores = { layout, explorer, scm, preview, flushNow };
    return stores;
}
