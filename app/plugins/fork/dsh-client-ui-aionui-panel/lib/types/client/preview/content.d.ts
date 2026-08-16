/**
 * Preview content routing: the renderers for every content type plus the
 * split-screen editor|preview layout. View mode (source/preview) resets to
 * preview when the displayed FILE changes (keyed on path+type, not tab id —
 * AionUi contract), and the split ratio is persisted under
 * preview-panel-split-ratio with a 20..80 clamp.
 * @module dsh-aionui-panel/client/preview/content
 */
import type { JSX } from 'react';
import type { PreviewTabState } from '../store.ts';
/** Split-ratio persistence key (AionUi contract). */
export declare const KEY_SPLIT_RATIO = "preview-panel-split-ratio";
/** The rendered content of one tab (viewMode/split are controlled by the panel). */
export declare function TabContent({ tab, viewMode, split, onContentChange, onSave, }: {
    tab: PreviewTabState;
    viewMode: 'source' | 'preview';
    split: boolean;
    onContentChange: (content: string) => void;
    onSave: () => void;
}): JSX.Element;
/** Parse CSV lines (quoted cells with escaped quotes). */
export declare function parseCsv(text: string): string[][];
/** Convert a data URL to a Blob (null on failure). */
export declare function dataUrlToBlob(dataUrl: string): Blob | null;
/** Bare domains get https://; whitespace queries go to a search engine. */
export declare function normalizeUrl(input: string): string;
//# sourceMappingURL=content.d.ts.map