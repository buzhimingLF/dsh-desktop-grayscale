import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Preview content routing: the renderers for every content type plus the
 * split-screen editor|preview layout. View mode (source/preview) resets to
 * preview when the displayed FILE changes (keyed on path+type, not tab id —
 * AionUi contract), and the split ratio is persisted under
 * preview-panel-split-ratio with a 20..80 clamp.
 * @module dsh-aionui-panel/client/preview/content
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useResizableSplit } from "../hooks/useResizableSplit.js";
import { t } from "../locales.js";
import { renderMarkdown, resolveMarkdownImage } from "./markdown.js";
import previewCss from '../styles/preview.module.css';
/** Split-ratio persistence key (AionUi contract). */
export const KEY_SPLIT_RATIO = 'preview-panel-split-ratio';
/** The rendered content of one tab (viewMode/split are controlled by the panel). */
export function TabContent({ tab, viewMode, split, onContentChange, onSave, }) {
    if (tab.error !== null) {
        return _jsxs("div", { className: previewCss.placeholder, children: [_jsx("div", { className: previewCss.placeholderTitle, children: tab.title }), _jsx("div", { className: previewCss.placeholderError, children: tab.error })] });
    }
    const editable = tab.contentType === 'markdown' || tab.contentType === 'html'
        || tab.contentType === 'code' || tab.contentType === 'csv' || tab.contentType === 'text';
    // Split screen: editable types only; editor | preview with a ratio handle.
    if (split && editable) {
        return (_jsx(SplitPane, { tab: tab, onContentChange: onContentChange, onSave: onSave }));
    }
    return (_jsxs("div", { className: previewCss.content, children: [tab.truncated && tab.content !== null && (_jsx("div", { className: previewCss.truncatedNote, children: t('preview.errorOversized') })), tab.contentType === 'markdown' && tab.content !== null && (_jsx(MarkdownViewer, { content: tab.content, root: tab.root, path: tab.path, sourceMode: viewMode === 'source', onContentChange: onContentChange })), tab.contentType === 'html' && tab.content !== null && (_jsx(HtmlViewer, { content: tab.content, sourceMode: viewMode === 'source', onContentChange: onContentChange })), (tab.contentType === 'code' || tab.contentType === 'text') && tab.content !== null && (_jsx(CodeViewer, { content: tab.content, language: tab.title.split('.').pop() ?? '' })), tab.contentType === 'csv' && tab.content !== null && _jsx(CsvViewer, { content: tab.content }), tab.contentType === 'diff' && tab.content !== null && _jsx(DiffViewer, { content: tab.content }), tab.contentType === 'image' && tab.content !== null && (_jsx(ImageViewer, { src: tab.content, meta: `${tab.image?.width ?? ''}${tab.image ? ' x ' : ''}${tab.image?.height ?? ''}` })), tab.contentType === 'pdf' && tab.content !== null && _jsx(PdfViewer, { dataUrl: tab.content, title: tab.title }), tab.contentType === 'url' && _jsx(UrlViewer, { tab: tab }), (tab.contentType === 'word' || tab.contentType === 'excel' || tab.contentType === 'ppt' || tab.contentType === 'unsupported') && (_jsx(UnsupportedViewer, { tab: tab })), tab.content === null && !tab.loading && (_jsxs("div", { className: previewCss.placeholder, children: [_jsx("div", { className: previewCss.placeholderTitle, children: tab.title }), _jsx("div", { className: previewCss.placeholderMeta, children: t('preview.downloadHint') })] })), tab.loading && _jsx("div", { className: previewCss.placeholder, children: t('scm.loading') })] }));
}
/** Split screen: textarea editor | rendered preview, ratio persisted. */
function SplitPane({ tab, onContentChange, onSave, }) {
    const { width: splitRatio, handleProps } = useResizableSplit({
        unit: 'ratio',
        defaultWidth: 50,
        minWidth: 20,
        maxWidth: 80,
        storageKey: KEY_SPLIT_RATIO,
    });
    const content = tab.content ?? '';
    return (_jsxs("div", { className: previewCss.splitPane, children: [_jsxs("div", { className: previewCss.splitPaneLeft, style: { width: `${splitRatio}%` }, children: [_jsx("div", { className: previewCss.splitHeader, children: t('preview.editor') }), _jsx("div", { className: previewCss.splitBody, children: _jsx("textarea", { className: previewCss.textEditor, value: content, spellCheck: false, onChange: (event) => onContentChange(event.target.value), onKeyDown: (event) => {
                                if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                                    event.preventDefault();
                                    onSave();
                                }
                            } }) })] }), _jsx("div", { className: previewCss.splitHandle, "data-reverse": "false", style: { left: `calc(${splitRatio}% - 6px)` }, ...handleProps }), _jsxs("div", { className: previewCss.splitPaneRight, style: { width: `${100 - splitRatio}%` }, children: [_jsx("div", { className: previewCss.splitHeader, children: t('preview.preview') }), _jsxs("div", { className: previewCss.splitBody, children: [tab.contentType === 'markdown' && _jsx(MarkdownViewer, { content: content, root: tab.root, path: tab.path }), tab.contentType === 'html' && _jsx(HtmlViewer, { content: content }), tab.contentType === 'csv' && _jsx(CsvViewer, { content: content }), tab.contentType === 'code' && _jsx(CodeViewer, { content: content, language: tab.title.split('.').pop() ?? '' })] })] })] }));
}
/** Markdown viewer with an optional source mode (textarea). */
function MarkdownViewer({ content, root, path, sourceMode = false, onContentChange, }) {
    const resolveImageSrc = useCallback((src) => {
        if (root === '' || path === '')
            return null;
        const resolution = resolveMarkdownImage(path, src);
        if (resolution.kind === 'absolute')
            return src;
        if (resolution.kind === 'escape')
            return null;
        // Workspace-relative target: serve the bytes through the host raw route
        // (same origin as the GUI), preserving any ?query#fragment suffix.
        return `/aionui-panel/raw?root=${encodeURIComponent(root)}&path=${encodeURIComponent(resolution.path)}${resolution.suffix}`;
    }, [root, path]);
    const html = useMemo(() => renderMarkdown(content, { resolveImageSrc }), [content, resolveImageSrc]);
    if (sourceMode && onContentChange !== undefined) {
        return (_jsx("div", { className: previewCss.content, children: _jsx("textarea", { className: previewCss.textEditor, value: content, spellCheck: false, onChange: (event) => onContentChange(event.target.value) }) }));
    }
    return _jsx("div", { className: previewCss.mdViewer, dangerouslySetInnerHTML: { __html: html } });
}
/** HTML viewer: sandboxed iframe (scripts off) or source textarea. */
function HtmlViewer({ content, sourceMode = false, onContentChange, }) {
    const srcDoc = useMemo(() => {
        // Base styles so the embedded page inherits the theme background.
        return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:-apple-system,"system-ui","Segoe UI",Roboto,"PingFang SC",sans-serif;color:#1d2129}@media (prefers-color-scheme:dark){body{color:rgba(255,255,255,0.9)}}</style></head><body>${content}</body></html>`;
    }, [content]);
    if (sourceMode && onContentChange !== undefined) {
        return (_jsx("div", { className: previewCss.content, children: _jsx("textarea", { className: previewCss.textEditor, value: content, spellCheck: false, onChange: (event) => onContentChange(event.target.value) }) }));
    }
    return _jsx("iframe", { className: previewCss.pdfViewer, srcDoc: srcDoc, sandbox: "", title: "html preview" });
}
/** Plain code/text viewer. */
function CodeViewer({ content, language }) {
    void language;
    return _jsx("pre", { className: previewCss.codeViewer, children: _jsx("code", { children: content }) });
}
/**
 * One memoized CSV row. The cells array reference is stable (it comes from the
 * memoized parsed rows), so an untouched row skips re-rendering when a sibling
 * cell changes or the panel re-renders for another reason.
 */
const CsvRow = memo(function CsvRow({ cells, isHeader }) {
    return (_jsx("tr", { children: cells.map((cell, cellIndex) => (isHeader ? _jsx("th", { children: cell }, cellIndex) : _jsx("td", { children: cell }, cellIndex))) }));
});
/**
 * Stable, content-derived key for a CSV row. Rows have no ids, so the cell
 * content (JSON, occurrence-disambiguated for duplicates) anchors the key
 * instead of the array position — a reordered or shifted table keeps stable
 * React identities instead of reusing DOM nodes by index.
 * @param row - the raw row cells.
 * @param occurrence - how many identical rows were already keyed.
 */
function csvRowKey(row, occurrence) {
    return `${JSON.stringify(row)}\u0000${occurrence}`;
}
/** CSV table. */
function CsvViewer({ content }) {
    const rows = useMemo(() => parseCsv(content), [content]);
    const keyedRows = useMemo(() => {
        const counts = new Map();
        return rows.map((row) => {
            const seen = counts.get(JSON.stringify(row)) ?? 0;
            counts.set(JSON.stringify(row), seen + 1);
            return { cells: row, key: csvRowKey(row, seen) };
        });
    }, [rows]);
    return (_jsx("div", { className: previewCss.csvViewer, children: _jsx("table", { className: previewCss.csvTable, children: keyedRows.map((entry, index) => (_jsx(CsvRow, { cells: entry.cells, isHeader: index === 0 }, entry.key))) }) }));
}
/** Parse CSV lines (quoted cells with escaped quotes). */
export function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    cell += '"';
                    i += 1;
                }
                else {
                    inQuotes = false;
                }
            }
            else {
                cell += char;
            }
            continue;
        }
        if (char === '"') {
            inQuotes = true;
            continue;
        }
        if (char === ',') {
            row.push(cell);
            cell = '';
            continue;
        }
        if (char === '\n') {
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
            continue;
        }
        if (char !== '\r')
            cell += char;
    }
    row.push(cell);
    if (row.length > 1 || row[0] !== '')
        rows.push(row);
    return rows;
}
/** Unified diff viewer. */
function DiffViewer({ content }) {
    const lines = content.split('\n');
    return (_jsx("div", { className: previewCss.diffViewer, children: lines.map((line, index) => {
            let className = previewCss.diffLineMeta;
            if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff ') || line.startsWith('index ')) {
                className = previewCss.diffLineMeta;
            }
            else if (line.startsWith('@@')) {
                className = previewCss.diffLineHunk;
            }
            else if (line.startsWith('+')) {
                className = previewCss.diffLineAdd;
            }
            else if (line.startsWith('-')) {
                className = previewCss.diffLineDel;
            }
            return (_jsx("div", { className: className, children: line === '' ? ' ' : line }, index));
        }) }));
}
/** Image viewer. */
function ImageViewer({ src, meta }) {
    return (_jsxs("div", { className: previewCss.content, children: [_jsx("div", { className: previewCss.imageViewer, children: _jsx("img", { src: src, alt: "" }) }), meta.trim() !== '' && _jsx("div", { className: previewCss.imageMeta, children: meta })] }));
}
/** PDF viewer: streamed route URL (iframe src) or a legacy data URL (blob). */
function PdfViewer({ dataUrl, title }) {
    const [url, setUrl] = useState(null);
    useEffect(() => {
        if (!dataUrl.startsWith('data:')) {
            // Same-origin /aionui-panel/raw URL: the iframe loads the stream
            // directly (mime application/pdf, no size cap, no base64 copy).
            setUrl(dataUrl === '' ? null : dataUrl);
            return;
        }
        const blob = dataUrlToBlob(dataUrl);
        if (blob === null) {
            setUrl(null);
            return;
        }
        const objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [dataUrl]);
    return url === null
        ? _jsx("div", { className: previewCss.placeholder, children: t('preview.unsupported') })
        : _jsx("iframe", { className: previewCss.pdfViewer, src: url, title: title });
}
/** Convert a data URL to a Blob (null on failure). */
export function dataUrlToBlob(dataUrl) {
    const comma = dataUrl.indexOf(',');
    if (comma === -1)
        return null;
    const meta = dataUrl.slice(0, comma);
    const mime = /data:([^;]+)/.exec(meta)?.[1] ?? 'application/octet-stream';
    try {
        const binary = atob(dataUrl.slice(comma + 1));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1)
            bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: mime });
    }
    catch {
        return null;
    }
}
/** URL tab: address bar + iframe. */
function UrlViewer({ tab }) {
    const [input, setInput] = useState(tab.content ?? '');
    const [url, setUrl] = useState(() => normalizeUrl(tab.content ?? ''));
    const frameRef = useRef(null);
    useEffect(() => {
        setInput(tab.content ?? '');
        setUrl(normalizeUrl(tab.content ?? ''));
    }, [tab.id, tab.content]);
    // The frame is sandboxed WITH allow-popups: sites like bilibili hardcode
    // target=_blank on their nav links, so popups are permitted rather than
    // silently dropped. allow-same-origin is intentionally OMITTED, so the
    // embedded site runs in an OPAQUE origin: it cannot reach window.parent or
    // touch same-origin storage, which also means localStorage access inside
    // the frame throws. The load guard and normalizeUrl's same-origin block
    // remain as defense-in-depth for any frame that still lands on the GUI
    // origin.
    const guardFrameNavigation = () => {
        const frame = frameRef.current;
        if (frame === null)
            return;
        try {
            const href = frame.contentWindow?.location.href;
            if (href !== undefined && !href.startsWith('about:') && new URL(href).origin === window.location.origin) {
                frame.src = 'about:blank';
            }
        }
        catch {
            // Cross-origin frame: nothing to guard.
        }
    };
    return (_jsxs("div", { className: previewCss.content, children: [_jsx("div", { className: previewCss.urlBar, children: _jsx("input", { className: previewCss.urlInput, value: input, placeholder: t('preview.url.placeholder'), spellCheck: false, onChange: (event) => setInput(event.target.value), onKeyDown: (event) => {
                        if (event.key === 'Enter')
                            setUrl(normalizeUrl(input));
                        if (event.key === 'Escape') {
                            setInput(tab.content ?? '');
                            setUrl(normalizeUrl(tab.content ?? ''));
                        }
                    }, onFocus: (event) => event.currentTarget.select() }) }), _jsx("iframe", { ref: frameRef, className: previewCss.urlFrame, src: url, title: tab.title, sandbox: "allow-scripts allow-forms allow-popups", allow: "autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write", allowFullScreen: true, onLoad: guardFrameNavigation }, `${url}\u0000${tab.reloadNonce ?? 0}`)] }));
}
/** Bare domains get https://; whitespace queries go to a search engine. */
export function normalizeUrl(input) {
    const trimmed = input.trim();
    if (trimmed === '')
        return 'about:blank';
    if (/\s/.test(trimmed))
        return `https://www.bing.com/search?q=${encodeURIComponent(trimmed)}`;
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    // Never embed a URL that points back at the harness host: the url frame
    // runs with allow-scripts + allow-same-origin, so a same-origin page there
    // could reach the shell document (the onLoad guard resets indirect
    // same-origin navigations, but a directly typed address must not land at
    // all). Degrade it instead.
    if (typeof window !== 'undefined') {
        try {
            if (new URL(candidate).origin === window.location.origin)
                return 'about:blank';
        }
        catch {
            // Malformed URL: fall through and return the best-effort candidate.
        }
    }
    return candidate;
}
/** Office / unsupported placeholder. */
function UnsupportedViewer({ tab }) {
    return (_jsxs("div", { className: previewCss.placeholder, children: [_jsx("div", { className: previewCss.placeholderTitle, children: tab.title }), _jsx("div", { className: previewCss.placeholderMeta, children: t('preview.unsupported') }), _jsx("div", { className: previewCss.placeholderMeta, children: t('preview.downloadHint') })] }));
}
