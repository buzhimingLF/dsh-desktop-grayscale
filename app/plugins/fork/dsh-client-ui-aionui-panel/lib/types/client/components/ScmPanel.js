import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The Changes (SCM) panel: per-repo working-tree status grouped into staged /
 * unstaged / untracked, with stage/unstage/discard actions on every row and
 * bulk actions in the section header. The host status is the only truth — no
 * optimistic rows; a failed batch surfaces its paths and the next refresh
 * clears the flag. Discard confirms with copy split by recoverability
 * (untracked = delete vs tracked = irreversible restore).
 *
 * AionUi ScmPanel behavior (Apache-2.0, re-implemented): window focus
 * refreshes (external editors write without git events), unknown states
 * render as a quiet '?', conflicted rows are visually distinct AND have no
 * actions.
 * @module dsh-aionui-panel/client/components/ScmPanel
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { t, format } from "../locales.js";
import { useStore } from "../hooks/useStore.js";
import { ConfirmDialog } from "./overlay.js";
import { activateOnKey } from "./a11y.js";
import { FileTypeIcon } from "./FileIcon.js";
import { BranchIcon, ChevronRightIcon, ListIcon, MinusIcon, PlusIcon, TreeIcon, UndoIcon } from "./icons.js";
import scmCss from '../styles/scm.module.css';
/** Minimum gap between window-focus SCM refreshes (ms). */
const FOCUS_REFRESH_MIN_MS = 5_000;
/** Badge letter + color class per state. */
const BADGE = {
    created: { letter: 'A', className: scmCss.badgeCreated },
    modified: { letter: 'M', className: scmCss.badgeModified },
    deleted: { letter: 'D', className: scmCss.badgeDeleted },
    renamed: { letter: 'R', className: scmCss.badgeCreated },
    conflicted: { letter: '!', className: scmCss.badgeConflicted },
    untracked: { letter: '?', className: scmCss.badgeUntracked },
    unknown: { letter: '?', className: scmCss.badgeUntracked },
};
/** The parent dir of a path ('' for root-level). */
function dirOf(path) {
    const idx = path.lastIndexOf('/');
    return idx > 0 ? path.slice(0, idx) : '';
}
/** Build a display-only directory tree from rows. */
function buildTree(rows) {
    const byDir = new Map();
    for (const row of rows) {
        const dir = dirOf(row.path);
        const list = byDir.get(dir);
        if (list === undefined)
            byDir.set(dir, [row]);
        else
            list.push(row);
    }
    return byDir;
}
/** The SCM tab body.
 * @param stores - the panel store bundle.
 */
export function ScmPanel({ stores }) {
    const scm = stores.scm;
    const preview = stores.preview;
    const state = useStore(scm);
    const [discardTargets, setDiscardTargets] = useState(null);
    // Window focus refreshes (catches external editors writing the tree).
    // Throttled: a focus burst must not spawn a git status per event — the
    // fs watch (host) and the 30s host poll already cover the steady state.
    // -Infinity so the first focus after mount always fires (production
    // Date.now() is enormous anyway; the sentinel makes the throttle explicit
    // and testable at clock 0).
    const lastFocusRefresh = useRef(-Infinity);
    useEffect(() => {
        const onFocus = () => {
            const now = Date.now();
            if (now - lastFocusRefresh.current < FOCUS_REFRESH_MIN_MS)
                return;
            lastFocusRefresh.current = now;
            void scm.refresh();
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [scm]);
    const status = state.status;
    const changesSectionOpen = state.sectionCollapsed['changes'] !== true;
    const requestDiscard = (rows) => {
        if (rows.length === 0)
            return;
        setDiscardTargets(rows);
    };
    const confirmDiscard = () => {
        if (discardTargets === null)
            return;
        void scm.discard(discardTargets.map((row) => row.path));
        setDiscardTargets(null);
    };
    if (state.loading && status === null) {
        return _jsx("div", { className: `aionui-root ${scmCss.panel}`, children: _jsx("div", { className: scmCss.loading, children: t('scm.loading') }) });
    }
    if (state.gitMissing) {
        return _jsx("div", { className: `aionui-root ${scmCss.panel}`, children: _jsx("div", { className: scmCss.notRepo, children: t('scm.gitMissing') }) });
    }
    if (status === null) {
        return _jsx("div", { className: `aionui-root ${scmCss.panel}`, children: _jsx("div", { className: scmCss.notRepo, children: t('scm.notRepo') }) });
    }
    const staged = status.staged;
    const unstaged = status.unstaged;
    const untracked = status.untracked;
    const hasChanges = staged.length + unstaged.length + untracked.length > 0;
    const allUntracked = discardTargets !== null && discardTargets.every((row) => row.state === 'untracked');
    return (_jsxs("div", { className: `aionui-root ${scmCss.panel}`, children: [_jsxs("div", { className: scmCss.section, style: { flex: changesSectionOpen ? 1 : undefined, maxHeight: changesSectionOpen ? undefined : 24 }, children: [_jsxs("div", { className: scmCss.sectionHeader, onClick: () => scm.setSectionCollapsed('changes', changesSectionOpen), onKeyDown: activateOnKey(() => { scm.setSectionCollapsed('changes', changesSectionOpen); }), role: "button", tabIndex: 0, "aria-expanded": changesSectionOpen, children: [_jsx("span", { className: `${scmCss.sectionChevron}${changesSectionOpen ? ` ${scmCss.sectionChevronOpen}` : ''}`, children: _jsx(ChevronRightIcon, { size: 13 }) }), _jsx("span", { className: scmCss.sectionTitle, children: t('scm.changes') }), status.branch !== '' && (_jsxs("span", { className: scmCss.branchName, style: { fontSize: 11, color: 'var(--aion-text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx(BranchIcon, { size: 12 }), status.branch] })), _jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }, onClick: (event) => event.stopPropagation(), children: [_jsx("button", { type: "button", className: scmCss.sectionAction, title: t('scm.stageAll'), onClick: () => void scm.stage(unstaged.map((row) => row.path)), disabled: unstaged.length === 0, children: _jsx(PlusIcon, { size: 13 }) }), _jsx("button", { type: "button", className: scmCss.sectionAction, title: t('scm.discardAll'), onClick: () => requestDiscard([...unstaged, ...untracked]), disabled: unstaged.length + untracked.length === 0, children: _jsx(UndoIcon, { size: 13 }) }), _jsx("button", { type: "button", className: `${scmCss.sectionAction}${state.viewMode === 'list' ? '' : ''}`, title: t('scm.viewList'), style: { color: state.viewMode === 'list' ? 'var(--aion-brand)' : undefined }, onClick: () => scm.setViewMode('list'), children: _jsx(ListIcon, { size: 13 }) }), _jsx("button", { type: "button", className: scmCss.sectionAction, title: t('scm.viewTree'), style: { color: state.viewMode === 'tree' ? 'var(--aion-brand)' : undefined }, onClick: () => scm.setViewMode('tree'), children: _jsx(TreeIcon, { size: 13 }) })] })] }), changesSectionOpen && (_jsxs("div", { className: scmCss.sectionBody, children: [!hasChanges && _jsx("div", { className: scmCss.empty, children: t('scm.empty') }), hasChanges && (_jsx(Group, { scm: scm, preview: preview, title: staged.length > 0 ? t('scm.staged') : undefined, rows: staged, bulkLabel: t('scm.unstage'), onBulk: (rows) => void scm.unstage(rows.map((row) => row.path)), onDiscard: requestDiscard })), hasChanges && unstaged.length > 0 && (_jsx(Group, { scm: scm, preview: preview, rows: unstaged, bulkLabel: t('scm.stage'), onBulk: (rows) => void scm.stage(rows.map((row) => row.path)), onDiscard: requestDiscard })), untracked.length > 0 && (_jsx(Group, { scm: scm, preview: preview, title: t('scm.untracked'), rows: untracked, bulkLabel: t('scm.stage'), onBulk: (rows) => void scm.stage(rows.map((row) => row.path)), onDiscard: requestDiscard }))] }))] }), discardTargets !== null && (_jsx(ConfirmDialog, { title: t('scm.discard'), body: allUntracked
                    ? format(t('scm.discardConfirmUntracked'), { count: discardTargets.length })
                    : format(t('scm.discardConfirmTracked'), { count: discardTargets.length }), confirmLabel: t('common.delete'), danger: true, onConfirm: confirmDiscard, onCancel: () => setDiscardTargets(null) }))] }));
}
/** One change group (staged / unstaged / untracked) with list or tree body. */
function Group({ scm, preview, rows, title, bulkLabel, onBulk, onDiscard, }) {
    const state = useStore(scm);
    const tree = useMemo(() => buildTree(rows), [rows]);
    const viewTree = state.viewMode === 'tree';
    const allActionable = rows.filter((row) => row.state !== 'conflicted');
    return (_jsxs("div", { children: [title !== undefined && (_jsxs("div", { className: scmCss.groupTitle, children: [title, _jsx("button", { type: "button", className: scmCss.groupAction, title: bulkLabel, onClick: () => onBulk(allActionable), disabled: allActionable.length === 0, children: bulkLabel === t('scm.unstage') ? _jsx(MinusIcon, { size: 12 }) : _jsx(PlusIcon, { size: 12 }) })] })), viewTree ? ([...tree.entries()].map(([dir, dirRows]) => (_jsx(DirNode, { dir: dir, rows: dirRows, depth: 0, state: state, scm: scm, preview: preview, onDiscard: onDiscard }, dir === '' ? '\u0000' : dir)))) : (rows.map((row) => (_jsx(ChangeRow, { row: row, state: state, scm: scm, preview: preview, onDiscard: onDiscard }, `${row.staged ? 's' : 'u'}:${row.path}`))))] }));
}
/** Tree-view directory node (expandable). */
function DirNode({ dir, rows, depth, state, scm, preview, onDiscard, }) {
    const expanded = state.treeExpanded.includes(dir);
    const label = dir === '' ? '/' : dir.split('/').pop() ?? dir;
    const toggleExpanded = () => {
        const next = expanded
            ? state.treeExpanded.filter((item) => item !== dir)
            : [...state.treeExpanded, dir];
        scm.setTreeExpanded(next);
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: scmCss.dirRow, style: { paddingLeft: 12 + depth * 12 }, title: dir, role: "button", tabIndex: 0, "aria-expanded": expanded, onClick: toggleExpanded, onKeyDown: activateOnKey(toggleExpanded), children: [_jsx("span", { className: `${scmCss.dirArrow}${expanded ? ` ${scmCss.dirArrowOpen}` : ''}`, children: _jsx(ChevronRightIcon, { size: 13 }) }), _jsx(FileTypeIcon, { name: label, isDir: true, expanded: expanded }), _jsx("span", { style: { fontSize: 13, color: 'var(--aion-text-primary)' }, children: label })] }), expanded &&
                rows.map((row) => (_jsx(ChangeRow, { row: row, state: state, scm: scm, preview: preview, onDiscard: onDiscard, indent: depth + 1, hideDir: true }, `${row.staged ? 's' : 'u'}:${row.path}`)))] }));
}
/** One change row: badge + name + dimmed dir + hover actions.
 * Clicking the row opens the path's diff in the preview panel (every state
 * has a diff — deleted rows show the removal, untracked rows a new-file diff).
 */
function ChangeRow({ row, state, scm, preview, onDiscard, indent = 0, hideDir = false, }) {
    const badge = BADGE[row.state] ?? BADGE.unknown;
    const busy = state.busy.includes(row.path);
    const failed = state.failed.includes(row.path);
    const conflicted = row.state === 'conflicted';
    const displayName = row.oldPath !== undefined ? `${row.oldPath.split('/').pop()} -> ${row.path.split('/').pop()}` : (row.path.split('/').pop() ?? row.path);
    const dir = dirOf(row.path);
    const openInPreview = () => {
        scm.select(row.path);
        // Staged rows diff the index against HEAD; unstaged rows the worktree
        // against the index — the side the row was listed under.
        preview.openDiff(state.root, row.path, row.staged);
    };
    return (_jsxs("div", { className: `${scmCss.changeRow}${state.selected === row.path ? ` ${scmCss.changeRowSelected}` : ''}${failed ? ` ${scmCss.rowFailed}` : ''}`, style: { paddingLeft: 12 + indent * 12 }, title: row.path, onClick: openInPreview, onKeyDown: activateOnKey(openInPreview), role: "button", tabIndex: 0, children: [_jsx("span", { className: `${scmCss.badge} ${badge.className}`, children: badge.letter }), _jsx("span", { className: scmCss.changeName, children: displayName }), !hideDir && dir !== '' && _jsx("span", { className: scmCss.changeDir, children: dir }), _jsx("span", { className: `${scmCss.rowActions}${busy || failed ? ` ${scmCss.rowActionsVisible}` : ''}`, children: conflicted ? null : row.staged ? (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: scmCss.rowAction, title: t('scm.unstage'), disabled: busy, onClick: (event) => { event.stopPropagation(); void scm.unstage([row.path]); }, children: _jsx(MinusIcon, { size: 13 }) }), _jsx("button", { type: "button", className: scmCss.rowAction, title: t('scm.discard'), disabled: busy, onClick: (event) => { event.stopPropagation(); onDiscard([row]); }, children: _jsx(UndoIcon, { size: 13 }) })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", className: scmCss.rowAction, title: t('scm.stage'), disabled: busy, onClick: (event) => { event.stopPropagation(); void scm.stage([row.path]); }, children: _jsx(PlusIcon, { size: 13 }) }), _jsx("button", { type: "button", className: scmCss.rowAction, title: t('scm.discard'), disabled: busy, onClick: (event) => { event.stopPropagation(); onDiscard([row]); }, children: _jsx(UndoIcon, { size: 13 }) })] })) })] }));
}
