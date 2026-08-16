/**
 * The /describe-image/attach route: a browser-to-host upload seam that turns a
 * picked image into a durable attachment reference and returns the
 * `[image attachment …]` note text the browser half splices into the composer
 * draft. The note is plain text, so a text-only model sees the reference and
 * can hand the exact JSON to describe_image; the image bytes themselves never
 * cross into the conversation log — they live in the attachment store, exactly
 * like images the vision pipeline uploads.
 *
 * The route works without any plugin configuration (the family aggregate mounts
 * this way): the byte bound falls back to the default and the attachment store
 * is resolved per call, failing with a clear message when it is absent.
 * @module @linxin666/dsh-tool-describe-image/attach
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment';
import { type ImageMimeType } from './media.ts';
/** Request-body byte cap: base64 of a {@link DEFAULT_MAX_BYTES} image plus envelope slack. */
export declare const MAX_ATTACH_BODY_BYTES: number;
/** Stable error codes the browser half surfaces without leaking internals. */
export interface AttachError {
    /** `rejected`: the image or payload fails validation; `internal`: the route or store failed. */
    code: 'rejected' | 'internal';
    message: string;
}
/** Validated upload payload. */
export interface AttachPayload {
    /** Base64-encoded image bytes (standard alphabet). */
    data: string;
    /** Media type the sender declares; verified against magic bytes. */
    mediaType: ImageMimeType;
    /** Optional display name; never interpreted as a path. */
    name?: string;
}
/** Outcome of one attach attempt. */
export type AttachOutcome = {
    ok: true;
    ref: ImageAttachmentRef;
    note: string;
    markdown: string;
} | {
    ok: false;
    error: AttachError;
};
/** The failure envelope used when a non-POST request hits the route. */
export declare const METHOD_NOT_ALLOWED: AttachError;
/** Remember one persisted reference by its attachment id. */
export declare function registerAttachmentRef(ref: ImageAttachmentRef): void;
/** Look up a persisted reference by its bare attachment id, if still in the registry. */
export declare function attachmentRefById(id: string): ImageAttachmentRef | undefined;
/**
 * The markdown image reference inserted into the composer draft: short,
 * renders as an image/link in the conversation, and carries the attachment
 * id in the URL so a text model can extract it and hand it to
 * describe_image (the tool resolves bare ids through the registry).
 * @param id - the attachment id (e.g. `sha256:…`).
 * @returns the markdown text to splice into the draft.
 */
export declare function attachmentMarkdown(id: string): string;
/** Build the `[image attachment …]` note text for one reference. */
export declare function attachmentNote(ref: ImageAttachmentRef): string;
/**
 * Validate an unknown upload payload and decode its bytes. Pure: no context,
 * no I/O — every rejection reason is spelled in the error message.
 * @param payload - the parsed request body.
 * @param maxBytes - the image byte bound.
 * @returns the validated payload and decoded bytes, or the rejection.
 */
export declare function validateAttachPayload(payload: unknown, maxBytes: number): {
    payload: AttachPayload;
    bytes: Buffer;
} | {
    error: AttachError;
};
/**
 * Validate and persist one upload. The declared media type is checked against
 * magic bytes before any store write; the store's own validation runs before
 * the reference is published.
 * @param ctx - registrant context carrying the optional attachment service.
 * @param maxBytes - the image byte bound.
 * @param payload - the parsed request body.
 * @returns the stored reference and its note text, or a structured rejection.
 */
export declare function handleAttach(ctx: Context, maxBytes: number, payload: unknown): Promise<AttachOutcome>;
/**
 * Register the /describe-image/attach POST route on the shared webserver. The
 * byte bound is read per request so the Settings card's maxBytes change lands
 * immediately; the attachment service is resolved per call.
 * @param ctx - registrant context; webServer is required.
 * @param readMaxBytes - per-request byte-bound reader (defaults to the constant).
 */
export declare function registerAttachRoute(ctx: Context, readMaxBytes?: () => number): void;
//# sourceMappingURL=attach-routes.d.ts.map