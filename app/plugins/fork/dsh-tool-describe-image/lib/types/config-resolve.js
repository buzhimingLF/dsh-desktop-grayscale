/**
 * Config and credential facts for the describe-image tool. Holds the validated
 * ResolvedConfig snapshot (defaults, bounds, and endpoint facts), the API-key
 * resolution seams, and the schemastery section that doubles as the plugin's
 * settings card schema. Kept separate from tool registration and the vision
 * HTTP client so single purpose stays single file.
 * @module @linxin666/dsh-tool-describe-image/config
 */
import z from 'schemastery';
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment';
import { settingsNamespace } from '@deepseek-ai/dsh-settings';
import { DEFAULT_MAX_BYTES } from "./media.js";
/** Environment-variable name the API key resolves through when no inline key is configured. */
export const DEFAULT_API_KEY_ENV = 'VISION_API_KEY';
/** Per-call output-token cap sent to the vision model. */
export const DEFAULT_MAX_OUTPUT_TOKENS = 1024;
/** Per-call vision request timeout in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 60_000;
/** Protocol styles the tool can speak to the configured endpoint. */
export const API_STYLES = ['chat-completions', 'responses'];
/** Protocol style used unless the configuration overrides it. */
export const DEFAULT_API_STYLE = 'chat-completions';
/** Whether conversation image references upgrade into inline thumbnails unless configured otherwise. */
export const DEFAULT_RENDER_IMAGE_PREVIEW = true;
/** Instruction sent when the model does not pass its own prompt. */
export const DEFAULT_PROMPT = 'Analyze this image: describe what is visible factually, transcribe legible text verbatim, and call out layout, notable details, or anything anomalous.';
/** Schemastery configuration for the describe-image tool; doubles as the `describe-image` settings-section schema. */
export const Config = z.object({
    baseURL: z.string(),
    model: z.string(),
    apiKey: z.string().role('secret'),
    apiKeyEnv: z.string().role('credential-ref').default(DEFAULT_API_KEY_ENV),
    defaultPrompt: z.string().default(DEFAULT_PROMPT),
    maxBytes: z.number().step(1).min(1).default(DEFAULT_MAX_BYTES),
    maxOutputTokens: z.number().step(1).min(1).default(DEFAULT_MAX_OUTPUT_TOKENS),
    timeoutMs: z.number().min(1).default(DEFAULT_TIMEOUT_MS),
    apiStyle: z.union(API_STYLES).default(DEFAULT_API_STYLE),
    renderImagePreview: z.boolean().default(DEFAULT_RENDER_IMAGE_PREVIEW),
});
/** Settings namespace carrying the endpoint, model, and key reference the Plugins card edits. */
export const DESCRIBE_IMAGE_SETTINGS_NAMESPACE = settingsNamespace('describe-image');
/**
 * Resolve raw config into validated connection facts. Programmatic construction may bypass
 * Schemastery normalization, so every default and bound is re-judged here; a non-empty composition
 * entry is validated at load so misconfiguration fails loud (an unconfigured family mount only
 * hits it per call, inside {@link apply}).
 * @param config - raw plugin config.
 * @returns validated facts.
 */
export function resolveConfig(config) {
    const baseURL = (config.baseURL ?? '').trim().replace(/\/+$/, '');
    if (!/^https?:\/\//.test(baseURL)) {
        throw new Error('describe-image: baseURL must be an absolute http(s) URL');
    }
    const model = (config.model ?? '').trim();
    if (model.length === 0)
        throw new Error('describe-image: model must be a non-empty model id');
    const apiKey = config.apiKey;
    if (apiKey !== undefined && apiKey.length === 0) {
        throw new Error('describe-image: apiKey must be non-empty when set');
    }
    let apiKeyEnv;
    const rawEnv = config.apiKeyEnv ?? DEFAULT_API_KEY_ENV;
    if (rawEnv.length > 0) {
        try {
            apiKeyEnv = credentialRef(rawEnv);
        }
        catch {
            throw new Error(`describe-image: apiKeyEnv ${JSON.stringify(rawEnv)} is not a valid environment-variable name`);
        }
    }
    const maxBytes = config.maxBytes ?? DEFAULT_MAX_BYTES;
    const maxOutputTokens = config.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const apiStyle = config.apiStyle ?? DEFAULT_API_STYLE;
    for (const [field, value] of [['maxBytes', maxBytes], ['maxOutputTokens', maxOutputTokens], ['timeoutMs', timeoutMs]]) {
        if (!Number.isSafeInteger(value) || value <= 0) {
            throw new Error(`describe-image: ${field} must be a positive safe integer`);
        }
    }
    if (!API_STYLES.includes(apiStyle)) {
        throw new Error(`describe-image: apiStyle must be one of ${API_STYLES.map(style => JSON.stringify(style)).join(', ')}`);
    }
    return { baseURL, model, apiKey, apiKeyEnv, defaultPrompt: config.defaultPrompt ?? DEFAULT_PROMPT, maxBytes, maxOutputTokens, timeoutMs, apiStyle, renderImagePreview: config.renderImagePreview ?? DEFAULT_RENDER_IMAGE_PREVIEW };
}
/**
 * Resolve the API key for one call: an explicit inline key wins; otherwise the credential seam (which owns
 * environment and managed-store layers) resolves the reference; without the seam the launch environment is
 * the whole credential plane.
 * @param ctx - registrant context.
 * @param spec - validated configuration.
 * @returns the resolved key.
 */
export async function resolveApiKey(ctx, spec) {
    if (spec.apiKey !== undefined)
        return spec.apiKey;
    if (spec.apiKeyEnv !== undefined) {
        const credentials = ctx.get('credentials');
        if (credentials !== undefined) {
            const hit = await credentials.resolve(spec.apiKeyEnv);
            if (hit !== undefined)
                return hit.value;
        }
        else {
            const ambient = launchEnvironmentOf(ctx).get(spec.apiKeyEnv);
            if (ambient !== undefined && ambient.value.length > 0)
                return ambient.value;
        }
    }
    throw new Error(`describe-image: no API key; set apiKey, store ${spec.apiKeyEnv ?? DEFAULT_API_KEY_ENV} through the credentials service,`
        + ' or export it in the launching environment');
}
