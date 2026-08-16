/**
 * Browser half of the describe-image plugin: no composer chrome of its own.
 * The shell's input box has no image entry for text-only models, so image
 * sends are rewritten at submit time (installSendHook) into describe-image
 * references before they reach the model — the way a text-only model gets an
 * image to analyze without the shell's vision pipeline. The shell renders
 * user messages as plain text, so a sent reference is then upgraded in place
 * into an inline thumbnail (installConversationImagePreview) unless the
 * deployment turns previews off. The settings card is rendered by the web
 * GUI's built-in plugin config page from the host-side `describe-image`
 * section.
 *
 * Failure policy: every DOM/runtime wiring failure is logged, never thrown —
 * the web shell fails the whole boot when a plugin apply throws.
 * @module @linxin666/dsh-tool-describe-image/client
 */
import type { ClientContext, SettingsScope, SettingsScopeSpec } from '@deepseek-ai/dsh-client-runtime/client';
import { type DescribeImageClientKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** The describe-image attach button copy. */
        'describe-image': DescribeImageClientKey;
    }
    interface SlotMap {
        /**
         * One family plugin card inside the Web UI Plugins group. Spelled here
         * with the same shape so this package can register without depending on
         * the sibling web-ui-settings package.
         */
        'web-ui.plugin.item': {
            kind: 'list';
            scope: 'root';
            owner: SettingsPluginItemOwnerProps;
        };
    }
}
/** Owner share of a plugin card (the section supplies nothing). */
export interface SettingsPluginItemOwnerProps {
    /** Marker field: card owner props are intentionally empty. */
    children?: never;
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        /**
         * Optional rc.6 compatibility binder provided by dsh-web-ui-settings;
         * absent when that group plugin is not installed, so callers fall back to
         * the official settings scope.
         */
        webUiSettings?: {
            bind<S>(spec: SettingsScopeSpec<S>): SettingsScope<S>;
        };
    }
}
/** Locale namespace of the browser half. */
export declare const NS: "describe-image";
/** Required services: slots for the settings card, conversation for the send hook, settings scope and locale for the card copy. */
export declare const inject: string[];
/** Apply the browser half. */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map