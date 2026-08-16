/**
 * Conversation image preview enhancer. The web shell renders user messages
 * as plain text (no markdown pipeline), so the describe-image reference the
 * send hook splices (`![图片](/describe-image/raw/sha256:…)`) sits in the
 * transcript as raw text. This module watches the chat transcript — the
 * official `conversation.session` slot wrapper, which excludes the composer —
 * and upgrades each reference in place into an inline thumbnail (a real
 * button: Enter/Space opens a full-size overlay, focus returns on close).
 * The message text itself is never edited — the original markdown is
 * restored when the toggle turns off or the plugin unloads — so the session
 * log and the model side are untouched.
 *
 * Scanning is scoped and incremental: a lightweight observer on the document
 * only (re)discovers the transcript container, while the content observer on
 * the container processes just the nodes each mutation record carries — no
 * full-page walks during streaming or sidebar churn. If the raw route is
 * unreachable through the current origin (for example a proxy that does not
 * forward it), the thumbnail load fails, the failure is remembered for the
 * session, and the reference text is left alone from there on.
 * @module @linxin666/dsh-tool-describe-image/client/preview
 */
/** One located reference: alt text, raw-route path, and its span inside the source text. */
export interface ImageReferenceMatch {
    readonly alt: string;
    readonly path: string;
    readonly start: number;
    readonly end: number;
}
/**
 * Locate every describe-image reference in one text chunk. Pure string math
 * (exported for tests); the DOM side walks text nodes and applies it.
 * @param text - raw message text.
 * @returns the references in source order.
 */
export declare function findImageReferences(text: string): ImageReferenceMatch[];
/** Handle over one installed enhancer. */
export interface ConversationImagePreview {
    /** Re-read the toggle: enhance when on, restore every preview when off. */
    refresh(): void;
    /** Restore every preview, close the overlay, and stop observing. */
    dispose(): void;
}
/**
 * Install the enhancer. With `root` omitted the transcript container is
 * resolved through the official slot attribute and re-resolved whenever the
 * shell remounts it (session switch); a fixed `root` (tests) skips that
 * watch. Content passes are record-driven and idempotent — processed
 * references are elements, never text nodes, so a re-scan finds nothing new.
 * @param isEnabled - read per pass so settings edits apply without a reload.
 * @param root - fixed subtree to watch (defaults to the transcript container).
 * @returns the handle; {@link ConversationImagePreview.dispose} restores the DOM.
 */
export declare function installConversationImagePreview(isEnabled: () => boolean, root?: HTMLElement): ConversationImagePreview;
//# sourceMappingURL=preview.d.ts.map