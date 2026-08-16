import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The preview tab strip: 36px bar, tabs capped at 180px (padding 0 10, gap 6,
 * 12px title), dirty dot (6px, primary), close glyph (16px box, 12px icon),
 * middle-click close, right-click menu (close left/right/others/all), the
 * 32px left/right overflow fade indicators (ResizeObserver + scroll), the
 * new-URL-tab plus, and the panel collapse button.
 * @module dsh-aionui-panel/client/preview/PreviewTabs
 */
import { useEffect, useRef, useState } from 'react';
import { t } from "../locales.js";
import { CloseIcon, PlusIcon, ShrinkIcon } from "../components/icons.js";
import { activateOnKey } from "../components/a11y.js";
import previewCss from '../styles/preview.module.css';
/** Tab width cap (AionUi measured). */
export const MAX_TAB_WIDTH_PX = 180;
/** Fade indicator width. */
const FADE_WIDTH = 32;
/** The tab strip. */
export function PreviewTabs({ tabs, activeTabId, onSwitch, onClose, onContextMenu, onNewUrlTab, onClosePanel, }) {
    const scrollRef = useRef(null);
    const [fade, setFade] = useState({ left: false, right: false });
    // Overflow fades: ResizeObserver + scroll listener, setState only on change.
    useEffect(() => {
        const el = scrollRef.current;
        if (el === null)
            return;
        const update = () => {
            const next = {
                left: el.scrollLeft > 1,
                right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
            };
            setFade((prev) => (prev.left === next.left && prev.right === next.right ? prev : next));
        };
        const observer = new ResizeObserver(update);
        observer.observe(el);
        el.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
        return () => {
            observer.disconnect();
            el.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, [tabs.length]);
    return (_jsxs("div", { className: previewCss.tabBar, children: [_jsxs("div", { ref: scrollRef, className: previewCss.tabScroll, children: [tabs.length === 0 && _jsx("div", { className: previewCss.noTabs, children: t('preview.noTabs') }), tabs.map((tab) => (_jsxs("div", { className: `${previewCss.tab}${tab.id === activeTabId ? ` ${previewCss.tabActive}` : ` ${previewCss.tabInactive}`}`, style: { maxWidth: MAX_TAB_WIDTH_PX }, role: "button", tabIndex: 0, title: tab.path, "aria-label": tab.title, onClick: () => onSwitch(tab.id), onKeyDown: activateOnKey(() => { onSwitch(tab.id); }), onContextMenu: (event) => onContextMenu(event, tab), onAuxClick: (event) => {
                            if (event.button !== 1)
                                return;
                            event.preventDefault();
                            event.stopPropagation();
                            onClose(tab.id);
                        }, children: [_jsx("span", { className: previewCss.tabTitle, title: tab.path, children: tab.title }), tab.dirty && _jsx("span", { className: previewCss.tabDotDirty, title: t('preview.dirty') }), _jsx("span", { className: previewCss.tabClose, role: "button", tabIndex: 0, title: t('common.close'), "aria-label": t('common.close'), onClick: (event) => {
                                    event.stopPropagation();
                                    onClose(tab.id);
                                }, onKeyDown: activateOnKey(() => { onClose(tab.id); }), children: _jsx(CloseIcon, { size: 12 }) })] }, tab.id))), _jsx("div", { className: previewCss.tabPlus, role: "button", tabIndex: 0, onClick: onNewUrlTab, onKeyDown: activateOnKey(onNewUrlTab), title: t('preview.newUrlTab'), children: _jsx(PlusIcon, { size: 14 }) })] }), _jsx("div", { className: previewCss.tabBarRight, children: _jsx("div", { className: previewCss.panelCollapse, role: "button", tabIndex: 0, onClick: onClosePanel, onKeyDown: activateOnKey(onClosePanel), title: t('preview.collapsePanel'), "aria-label": t('preview.collapsePanel'), children: _jsx(ShrinkIcon, { size: 14 }) }) }), fade.left && _jsx("div", { className: previewCss.tabFadeLeft, style: { width: FADE_WIDTH } }), fade.right && _jsx("div", { className: previewCss.tabFadeRight, style: { width: FADE_WIDTH } })] }));
}
