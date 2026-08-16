import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The Git graph panel: a read-only commit list with lane topology, ref
 * labels, and paging (git log --branches --tags --remotes --topo-order).
 * @module dsh-git-graph/client/graph/GraphDialog
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconCloseOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';
import { computeLanes } from "../../core/types.js";
import { Backdrop, cx } from "../chips/Chip.js";
import css from '../chips/context.module.css';
/** Initial page size of the graph fetch. */
const INITIAL_LIMIT = 200;
/** Page size of one "load more" step. */
const PAGE_STEP = 100;
/** Lane glyph → the rendered monospace character. */
function glyphChar(glyph) {
    switch (glyph) {
        case 'node': return '●';
        case 'merge': return '◆';
        case 'pass': return '│';
        case 'gap': return ' ';
    }
}
/** Seconds per time bucket (relative timestamps). */
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/**
 * A compact relative timestamp (GitHub-style): "just now", "5 分钟前",
 * falling back to a plain date past 30 days.
 * @param epochSeconds - commit author time in seconds.
 * @param t - the dictionary.
 * @returns the display string.
 */
function formatTime(epochSeconds, t) {
    const elapsed = Math.max(0, Math.floor(Date.now() / 1000) - epochSeconds);
    if (elapsed < MINUTE)
        return t('graph.time.justNow');
    if (elapsed < HOUR)
        return t('graph.time.minutesAgo', { count: Math.floor(elapsed / MINUTE) });
    if (elapsed < DAY)
        return t('graph.time.hoursAgo', { count: Math.floor(elapsed / HOUR) });
    if (elapsed < 30 * DAY)
        return t('graph.time.daysAgo', { count: Math.floor(elapsed / DAY) });
    const date = new Date(epochSeconds * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
/**
 * The Git graph panel.
 * @param props - see {@link GraphDialogProps}.
 */
export function GraphDialog({ graph, onClose, t }) {
    const [view, setView] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const load = useCallback((limit) => {
        setLoading(true);
        void graph(limit).then((next) => {
            setView(next);
            setError(next === null ? t('error.internal') : null);
        }).catch(() => {
            setError(t('error.internal'));
        }).finally(() => { setLoading(false); });
    }, [graph, t]);
    useEffect(() => { load(INITIAL_LIMIT); }, [load]);
    const lanes = useMemo(() => {
        if (view === null)
            return [];
        return computeLanes(view.commits);
    }, [view]);
    const laneCount = useMemo(() => {
        let count = 0;
        for (const row of lanes)
            count = Math.max(count, row.columns.length);
        return count;
    }, [lanes]);
    return (_jsxs(_Fragment, { children: [_jsx(Backdrop, { onClose: onClose }), _jsxs("div", { className: css.dialog, role: "dialog", "aria-label": t('graph.title'), "data-gitgraph-dialog": true, children: [_jsxs("div", { className: css.dialogHeader, children: [_jsxs("div", { className: css.dialogHeading, children: [_jsx("h3", { className: css.dialogTitle, children: t('graph.title') }), _jsx("div", { className: css.graphSubtitle, children: t('graph.subtitle', {
                                            count: view === null ? 0 : view.commits.length,
                                            lanes: laneCount,
                                        }) })] }), _jsx("button", { type: "button", className: css.dialogClose, onClick: onClose, "aria-label": t('graph.close'), children: _jsx(IconCloseOutline16, { size: 16 }) })] }), _jsx("div", { className: css.graphBody, children: loading && view === null
                            ? _jsx("div", { className: css.graphEmpty, children: t('graph.loading') })
                            : error !== null
                                ? _jsx("div", { className: css.graphEmpty, children: error })
                                : view === null || view.commits.length === 0
                                    ? _jsx("div", { className: css.graphEmpty, children: t('graph.empty') })
                                    : view.commits.map((commit, index) => {
                                        const row = lanes[index];
                                        if (row === undefined)
                                            return null;
                                        return (_jsxs("div", { className: css.graphRow, children: [_jsx("span", { className: css.graphLanes, "aria-hidden": "true", "data-gitgraph-lanes": true, children: row.columns.map((glyph, column) => (_jsx("span", { "data-gitgraph-glyph": glyph, className: cx(css.graphLaneCell, glyph === 'node' && css.graphLaneNode, glyph === 'merge' && css.graphLaneMerge, glyph === 'pass' && css.graphLanePass), children: glyphChar(glyph) }, column))) }), _jsx("span", { className: css.graphOid, title: commit.oid, children: commit.oid.slice(0, 7) }), _jsxs("span", { className: css.graphMain, children: [_jsx("span", { className: css.graphSubject, title: commit.subject, children: commit.subject }), _jsxs("span", { className: css.graphMeta, children: [commit.refs.map(ref => (_jsx("span", { title: ref, "data-gitgraph-ref": true, "data-gitgraph-ref-current": ref === view.branch || undefined, className: cx(css.graphRef, ref === view.branch && css.graphRefCurrent), children: ref }, ref))), _jsx("span", { children: commit.author }), _jsx("span", { className: css.graphMetaSep, children: "\u00B7" }), _jsx("span", { children: formatTime(commit.authorTime, t) })] })] })] }, commit.oid));
                                    }) }), view !== null && view.hasMore && (_jsx("button", { type: "button", className: css.graphMore, onClick: () => { load(view.commits.length + PAGE_STEP); }, children: t('graph.loadMore') }))] })] }));
}
