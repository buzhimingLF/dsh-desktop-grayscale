/**
 * Host loader entry for the task-board plugin.
 *
 * Everything the board does is browser work (DOM, localStorage, driving the
 * client runtime's session services over the wire), so the host half's main
 * behavior is a system-prompt section announcing the plugin to every agent.
 * The section registers while this plugin is in the host composition (mount /
 * DSH restart) and disappears when the plugin leaves it (unmount / restart),
 * so agents always know the board exists and how to cooperate with it. The
 * announcement can be turned off through the web settings plugin-configuration
 * surface (`announceToAgent`); the section then disappears live.
 */
import type { Context } from '@deepseek-ai/cordis';
import z from 'schemastery';
export declare const inject: string[];
/** Model-facing announcement: plugin presence, capabilities, and limits. */
export declare const TASK_BOARD_GUIDANCE = "\u672C\u673A\u5DF2\u5B89\u88C5 dsh-task-board \u63D2\u4EF6\uFF08DSH Web GUI \u7684\u4EFB\u52A1\u770B\u677F\uFF09\uFF1A\u4FA7\u8FB9\u680F\u300C\u4EFB\u52A1\u770B\u677F\u300D\u5165\u53E3\uFF1B\u5728 dsh-web-ui \u63D2\u4EF6\u5168\u5BB6\u6876\u4ED3\u5E93\uFF08packages/dsh-task-board\uFF09\u7EDF\u4E00\u7EF4\u62A4\uFF0C\u7ECF\u805A\u5408\u5305 web-ui-all \u4E00\u952E\u5B89\u88C5\u3002\u80FD\u529B\uFF1A\u591A\u5217\u770B\u677F\u7BA1\u7406\u4EFB\u52A1\uFF1B\u4EFB\u52A1\u53EF\u771F\u5B9E\u6267\u884C\uFF08\u9A71\u52A8 agent \u4F1A\u8BDD\uFF09\uFF1B\u4EFB\u52A1\u53EF\u9489\u4F4F\u6267\u884C\u76EE\u6807\u2014\u2014\u5DE5\u4F5C\u533A / \u6A21\u5F0F\uFF08agent \u9884\u8BBE\uFF09/ \u6743\u9650\uFF08read-only / workspace-write / danger-full-access\uFF09\uFF0C\u7F3A\u7701\u7528\u8FD0\u884C\u65F6\u9ED8\u8BA4\uFF1B\u4EFB\u52A1\u652F\u6301 5 \u6BB5 cron \u5B9A\u65F6\u6267\u884C\uFF08\u5982 0 23 * * *\uFF09\uFF1B\u6570\u636E\u5B58\u6D4F\u89C8\u5668 localStorage\uFF08\u952E dsh.taskBoard.v1\uFF09\u3002\u9650\u5236\uFF1A\u5B9A\u65F6\u8C03\u5EA6\u5728\u6D4F\u89C8\u5668\u7AEF\uFF0C\u9700 GUI \u6807\u7B7E\u9875\u6253\u5F00\uFF0C\u9519\u8FC7\u5373\u8DF3\u8FC7\uFF1B\u6267\u884C\u6D88\u8017 API \u989D\u5EA6\u3002\u7528\u6237\u63D0\u5230\u300C\u4EFB\u52A1\u770B\u677F / \u770B\u677F / \u5B9A\u65F6\u4EFB\u52A1\u300D\u65F6\u5373\u6307\u672C\u63D2\u4EF6\uFF0C\u8BF7\u636E\u6B64\u534F\u4F5C\u3002";
/**
 * Settings namespace of the board's announcement capability — the section the
 * web settings surface edits. Spelled here rather than imported: the browser
 * half spells the same value and must not depend on a Host package.
 */
export declare const TASK_BOARD_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/** Plugin config, validated by the same-named schemastery schema. */
export interface Config {
    /**
     * When true (default), a system-prompt section announces the board to every
     * agent. Set false to keep the board silent in prompts; agents then learn
     * about it only when the user mentions it.
     */
    announceToAgent?: boolean;
    /** Master switch for the plugin (browser half + host announcement). */
    enabled?: boolean;
}
export declare const Config: z<Config>;
/**
 * Register the board's announcement section, gated on the composition entry's
 * `announceToAgent` (and the live settings value once the web settings
 * surface is served). The section is re-registered whenever the source
 * changes, so a settings edit takes effect without a restart.
 * @param ctx - the plugin context (systemPrompt injected).
 * @param config - resolved plugin config (schema defaults applied by the loader).
 */
export declare function apply(ctx: Context, config?: Config): void;
