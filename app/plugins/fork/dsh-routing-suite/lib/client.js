window.__ModuleLoader__.load({
	id: "dsh-routing-suite",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		//#region src/client/index.ts
		/** Read-only localized Routing Suite status page. */
		const copy = {
			"zh-CN": {
				tab: "智能路由",
				title: "智能任务路由",
				loading: "正在读取状态…",
				unavailable: "暂时无法读取运行状态，但路由不会影响现有工具或上下文。",
				enabled: "已启用",
				disabled: "已停用",
				current: "当前策略",
				scope: "仅在“智能路由模式”中生效",
				auto: "自动判断（推荐）",
				inspect: "检查优先",
				direct: "直接执行",
				autoHelp: "根据会话中的第一条任务，自动判断更适合先检查还是直接实现。",
				inspectHelp: "适合修复、排障、审查和迁移：先确认事实与根因，再做最小改动。",
				directHelp: "适合新建、开发和生成：直接推进可用结果，完成后进行验证。",
				safety: "它只增加一段简短工作方式提示，不读取文件、不执行命令、不裁剪工具，也不会产生额外模型请求。"
			},
			en: {
				tab: "Smart routing",
				title: "Task-aware routing",
				loading: "Reading status…",
				unavailable: "Runtime status is temporarily unavailable. Routing never removes existing tools or context.",
				enabled: "Enabled",
				disabled: "Disabled",
				current: "Current strategy",
				scope: "Active only in Smart routing mode",
				auto: "Automatic (recommended)",
				inspect: "Inspect first",
				direct: "Direct execution",
				autoHelp: "Uses the session’s first task to decide whether to inspect first or move directly to implementation.",
				inspectHelp: "For fixes, diagnosis, reviews, and migrations: establish facts and root cause before the smallest justified change.",
				directHelp: "For creation and implementation: move toward a usable result and verify it when complete.",
				safety: "It only adds short workflow guidance. It does not read files, run commands, remove tools or context, or make extra model requests."
			}
		};
		function text() {
			const primary = (navigator.languages?.[0] || navigator.language || "en").toLowerCase();
			return primary === "zh-cn" || primary.startsWith("zh-hans") ? copy["zh-CN"] : copy.en;
		}
		const inject = ["slots"];
		const styles = `
.drs-page{display:flex;flex-direction:column;gap:12px;max-width:720px;color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.55}
.drs-page h3{margin:0;font-size:18px;font-weight:600}
.drs-status,.drs-note{padding:10px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-3)}
.drs-status{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2)}
.drs-note{color:var(--dsw-alias-label-tertiary)}
.drs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
.drs-card{padding:12px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-bg-layer-3)}
.drs-card.active{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2)}
.drs-card strong{display:block;margin-bottom:4px;font-weight:600}
.drs-card span{color:var(--dsw-alias-label-tertiary);font-size:12px}
`;
		function RoutingSuiteSection() {
			const t = text();
			const [status, setStatus] = (0, react.useState)({ kind: "loading" });
			(0, react.useEffect)(() => {
				const controller = new AbortController();
				fetch("/routing-suite/api/status", {
					credentials: "same-origin",
					signal: controller.signal
				}).then(async (response) => {
					if (!response.ok) throw new Error("status unavailable");
					const data = await response.json();
					if (!data?.ok) throw new Error("status unavailable");
					const strategy = data.strategy === "inspect-first" || data.strategy === "direct" ? data.strategy : "auto";
					setStatus({
						kind: "ready",
						value: {
							ok: true,
							enabled: data.enabled !== false,
							strategy
						}
					});
				}).catch((error) => {
					if (!(error instanceof DOMException && error.name === "AbortError")) setStatus({ kind: "error" });
				});
				return () => {
					controller.abort();
				};
			}, []);
			const strategy = status.kind === "ready" ? status.value.strategy : void 0;
			const statusText = status.kind === "loading" ? t.loading : status.kind === "error" ? t.unavailable : `${status.value.enabled ? t.enabled : t.disabled} · ${t.scope} · ${t.current}: ${strategy === "auto" ? t.auto : strategy === "inspect-first" ? t.inspect : t.direct}`;
			const definitions = [
				[
					"auto",
					t.auto,
					t.autoHelp
				],
				[
					"inspect-first",
					t.inspect,
					t.inspectHelp
				],
				[
					"direct",
					t.direct,
					t.directHelp
				]
			];
			return (0, react.createElement)("div", { className: "drs-page" }, (0, react.createElement)("style", null, styles), (0, react.createElement)("h3", null, t.title), (0, react.createElement)("div", { className: "drs-status" }, statusText), (0, react.createElement)("div", { className: "drs-grid" }, definitions.map(([id, label, help]) => (0, react.createElement)("div", {
				key: id,
				className: `drs-card${strategy === id ? " active" : ""}`
			}, (0, react.createElement)("strong", null, label), (0, react.createElement)("span", null, help)))), (0, react.createElement)("div", { className: "drs-note" }, t.safety));
		}
		function apply(ctx) {
			ctx.effect(() => ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "routing-suite-status",
				order: 50,
				label: () => text().tab
			}, RoutingSuiteSection)), "routing-suite: localized status");
		}
		//#endregion
		exports.RoutingSuiteSection = RoutingSuiteSection;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map