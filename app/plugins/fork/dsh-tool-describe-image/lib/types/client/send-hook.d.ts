/**
 * Send interception: text-only models reject image blocks at submit, so a
 * send that carries draft images is rewritten into a plain-text prompt that
 * carries describe-image references instead. The images are uploaded through
 * the host attach route (so bytes stay out of the conversation log), the
 * draft images are released, and the model analyzes them through the
 * describe_image tool rather than receiving the bytes it cannot read.
 *
 * The hook wraps the conversation service's sendSession method in place. It
 * is structural (no dependency on the conversation package's internal
 * types) and idempotent (a module marker guards against double install).
 * @module @linxin666/dsh-tool-describe-image/client/send-hook
 */
/**
 * Wrap the conversation service so image-bearing sends route through the
 * describe-image attach seam. No-op when the service surface is unavailable
 * (older shell) or already wrapped.
 * @param conversation - the `conversation` service instance.
 */
export declare function installSendHook(conversation: unknown): void;
//# sourceMappingURL=send-hook.d.ts.map