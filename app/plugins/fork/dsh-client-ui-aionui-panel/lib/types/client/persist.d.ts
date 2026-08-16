/**
 * Persistence helpers for panel preferences: range-validated reads (invalid
 * stored values fall back to defaults — a broken or hand-edited value must
 * never produce a 0px or NaN panel), debounced writes, and the LRU registry
 * for preview scopes (at most 12 scopes; the oldest savedAt evicts).
 *
 * Keys follow the AionUi contract verbatim:
 *   chat-workspace-width-px, chat-preview-width-px, preview-panel-split-ratio,
 *   project-panel-collapse:<root>, explorer-ui:<root>, scm-ui:<root>,
 *   preview-ui:<root>.
 * @module dsh-aionui-panel/client/persist
 */
/** Read a stored number, validating it against [min, max]; fallback otherwise. */
export declare function readStoredNumber(key: string, min: number, max: number, fallback: number): number;
/** Read a stored string; fallback when absent. */
export declare function readStoredString(key: string, fallback?: string): string;
/** Write a number if it differs from the stored value (avoids churn). */
export declare function writeStoredNumber(key: string, value: number): void;
/** Write a string if it differs from the stored value. */
export declare function writeStoredString(key: string, value: string): void;
/** Debounced writer: coalesces rapid updates (drag frames) into one write. */
export declare function debouncedWriter(write: (value: unknown) => void, delayMs?: number): {
    schedule: (value: unknown) => void;
    flush: () => void;
    dispose: () => void;
};
/**
 * A single debounce pipeline used by the stores for its search and persist
 * timers: coalesces rapid schedules into one trailing run (the latest fn wins).
 * `flush` runs the pending fn immediately (pagehide/beforeunload), `dispose`
 * cancels a pending schedule. Behavior is equivalent to the stores' previous
 * hand-rolled setTimeout + clearTimeout pairs, just centralized.
 */
export interface Debounced {
    /** Queue a fn; repeated calls before the delay replaces the pending fn. */
    schedule: (fn: () => void) => void;
    /** Run the pending fn now and clear the timer. */
    flush: () => void;
    /** Cancel the pending fn and timer. */
    dispose: () => void;
}
/** Create one debounced scheduler (default 150ms). */
export declare function createDebounced(delayMs?: number): Debounced;
/** The preview-ui scope registry: keys, savedAt values, eviction. */
export declare const PREVIEW_SCOPE_PREFIX = "preview-ui:";
/** LRU cap on distinct preview scopes. */
export declare const PREVIEW_SCOPE_CAP = 12;
/**
 * Precisely delete every stored key under a prefix. Only this package's own
 * prefixed keys are removed — foreign-application keys are never touched,
 * replacing the former all-at-once `localStorage.clear()` sweep.
 */
export declare function removeStoredByPrefix(prefix: string): number;
/** All stored preview scopes with their savedAt timestamps, oldest first. */
export declare function listPreviewScopes(): Array<{
    root: string;
    savedAt: number;
}>;
/** Evict the oldest scopes beyond the cap. */
export declare function evictPreviewScopes(keep: string): void;
/** Serialize a JSON value with a size guard (quota failures degrade silently). */
export declare function writeJson(key: string, value: unknown): boolean;
/** Parse a stored JSON value; fallback on any failure. */
export declare function readJson<T>(key: string, fallback: T): T;
//# sourceMappingURL=persist.d.ts.map