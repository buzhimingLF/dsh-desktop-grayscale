import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The branch picker popover: searchable local branch list with the current
 * branch checked, the dirtiness line, switch feedback (success/error), and
 * the footer flows (create branch / Git graph).
 * @module dsh-git-graph/client/chips/BranchPopover
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { IconBranchOutline16, IconCheckOutline14, IconSearchOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';
import { errorMessage } from "./error-copy.js";
import { cx, Backdrop } from "./Chip.js";
import css from './context.module.css';
/** How long the success notice stays before the popover closes itself. */
const SUCCESS_DISMISS_MS = 900;
/**
 * The branch picker popover.
 * @param props - see {@link BranchPopoverProps}.
 */
export function BranchPopover({ view, onSwitch, onSwitched, onCreate, onGraph, onClose, t, hero = false }) {
    const [query, setQuery] = useState('');
    const [pending, setPending] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const dismissTimer = useRef(undefined);
    useEffect(() => () => {
        if (dismissTimer.current !== undefined)
            clearTimeout(dismissTimer.current);
    }, []);
    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (needle === '')
            return view.branches;
        return view.branches.filter(branch => branch.name.toLowerCase().includes(needle));
    }, [view.branches, query]);
    const switchTo = (branch) => {
        if (pending !== null)
            return;
        setPending(branch);
        setError(null);
        setSuccess(null);
        void onSwitch(branch).then((result) => {
            if (result.ok) {
                onSwitched();
                setSuccess(t('toast.switchSuccess', { branchName: result.branch }));
                dismissTimer.current = setTimeout(onClose, SUCCESS_DISMISS_MS);
                return;
            }
            setError(errorMessage(result.error, t));
        }).finally(() => { setPending(null); });
    };
    return (_jsxs(_Fragment, { children: [_jsx(Backdrop, { onClose: onClose }), _jsxs("div", { className: cx(css.popover, hero && css.popoverHero), role: "listbox", "aria-label": t('branch.search'), "data-gitgraph-popover": true, children: [_jsxs("div", { className: css.searchBox, children: [_jsx(IconSearchOutline16, { size: 14 }), _jsx("input", { className: css.searchInput, value: query, onChange: (event) => { setQuery(event.target.value); }, placeholder: t('branch.search'), autoFocus: true })] }), view.dirtyFiles > 0
                        && _jsx("div", { className: css.dirty, children: t('branch.dirty', { count: view.dirtyFiles }) }), _jsx("div", { className: css.list, children: filtered.length === 0
                            ? _jsx("div", { className: css.empty, children: t('branch.empty') })
                            : filtered.map(branch => (_jsxs("button", { type: "button", className: cx(css.item, branch.current && css.itemActive), onClick: () => { switchTo(branch.name); }, role: "option", "aria-selected": branch.current, disabled: pending !== null, children: [_jsx(IconBranchOutline16, { size: 14 }), _jsx("span", { className: css.itemText, children: _jsx("span", { className: css.itemName, title: branch.name, children: branch.name }) }), branch.current && _jsx(IconCheckOutline14, { className: css.check, size: 14 })] }, branch.name))) }), success !== null && _jsx("div", { className: cx(css.notice, css.noticeOk), children: success }), error !== null && _jsx("div", { className: css.notice, children: error }), _jsxs("div", { className: css.footer, children: [_jsxs("button", { type: "button", className: css.footerItem, onClick: onCreate, children: [_jsx(IconBranchOutline16, { size: 14 }), t('branch.create')] }), _jsxs("button", { type: "button", className: css.footerItem, onClick: onGraph, children: [_jsx(IconBranchOutline16, { size: 14 }), t('branch.graph')] })] })] })] }));
}
