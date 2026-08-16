/**
 * 16x16 file/folder icons for the tree — a small built-in set (folder
 * open/closed, file variants by kind) using the token colors, so both themes
 * stay consistent without pulling in a vscode-icons package.
 * @module dsh-aionui-panel/client/components/FileIcon
 */
import type { JSX } from 'react';
/** The icon for one tree entry (16x16, currentColor). */
export declare function FileTypeIcon({ name, isDir, expanded, className, }: {
    name: string;
    isDir: boolean;
    expanded: boolean;
    className?: string;
}): JSX.Element;
//# sourceMappingURL=FileIcon.d.ts.map