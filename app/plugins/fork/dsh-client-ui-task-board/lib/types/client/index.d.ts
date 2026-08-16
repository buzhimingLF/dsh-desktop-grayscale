/**
 * Task-board client plugin: wires the framework-free core (controller,
 * execution service, store) to the real client runtime and mounts the two
 * DOM surfaces — the sidebar entry row and the board view in the center
 * column.
 *
 * Failure policy: DOM mounting problems are logged, never thrown — the web
 * shell fails the whole boot when a plugin apply throws, and an external
 * plugin must not take the GUI down.
 */
import type { ClientContext, SettingsScope, SettingsScopeSpec } from '@deepseek-ai/dsh-client-runtime/client';
import { type TaskBoardKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Task-board surface copy. */
        'task-board': TaskBoardKey;
    }
    interface SlotMap {
        /**
         * The child slot the Web UI plugin group declares; this card registers
         * into the group instead of the top-level `settings.plugin.item` list.
         * Spelled here with the same shape so this package can register without
         * depending on the sibling UI package.
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
/** Required services (fiber inject waiting — the runtime must be up first). */
export declare const inject: string[];
/**
 * Mount the task board.
 * @param ctx - client root context (services: sessions, workspaces).
 */
export declare function apply(ctx: ClientContext): void;
