/**
 * @linxin666/dsh-client-ui-aionui-panel — host half: the workspace-gated
 * filesystem + git services and the /aionui-panel/* HTTP routes (JSON
 * operations + SSE change stream) on the shared webserver. The browser half
 * (exports "./client") is served by client-modules from the same package's
 * dsh.client declaration.
 *
 * The host half also announces the plugin to every agent through the
 * system-prompt section mechanism (the same band task-board uses), so agents
 * know the right-panel system exists and how to cooperate with it.
 *
 * AionUi right-panel design (Apache-2.0, iOfficeAI/AionUi) — re-implemented
 * from measured behavior and architecture, not copied code.
 * @module @linxin666/dsh-client-ui-aionui-panel
 */
import type { Context } from '@deepseek-ai/cordis';
/** Required services: the route registry, the managed subprocess seam, the workspace registry, and the prompt band. */
export declare const inject: string[];
/** Model-facing announcement: plugin presence, capabilities, and limits. */
export declare const AIONUI_PANEL_GUIDANCE = "\u672C\u673A\u5DF2\u5B89\u88C5 dsh-aionui-panel \u63D2\u4EF6\uFF08DSH Web GUI \u7684\u53F3\u4FA7\u9762\u677F\u7CFB\u7EDF\uFF09\uFF1A\u9879\u76EE\u4F1A\u8BDD\u6253\u5F00\u65F6\uFF0C\u804A\u5929\u533A\u53F3\u4FA7\u51FA\u73B0\u300C\u9884\u89C8\u300D\u4E0E\u300C\u6587\u4EF6/\u53D8\u66F4\u300D\u4E24\u5757\u9762\u677F\u3002\u80FD\u529B\uFF1AExplorer \u6587\u4EF6\u6811\uFF08\u70B9\u51FB\u6587\u4EF6\u5728\u9884\u89C8\u9762\u677F\u6253\u5F00\u3001\u6574\u884C\u70B9\u51FB\u5C55\u5F00\u6587\u4EF6\u5939\u3001\u6309\u6587\u4EF6\u540D\u641C\u7D22\u5B9A\u4F4D\uFF09\uFF1BPreview \u591A tab \u9884\u89C8\uFF08markdown/html/code/diff/csv/pdf/office/\u56FE\u7247/\u6587\u672C\u7B49\u683C\u5F0F\uFF0C\u652F\u6301\u6E90\u7801/\u9884\u89C8\u5207\u6362\u3001\u5206\u5C4F\u7F16\u8F91\u3001\u4FDD\u5B58\uFF09\uFF1BSCM \u53D8\u66F4\u9762\u677F\uFF08\u771F\u5B9E git stage/unstage/discard\uFF09\uFF1B\u9762\u677F\u5BBD\u5EA6\u53EF\u62D6\u62FD\u8C03\u6574\uFF08Explorer 220~500px\u3001Preview 340~1200px\uFF09\uFF0C\u53CC\u51FB\u628A\u624B\u590D\u4F4D\u9ED8\u8BA4\u5BBD\u5EA6\uFF0C\u6298\u53E0\u72B6\u6001\u4E0E\u5BBD\u5EA6\u6309\u9879\u76EE\u6301\u4E45\u5316\uFF08localStorage\uFF09\u3002\u6570\u636E\u6E90\u4E3A\u5F53\u524D\u4F1A\u8BDD\u5DE5\u4F5C\u76EE\u5F55\u7684\u771F\u5B9E\u6587\u4EF6\u7CFB\u7EDF\u4E0E\u771F\u5B9E git \u4ED3\u5E93\uFF0C\u5BBF\u4E3B\u8FDB\u7A0B\u7ECF /aionui-panel/* \u8DEF\u7531\u63D0\u4F9B\u3002\u7528\u6237\u63D0\u5230\u300C\u53F3\u4FA7\u9762\u677F / \u9884\u89C8\u9762\u677F / \u6587\u4EF6\u6811 / \u53D8\u66F4\u9762\u677F\u300D\u65F6\u5373\u6307\u672C\u63D2\u4EF6\uFF0C\u8BF7\u636E\u6B64\u534F\u4F5C\u3002";
/**
 * Mount the panel data services and their routes.
 * @param ctx - context carrying webServer, subprocess, workspaceRegistry, systemPrompt.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map