/**
 * Shared image-media facts for the describe-image plugin: the accepted media
 * types, the magic-byte gate, and the byte bound both the tool and the attach
 * route enforce. Kept in its own module so the attach route can import it
 * without a cycle through the plugin entry.
 * @module @linxin666/dsh-tool-describe-image/media
 */
/** Image media types the magic-byte gate accepts. */
export type ImageMimeType = 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
/** The accepted image media types, in stable order. */
export declare const IMAGE_MEDIA_TYPES: readonly ImageMimeType[];
/** Upper bound on image bytes (local files and downloaded URLs alike). */
export declare const DEFAULT_MAX_BYTES: number;
/** Whether the declared media type is one the plugin accepts. */
export declare function isImageMimeType(value: unknown): value is ImageMimeType;
/**
 * Detect the image media type from magic bytes.
 * @param bytes - the leading bytes of the input.
 * @returns the accepted media type, or `undefined` for unknown or truncated inputs.
 */
export declare function sniffMimeType(bytes: Buffer): ImageMimeType | undefined;
/**
 * Strictly decode a base64 payload: the standard alphabet, correct padding,
 * and a length that is a multiple of four. Rejects anything `Buffer.from`
 * would silently tolerate.
 * @param encoded - the base64 text.
 * @returns the decoded bytes, or `undefined` when the text is not valid base64.
 */
export declare function decodeBase64(encoded: string): Buffer | undefined;
//# sourceMappingURL=media.d.ts.map