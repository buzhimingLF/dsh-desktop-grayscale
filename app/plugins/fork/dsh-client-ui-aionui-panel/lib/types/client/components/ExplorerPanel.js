import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The Explorer column: Files/Changes tab bar (37px), the persistent filename
 * search at the top of the Files tab (150ms debounced; a hit click REVEALS
 * the file in the tree — expand ancestors + select — never opens preview),
 * the lazy file tree (34px rows, full-row expand/collapse, 16px icons), and
 * the in-column collapse chevron.
 *
 * AionUi Explorer behavior (Apache-2.0, re-implemented): row click toggles
 * folders (no need to hit the arrow), search results are reveal-only, and
 * clicking a file opens it in the preview panel (dedup focuses the tab).
 * @module dsh-aionui-panel/client/components/ExplorerPanel
 */
import { memo, useRef, useState } from 'react';
import { parentRel } from "../fileType.js";
import { t } from "../locales.js";
import { useStore } from "../hooks/useStore.js";
import { FileTypeIcon } from "./FileIcon.js";
import { ChevronRightIcon, CloseIcon, ExpandRightIcon, SearchIcon } from "./icons.js";
import { ScmPanel } from "./ScmPanel.js";
import { activateOnKey } from "./a11y.js";
import { FILE_DRAG_MIME } from "../drag/file-drag.js";
import explorerCss from '../styles/explorer.module.css';
import '../styles/tokens.module.css';
/** Row indent step per tree depth (px). */
const INDENT_STEP = 16;
/**
 * The whole explorer column content.
 * @param stores - the panel store bundle.
 * @param onToggleCollapse - collapse the column (host chrome).
 */
export function ExplorerPanel({ stores, onToggleCollapse, }) {
    const state = useStore(stores.explorer);
    const [searchFocus, setSearchFocus] = useState(false);
    return (_jsxs("div", { className: "aionui-root", style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }, children: [_jsxs("div", { className: explorerCss.tabBar, children: [_jsx("button", { type: "button", className: state.activeTab === 'files' ? explorerCss.tabBtnActive : explorerCss.tabBtn, onClick: () => stores.explorer.setActiveTab('files'), children: t('explorer.tabs.files') }), _jsx("button", { type: "button", className: state.activeTab === 'changes' ? explorerCss.tabBtnActive : explorerCss.tabBtn, onClick: () => stores.explorer.setActiveTab('changes'), children: t('explorer.tabs.changes') }), _jsx("button", { type: "button", className: "aionui-collapse-chevron", style: { marginLeft: 'auto' }, onClick: onToggleCollapse, title: t('explorer.collapse'), "aria-label": t('explorer.collapse'), children: _jsx(ExpandRightIcon, { size: 16 }) })] }), _jsxs("div", { style: { display: state.activeTab === 'files' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0 }, children: [_jsx(SearchArea, { stores: stores, searchFocus: searchFocus, onFocusChange: setSearchFocus }), _jsx(FileTree, { stores: stores })] }), state.activeTab === 'changes' && _jsx(ScmPanel, { stores: stores })] }));
}
/** The search box + results (the tree stays mounted underneath). */
function SearchArea({ stores, searchFocus, onFocusChange, }) {
    const explorer = stores.explorer;
    const state = useStore(explorer);
    const search = state.search;
    const active = search.query !== '';
    const inputRef = useRef(null);
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', minHeight: 0, flex: active ? 1 : undefined }, children: [_jsx("div", { className: explorerCss.searchArea, children: _jsxs("div", { className: `${explorerCss.searchBox}${searchFocus ? ` ${explorerCss.searchAreaFocus}` : ''}`, style: { borderColor: searchFocus ? 'var(--aion-primary)' : undefined }, children: [_jsx("span", { className: explorerCss.searchIcon, children: _jsx(SearchIcon, { size: 14 }) }), _jsx("input", { ref: inputRef, className: explorerCss.searchInput, value: search.query, placeholder: t('explorer.search.placeholder'), "aria-label": t('explorer.search.placeholder'), onFocus: () => onFocusChange(true), onBlur: () => onFocusChange(false), onChange: (event) => explorer.setSearchQuery(event.target.value) }), search.query !== '' && (_jsx("button", { type: "button", className: explorerCss.searchClear, onClick: () => { explorer.cancelSearch(); inputRef.current?.focus(); }, "aria-label": t('common.close'), children: _jsx(CloseIcon, { size: 12 }) }))] }) }), active ? (_jsx(SearchResults, { stores: stores })) : null] }));
}
/** The flat search-result stream (click = reveal in tree). */
function SearchResults({ stores }) {
    const explorer = stores.explorer;
    const state = useStore(explorer);
    const search = state.search;
    return (_jsxs("div", { className: explorerCss.scrollArea, children: [search.status === 'searching' && search.hits.length === 0 && (_jsx("div", { className: explorerCss.searchStatus, children: t('explorer.search.searching') })), search.status === 'error' && _jsx("div", { className: explorerCss.searchStatus, children: t('explorer.search.error') }), search.status === 'done' && search.hits.length === 0 && (_jsx("div", { className: explorerCss.searchStatus, children: t('explorer.search.empty') })), search.hits.map((hit) => (_jsxs("div", { className: explorerCss.resultRow, role: "button", tabIndex: 0, title: hit.path, onClick: () => {
                    // Reveal: expand the ancestor chain and select — not preview.
                    explorer.reveal(hit.path);
                }, onKeyDown: activateOnKey(() => { explorer.reveal(hit.path); }), children: [_jsx(FileTypeIcon, { name: hit.name, isDir: hit.isDir, expanded: false }), _jsx("span", { className: explorerCss.resultName, children: hit.name }), _jsx("span", { className: explorerCss.resultPath, children: parentRel(hit.path) })] }, hit.path))), search.truncated && search.hits.length > 0 && (_jsx("div", { className: explorerCss.searchStatus, children: t('explorer.search.truncated', { count: search.hits.length }) }))] }));
}
/** The lazy file tree. */
function FileTree({ stores }) {
    const explorer = stores.explorer;
    const preview = stores.preview;
    const state = useStore(explorer);
    const root = state.root;
    if (root === '')
        return _jsx("div", { className: explorerCss.emptyState, children: t('explorer.tree.empty') });
    const entries = state.dirs[''];
    if (entries === undefined) {
        return _jsx("div", { className: explorerCss.searchStatus, children: t('scm.loading') });
    }
    if (entries.length === 0)
        return _jsx("div", { className: explorerCss.emptyState, children: t('explorer.tree.empty') });
    return (_jsx("div", { className: `${explorerCss.scrollArea} ${explorerCss.tree}`, children: entries.map((entry) => (_jsx(TreeRow, { entry: entry, depth: 0, expanded: state.expanded, selected: state.selected, dirs: state.dirs, root: state.root, stores: stores }, entry.path))) }));
}
/** One tree row (recursive for children). */
function TreeRowBase({ entry, depth, expanded, selected, dirs, root, stores, }) {
    const explorer = stores.explorer;
    const preview = stores.preview;
    const isExpanded = expanded.includes(entry.path);
    const isSelected = selected === entry.path;
    const children = entry.isDir ? dirs[entry.path] : undefined;
    const [draggingRow, setDraggingRow] = useState(false);
    const handleClick = () => {
        if (entry.isDir) {
            // Full-row expand/collapse toggle.
            explorer.toggleDir(entry.path);
            return;
        }
        // A file: select + open in preview (dedup focuses the open tab).
        explorer.select(entry.path);
        preview.openFile(root, entry.path);
    };
    // Files are draggable into the composer (the drag MIME carries the
    // workspace-relative path); directory rows stay click-only.
    const onDragStart = (event) => {
        if (entry.isDir)
            return;
        event.dataTransfer.setData(FILE_DRAG_MIME, entry.path);
        event.dataTransfer.setData('text/plain', entry.path);
        event.dataTransfer.effectAllowed = 'copy';
        setDraggingRow(true);
    };
    const onDragEnd = () => {
        setDraggingRow(false);
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: `${explorerCss.treeRow}${isSelected ? ` ${explorerCss.treeRowSelected}` : ''}${draggingRow ? ` ${explorerCss.treeRowDragging}` : ''}`, style: { paddingLeft: 12 + 8 + depth * INDENT_STEP }, onClick: handleClick, onKeyDown: activateOnKey(handleClick), onDoubleClick: (event) => {
                    // Double-click on a file: same as click (open). Folders: keep toggle.
                    event.stopPropagation();
                }, draggable: !entry.isDir, onDragStart: onDragStart, onDragEnd: onDragEnd, role: "button", tabIndex: 0, "aria-expanded": entry.isDir ? isExpanded : undefined, title: entry.path, children: [entry.isDir ? (_jsx("span", { className: `${explorerCss.treeArrow}${isExpanded ? ` ${explorerCss.treeArrowOpen}` : ''}`, children: _jsx(ChevronRightIcon, { size: 13 }) })) : (_jsx("span", { className: explorerCss.treeArrowEmpty })), _jsx(FileTypeIcon, { name: entry.name, isDir: entry.isDir, expanded: isExpanded }), _jsx("span", { className: explorerCss.treeName, children: entry.name })] }), entry.isDir && isExpanded && children !== undefined && (_jsx("div", { children: children.map((child) => (_jsx(TreeRow, { entry: child, depth: depth + 1, expanded: expanded, selected: selected, dirs: dirs, root: root, stores: stores }, child.path))) }))] }));
}
/**
 * A memoized tree row so the whole tree does not re-render on every explorer
 * state change (search keystrokes, tab switches, fs version bumps). The row
 * takes the `state` fields it actually reads as individual props — `expanded`,
 * `selected`, `dirs` — whose references only change when the corresponding
 * data changed, so the default shallow comparison skips rows whose own entry,
 * ancestor, expansion or selection are unaffected. A `dirs` re-fetch (an fs
 * event that relists the expanded dirs) still re-renders the rows under those
 * dirs — the unavoidable O(open-dirs) cost — but transient UI state no longer
 * invalidates the tree.
 */
const TreeRow = memo(TreeRowBase);
