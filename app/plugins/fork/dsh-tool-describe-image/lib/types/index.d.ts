/**
 * Model-facing image understanding for text-only models. Each call loads one image — a local file
 * path or an http(s) URL — and asks a vision-language model at an OpenAI-compatible endpoint to
 * describe it; only the returned text crosses into the conversation, so the image never enters the
 * session log. The API key resolves per call (inline config value, then the credential seam, then
 * the launch environment), and the HTTP client refuses redirects so a bearer credential can never
 * be forwarded off the configured endpoint.
 *
 * Ported from deepseek-harness packages/vision/tool-describe-image (mirrored at
 * whitelonng/dsh-plugin-describe-image). Family adaptation: the plugin may be mounted without
 * configuration (the dsh-web-ui-all aggregate does this), so endpoint/model validation happens per
 * call — or eagerly at load when a composition entry actually configures it. The "Image
 * understanding" settings section can fill the fields live from Settings → 插件配置.
 * @module @linxin666/dsh-tool-describe-image
 */
import type { Context } from '@deepseek-ai/cordis';
import type { GenericCallView } from '@deepseek-ai/dsh-tools';
import { Config } from './config-resolve.ts';
export declare const name = "describe-image";
export declare const inject: string[];
export { DEFAULT_MAX_BYTES, sniffMimeType } from './media.ts';
export type { ImageMimeType } from './media.ts';
export { API_STYLES, Config, DEFAULT_API_KEY_ENV, DEFAULT_API_STYLE, DEFAULT_MAX_OUTPUT_TOKENS, DEFAULT_PROMPT, DEFAULT_RENDER_IMAGE_PREVIEW, DEFAULT_TIMEOUT_MS, DESCRIBE_IMAGE_SETTINGS_NAMESPACE, resolveApiKey, resolveConfig, } from './config-resolve.ts';
export type { ApiStyle, ResolvedConfig } from './config-resolve.ts';
export { callVision, createVisionCache, DEFAULT_CACHE_MAX_ENTRIES, DEFAULT_CACHE_TTL_MS, extractChatCompletionsContent, extractResponsesContent, loadImage, parseImageAttachmentRef, readAttachment, readBoundedBody, readBoundedText, semanticRequestKey, } from './vision-client.ts';
export type { LoadedImage, VisionCache } from './vision-client.ts';
/** The describe_image call’s validated arguments. */
export interface DescribeImageArgs {
    image: string;
    prompt?: string;
}
/**
 * Pure call view: a generic read card, with a file location for local paths.
 * @param args - the validated call arguments.
 * @returns the pending-state card for one describe_image call.
 */
export declare function describeImageCallView(args: DescribeImageArgs): GenericCallView;
/**
 * Register the `describe_image` tool on `ctx.tools`. The image never enters the conversation: the
 * tool returns only the vision model’s text answer. The `describe-image` settings section layers
 * over the composition entry and is re-resolved per call, so the Settings → 插件配置 card's changes
 * reach the very next invocation. Repeat calls for the same image and prompt reuse a short-lived
 * semantic cache so the endpoint is not called twice in quick succession.
 *
 * Family adaptation: the aggregate mounts this plugin without configuration, so endpoint/model
 * validation is lazy — an empty composition entry loads fine and the first call fails with a clear
 * "unconfigured" message; a non-empty entry is still validated eagerly at load and fails loud.
 * @param ctx - registrant context carrying the tool registry.
 * @param config - deployment configuration.
 */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map