window.__ModuleLoader__.load({
	id: "@linxin666/dsh-client-ui-web-ui-settings",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let _deepseek_ai_cordis = require("@deepseek-ai/cordis");
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/protocol.ts
		/**
		* Settings-bridge protocol shared by the host and client halves of
		* dsh-web-ui-settings.
		*
		* DSH 0.1.0-rc.6 host-apiproxy serves only its hard-coded settings allowlist
		* (WEB_SETTINGS_NAMESPACES plus product namespaces), so every third-party
		* namespace answers "settings-not-exposed" and the family plugin cards can
		* only explain the gap. This bridge re-serves the dsh-web-ui family
		* namespaces through the host settings seam over a same-origin, loopback-only
		* HTTP pair, gated by the user's web_settings_namespaces allowlist from
		* settings.yaml with a built-in family fallback list. On hosts whose
		* apiproxy already exposes the namespaces, the official settings scope stays
		* the primary transport and this bridge never activates.
		*/
		/** Bridge route prefix (same-origin, loopback-only). */
		const WEB_UI_SETTINGS_BRIDGE_PREFIX = "/api/dsh-web-ui-settings";
		//#endregion
		//#region src/client/compat-settings-scope.ts
		/**
		* rc.6-compatible settings scope for the Web UI plugin group.
		*
		* The official settings scope answers "unavailable" for every third-party
		* namespace on rc.6 hosts (the apiproxy allowlist is hard-coded), which turns
		* every family plugin card into a read-only explanation. This binder wraps
		* the official scope: when it reports the namespace ready, the wrapper is a
		* pass-through; when it reports unavailable on a loopback connection, a
		* bridge controller takes over and serves the same SettingsScope contract
		* from this package's host-side bridge routes (/api/dsh-web-ui-settings).
		* Remote browsers (non-loopback) never use the bridge, matching the official
		* process-local policy. Family plugins opt in through ctx.get('webUiSettings')
		* without a hard service dependency, so a deployment without this package
		* keeps the previous behavior.
		*/
		/** True when the value is a well-formed bridge RPC result (the inner result payload the route answers). */
		function isBridgeResult(value) {
			if (typeof value !== "object" || value === null) return false;
			const record = value;
			if (typeof record.ok !== "boolean") return false;
			if (record.ok) return typeof record.value === "object" && record.value !== null;
			return typeof record.code === "string" && typeof record.message === "string";
		}
		/**
		* Build the fetch-backed settings face for the bridge routes. Network and
		* HTTP failures collapse into an ok:false envelope so the controller keeps
		* its unavailable state instead of throwing into plugin activation.
		* @param fetchFn - the fetch implementation (the global fetch on loopback).
		* @returns the settings face.
		*/
		function createBridgeApi(fetchFn) {
			const post = async (path, body) => {
				try {
					const response = await fetchFn(WEB_UI_SETTINGS_BRIDGE_PREFIX + path, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(body)
					});
					if (!response.ok) return { result: {
						ok: false,
						code: "internal",
						message: "bridge HTTP " + response.status
					} };
					const parsed = await response.json();
					if (!isBridgeResult(parsed)) return { result: {
						ok: false,
						code: "internal",
						message: "bridge malformed response"
					} };
					return { result: parsed };
				} catch {
					return { result: {
						ok: false,
						code: "internal",
						message: "settings bridge unreachable"
					} };
				}
			};
			return { settings: {
				describe: async (payload) => post("/describe", payload),
				mutate: async (payload) => post("/mutate", payload)
			} };
		}
		/**
		* A minimal SettingsScopeController over the bridge face. Mirrors the
		* official controller's ordering (serialized queue, revision-fenced writes,
		* recovery read after a refusal) but trusts the Host-seam value without
		* re-running the wire-schema validation: the seam already validated it, and
		* the family cards bind without a narrowing decoder.
		*/
		var BridgeScopeController = class {
			api;
			spec;
			store;
			tail = Promise.resolve();
			disposed = false;
			constructor(api, spec) {
				this.api = api;
				this.spec = spec;
				this.store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)({
					status: "loading",
					value: void 0,
					base: void 0,
					user: void 0,
					revision: void 0,
					writable: false,
					mode: "host"
				});
			}
			getSnapshot() {
				return this.store.getSnapshot();
			}
			subscribe(listener) {
				return this.store.subscribe(listener);
			}
			/** Queue a Host refresh through the bridge. */
			load() {
				return this.enqueue(() => this.read());
			}
			set(field, value) {
				return this.enqueue(() => this.write({
					op: "set",
					path: [field],
					value
				}));
			}
			unset(field) {
				return this.enqueue(() => this.write({
					op: "unset",
					path: [field]
				}));
			}
			/**
			* Write every staged op in one bridge /mutate so the Host validate hook
			* judges the whole batch (baseURL+model together) instead of each field in
			* isolation. Reports per-field success from the returned view.
			* @param fields - the operations to apply, in order.
			* @returns the batch outcome and per-field landed flags.
			*/
			mutate(fields) {
				return this.enqueue(() => this.writeBatch(fields));
			}
			/** Stop queued operations and wait for the current bridge call to settle. */
			async dispose() {
				this.disposed = true;
				await this.tail;
			}
			enqueue(operation) {
				if (this.disposed) return Promise.resolve(void 0);
				const task = this.tail.then(async () => {
					if (this.disposed) return void 0;
					return operation();
				});
				this.tail = task.catch(() => {});
				return task;
			}
			async read() {
				let response;
				try {
					response = await this.api.settings.describe({});
				} catch {
					if (!this.disposed) this.store.update((draft) => {
						draft.status = "unavailable";
					});
					return;
				}
				if (!response.result.ok || this.disposed) {
					if (!this.disposed) this.store.update((draft) => {
						draft.status = "unavailable";
					});
					return;
				}
				const { namespaces, writable } = response.result.value;
				const view = namespaces.find((candidate) => candidate.ns === this.spec.namespace);
				if (view === void 0) {
					this.store.update((draft) => {
						draft.status = "unavailable";
						draft.writable = writable;
					});
					return;
				}
				this.accept(view.value, view, writable);
			}
			async write(op) {
				const revision = this.getSnapshot().revision;
				let response;
				try {
					response = await this.api.settings.mutate({
						ns: this.spec.namespace,
						ops: [op],
						...revision === void 0 ? {} : { expectedRevision: revision }
					});
				} catch {
					await this.read();
					return;
				}
				if (!response.result.ok || this.disposed) {
					await this.read();
					return;
				}
				this.accept(response.result.value.value, response.result.value, void 0);
			}
			async writeBatch(fields) {
				const revision = this.getSnapshot().revision;
				const ops = fields.map(({ field, op, value }) => op === "set" ? {
					op,
					path: [field],
					value
				} : {
					op,
					path: [field]
				});
				let response;
				try {
					response = await this.api.settings.mutate({
						ns: this.spec.namespace,
						ops,
						...revision === void 0 ? {} : { expectedRevision: revision }
					});
				} catch {
					await this.read();
					return {
						ok: false,
						fields: [],
						code: "internal",
						message: "settings bridge unreachable"
					};
				}
				if (!response.result.ok || this.disposed) {
					const refusal = response.result.ok === false ? response.result : {
						code: "internal",
						message: "settings bridge unreachable"
					};
					await this.read();
					return {
						ok: false,
						fields: [],
						code: refusal.code,
						message: refusal.message
					};
				}
				this.accept(response.result.value.value, response.result.value, void 0);
				return {
					ok: true,
					fields: this.landedFields(fields, response.result.value)
				};
			}
			/**
			* Judge each requested field against the read-back view. A secret field is
			* redacted from the user layer, so it is judged by the view's secret-set
			* marker; every other field is judged by user-layer presence/value.
			*/
			landedFields(fields, view) {
				const secretSet = /* @__PURE__ */ new Map();
				for (const secret of view.secrets ?? []) secretSet.set(secret.path.join("."), secret.set);
				const user = view.user;
				return fields.map(({ field, op, value }) => {
					const secretFlag = secretSet.get(field);
					if (secretFlag !== void 0) return {
						field,
						landed: secretFlag
					};
					if (op === "set") return {
						field,
						landed: user !== void 0 && Object.hasOwn(user, field) && user[field] === value
					};
					return {
						field,
						landed: user === void 0 || !Object.hasOwn(user, field)
					};
				});
			}
			/** Publish one accepted Host view (value narrowed by the optional decoder). */
			accept(section, view, writable) {
				const decoded = this.spec.decode === void 0 ? section : this.spec.decode(section);
				this.store.update((draft) => {
					draft.revision = view.revision;
					draft.base = view.base;
					draft.user = view.user;
					if (writable !== void 0) draft.writable = writable;
					if (decoded === void 0) return;
					draft.status = "ready";
					draft.value = decoded;
				});
			}
		};
		/**
		* Wrap the official settings scope with the bridge fallback. The official
		* scope stays authoritative whenever it serves the namespace; the bridge
		* controller answers only its unavailable state on a loopback connection.
		* @param options - the official scope, the namespace, and the loopback fetch.
		* @returns the compatibility scope implementing the SettingsScope contract.
		*/
		function createCompatScope(options) {
			const { namespace, primary } = options;
			const fallback = options.fetchFn === void 0 ? void 0 : new BridgeScopeController(createBridgeApi(options.fetchFn), { namespace });
			const store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)(project());
			let fallbackStarted = false;
			const publish = () => {
				store.set(project());
			};
			const startFallback = () => {
				if (fallback === void 0 || fallbackStarted) return;
				fallbackStarted = true;
				fallback.load();
			};
			function project() {
				const primarySnapshot = primary.getSnapshot();
				if (primarySnapshot.status === "ready" || fallback === void 0) return primarySnapshot;
				if (primarySnapshot.status === "loading") return primarySnapshot;
				const bridgeSnapshot = fallback.getSnapshot();
				if (bridgeSnapshot.status === "ready") return bridgeSnapshot;
				if (bridgeSnapshot.status === "loading") return {
					...primarySnapshot,
					status: "loading"
				};
				return primarySnapshot;
			}
			primary.subscribe(() => {
				publish();
				if (primary.getSnapshot().status === "unavailable") startFallback();
			});
			fallback?.subscribe(publish);
			if (primary.getSnapshot().status === "unavailable") startFallback();
			return {
				getSnapshot: () => store.getSnapshot(),
				subscribe: (listener) => store.subscribe(listener),
				set: (field, value) => active().set(field, value),
				unset: (field) => active().unset(field),
				load: async () => {
					fallbackStarted = true;
					await fallback?.load();
				},
				get mutate() {
					const backend = active();
					if (fallback !== void 0 && backend === fallback && typeof fallback.mutate === "function") return fallback.mutate.bind(fallback);
				}
			};
			function active() {
				return primary.getSnapshot().status === "ready" ? primary : fallback ?? primary;
			}
		}
		/**
		* The rc.6 compatibility binder, provided as the webUiSettings service. Its
		* bind() rides the official binder first and hands the bridge controller in
		* only when the official scope settles as unavailable on a loopback
		* connection, so official behavior stays untouched wherever it works.
		*/
		var WebUiSettingsBinder = class extends _deepseek_ai_cordis.Service {
			constructor(ctx) {
				super(ctx, "webUiSettings");
			}
			bind(spec) {
				const ctx = this.ctx;
				const official = ctx.get("settingsScope");
				if (!isBinderFace(official)) throw new Error("webUiSettings: the official settingsScope binder is unavailable");
				const primary = official.bind(spec);
				const connectionValue = ctx.get("connection");
				const loopback = (isConnectionHandle(connectionValue) ? connectionValue : void 0)?.isLoopback === true;
				const scope = createCompatScope({
					namespace: spec.namespace,
					primary,
					fetchFn: loopback ? ((input, init) => fetch(input, init)) : void 0
				});
				ctx.effect(() => {
					const remoteValue = ctx.get("remote");
					const remote = isRemoteFace(remoteValue) ? remoteValue : void 0;
					const disposers = [];
					if (remote !== void 0) disposers.push(remote.$on("settings/document-updated", (namespace) => {
						if (namespace !== void 0 && namespace !== spec.namespace) return;
						scope.load();
					}));
					disposers.push(ctx.on("connection/reset", () => {
						scope.load();
					}));
					return () => {
						for (const dispose of disposers) dispose();
					};
				}, "web-ui-settings: compat scope invalidation");
				return scope;
			}
		};
		/** True when the value exposes the official settings binder's bind() seam. */
		function isBinderFace(value) {
			return typeof value === "object" && value !== null && typeof value.bind === "function";
		}
		/** True when the value looks like the client connection handle this wrapper reads. */
		function isConnectionHandle(value) {
			if (typeof value !== "object" || value === null) return false;
			const record = value;
			return record.isLoopback === void 0 || typeof record.isLoopback === "boolean";
		}
		/** True when the value exposes the settings invalidation face the wrapper listens to. */
		function isRemoteFace(value) {
			return typeof value === "object" && value !== null && typeof value.$on === "function";
		}
		//#endregion
		//#region \0dsh-css:packages/dsh-web-ui-settings/src/client/web-ui-settings.module.css.mjs
		const css = ".-\\35 WdAW_groupCard{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;list-style:none;transition:border-color .16s,background .16s}.-\\35 WdAW_groupCard:hover{border-color:var(--dsw-alias-label-dimmed)}.-\\35 WdAW_groupCardOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}.-\\35 WdAW_header{appearance:none;width:100%;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;border-radius:12px;align-items:center;gap:12px;padding:14px 16px;display:flex}.-\\35 WdAW_header:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}.-\\35 WdAW_headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.-\\35 WdAW_name{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}.-\\35 WdAW_description{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}.-\\35 WdAW_chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}.-\\35 WdAW_chevronOpen{transform:rotate(180deg)}.-\\35 WdAW_body{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding:12px 0 8px}.-\\35 WdAW_subcards{flex-direction:column;gap:10px;margin:0;padding:0;list-style:none;display:flex}@media (prefers-reduced-motion:reduce){.-\\35 WdAW_groupCard,.-\\35 WdAW_header,.-\\35 WdAW_chevron,.-\\35 WdAW_chevronOpen{transition:none}}.-\\35 WdAW_entries{flex-direction:column;gap:8px;margin:8px 0 0;padding:0;list-style:none;display:flex}.-\\35 WdAW_entry{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);border-radius:6px;flex-direction:column;gap:4px;padding:10px 12px;display:flex}.-\\35 WdAW_entryHead{justify-content:space-between;align-items:baseline;gap:8px;min-width:0;display:flex}.-\\35 WdAW_entryName{color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;font-weight:600;overflow:hidden}.-\\35 WdAW_entryAuthor{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;flex:none;font-size:12px;overflow:hidden}.-\\35 WdAW_entryDescription,.-\\35 WdAW_entryDescriptionEn{color:var(--dsw-alias-label-secondary);margin:0;font-size:13px;line-height:1.4}.-\\35 WdAW_entryDescriptionEn{color:var(--dsw-alias-label-tertiary);font-size:12px}.-\\35 WdAW_entryLinks{flex-wrap:wrap;align-items:center;gap:10px;margin-top:2px;display:flex}.-\\35 WdAW_entryLink{color:var(--dsw-alias-link-primary,var(--dsw-alias-button-info-fill));font-size:13px;text-decoration:underline}.-\\35 WdAW_entryLink:hover{text-decoration:none}.-\\35 WdAW_entryNpm{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:12px;overflow:hidden}.-\\35 WdAW_empty{color:var(--dsw-alias-label-tertiary);margin:0;padding:8px 2px;font-size:13px}.-\\35 WdAW_notice{color:var(--dsw-alias-label-tertiary);margin:10px 2px 0;font-size:12px;line-height:1.4}";
		const tagId = "@linxin666/dsh-client-ui-web-ui-settings/web-ui-settings.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@linxin666/dsh-client-ui-web-ui-settings";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var web_ui_settings_module_css_default = {
			"body": "-5WdAW_body",
			"chevron": "-5WdAW_chevron",
			"chevronOpen": "-5WdAW_chevronOpen",
			"description": "-5WdAW_description",
			"empty": "-5WdAW_empty",
			"entries": "-5WdAW_entries",
			"entry": "-5WdAW_entry",
			"entryAuthor": "-5WdAW_entryAuthor",
			"entryDescription": "-5WdAW_entryDescription",
			"entryDescriptionEn": "-5WdAW_entryDescriptionEn",
			"entryHead": "-5WdAW_entryHead",
			"entryLink": "-5WdAW_entryLink",
			"entryLinks": "-5WdAW_entryLinks",
			"entryName": "-5WdAW_entryName",
			"entryNpm": "-5WdAW_entryNpm",
			"groupCard": "-5WdAW_groupCard",
			"groupCardOpen": "-5WdAW_groupCardOpen",
			"headText": "-5WdAW_headText",
			"header": "-5WdAW_header",
			"name": "-5WdAW_name",
			"notice": "-5WdAW_notice",
			"subcards": "-5WdAW_subcards"
		};
		//#endregion
		//#region src/client/WebUIPluginsCard.tsx
		/**
		* The Web UI plugin group card. Renders as one item in the
		* `settings.plugin.item` list and, when expanded, renders every family
		* plugin card into its own child slot. The card chrome mirrors the official
		* ui-plugin-config PluginCard so the group reads as a sibling of the built-in
		* Shell / Agent loop / Web search cards.
		*/
		/**
		* Render the group card with the child plugin cards inside its body.
		* @param props - locale copy and the child slot renderer.
		* @returns the group card, or nothing when the section does not exist.
		*/
		function WebUIPluginsCard(props) {
			const { t, renderSlot } = props;
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: open ? `${web_ui_settings_module_css_default.groupCard} ${web_ui_settings_module_css_default.groupCardOpen}` : web_ui_settings_module_css_default.groupCard,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: web_ui_settings_module_css_default.header,
					"aria-expanded": open,
					"aria-label": `${t(open ? "collapse" : "expand")}: ${t("title")}`,
					onClick: () => {
						setOpen(!open);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: web_ui_settings_module_css_default.headText,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: web_ui_settings_module_css_default.name,
							title: t("title"),
							children: t("title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: web_ui_settings_module_css_default.description,
							title: t("description"),
							children: t("description")
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
						width: "14",
						height: "14",
						viewBox: "0 0 14 14",
						fill: "none",
						xmlns: "http://www.w3.org/2000/svg",
						className: open ? `${web_ui_settings_module_css_default.chevron} ${web_ui_settings_module_css_default.chevronOpen}` : web_ui_settings_module_css_default.chevron,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z",
							fill: "currentColor"
						})
					})]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: web_ui_settings_module_css_default.body,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: web_ui_settings_module_css_default.subcards,
						children: renderSlot("web-ui.plugin.item", {})
					})
				}) : null]
			});
		}
		//#endregion
		//#region src/client/generated/community.ts
		/** Every community plugin, in community.json order. */
		const COMMUNITY_PLUGINS = [
			{
				"id": "dsh-data-agent",
				"name": "Data Agent",
				"nameEn": "Data Agent",
				"author": "omdsh-dev",
				"repo": "https://github.com/omdsh-dev/dsh-data-agent",
				"description": "为 DSH 定义专用 Data Agent 预设，让 AI 帮你查询、更新、分析数据。",
				"descriptionEn": "Defines a dedicated Data Agent preset for DSH so the AI can query, update and analyze data."
			},
			{
				"id": "dsh-tui",
				"name": "dsh-TUI",
				"nameEn": "dsh-TUI",
				"author": "ccch1mneyyy",
				"repo": "https://github.com/ccch1mneyyy/dsh-TUI",
				"description": "Claude Code 风格全屏交互终端插件：像素鲸鱼顶栏、实时工作状态行、思考流式展开、双击 Esc 回滚、上下文进度条与 TPS 仪表。",
				"descriptionEn": "A Claude Code style fullscreen interactive terminal plugin: pixel-whale header, live working-state line, streaming reasoning expansion, double-Esc rollback, context progress bar and TPS gauges."
			},
			{
				"id": "dsh-tianshu-tui",
				"name": "天书 TUI",
				"nameEn": "Tianshu TUI",
				"author": "huiliyi37",
				"repo": "https://github.com/huiliyi37/dsh-tianshu-tui",
				"description": "基于官方 DeepSeek Harness 的交互式终端 UI 插件，在官方基础上增加 TDD 与证据门等工作流。",
				"descriptionEn": "An interactive terminal UI plugin for DeepSeek Harness that adds TDD and evidence-gate workflows on top of the official base."
			},
			{
				"id": "dsh-chat-summary",
				"name": "Chat Summary",
				"nameEn": "Chat Summary",
				"author": "v833",
				"repo": "https://github.com/v833/dsh-chat-summary",
				"description": "总结当前对话并导出为 Markdown / DOCX / PDF，可选 LLM 智能总结（用户自配 API Key）。",
				"descriptionEn": "Summarize the current conversation and export it as Markdown / DOCX / PDF, with optional LLM summarization using your own API key.",
				"npm": "@linxin666/dsh-client-ui-chat-summary"
			},
			{
				"id": "dsh-builtin-toggles",
				"name": "内置能力检查器",
				"nameEn": "Built-in Capability Inspector",
				"author": "Starfie1d1272",
				"repo": "https://github.com/Starfie1d1272/dsh-builtin-toggles",
				"description": "Evidence-backed 内置 capability Inspector：展示 DSH Web built-in capability 的 provenance、compatibility 与 structural drift；仅对 9 个经过审阅的 UI leaves 提供 fail-closed 开关。",
				"descriptionEn": "Evidence-backed built-in capability Inspector: surfaces provenance, compatibility and structural drift of DSH Web built-ins, with fail-closed toggles for only the nine reviewed UI leaves.",
				"npm": "dsh-builtin-toggles"
			},
			{
				"id": "dsh-pilot",
				"name": "Pilot 浏览器驾驶舱",
				"nameEn": "Pilot Browser Cockpit",
				"author": "guo6x",
				"repo": "https://github.com/guo6x/dsh-pilot",
				"description": "给 agent 一双会开车的手：零依赖 CDP 浏览器操控（8 个 pilot_* 工具：导航/点击/输入/按键/JS/截图）+ Web GUI 可拖拽驾驶舱面板，无需 Playwright、无需 API key。",
				"descriptionEn": "Give your agent hands: zero-dependency CDP browser control (8 pilot_* tools: navigate/click/type/keys/eval/screenshot) plus a draggable cockpit panel in the Web GUI - no Playwright, no API key."
			},
			{
				"id": "dsh-housekeeper",
				"name": "环境管家",
				"nameEn": "Environment Housekeeper",
				"author": "guo6x",
				"repo": "https://github.com/guo6x/dsh-housekeeper",
				"description": "管住 agent 的脏手：工具链台账（node/pnpm/git/gh/ffmpeg 等自动探测）、缓存与临时目录扫描 + 白名单安全一键清理、机器规则 AGENTS.md 查看编辑，全在设置面板完成。",
				"descriptionEn": "Keep your agent's hands clean: toolchain inventory, scratch/cache scan with whitelist-guarded one-click cleanup, and the machine rules file (AGENTS.md) view/edit - all in the settings panel."
			}
		];
		//#endregion
		//#region src/client/community-guard.ts
		/** True when the value is a well-formed community plugin entry. */
		function isCommunityPluginEntry(value) {
			if (typeof value !== "object" || value === null) return false;
			const entry = value;
			if (typeof entry.id !== "string" || entry.id === "") return false;
			if (typeof entry.name !== "string" || typeof entry.nameEn !== "string") return false;
			if (typeof entry.author !== "string" || entry.author === "") return false;
			if (typeof entry.repo !== "string" || !entry.repo.startsWith("https://")) return false;
			if (entry.description !== void 0 && typeof entry.description !== "string") return false;
			if (entry.descriptionEn !== void 0 && typeof entry.descriptionEn !== "string") return false;
			if (entry.npm !== void 0 && typeof entry.npm !== "string") return false;
			return true;
		}
		//#endregion
		//#region src/client/CommunityPluginsCard.tsx
		/**
		* The community plugin index card. Renders inside the Web UI plugin group:
		* every entry points at a contributor's own repository — this package only
		* indexes them, it never vendors their code. The body is a plain link list
		* (no settings form), so the card works without any settings namespace.
		*/
		/**
		* Render the community plugin index card.
		* @param props - locale copy and the (default-generated) entry list.
		* @returns the disclosure card with the contributor links inside.
		*/
		function CommunityPluginsCard(props) {
			const { t } = props;
			const plugins = (props.plugins ?? COMMUNITY_PLUGINS).filter(isCommunityPluginEntry);
			const [open, setOpen] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: open ? `${web_ui_settings_module_css_default.groupCard} ${web_ui_settings_module_css_default.groupCardOpen}` : web_ui_settings_module_css_default.groupCard,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: web_ui_settings_module_css_default.header,
					"aria-expanded": open,
					"aria-label": `${t(open ? "collapse" : "expand")}: ${t("title")}`,
					onClick: () => {
						setOpen(!open);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: web_ui_settings_module_css_default.headText,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: web_ui_settings_module_css_default.name,
							title: t("title"),
							children: t("title")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: web_ui_settings_module_css_default.description,
							title: t("description"),
							children: t("description")
						})]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
						width: "14",
						height: "14",
						viewBox: "0 0 14 14",
						fill: "none",
						xmlns: "http://www.w3.org/2000/svg",
						className: open ? `${web_ui_settings_module_css_default.chevron} ${web_ui_settings_module_css_default.chevronOpen}` : web_ui_settings_module_css_default.chevron,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z",
							fill: "currentColor"
						})
					})]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: web_ui_settings_module_css_default.body,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: web_ui_settings_module_css_default.entries,
						children: plugins.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
							className: web_ui_settings_module_css_default.empty,
							role: "status",
							children: t("empty")
						}) : plugins.map((plugin) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: web_ui_settings_module_css_default.entry,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: web_ui_settings_module_css_default.entryHead,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: web_ui_settings_module_css_default.entryName,
										title: plugin.name,
										children: plugin.name
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: web_ui_settings_module_css_default.entryAuthor,
										title: plugin.author,
										children: [
											t("author"),
											": ",
											plugin.author
										]
									})]
								}),
								plugin.description ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: web_ui_settings_module_css_default.entryDescription,
									children: plugin.description
								}) : null,
								plugin.descriptionEn ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: web_ui_settings_module_css_default.entryDescriptionEn,
									children: plugin.descriptionEn
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
									className: web_ui_settings_module_css_default.entryLinks,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
										className: web_ui_settings_module_css_default.entryLink,
										href: plugin.repo,
										target: "_blank",
										rel: "noreferrer",
										children: t("repository")
									}), plugin.npm ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", {
										className: web_ui_settings_module_css_default.entryNpm,
										children: plugin.npm
									}) : null]
								})
							]
						}, plugin.id))
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: web_ui_settings_module_css_default.notice,
						role: "note",
						children: t("notice")
					})]
				}) : null]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/**
		* The `web-ui-plugins` locale dictionaries for the group card.
		*/
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"title": "Web UI 插件",
			"description": "统一管理 dsh-web-ui 全家桶插件的启用与配置。",
			"expand": "展开",
			"collapse": "收起",
			"empty": "没有已安装的 dsh-web-ui 插件。"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"title": "Web UI Plugins",
			"description": "Enable and configure the dsh-web-ui family plugins from one place.",
			"expand": "Show plugins",
			"collapse": "Hide plugins",
			"empty": "No dsh-web-ui plugins installed."
		};
		/**
		* The `community-plugins` locale dictionaries for the community plugin index
		* card.
		*/
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const communityPluginsZh = {
			"title": "社区插件",
			"description": "社区贡献者开发与维护的插件，链接指向作者自己的仓库。",
			"expand": "展开",
			"collapse": "收起",
			"empty": "暂无社区插件登记。",
			"author": "作者",
			"repository": "仓库",
			"notice": "条目由贡献者自行登记，与 dsh-web-ui 的发布内容无关；使用前请自行评估。"
		};
		/** English dictionary, checked complete against the zh key set. */
		const communityPluginsEn = {
			"title": "Community Plugins",
			"description": "Plugins developed and maintained by community contributors, linking to each author's own repository.",
			"expand": "Show plugins",
			"collapse": "Hide plugins",
			"empty": "No community plugins registered yet.",
			"author": "Author",
			"repository": "Repository",
			"notice": "Entries are contributed by their authors and are separate from dsh-web-ui releases; evaluate before use."
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services. */
		const inject = [
			"slots",
			"locale",
			"connection",
			"settingsScope",
			"remote"
		];
		/**
		* Register the Web UI plugin group.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register("web-ui-plugins", {
				zh,
				en
			}), "web-ui-settings: dictionaries");
			new WebUiSettingsBinder(ctx);
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				id: "web-ui-plugins",
				order: 90,
				locale: "web-ui-plugins",
				children: { "web-ui.plugin.item": {
					kind: "list",
					scope: "root"
				} }
			}, WebUIPluginsCard));
			ctx.effect(() => ctx.locale.register("community-plugins", {
				zh: communityPluginsZh,
				en: communityPluginsEn
			}), "web-ui-settings: community-plugins dictionaries");
			ctx.slots.inject("web-ui.plugin.item", () => ctx.slots.register({
				name: "web-ui.plugin.item",
				id: "community-plugins",
				order: 120,
				locale: "community-plugins",
				inject: () => ({})
			}, CommunityPluginsCard));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map