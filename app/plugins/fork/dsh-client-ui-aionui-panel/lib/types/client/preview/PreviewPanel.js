import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The preview panel root: tab strip + toolbar + content router, the tab
 * context menu (close left/right/others/all), the dirty-close confirmation
 * (the single entry for every batch close — middle-click included), and the
 * panel collapse button. View mode and split live here so the toolbar and the
 * content share one source; both reset when the displayed file changes.
 * @module dsh-aionui-panel/client/preview/PreviewPanel
 */
import { useEffect, useRef, useState } from 'react';
import { isEditableType } from "../fileType.js";
import { t, format } from "../locales.js";
import { useStore } from "../hooks/useStore.js";
import { ConfirmDialog, ContextMenu } from "../components/overlay.js";
import { PreviewTabs } from "./PreviewTabs.js";
import { PreviewToolbar, downloadTab } from "./PreviewToolbar.js";
import { TabContent } from "./content.js";
import previewCss from '../styles/preview.module.css';
/** The preview panel (mounted in the preview grid column). */
export function PreviewPanel({ stores }) {
    const preview = stores.preview;
    const state = useStore(preview);
    const [menu, setMenu] = useState(null);
    const [closingIds, setClosingIds] = useState(null);
    const [viewMode, setViewMode] = useState('preview');
    const [split, setSplit] = useState(false);
    const lastDirtyCheck = useRef(new Set());
    const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId) ?? null;
    // View mode resets to preview when the displayed FILE changes (path+type).
    const identity = activeTab === null ? '' : `${activeTab.path}\u0000${activeTab.contentType}`;
    useEffect(() => {
        setViewMode('preview');
        setSplit(false);
    }, [identity]);
    /** Close a batch; dirty tabs route through the confirmation first. */
    const requestClose = (ids) => {
        const dirty = state.tabs.filter((tab) => ids.includes(tab.id) && tab.dirty);
        if (dirty.length === 0) {
            preview.closeTabs(ids);
            return;
        }
        lastDirtyCheck.current = new Set(dirty.map((tab) => tab.id));
        setClosingIds(ids);
    };
    const closeMenuFor = (event, tab) => {
        event.preventDefault();
        event.stopPropagation();
        const index = state.tabs.findIndex((item) => item.id === tab.id);
        setMenu({
            x: event.clientX,
            y: event.clientY,
            entries: [
                {
                    key: 'close-left',
                    label: t('preview.closeLeft'),
                    disabled: index <= 0,
                    onSelect: () => requestClose(state.tabs.slice(0, index).map((item) => item.id)),
                },
                {
                    key: 'close-right',
                    label: t('preview.closeRight'),
                    disabled: index >= state.tabs.length - 1,
                    onSelect: () => requestClose(state.tabs.slice(index + 1).map((item) => item.id)),
                },
                { key: 'sep-1', label: '---', onSelect: () => { } },
                {
                    key: 'close-others',
                    label: t('preview.closeOthers'),
                    disabled: state.tabs.length <= 1,
                    onSelect: () => requestClose(state.tabs.filter((item) => item.id !== tab.id).map((item) => item.id)),
                },
                {
                    key: 'close-all',
                    label: t('preview.closeAll'),
                    onSelect: () => requestClose(state.tabs.map((item) => item.id)),
                },
            ],
        });
    };
    /** A fresh url tab (empty address; the viewer owns the input). */
    const newUrlTab = () => {
        const stamp = Date.now();
        const tab = {
            id: `url:${stamp}`,
            title: 'new tab',
            root: state.root,
            path: `url:${stamp}`,
            contentType: 'url',
            content: '',
            dirty: false,
            updated: false,
            loading: false,
            truncated: false,
            error: null,
            savedAt: Date.now(),
        };
        preview.update((prev) => ({ ...prev, open: true, tabs: [...prev.tabs, tab], activeTabId: tab.id }));
    };
    return (_jsxs("div", { className: `aionui-root ${previewCss.panel}`, children: [_jsx(PreviewTabs, { tabs: state.tabs, activeTabId: state.activeTabId, onSwitch: (id) => preview.switchTab(id), onClose: (id) => requestClose([id]), onContextMenu: closeMenuFor, onNewUrlTab: newUrlTab, onClosePanel: () => preview.setOpen(false) }), activeTab !== null && (_jsxs(_Fragment, { children: [_jsx(PreviewToolbar, { contentType: activeTab.contentType, hasContent: activeTab.content !== null, loading: activeTab.loading, dirty: activeTab.dirty, updated: activeTab.updated, viewMode: viewMode, canToggleView: activeTab.contentType === 'markdown' || activeTab.contentType === 'html', split: split, canSplit: isEditableType(activeTab.contentType) && activeTab.content !== null, onViewModeChange: setViewMode, onSplitChange: setSplit, onRefresh: () => void preview.reloadTab(activeTab.id), onSave: () => void preview.saveTab(activeTab.id), onDownload: () => downloadTab(activeTab) }), _jsx(TabContent, { tab: activeTab, viewMode: viewMode, split: split, onContentChange: (content) => preview.updateContent(activeTab.id, content), onSave: () => void preview.saveTab(activeTab.id) })] })), menu !== null && _jsx(ContextMenu, { state: menu, onClose: () => setMenu(null) }), closingIds !== null && (_jsx(ConfirmDialog, { title: t('preview.closeConfirmTitle'), body: format(t('preview.closeConfirmBody'), { count: lastDirtyCheck.current.size }), confirmLabel: t('common.close'), danger: true, onConfirm: () => {
                    preview.closeTabs(closingIds);
                    setClosingIds(null);
                }, onCancel: () => setClosingIds(null) }))] }));
}
