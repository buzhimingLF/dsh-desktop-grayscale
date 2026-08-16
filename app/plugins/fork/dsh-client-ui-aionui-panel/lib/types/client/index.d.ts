/**
 * AionUI right-panel system — browser half: mounts the explorer and preview
 * columns into the web shell's frame grid (through the layout controller),
 * binds the four stores to the live client runtime (the active session's cwd
 * is the project root), subscribes to the host change stream (fs + git), and
 * follows the shell's dark marker (body[data-ds-dark-theme]) via CSS only.
 *
 * Failure policy: every DOM/runtime wiring failure is logged, never thrown —
 * the web shell fails the whole boot when a plugin apply throws.
 *
 * AionUi right-panel design (Apache-2.0, iOfficeAI/AionUi) — re-implemented
 * from measured behavior and architecture, not copied code.
 * @module dsh-aionui-panel/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type AionUiPanelKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Panel surface copy. */
        'aionui-panel': AionUiPanelKey;
    }
}
/** Required services: sessions for the project root, locale for the copy. */
export declare const inject: string[];
/** Apply the browser half. */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map