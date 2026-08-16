/**
 * Preview content-type detection from a file name — the router's single
 * source of truth for what a file becomes when opened (mirrors AionUi's
 * getFileTypeInfo table, re-derived for the panel's format set).
 * @module dsh-aionui-panel/client/fileType
 */
import type { PreviewContentType } from '../core/types.ts';
/** Detect the preview content type of a file by name (lowercased). */
export declare function detectContentType(name: string): PreviewContentType;
/** Whether the type can be edited and saved back. */
export declare function isEditableType(type: PreviewContentType): boolean;
/** Whether the type reads its content as text (vs image data URL). */
export declare function isTextType(type: PreviewContentType): boolean;
/** A stable tab id from the file identity (root + path + type). */
export declare function tabIdOf(root: string, path: string, type: PreviewContentType): string;
/** The language hint for code tabs (extension without the dot). */
export declare function languageOf(name: string): string;
/** The title for a tab: the basename. */
export declare function basenameOf(path: string): string;
/** The parent relative path of a path ('' for a root-level item). */
export declare function parentRel(path: string): string;
/**
 * The streaming URL a pdf tab renders: the host raw route serves the bytes
 * with mime application/pdf, so the preview iframe loads them directly — no
 * base64 round-trip and no read-size cap. The nonce defeats browser caching
 * when the tab is refreshed after the file changed on disk.
 *
 * Contributed by EricWang1358 (#239).
 */
export declare function pdfPreviewUrl(root: string, path: string, nonce: number): string;
//# sourceMappingURL=fileType.d.ts.map