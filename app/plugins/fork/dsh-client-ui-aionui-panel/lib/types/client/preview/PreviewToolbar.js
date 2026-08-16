import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { isEditableType } from "../fileType.js";
import { t } from "../locales.js";
import { CodeIcon, DownloadIcon, EyeIcon, RefreshIcon, SaveIcon, SplitIcon } from "../components/icons.js";
import previewCss from '../styles/preview.module.css';
/** Derive the refresh state for one tab. */
export function refreshStateFor(contentType, hasContent, loading, updated) {
    // URL tabs reload their frame (cross-origin documents can only be
    // re-navigated to the tab's address, never reloaded in place).
    if (contentType === 'url')
        return 'idle';
    if (contentType === 'word' || contentType === 'excel'
        || contentType === 'ppt' || contentType === 'unsupported' || contentType === 'image') {
        return 'hidden';
    }
    if (!hasContent || loading)
        return 'disabled';
    return updated ? 'updated' : 'idle';
}
/** Download the current tab's content as a file. */
export function downloadTab(tab) {
    if (tab.content === null)
        return;
    const isDataUrl = tab.content.startsWith('data:');
    // Pdf tabs hold a same-origin raw-route URL: anchor it directly (the
    // download attribute forces a save), no blob copy needed.
    const isRouteUrl = tab.content.startsWith('/aionui-panel/raw');
    const href = isDataUrl || isRouteUrl
        ? tab.content
        : URL.createObjectURL(new Blob([tab.content], { type: 'text/plain;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = tab.title;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    if (!isDataUrl && !isRouteUrl)
        setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
/** The toolbar. */
export function PreviewToolbar({ contentType, hasContent, loading, dirty, updated, viewMode, canToggleView, split, canSplit, onViewModeChange, onSplitChange, onRefresh, onSave, onDownload, }) {
    const refreshState = refreshStateFor(contentType, hasContent, loading, updated);
    const editable = isEditableType(contentType);
    return (_jsxs("div", { className: previewCss.toolbar, children: [canToggleView && (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: `${previewCss.toolbarBtn}${viewMode === 'source' ? ` ${previewCss.toolbarBtnActive}` : ''}`, onClick: () => onViewModeChange('source'), children: [_jsx(CodeIcon, { size: 13 }), t('preview.source')] }), _jsxs("button", { type: "button", className: `${previewCss.toolbarBtn}${viewMode === 'preview' ? ` ${previewCss.toolbarBtnActive}` : ''}`, onClick: () => onViewModeChange('preview'), children: [_jsx(EyeIcon, { size: 13 }), t('preview.preview')] })] })), canSplit && (_jsxs("button", { type: "button", className: `${previewCss.toolbarBtn}${split ? ` ${previewCss.toolbarBtnActive}` : ''}`, title: t('preview.split'), onClick: () => onSplitChange(!split), children: [_jsx(SplitIcon, { size: 13 }), t('preview.split')] })), _jsx("button", { type: "button", className: previewCss.toolbarBtn, title: t('preview.download'), disabled: !hasContent, onClick: onDownload, children: _jsx(DownloadIcon, { size: 13 }) }), _jsx("span", { className: previewCss.toolbarSpacer }), refreshState !== 'hidden' && (_jsxs("button", { type: "button", className: `${previewCss.toolbarBtn}${refreshState === 'updated' ? ` ${previewCss.toolbarBtnWarn}` : ''}`, title: refreshState === 'updated' ? t('preview.refresh.updated') : t('preview.refresh'), disabled: refreshState === 'disabled', onClick: onRefresh, children: [_jsx(RefreshIcon, { size: 13 }), t('preview.refresh')] })), editable && dirty && (_jsxs("button", { type: "button", className: previewCss.toolbarBtn, onClick: onSave, disabled: loading, children: [_jsx(SaveIcon, { size: 13 }), t('preview.save')] }))] }));
}
