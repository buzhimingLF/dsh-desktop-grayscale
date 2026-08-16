import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Minimal overlay primitives for the panel: a toast and a context menu,
 * rendered through plain DOM + portals so they can live outside the grid
 * columns (fixed positioning, high z-index).
 * @module dsh-aionui-panel/client/components/overlay
 */
import { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from "../locales.js";
/** One transient toast message. */
let toastTimer;
export function toast(message) {
    const el = document.createElement('div');
    el.className = 'aionui-toast';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.2s ease';
    }, 1800);
    setTimeout(() => el.remove(), 2100);
    if (toastTimer !== undefined)
        clearTimeout(toastTimer);
    toastTimer = undefined;
}
/** The shared context-menu portal host (one at a time). */
export function ContextMenu({ state, onClose }) {
    const [position, setPosition] = useState(null);
    useLayoutEffect(() => {
        if (state === null) {
            setPosition(null);
            return;
        }
        // Keep the menu inside the viewport.
        const width = 180;
        const height = state.entries.length * 28 + 12;
        setPosition({
            x: Math.min(state.x, window.innerWidth - width - 8),
            y: Math.min(state.y, window.innerHeight - height - 8),
        });
    }, [state]);
    useEffect(() => {
        if (state === null)
            return;
        const close = (event) => {
            // A pointerdown inside the menu must not close it — the menu item's own
            // onClick still needs to run (and microtask-less onClose before onSelect
            // would unmount the item mid-click). Only close on outside clicks.
            if (event.target instanceof Element && event.target.closest('[data-menu-root]') !== null)
                return;
            onClose();
        };
        const key = (event) => {
            if (event.key === 'Escape')
                onClose();
        };
        window.addEventListener('pointerdown', close, { capture: true });
        window.addEventListener('blur', onClose);
        window.addEventListener('keydown', key);
        window.addEventListener('contextmenu', onClose);
        return () => {
            window.removeEventListener('pointerdown', close, { capture: true });
            window.removeEventListener('blur', onClose);
            window.removeEventListener('keydown', key);
            window.removeEventListener('contextmenu', onClose);
        };
    }, [state, onClose]);
    if (state === null || position === null)
        return null;
    return createPortal(_jsx("div", { className: "aionui-menu", "data-menu-root": "", style: { left: position.x, top: position.y }, onPointerDown: (event) => event.stopPropagation(), onContextMenu: (event) => event.preventDefault(), children: state.entries.map((entry) => (_jsx("div", { children: entry.label === '---' ? (_jsx("div", { className: "aionui-menu-sep" })) : (_jsx("div", { className: `aionui-menu-item${entry.disabled === true ? ' aionui-menu-item-disabled' : ''}`, onClick: () => {
                    if (entry.disabled === true)
                        return;
                    onClose();
                    entry.onSelect();
                }, role: "menuitem", children: entry.label })) }, entry.key))) }), document.body);
}
/** A confirmation dialog (dirty-close confirm, discard confirm). */
export function ConfirmDialog({ title, body, confirmLabel, danger, onConfirm, onCancel, }) {
    useEffect(() => {
        const key = (event) => {
            if (event.key === 'Escape')
                onCancel();
        };
        window.addEventListener('keydown', key);
        return () => window.removeEventListener('keydown', key);
    }, [onCancel]);
    return createPortal(_jsx("div", { className: "aionui-overlay", onPointerDown: onCancel, children: _jsxs("div", { className: "aionui-dialog", onPointerDown: (event) => event.stopPropagation(), children: [_jsx("div", { className: "aionui-dialog-title", children: title }), _jsx("div", { className: "aionui-dialog-body", children: body }), _jsxs("div", { className: "aionui-dialog-actions", children: [_jsx("button", { type: "button", className: "aionui-btn", onClick: onCancel, children: t('common.cancel') }), _jsx("button", { type: "button", className: `aionui-btn ${danger === true ? 'aionui-btn-danger' : 'aionui-btn-primary'}`, onClick: onConfirm, children: confirmLabel ?? t('common.confirm') })] })] }) }), document.body);
}
