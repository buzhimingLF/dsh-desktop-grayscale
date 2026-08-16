/**
 * Config and credential facts for the describe-image tool. Holds the validated
 * ResolvedConfig snapshot (defaults, bounds, and endpoint facts), the API-key
 * resolution seams, and the schemastery section that doubles as the plugin's
 * settings card schema. Kept separate from tool registration and the vision
 * HTTP client so single purpose stays single file.
 * @module @linxin666/dsh-tool-describe-image/config
 */
import type { Context } from '@deepseek-ai/cordis';
import z from 'schemastery';
import type { CredentialRef } from '@deepseek-ai/dsh-credentials';
/** Environment-variable name the API key resolves through when no inline key is configured. */
export declare const DEFAULT_API_KEY_ENV = "VISION_API_KEY";
/** Per-call output-token cap sent to the vision model. */
export declare const DEFAULT_MAX_OUTPUT_TOKENS = 1024;
/** Per-call vision request timeout in milliseconds. */
export declare const DEFAULT_TIMEOUT_MS = 60000;
/** Protocol styles the tool can speak to the configured endpoint. */
export declare const API_STYLES: readonly ["chat-completions", "responses"];
export type ApiStyle = typeof API_STYLES[number];
/** Protocol style used unless the configuration overrides it. */
export declare const DEFAULT_API_STYLE: ApiStyle;
/** Whether conversation image references upgrade into inline thumbnails unless configured otherwise. */
export declare const DEFAULT_RENDER_IMAGE_PREVIEW = true;
/** Instruction sent when the model does not pass its own prompt. */
export declare const DEFAULT_PROMPT = "Analyze this image: describe what is visible factually, transcribe legible text verbatim, and call out layout, notable details, or anything anomalous.";
/**
 * Deployment configuration for the describe-image tool. The interface keeps every field optional so
 * programmatic construction is re-judged by {@link resolveConfig}; the schema requires `baseURL` and
 * `model` for composition entries.
 */
export interface Config {
    /** Root of the OpenAI-compatible endpoint, e.g. `https://api.openai.com/v1`; trailing slashes are stripped. */
    baseURL?: string;
    /** Vision model id for the configured endpoint. */
    model?: string;
    /** Inline API key; prefer `apiKeyEnv` with the credential seam. Feed from the environment via `!!js process.env.VISION_API_KEY`. */
    apiKey?: string;
    /** Credential reference (environment-variable name) for the API key; defaults to `VISION_API_KEY`. */
    apiKeyEnv?: string;
    /** Instruction used when a call omits its `prompt`; defaults to a concise factual description. */
    defaultPrompt?: string;
    /** Image byte bound; defaults to {@link DEFAULT_MAX_BYTES}. */
    maxBytes?: number;
    /** Output-token cap sent to the vision model; defaults to {@link DEFAULT_MAX_OUTPUT_TOKENS}. */
    maxOutputTokens?: number;
    /** Per-call request timeout; defaults to {@link DEFAULT_TIMEOUT_MS}. */
    timeoutMs?: number;
    /** Protocol style of the endpoint; defaults to {@link DEFAULT_API_STYLE} (`chat-completions`). */
    apiStyle?: ApiStyle;
    /**
     * Whether describe-image references in the conversation upgrade in place into inline
     * thumbnails; defaults to {@link DEFAULT_RENDER_IMAGE_PREVIEW}. The web shell renders
     * user messages as plain text, so a sent reference would otherwise sit in the
     * transcript as raw markdown. Display-only: the message text, the session log, and
     * the model side are untouched. If the raw route is unreachable through the current
     * origin, the thumbnail load fails and the reference text stays as-is.
     */
    renderImagePreview?: boolean;
}
/** Schemastery configuration for the describe-image tool; doubles as the `describe-image` settings-section schema. */
export declare const Config: z<Config>;
/** Settings namespace carrying the endpoint, model, and key reference the Plugins card edits. */
export declare const DESCRIBE_IMAGE_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/** One resolved, validated configuration snapshot; defaults and beyond-schema constraints applied. */
export interface ResolvedConfig {
    baseURL: string;
    model: string;
    apiKey: string | undefined;
    apiKeyEnv: CredentialRef | undefined;
    defaultPrompt: string;
    maxBytes: number;
    maxOutputTokens: number;
    timeoutMs: number;
    apiStyle: ApiStyle;
    renderImagePreview: boolean;
}
/**
 * Resolve raw config into validated connection facts. Programmatic construction may bypass
 * Schemastery normalization, so every default and bound is re-judged here; a non-empty composition
 * entry is validated at load so misconfiguration fails loud (an unconfigured family mount only
 * hits it per call, inside {@link apply}).
 * @param config - raw plugin config.
 * @returns validated facts.
 */
export declare function resolveConfig(config: Config): ResolvedConfig;
/**
 * Resolve the API key for one call: an explicit inline key wins; otherwise the credential seam (which owns
 * environment and managed-store layers) resolves the reference; without the seam the launch environment is
 * the whole credential plane.
 * @param ctx - registrant context.
 * @param spec - validated configuration.
 * @returns the resolved key.
 */
export declare function resolveApiKey(ctx: Context, spec: ResolvedConfig): Promise<string>;
//# sourceMappingURL=config-resolve.d.ts.map