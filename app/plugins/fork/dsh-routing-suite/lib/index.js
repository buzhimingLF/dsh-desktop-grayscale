import z from "schemastery";
//#region src/router.mjs
const ROUTING_SECTION = "routing-suite-guidance";
const INSPECT_INTENT_PATTERNS = [/修复|排查|调试|报错|为什么|审查|检查|迁移|重构|优化|升级|兼容|漏洞|回归/gi, /\b(?:fix|debug|diagnos\w*|review|audit|inspect|migrat\w*|refactor\w*|optimi[sz]\w*|upgrade|compat\w*|regression)\b/gi];
const INSPECT_SYMPTOM_PATTERNS = [/错误|失败|损坏/gi, /\b(?:error|failing|failed|broken)\b/gi];
const DIRECT_PATTERNS = [/新建|创建|开发|实现|生成|搭建|从零|写一个|新增|添加/gi, /\b(?:build|create|implement|generate|scaffold|develop|write|add|new)\b/gi];
const GUIDANCE = {
	"inspect-first": "Routing guidance: this is a maintenance or investigation task. Inspect the relevant facts first, identify the root cause, then make the smallest justified change and verify it.",
	direct: "Routing guidance: this is a creation or implementation task. Move directly toward a usable result, keep the design proportional, and verify the finished behavior."
};
function score(text, patterns) {
	let total = 0;
	for (const pattern of patterns) total += text.match(pattern)?.length ?? 0;
	return total;
}
function extractText(data) {
	const message = data?.message ?? data;
	if (typeof message === "string") return message;
	return (Array.isArray(message?.content) ? message.content : []).filter((part) => part?.type === "text" && typeof part.text === "string").map((part) => part.text).join("\n");
}
function firstUserText(session) {
	const events = Array.isArray(session?.events) ? session.events : [];
	for (const event of events) {
		if (event?.type !== "user/message") continue;
		const outer = event.data;
		const message = outer?.message ?? outer;
		const source = outer?.source ?? message?.source;
		if (source?.kind && source.kind !== "user") continue;
		const text = extractText(outer).trim();
		if (text) return text;
	}
	return "";
}
function classifyTask(text) {
	const input = typeof text === "string" ? text.trim() : "";
	if (!input) return "neutral";
	const inspectIntent = score(input, INSPECT_INTENT_PATTERNS);
	const inspectSymptom = score(input, INSPECT_SYMPTOM_PATTERNS);
	const direct = score(input, DIRECT_PATTERNS);
	if (inspectIntent > 0) return "inspect-first";
	if (direct > 0) return "direct";
	if (inspectSymptom > 0) return "inspect-first";
	return "neutral";
}
function resolveMode(strategy, session) {
	if (strategy === "inspect-first" || strategy === "direct") return strategy;
	return classifyTask(firstUserText(session));
}
function applyRoutingToAssembly(assembled, mode) {
	if (mode === "neutral" || !GUIDANCE[mode] || !Array.isArray(assembled?.sections)) return assembled;
	const sections = assembled.sections.filter((section) => section?.name !== ROUTING_SECTION);
	sections.push({
		name: ROUTING_SECTION,
		text: GUIDANCE[mode],
		order: 10
	});
	return {
		...assembled,
		sections
	};
}
//#endregion
//#region src/index.ts
const name = "dsh-routing-suite";
const inject = ["systemPrompt", "webServer"];
const routingPreset = "routing-suite";
function selectedPreset(session) {
	const events = Array.isArray(session?.events) ? session.events : [];
	for (let index = events.length - 1; index >= 0; index -= 1) {
		const event = events[index];
		if (event?.type === "agent-preset/selected" && typeof event.data?.agentPreset === "string") return event.data.agentPreset;
	}
	return typeof session?.header?.agentPreset === "string" ? session.header.agentPreset : void 0;
}
const Config = z.object({
	enabled: z.boolean().default(true),
	strategy: z.union([
		"auto",
		"inspect-first",
		"direct"
	]).default("auto")
});
function apply(ctx, config) {
	const enabled = config.enabled ?? true;
	const strategy = config.strategy ?? "auto";
	ctx.on("system-prompt/assemble", async (_assembly, context, next) => {
		const assembled = await next();
		if (!enabled) return assembled;
		const session = context?.agent?.session;
		if (!session || selectedPreset(session) !== "routing-suite") return assembled;
		return applyRoutingToAssembly(assembled, resolveMode(strategy, session));
	});
	ctx.effect(() => ctx.webServer.register({
		kind: "prefix",
		path: "/routing-suite/api",
		handler: async (req, res) => {
			const path = new URL(req.url ?? "/", "http://localhost").pathname.replace(/^\/routing-suite\/api/, "") || "/";
			res.setHeader("content-type", "application/json; charset=utf-8");
			if (req.method === "GET" && path === "/status") {
				res.statusCode = 200;
				res.end(JSON.stringify({
					ok: true,
					enabled,
					strategy,
					preset: routingPreset
				}));
				return;
			}
			res.statusCode = 404;
			res.end(JSON.stringify({
				ok: false,
				error: "not found"
			}));
		}
	}), "routing-suite: read-only status API");
}
//#endregion
export { Config, apply, inject, name, routingPreset, selectedPreset };

//# sourceMappingURL=index.js.map