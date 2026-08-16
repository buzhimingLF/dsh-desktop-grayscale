window.__ModuleLoader__.load({
	id: "dsh-see-skills",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");

		// 极简灰度样式：技能 tab 内容（better-sidebar 面板内）。
		const CSS = [
			".see-skills-list{display:flex;flex-direction:column;gap:8px;padding:8px;overflow-y:auto;height:100%}",
			".ss-skill{border:1px solid var(--dsw-alias-border-l2,#2a2a2a);border-radius:8px;padding:10px 12px;background:var(--dsw-alias-bg-layer-2,#1e1e1e)}",
			".ss-name{margin:0 0 4px;font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary,#eee)}",
			".ss-desc{margin:0 0 6px;font-size:12px;color:var(--dsw-alias-label-secondary,#9a9a9a);line-height:1.5;white-space:pre-wrap;word-break:break-word}",
			".ss-meta{font-size:11px;color:var(--dsw-alias-label-tertiary,#777)}",
			".ss-msg{padding:20px;text-align:center;color:var(--dsw-alias-label-tertiary,#777);font-size:12px}",
		].join("");

		function SeeSkillsView() {
			const [skills, setSkills] = react.useState(null);
			const [error, setError] = react.useState(null);
			react.useEffect(() => {
				let cancelled = false;
				(async () => {
					try {
						const res = await fetch("/see-skills/skills");
						if (!res.ok) throw new Error("HTTP " + res.status);
						const data = await res.json();
						if (!cancelled) setSkills(Array.isArray(data.skills) ? data.skills : []);
					} catch (e) {
						if (!cancelled) setError(e?.message ?? String(e));
					}
				})();
				return () => { cancelled = true; };
			}, []);

			if (error) return react.createElement("div", { className: "ss-msg" }, "读取失败：" + error);
			if (skills === null) return react.createElement("div", { className: "ss-msg" }, "加载中…");
			if (skills.length === 0) return react.createElement("div", { className: "ss-msg" }, "未发现任何技能（把 SKILL.md 放进 ~/.dsh/skills）");
			return react.createElement("div", { className: "see-skills-list" },
				skills.map((s) =>
					react.createElement("div", { className: "ss-skill", key: s.path || s.name },
						react.createElement("h4", { className: "ss-name" }, s.name),
						react.createElement("p", { className: "ss-desc" }, s.description || ""),
						react.createElement("div", { className: "ss-meta" },
							(s.sections?.length || 0) + " 章节 · " + (s.references?.length || 0) + " 参考 · " + (s.scripts?.length || 0) + " 脚本"
						)
					)
				)
			);
		}

		function apply(ctx) {
			if (typeof document === "undefined" || !document.body) return;

			// 注入样式
			const style = document.createElement("style");
			style.dataset.plugin = "dsh-see-skills";
			style.textContent = CSS;
			document.head.appendChild(style);
			ctx.effect(() => () => style.remove(), "see-skills style");

			// 注册 better-sidebar 侧边栏「技能」tab（懒注入：better-sidebar 缺席时静默跳过）。
			if (typeof ctx.inject === "function") {
				ctx.inject(["betterSidebar"], (scope) => {
					try {
						scope.effect(() =>
							scope.betterSidebar.registerTab({
								id: "see-skills:skills",
								title: "技能",
								order: 55,
								single: true,
								component: () => react.createElement(SeeSkillsView),
							})
						);
					} catch (e) {
						console.error("[see-skills] registerTab failed:", e?.message ?? e);
					}
				});
			}
		}

		exports.apply = apply;
		return module.exports;
	}
});
