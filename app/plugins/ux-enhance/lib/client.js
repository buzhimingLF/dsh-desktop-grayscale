window.__ModuleLoader__.load({
	id: "dsh-ux-enhance",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		// 模型价格（每百万 token，美元）。与 pi-ai catalog 一致；未知模型走默认档。
		const PRICES = {
			"deepseek-v4-pro": { input: 0.435, output: 0.87, cacheRead: 0.003625 },
			"deepseek-v4-flash": { input: 0.14, output: 0.28, cacheRead: 0.0028 },
		};
		const DEFAULT_PRICE = { input: 0.435, output: 0.87, cacheRead: 0.003625 };

		// ---------- 工具 ----------
		function cssEscape(s) { return String(s); }

		function findComposer() {
			// DSH 输入框是一个 textarea；优先找可见的、非 disabled 的那个。
			const areas = Array.from(document.querySelectorAll("textarea"));
			for (const a of areas) {
				if (a.disabled) continue;
				const r = a.getBoundingClientRect();
				if (r.width > 0 && r.height > 0) return a;
			}
			return areas.find((a) => !a.disabled) ?? null;
		}

		function collectUserMessages() {
			// 用户消息：从会话区找 role 或 data 标记，兜底收集所有非空的块级文本。
			const out = [];
			const seen = new Set();
			for (const el of document.querySelectorAll('[data-variant="user"], [data-role="user"], [data-message-role="user"]')) {
				const text = (el.innerText || "").trim();
				if (text && !seen.has(text)) { seen.add(text); out.push(text); }
			}
			// 兜底：如果没有 role 标记，尝试从常见的 user-row 结构收集。
			if (out.length === 0) {
				for (const el of document.querySelectorAll('[class*="userRow"], [class*="user-row"], [class*="user_row"]')) {
					const text = (el.innerText || "").trim();
					if (text && !seen.has(text)) { seen.add(text); out.push(text); }
				}
			}
			return out;
		}

		// ---------- 1. Ctrl+滚轮 字体缩放 ----------
		const ZOOM_KEY = "dsh.ux-enhance.zoom";
		function readZoom() {
			try { const v = parseInt(localStorage.getItem(ZOOM_KEY), 10); return Number.isFinite(v) ? Math.min(150, Math.max(70, v)) : 100; }
			catch { return 100; }
		}
		function applyZoom(pct) {
			const conv = document.querySelector('[data-dsh-conversation], [class*="conversation"], main, #root');
			if (conv) conv.style.fontSize = pct + "%";
			try { localStorage.setItem(ZOOM_KEY, String(pct)); } catch {}
		}
		function onWheel(e) {
			if (!e.ctrlKey && !e.metaKey) return;
			// 只在会话内容区（有文本的地方）缩放，避免误触全局。
			const target = e.target;
			if (!(target instanceof Element)) return;
			if (!target.closest('[class*="conversation"], main, #root, [class*="message"]')) return;
			e.preventDefault();
			const delta = e.deltaY < 0 ? 10 : -10;
			applyZoom(readZoom() + delta);
		}

		// ---------- 2. ↑/↓ 历史消息导航 ----------
		let history = [];
		let historyIndex = -1;
		function refreshHistory() { history = collectUserMessages(); }
		function onKeyDown(e) {
			const target = e.target;
			if (!(target instanceof HTMLTextAreaElement)) return;
			if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
			const ta = target;
			const atStart = ta.selectionStart === 0 && ta.selectionEnd === 0;
			const atEnd = ta.selectionStart === ta.value.length && ta.selectionEnd === ta.value.length;
			if (e.key === "ArrowUp" && !atStart) return;      // 多行光标在中间时不劫持
			if (e.key === "ArrowDown" && !atEnd) return;
			if (history.length === 0) return;
			e.preventDefault();
			if (e.key === "ArrowUp") {
				if (historyIndex < 0) historyIndex = history.length - 1;
				else if (historyIndex > 0) historyIndex -= 1;
			} else {
				if (historyIndex < 0) return;
				if (historyIndex < history.length - 1) historyIndex += 1;
				else { historyIndex = -1; ta.value = ""; return; }
			}
			ta.value = history[historyIndex];
			ta.setSelectionRange(ta.value.length, ta.value.length);
		}

		// ---------- 3. 实时费用估算 ----------
		const COST_KEY = "dsh.ux-enhance.cost";
		function readCostEnabled() {
			try { return localStorage.getItem(COST_KEY) !== "off"; } catch { return true; }
		}
		function estimateCost(inputTokens, outputTokens, cacheReadTokens) {
			const price = pickPrice();
			return (inputTokens * price.input + outputTokens * price.output + cacheReadTokens * price.cacheRead) / 1e6;
		}
		function pickPrice() {
			// 从模型选择器/状态行读当前模型名，匹配价格表。
			const hay = document.body.innerText || "";
			for (const name of Object.keys(PRICES)) {
				if (hay.includes(name)) return PRICES[name];
			}
			return DEFAULT_PRICE;
		}
		function injectCostBadge(ctx) {
			if (document.getElementById("dsh-cost") !== null) return;
			const badge = document.createElement("div");
			badge.id = "dsh-cost";
			badge.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:2147483000;padding:5px 10px;border-radius:8px;background:rgba(22,22,22,.85);color:#c8c8c8;font-size:11px;font-family:system-ui;pointer-events:none;user-select:none;";
			document.body.appendChild(badge);
			// 定期扫描会话里的 token 用量文本（DSH 状态行会显示 token 数）。
			function tick() {
				if (!readCostEnabled()) { badge.textContent = ""; return; }
				const tokens = scanTokenUsage();
				if (tokens === null) { badge.textContent = "费用：—"; return; }
				const cost = estimateCost(tokens.input, tokens.output, tokens.cacheRead);
				badge.textContent = "费用 ≈ $" + cost.toFixed(4) + "（in " + tokens.input + " / out " + tokens.output + "）";
			}
			tick();
			const timer = setInterval(tick, 3000);
			ctx.effect(() => () => { clearInterval(timer); badge.remove(); }, "ux-enhance cost badge");
		}
		function scanTokenUsage() {
			// 从 DOM 找 "input xxxx / output yyyy" 之类的 token 文本。
			const body = document.body;
			if (!body) return null;
			const text = body.innerText || "";
			// 常见格式：`1.2k / 3.4k` 或 `input 1234 output 5678`。这里做保守解析。
			const m = text.match(/(?:输入|in(?:put)?)\s*[:\s]?\s*([\d,\.kKmM]+)[^\d]{0,12}(?:输出|out(?:put)?)\s*[:\s]?\s*([\d,\.kKmM]+)/i);
			if (!m) return null;
			return { input: parseNum(m[1]), output: parseNum(m[2]), cacheRead: 0 };
		}
		function parseNum(s) {
			const t = s.replace(/,/g, "").trim().toLowerCase();
			let n = parseFloat(t);
			if (t.endsWith("k")) n *= 1e3;
			else if (t.endsWith("m")) n *= 1e6;
			return Number.isFinite(n) ? n : 0;
		}

		// ---------- apply ----------
		function apply(ctx) {
			if (typeof document === "undefined" || document.body === null) return;
			// 字体缩放：初始应用一次。
			applyZoom(readZoom());
			window.addEventListener("wheel", onWheel, { passive: false });
			// 历史：keydown 捕获（冒泡阶段）。
			document.addEventListener("keydown", onKeyDown);
			// 历史刷新：DOM 变化时重新收集。
			let historyTimer = null;
			const refreshThrottled = () => {
				if (historyTimer !== null) return;
				historyTimer = setTimeout(() => { historyTimer = null; refreshHistory(); }, 500);
			};
			new MutationObserver(refreshThrottled).observe(document.body, { childList: true, subtree: true, characterData: true });
			refreshHistory();
			// 费用徽章。
			injectCostBadge(ctx);
			ctx.effect(() => () => {
				window.removeEventListener("wheel", onWheel);
				document.removeEventListener("keydown", onKeyDown);
			}, "ux-enhance");
		}

		exports.apply = apply;
		return module.exports;
	}
});
