/**
 * Browser half of the attach seam: pure draft-splicing math plus the
 * upload client for the host /describe-image/attach route. The browser
 * sends the picked image as base64 text; the host validates magic bytes,
 * persists the bytes in the attachment store, and returns the
 * `[image attachment …]` note text to splice into the composer draft.
 * Image bytes never enter the conversation log — only the note text does.
 * @module @linxin666/dsh-tool-describe-image/client/attach
 */
/** The host attach endpoint, same-origin with the web shell. */
export declare const ATTACH_ENDPOINT = "/describe-image/attach";
/** Image media types the button offers for upload (mirrors the host gate). */
export declare const ACCEPTED_IMAGE_MIME: readonly string[];
/** Client-side byte bound, matching the host default; the host re-checks. */
export declare const CLIENT_MAX_BYTES: number;
/**
 * Placeholder alt text of the markdown image reference; the model reads the
 * URL and extracts the attachment id. Kept deliberately short.
 */
export declare const IMAGE_ALT = "\u56FE\u7247";
/**
 * Splice a note into a composer draft at the caret, following the same
 * separator rule the file-drag inlay uses: one space before the note unless
 * the caret sits at the start of the draft or right after whitespace; one
 * space after unless the caret sits at the end of the draft or right before
 * whitespace. Empty note or an out-of-range caret are no-ops.
 * @param draft - the current draft text.
 * @param note - the `[image attachment …]` note to insert.
 * @param caret - insertion offset (default: the end of the draft).
 * @returns the next draft; the caller owns writing it through the input facade.
 */
export declare function insertNoteIntoDraft(draft: string, note: string, caret?: number): string;
/**
 * Read a picked file as base64 text (no data-URL prefix).
 * @param file - the file the user picked.
 * @returns the base64 payload, or a structured rejection.
 */
export declare function readFileAsBase64(file: File): Promise<{
    ok: true;
    base64: string;
} | {
    ok: false;
    message: string;
}>;
/**
 * Upload base64 image bytes to the host attach route.
 * @param base64 - the base64 image payload.
 * @param mediaType - the declared media type (verified against magic bytes on the host).
 * @param name - optional display name.
 * @returns the `[image attachment …]` note text, or a structured rejection.
 */
export declare function uploadImageForDescribe(base64: string, mediaType: string, name?: string): Promise<{
    ok: true;
    note: string;
    markdown: string;
} | {
    ok: false;
    message: string;
}>;
/**
 * Client-side admission for one picked file: accepted media type and byte
 * bound. The host re-validates everything, so this is fast feedback only.
 * @param file - the picked file.
 * @returns a structured rejection when the file cannot be uploaded.
 */
export declare function admitPickedImage(file: File): {
    ok: true;
} | {
    ok: false;
    reason: 'type' | 'size';
};
//# sourceMappingURL=attach.d.ts.map