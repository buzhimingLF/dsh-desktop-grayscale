import { jsx as _jsx } from "react/jsx-runtime";
import { detectContentType } from "../fileType.js";
import { FileCodeIcon, FileIcon, FileImageIcon, FileTextIcon, FolderIcon, FolderOpenIcon, } from "./icons.js";
/** The icon for one tree entry (16x16, currentColor). */
export function FileTypeIcon({ name, isDir, expanded, className, }) {
    if (isDir) {
        return expanded
            ? _jsx(FolderOpenIcon, { size: 16, className: className })
            : _jsx(FolderIcon, { size: 16, className: className });
    }
    const type = detectContentType(name);
    switch (type) {
        case 'image':
            return _jsx(FileImageIcon, { size: 16, className: className });
        case 'markdown':
        case 'text':
            return _jsx(FileTextIcon, { size: 16, className: className });
        case 'code':
        case 'diff':
        case 'csv':
        case 'html':
            return _jsx(FileCodeIcon, { size: 16, className: className });
        default:
            return _jsx(FileIcon, { size: 16, className: className });
    }
}
