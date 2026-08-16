import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import z from "schemastery";
//#region src/index.ts
/** Order of the announcement section within the tool-guidance band. */
const SECTION_ORDER = 200;
const inject = ["systemPrompt"];
/** Model-facing announcement: plugin presence, capabilities, and limits. */
const TASK_BOARD_GUIDANCE = "本机已安装 dsh-task-board 插件（DSH Web GUI 的任务看板）：侧边栏「任务看板」入口；在 dsh-web-ui 插件全家桶仓库（packages/dsh-task-board）统一维护，经聚合包 web-ui-all 一键安装。能力：多列看板管理任务；任务可真实执行（驱动 agent 会话）；任务可钉住执行目标——工作区 / 模式（agent 预设）/ 权限（read-only / workspace-write / danger-full-access），缺省用运行时默认；任务支持 5 段 cron 定时执行（如 0 23 * * *）；数据存浏览器 localStorage（键 dsh.taskBoard.v1）。限制：定时调度在浏览器端，需 GUI 标签页打开，错过即跳过；执行消耗 API 额度。用户提到「任务看板 / 看板 / 定时任务」时即指本插件，请据此协作。";
/**
* Settings namespace of the board's announcement capability — the section the
* web settings surface edits. Spelled here rather than imported: the browser
* half spells the same value and must not depend on a Host package.
*/
const TASK_BOARD_SETTINGS_NAMESPACE = settingsNamespace("task-board");
const Config = z.object({
	announceToAgent: z.boolean().default(true),
	enabled: z.boolean().default(true)
});
/** Schema default, re-read for hand-built test contexts (the loader applies them normally). */
const DEFAULT_ANNOUNCE = true;
/**
* Register the board's announcement section, gated on the composition entry's
* `announceToAgent` (and the live settings value once the web settings
* surface is served). The section is re-registered whenever the source
* changes, so a settings edit takes effect without a restart.
* @param ctx - the plugin context (systemPrompt injected).
* @param config - resolved plugin config (schema defaults applied by the loader).
*/
function apply(ctx, config) {
	let current = () => config ?? {};
	let disposeSection;
	const sync = () => {
		if (disposeSection !== void 0) {
			disposeSection();
			disposeSection = void 0;
		}
		if ((current().enabled ?? true) === false) return;
		if ((current().announceToAgent ?? DEFAULT_ANNOUNCE) === false) return;
		disposeSection = ctx.systemPrompt.section({
			name: "plugin:task-board",
			order: SECTION_ORDER,
			text: TASK_BOARD_GUIDANCE
		});
	};
	installSettingsSection(ctx, TASK_BOARD_SETTINGS_NAMESPACE, Config, config ?? {}, {
		setSource: (source) => {
			current = source;
		},
		onChange: sync
	});
	sync();
}
//#endregion
export { Config, TASK_BOARD_GUIDANCE, TASK_BOARD_SETTINGS_NAMESPACE, apply, inject };
