/**
 * A compact markdown renderer for the preview panel: headings, paragraphs,
 * fenced + inline code, bold/italic, links/images, lists, blockquotes, hr,
 * and tables. All HTML is escaped before transformation — the output only
 * ever contains the renderer's own tags. Pure and exported for tests.
 * @module dsh-aionui-panel/client/preview/markdown
 */
/** Escape HTML special characters. */
export declare function escapeHtml(text: string): string;
/** How one image src resolves against the markdown file's location. */
export type MarkdownImageResolution = 
/** Scheme URL or fragment: the browser resolves it as-is. */
{
    kind: 'absolute';
}
/** Workspace-relative target: resolved path plus any ?query#fragment suffix. */
 | {
    kind: 'relative';
    path: string;
    suffix: string;
}
/** `..` escaped the project root: the image must be dropped. */
 | {
    kind: 'escape';
};
/**
 * Resolve one markdown image src against the markdown file's location:
 * - Absolute URLs (http/https/data:/...) and fragment-only srcs are left to
 *   the browser ('absolute').
 * - Root-relative srcs (/img.png) resolve from the project root; other
 *   relative srcs resolve against the file's directory. `..` escaping the
 *   project root is rejected ('escape').
 * - The path portion is percent-decoded (markdown authors encode spaces in
 *   filenames) and any ?query#fragment suffix is preserved verbatim, so
 *   cache-busting srcs like ./img.png?v=2 still fetch img.png.
 */
export declare function resolveMarkdownImage(filePath: string, src: string): MarkdownImageResolution;
/** Options controlling markdown rendering. */
export interface MarkdownRenderOptions {
    /**
     * Rewrite image srcs before they are emitted. Return the URL to use, or
     * null to drop the image (alt text only). Relative workspace paths are
     * typically resolved to absolute URLs here.
     */
    resolveImageSrc?: (src: string) => string | null;
}
/**
 * Guard a raw link/image target against dangerous protocols. Returns the
 * (trimmed) raw string when safe, else null. Only these schemes are allowed:
 * http:, https:, mailto: and fragment anchors (#...). Scheme-less relative
 * paths (./ ../ / and plain filenames) pass through unchanged. Anything with
 * a scheme outside the allow-list — javascript:, data:, vbscript:, etc. —
 * is rejected so the value never reaches dangerouslySetInnerHTML.
 */
export declare function safeUrl(raw: string): string | null;
/** Inline pass: code spans, bold, italic, images, links. */
export declare function renderInline(text: string, options?: MarkdownRenderOptions): string;
/** Render a markdown document to HTML (block pass). */
export declare function renderMarkdown(source: string, options?: MarkdownRenderOptions): string;
//# sourceMappingURL=markdown.d.ts.map