window.__ModuleLoader__.load({
	id: "@linxin666/dsh-client-ui-git-graph",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/api.ts
		/** Transport failure (fetch threw or the response was not JSON). */
		const TRANSPORT_ERROR = {
			code: "internal",
			message: "git route unavailable"
		};
		/** POST one JSON payload and decode the envelope; never throws. */
		async function post(path, payload) {
			let response;
			try {
				response = await fetch(path, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(payload)
				});
			} catch {
				return {
					ok: false,
					error: TRANSPORT_ERROR
				};
			}
			try {
				const envelope = await response.json();
				if (typeof envelope !== "object" || envelope === null) return {
					ok: false,
					error: TRANSPORT_ERROR
				};
				const record = envelope;
				if (record.ok === true) return {
					ok: true,
					value: record.value
				};
				return {
					ok: false,
					error: record.error ?? TRANSPORT_ERROR
				};
			} catch {
				return {
					ok: false,
					error: TRANSPORT_ERROR
				};
			}
		}
		/** Typed git operations over the wire. */
		var GitApi = class {
			/** The repository snapshot (null: not a git repository / not a workspace). */
			status(path) {
				return post("/git/status", { path });
			}
			/** Local branch list with the current branch marked. */
			branches(path) {
				return post("/git/branches", { path });
			}
			/** Workspace-level `git switch --no-guess <branch>` (host guards first). */
			switchBranch(path, branch) {
				return post("/git/switch", {
					path,
					branch
				});
			}
			/** `git switch --no-guess -c <name>` from the current HEAD. */
			createBranch(path, name) {
				return post("/git/create-branch", {
					path,
					name
				});
			}
			/** Topo-ordered commit graph across branches/tags/remotes. */
			graph(path, limit) {
				return post("/git/graph", limit === void 0 ? { path } : {
					path,
					limit
				});
			}
		};
		/**
		* Subscribe to host-pushed branch-state changes for one workspace path (the
		* host polls the workspace while a subscriber is connected). Reconnects are
		* handled by the EventSource; the caller re-subscribes when the path changes.
		* @param path - workspace root to watch.
		* @param onChange - fired on every pushed change.
		* @returns the disposer closing the stream.
		*/
		function subscribeChanges(path, onChange) {
			const source = new EventSource(`/git/events?path=${encodeURIComponent(path)}`);
			source.addEventListener("change", () => {
				onChange();
			});
			return () => {
				source.close();
			};
		}
		//#endregion
		//#region \0dsh-css:packages/dsh-git-graph/src/client/chips/context.module.css.mjs
		const css = "._7rgC5q_anchor{position:relative}._7rgC5q_chipWrap{display:inline-flex;position:relative}._7rgC5q_anchorDock{--gitgraph-dock-gap-tighten:-8px;padding-left:var(--dsh-composer-side-clearance,16px);margin-bottom:var(--gitgraph-dock-gap-tighten)}._7rgC5q_anchorHero{z-index:10;padding-left:0;position:absolute}._7rgC5q_chip{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-tool-bar-fill);height:24px;color:var(--dsw-alias-label-secondary);cursor:pointer;white-space:nowrap;border-radius:999px;align-items:center;gap:6px;padding:0 10px;font-size:12px;line-height:1;transition:background-color .12s,border-color .12s,color .12s;display:inline-flex}._7rgC5q_chip:hover{background:var(--dsw-alias-interactive-bg-hover)}._7rgC5q_chip:active{background:var(--dsw-alias-interactive-bg-active)}._7rgC5q_chip:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary);outline:none}._7rgC5q_chip:disabled{opacity:.55;cursor:not-allowed}._7rgC5q_chip:disabled:hover{background:var(--dsw-alias-button-tool-bar-fill)}._7rgC5q_chipOpen{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-label-primary)}._7rgC5q_chipLabel{text-overflow:ellipsis;max-width:220px;overflow:hidden}._7rgC5q_chipChevron{color:var(--dsw-alias-label-tertiary)}._7rgC5q_chipHero{max-width:min(100%,240px);height:auto;min-height:28px;color:var(--dsw-alias-label-primary);background:0 0;border:none;border-radius:16px;gap:4px;padding:0 8px;font-size:13px;font-weight:500;line-height:20px;overflow:hidden}._7rgC5q_chipHero:hover,._7rgC5q_chipHero:active,._7rgC5q_chipHero._7rgC5q_chipOpen{background:var(--dsw-alias-interactive-bg-hover)}._7rgC5q_chipHero ._7rgC5q_chipLabel{max-width:180px}._7rgC5q_chipHero ._7rgC5q_chipChevron{color:var(--dsw-alias-label-caption)}._7rgC5q_backdrop{z-index:30;position:fixed;inset:0}._7rgC5q_popover{z-index:40;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);width:280px;max-height:360px;box-shadow:0 8px 24px var(--dsw-alias-bg-mask-2);border-radius:10px;flex-direction:column;display:flex;position:absolute;bottom:calc(100% + 4px);left:0;overflow:hidden}._7rgC5q_popoverHero{top:calc(100% + 4px);bottom:auto}._7rgC5q_searchBox{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:8px;align-items:center;gap:6px;margin:8px;padding:6px 10px;transition:border-color .12s,box-shadow .12s;display:flex}._7rgC5q_searchBox:focus-within{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px var(--dsw-alias-brand-primary)}._7rgC5q_searchInput{min-width:0;color:var(--dsw-alias-label-primary);background:0 0;border:none;outline:none;flex:1;font-size:13px;transition:box-shadow .12s}._7rgC5q_searchInput::placeholder{color:var(--dsw-alias-label-tertiary)}._7rgC5q_list{flex:1;min-height:64px;padding:2px 6px 6px;overflow-y:auto}._7rgC5q_item{cursor:pointer;text-align:left;border:none;border-radius:8px;align-items:center;gap:8px;padding:7px 8px;transition:background-color .12s;display:flex}._7rgC5q_item:hover{background:var(--dsw-alias-interactive-bg-hover)}._7rgC5q_item:active{background:var(--dsw-alias-interactive-bg-active)}._7rgC5q_item:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary);outline:none}._7rgC5q_item:disabled{opacity:.55;cursor:not-allowed}._7rgC5q_item:disabled:hover{background:0 0}._7rgC5q_itemActive{background:var(--dsw-alias-interactive-bg-active)}._7rgC5q_itemText{flex:1;min-width:0}._7rgC5q_itemName{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:13px;overflow:hidden}._7rgC5q_itemPath{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);margin-top:1px;font-size:11px;overflow:hidden}._7rgC5q_check{color:var(--dsw-alias-brand-primary);flex:none}._7rgC5q_empty{text-align:center;color:var(--dsw-alias-label-tertiary);padding:14px 10px;font-size:12px}._7rgC5q_dirty{color:var(--dsw-alias-state-warn-primary);margin:0 10px 4px;font-size:11px}._7rgC5q_notice{background:var(--dsw-alias-state-error-secondary);color:var(--dsw-alias-state-error-primary);border-radius:8px;margin:0 8px 8px;padding:6px 10px;font-size:12px}._7rgC5q_noticeOk{background:var(--dsw-alias-state-success-secondary);color:var(--dsw-alias-state-success-primary)}._7rgC5q_footer{border-top:1px solid var(--dsw-alias-border-l1);flex-direction:column;gap:2px;padding:6px;display:flex}._7rgC5q_footerItem{cursor:pointer;color:var(--dsw-alias-label-primary);text-align:left;background:0 0;border:none;border-radius:8px;align-items:center;gap:8px;padding:7px 10px;font-size:13px;transition:background-color .12s;display:flex}._7rgC5q_footerItem:hover{background:var(--dsw-alias-interactive-bg-hover)}._7rgC5q_footerItem:active{background:var(--dsw-alias-interactive-bg-active)}._7rgC5q_footerItem:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary);outline:none}._7rgC5q_footerItem:disabled{opacity:.55;cursor:not-allowed}._7rgC5q_footerItem:disabled:hover{background:0 0}._7rgC5q_footerItemDisabled{opacity:.55;cursor:not-allowed}._7rgC5q_footerItemDisabled:hover{background:0 0}._7rgC5q_footerHint{color:var(--dsw-alias-label-tertiary);margin-left:auto;font-size:11px}._7rgC5q_dialog{z-index:50;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);width:min(760px,100vw - 48px);max-height:min(76vh,720px);box-shadow:0 12px 32px var(--dsw-alias-bg-mask-2);border-radius:12px;flex-direction:column;padding:16px 16px 12px;display:flex;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%)}._7rgC5q_dialogHeader{justify-content:space-between;align-items:flex-start;gap:12px;padding:0 4px;display:flex}._7rgC5q_dialogHeading{min-width:0}._7rgC5q_dialogClose{width:26px;height:26px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;border-radius:8px;flex:none;justify-content:center;align-items:center;margin:-2px;transition:background-color .12s,color .12s;display:inline-flex}._7rgC5q_dialogClose:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}._7rgC5q_dialogClose:active{background:var(--dsw-alias-interactive-bg-active)}._7rgC5q_dialogClose:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary);outline:none}._7rgC5q_dialogTitle{color:var(--dsw-alias-label-primary);margin:0 0 2px;font-size:15px;font-weight:600}._7rgC5q_dialogDescription{color:var(--dsw-alias-label-secondary);margin:0 0 12px;font-size:12px;line-height:1.5}._7rgC5q_dialogField{flex-direction:column;gap:6px;display:flex}._7rgC5q_dialogLabel{color:var(--dsw-alias-label-secondary);font-size:12px}._7rgC5q_dialogInput{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border-radius:8px;outline:none;padding:8px 10px;font-size:13px;transition:border-color .12s,box-shadow .12s}._7rgC5q_dialogInput:focus{border-color:var(--dsw-alias-brand-primary)}._7rgC5q_dialogInput:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary)}._7rgC5q_dialogError{color:var(--dsw-alias-state-error-primary);margin-top:8px;font-size:12px}._7rgC5q_dialogActions{justify-content:flex-end;gap:8px;margin-top:14px;display:flex}._7rgC5q_dialogButton{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-tool-bar-fill);color:var(--dsw-alias-label-primary);cursor:pointer;border-radius:8px;padding:6px 14px;font-size:13px;transition:background-color .12s,border-color .12s,color .12s}._7rgC5q_dialogButton:hover{background:var(--dsw-alias-interactive-bg-hover)}._7rgC5q_dialogButton:active{background:var(--dsw-alias-interactive-bg-active)}._7rgC5q_dialogButton:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary);outline:none}._7rgC5q_dialogButton:disabled{opacity:.55;cursor:not-allowed}._7rgC5q_dialogButton:disabled:hover{background:var(--dsw-alias-button-tool-bar-fill)}._7rgC5q_dialogButtonPrimary{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-button-contrast-fill);transition:background-color .12s,border-color .12s,filter .12s}._7rgC5q_dialogButtonPrimary:hover{background:var(--dsw-alias-button-primary-hover)}._7rgC5q_dialogButtonPrimary:active{filter:brightness(.92)}._7rgC5q_dialogButtonPrimary:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-button-contrast-fill), 0 0 0 4px var(--dsw-alias-brand-primary);outline:none}._7rgC5q_dialogButtonPrimary:disabled{opacity:.6;cursor:not-allowed}._7rgC5q_dialogButtonPrimary:disabled:hover{background:var(--dsw-alias-brand-primary)}._7rgC5q_graphBody{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;flex:1;min-height:240px;margin-top:10px;padding:4px;overflow-y:auto}._7rgC5q_graphSubtitle{color:var(--dsw-alias-label-tertiary);margin-top:2px;font-size:11px}._7rgC5q_graphRow{border-radius:8px;align-items:center;gap:10px;padding:7px 8px;font-size:12px;display:flex}._7rgC5q_graphRow:hover{background:var(--dsw-alias-interactive-bg-hover)}._7rgC5q_graphLanes{color:var(--dsw-alias-label-tertiary);flex:none;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;line-height:1.4;display:flex}._7rgC5q_graphLaneCell{text-align:center;flex:none;width:15px;display:inline-block}._7rgC5q_graphLaneNode,._7rgC5q_graphLaneMerge{color:var(--dsw-alias-brand-primary);font-weight:700}._7rgC5q_graphLanePass{color:var(--dsw-alias-label-tertiary)}._7rgC5q_graphOid{min-width:58px;color:var(--dsw-alias-label-tertiary);flex:none;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px}._7rgC5q_graphMain{flex-direction:column;flex:1;gap:3px;min-width:0;display:flex}._7rgC5q_graphSubject{text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;overflow:hidden}._7rgC5q_graphMeta{color:var(--dsw-alias-label-tertiary);flex-wrap:wrap;align-items:center;gap:4px 6px;font-size:11px;display:flex}._7rgC5q_graphMetaSep{color:var(--dsw-alias-label-tertiary);flex:none}._7rgC5q_graphRef{text-overflow:ellipsis;background:var(--dsw-alias-bg-layer-2);max-width:120px;color:var(--dsw-alias-label-secondary);border-radius:999px;flex:none;padding:1px 6px;font-size:10px;overflow:hidden}._7rgC5q_graphRefCurrent{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-button-contrast-fill)}[data-gitgraph-chip-anchor][data-gitgraph-stock-light]{--gitgraph-stock-ink-rgb:15, 17, 21;--gitgraph-stock-ink:#0f1115;--gitgraph-stock-on-success:#fff;--gitgraph-stock-success-fill:#137333;--gitgraph-stock-success-border:#0f5f2b;--dsw-alias-button-tool-bar-fill:rgba(var(--gitgraph-stock-ink-rgb), .04);--dsw-alias-button-tool-bar-hover:rgba(var(--gitgraph-stock-ink-rgb), .08);--dsw-alias-border-l2:rgba(var(--gitgraph-stock-ink-rgb), .16);--dsw-alias-interactive-bg-hover:rgba(var(--gitgraph-stock-ink-rgb), .06);--dsw-alias-interactive-bg-active:rgba(var(--gitgraph-stock-ink-rgb), .1);--dsw-alias-label-primary:var(--gitgraph-stock-ink);--dsw-alias-label-secondary:var(--gitgraph-stock-ink);--dsw-alias-label-tertiary:rgba(var(--gitgraph-stock-ink-rgb), .56);--dsw-alias-button-contrast-fill:var(--gitgraph-stock-on-success)}[data-gitgraph-chip-anchor][data-gitgraph-stock-light] ._7rgC5q_noticeOk{background:var(--gitgraph-stock-success-fill);color:var(--gitgraph-stock-on-success);box-shadow:inset 0 0 0 1px var(--gitgraph-stock-success-border)}._7rgC5q_graphEmpty{text-align:center;color:var(--dsw-alias-label-tertiary);padding:24px 10px;font-size:12px}._7rgC5q_graphMore{border:1px solid var(--dsw-alias-border-l1);width:100%;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border-radius:8px;margin-top:8px;padding:6px;font-size:12px;transition:background-color .12s;display:block}._7rgC5q_graphMore:hover{background:var(--dsw-alias-interactive-bg-hover)}._7rgC5q_graphMore:active{background:var(--dsw-alias-interactive-bg-active)}._7rgC5q_graphMore:focus-visible{box-shadow:0 0 0 2px var(--dsw-alias-brand-primary);outline:none}@media (prefers-reduced-motion:reduce){._7rgC5q_chip,._7rgC5q_searchBox,._7rgC5q_searchInput,._7rgC5q_item,._7rgC5q_footerItem,._7rgC5q_dialogClose,._7rgC5q_dialogInput,._7rgC5q_dialogButton,._7rgC5q_dialogButtonPrimary,._7rgC5q_graphMore{transition:none}}";
		const tagId = "@linxin666/dsh-client-ui-git-graph/context.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@linxin666/dsh-client-ui-git-graph";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var context_module_css_default = {
			"anchor": "_7rgC5q_anchor",
			"anchorDock": "_7rgC5q_anchorDock",
			"anchorHero": "_7rgC5q_anchorHero",
			"backdrop": "_7rgC5q_backdrop",
			"check": "_7rgC5q_check",
			"chip": "_7rgC5q_chip",
			"chipChevron": "_7rgC5q_chipChevron",
			"chipHero": "_7rgC5q_chipHero",
			"chipLabel": "_7rgC5q_chipLabel",
			"chipOpen": "_7rgC5q_chipOpen",
			"chipWrap": "_7rgC5q_chipWrap",
			"dialog": "_7rgC5q_dialog",
			"dialogActions": "_7rgC5q_dialogActions",
			"dialogButton": "_7rgC5q_dialogButton",
			"dialogButtonPrimary": "_7rgC5q_dialogButtonPrimary",
			"dialogClose": "_7rgC5q_dialogClose",
			"dialogDescription": "_7rgC5q_dialogDescription",
			"dialogError": "_7rgC5q_dialogError",
			"dialogField": "_7rgC5q_dialogField",
			"dialogHeader": "_7rgC5q_dialogHeader",
			"dialogHeading": "_7rgC5q_dialogHeading",
			"dialogInput": "_7rgC5q_dialogInput",
			"dialogLabel": "_7rgC5q_dialogLabel",
			"dialogTitle": "_7rgC5q_dialogTitle",
			"dirty": "_7rgC5q_dirty",
			"empty": "_7rgC5q_empty",
			"footer": "_7rgC5q_footer",
			"footerHint": "_7rgC5q_footerHint",
			"footerItem": "_7rgC5q_footerItem",
			"footerItemDisabled": "_7rgC5q_footerItemDisabled",
			"graphBody": "_7rgC5q_graphBody",
			"graphEmpty": "_7rgC5q_graphEmpty",
			"graphLaneCell": "_7rgC5q_graphLaneCell",
			"graphLaneMerge": "_7rgC5q_graphLaneMerge",
			"graphLaneNode": "_7rgC5q_graphLaneNode",
			"graphLanePass": "_7rgC5q_graphLanePass",
			"graphLanes": "_7rgC5q_graphLanes",
			"graphMain": "_7rgC5q_graphMain",
			"graphMeta": "_7rgC5q_graphMeta",
			"graphMetaSep": "_7rgC5q_graphMetaSep",
			"graphMore": "_7rgC5q_graphMore",
			"graphOid": "_7rgC5q_graphOid",
			"graphRef": "_7rgC5q_graphRef",
			"graphRefCurrent": "_7rgC5q_graphRefCurrent",
			"graphRow": "_7rgC5q_graphRow",
			"graphSubject": "_7rgC5q_graphSubject",
			"graphSubtitle": "_7rgC5q_graphSubtitle",
			"item": "_7rgC5q_item",
			"itemActive": "_7rgC5q_itemActive",
			"itemName": "_7rgC5q_itemName",
			"itemPath": "_7rgC5q_itemPath",
			"itemText": "_7rgC5q_itemText",
			"list": "_7rgC5q_list",
			"notice": "_7rgC5q_notice",
			"noticeOk": "_7rgC5q_noticeOk",
			"popover": "_7rgC5q_popover",
			"popoverHero": "_7rgC5q_popoverHero",
			"searchBox": "_7rgC5q_searchBox",
			"searchInput": "_7rgC5q_searchInput"
		};
		//#endregion
		//#region src/client/chips/Chip.tsx
		/** Join conditional class names (the dependency-free clsx stand-in). */
		function cx(...parts) {
			return parts.filter((part) => typeof part === "string" && part !== "").join(" ");
		}
		/** The pill button shared by the project and branch chips. */
		function Chip({ icon, label, ariaLabel, open, onClick, hero = false }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				"data-gitgraph-chip": true,
				className: cx(context_module_css_default.chip, open && context_module_css_default.chipOpen, hero && context_module_css_default.chipHero),
				onClick,
				"aria-label": ariaLabel,
				"aria-expanded": open,
				children: [
					icon,
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: context_module_css_default.chipLabel,
						title: label,
						children: label
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, {
						className: context_module_css_default.chipChevron,
						size: 12
					})
				]
			});
		}
		/** Full-screen transparent backdrop closing the open popover/dialog on click. */
		function Backdrop({ onClose }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: context_module_css_default.backdrop,
				onClick: onClose
			});
		}
		//#endregion
		//#region src/client/chips/error-copy.ts
		/** The blocked-file sentence tail: quoted paths plus the overflow count. */
		function pathsText(error, t) {
			return `${(error.paths ?? []).map((path) => `"${path}"`).join("、")}${error.moreFiles !== void 0 && error.moreFiles > 0 ? ` ${t("error.moreFiles", { count: error.moreFiles })}` : ""}`;
		}
		/**
		* One readable message for a git operation rejection.
		* @param error - the classified git error.
		* @param t - the git-graph namespace translate seat.
		* @returns the sentence for the error's code.
		*/
		function errorMessage(error, t) {
			switch (error.code) {
				case "conflicts-present": return t("error.conflictsPresent");
				case "operation-in-progress": return t("error.operationInProgress");
				case "branch-in-other-worktree": return t("error.branchInOtherWorktree");
				case "tracked-changes-would-be-overwritten": return t("error.trackedOverwrite", { paths: pathsText(error, t) });
				case "untracked-changes-would-be-overwritten": return t("error.untrackedOverwrite", { paths: pathsText(error, t) });
				case "target-branch-not-found": return t("error.targetBranchNotFound");
				case "invalid-branch-name": return t("error.invalidBranchName");
				case "branch-already-exists": return t("error.branchAlreadyExists");
				case "workspace-unknown": return t("error.workspaceUnknown");
				case "internal": return t("error.requestFailed", { error: error.message });
			}
		}
		//#endregion
		//#region src/client/chips/BranchPopover.tsx
		/**
		* The branch picker popover: searchable local branch list with the current
		* branch checked, the dirtiness line, switch feedback (success/error), and
		* the footer flows (create branch / Git graph).
		* @module dsh-git-graph/client/chips/BranchPopover
		*/
		/** How long the success notice stays before the popover closes itself. */
		const SUCCESS_DISMISS_MS = 900;
		/**
		* The branch picker popover.
		* @param props - see {@link BranchPopoverProps}.
		*/
		function BranchPopover({ view, onSwitch, onSwitched, onCreate, onGraph, onClose, t, hero = false }) {
			const [query, setQuery] = (0, react.useState)("");
			const [pending, setPending] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [success, setSuccess] = (0, react.useState)(null);
			const dismissTimer = (0, react.useRef)(void 0);
			(0, react.useEffect)(() => () => {
				if (dismissTimer.current !== void 0) clearTimeout(dismissTimer.current);
			}, []);
			const filtered = (0, react.useMemo)(() => {
				const needle = query.trim().toLowerCase();
				if (needle === "") return view.branches;
				return view.branches.filter((branch) => branch.name.toLowerCase().includes(needle));
			}, [view.branches, query]);
			const switchTo = (branch) => {
				if (pending !== null) return;
				setPending(branch);
				setError(null);
				setSuccess(null);
				onSwitch(branch).then((result) => {
					if (result.ok) {
						onSwitched();
						setSuccess(t("toast.switchSuccess", { branchName: result.branch }));
						dismissTimer.current = setTimeout(onClose, SUCCESS_DISMISS_MS);
						return;
					}
					setError(errorMessage(result.error, t));
				}).finally(() => {
					setPending(null);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Backdrop, { onClose }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: cx(context_module_css_default.popover, hero && context_module_css_default.popoverHero),
				role: "listbox",
				"aria-label": t("branch.search"),
				"data-gitgraph-popover": true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: context_module_css_default.searchBox,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutline16, { size: 14 }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							className: context_module_css_default.searchInput,
							value: query,
							onChange: (event) => {
								setQuery(event.target.value);
							},
							placeholder: t("branch.search"),
							autoFocus: true
						})]
					}),
					view.dirtyFiles > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: context_module_css_default.dirty,
						children: t("branch.dirty", { count: view.dirtyFiles })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: context_module_css_default.list,
						children: filtered.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: context_module_css_default.empty,
							children: t("branch.empty")
						}) : filtered.map((branch) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: cx(context_module_css_default.item, branch.current && context_module_css_default.itemActive),
							onClick: () => {
								switchTo(branch.name);
							},
							role: "option",
							"aria-selected": branch.current,
							disabled: pending !== null,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, { size: 14 }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: context_module_css_default.itemText,
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: context_module_css_default.itemName,
										title: branch.name,
										children: branch.name
									})
								}),
								branch.current && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCheckOutline14, {
									className: context_module_css_default.check,
									size: 14
								})
							]
						}, branch.name))
					}),
					success !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: cx(context_module_css_default.notice, context_module_css_default.noticeOk),
						children: success
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: context_module_css_default.notice,
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: context_module_css_default.footer,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: context_module_css_default.footerItem,
							onClick: onCreate,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, { size: 14 }), t("branch.create")]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
							type: "button",
							className: context_module_css_default.footerItem,
							onClick: onGraph,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, { size: 14 }), t("branch.graph")]
						})]
					})
				]
			})] });
		}
		//#endregion
		//#region src/core/git-command.ts
		/**
		* Pure mirror of `git check-ref-format --branch` short-name rules, for
		* instant client-side feedback; the host's check-ref-format call stays the
		* authoritative gate. Returns the reason when the name is invalid.
		* @param name - proposed branch name (short form, no refs/ prefix).
		* @returns null when valid, else a short reason.
		*/
		function validateBranchName(name) {
			if (name === "") return "empty";
			if (name === "@") return "at-sign";
			if (name.startsWith("-")) return "leading-dash";
			if (name.endsWith(".")) return "trailing-dot";
			if (name.endsWith(".lock")) return "lock-suffix";
			if (name.includes("..")) return "double-dot";
			if (name.includes("@{")) return "at-brace";
			if (name.includes("//")) return "double-slash";
			if (name.includes(" ")) return "space";
			if (name.includes("~") || name.includes("^") || name.includes(":")) return "forbidden-char";
			if (name.includes("?") || name.includes("*") || name.includes("[") || name.includes("\\")) return "forbidden-char";
			for (const ch of name) {
				const code = ch.codePointAt(0);
				if (code !== void 0 && (code < 32 || code === 127)) return "control-char";
			}
			for (const component of name.split("/")) {
				if (component === "") return "empty-component";
				if (component.startsWith(".")) return "dot-component";
				if (component.endsWith(".lock")) return "lock-suffix";
			}
			if (name.length > 1e3) return "too-long";
			return null;
		}
		//#endregion
		//#region src/client/chips/CreateBranchDialog.tsx
		/**
		* The create-branch dialog: name input with the pure validation mirror for
		* instant feedback, the host `check-ref-format` gate as the authority, and
		* readable rejection copy.
		* @module dsh-git-graph/client/chips/CreateBranchDialog
		*/
		/**
		* The create-and-switch dialog.
		* @param props - see {@link CreateBranchDialogProps}.
		*/
		function CreateBranchDialog({ onCreate, onClose, t }) {
			const [name, setName] = (0, react.useState)("");
			const [pending, setPending] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const submit = () => {
				if (pending) return;
				const trimmed = name.trim();
				if (validateBranchName(trimmed) !== null) {
					setError(t("error.invalidBranchName"));
					return;
				}
				setPending(true);
				setError(null);
				onCreate(trimmed).then((result) => {
					if (result.ok) {
						onClose();
						return;
					}
					setError(errorMessage(result.error, t));
				}).finally(() => {
					setPending(false);
				});
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Backdrop, { onClose }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: context_module_css_default.dialog,
				role: "dialog",
				"aria-label": t("branch.createDialog.title"),
				"data-gitgraph-dialog": true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: context_module_css_default.dialogTitle,
						children: t("branch.createDialog.title")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: context_module_css_default.dialogDescription,
						children: t("branch.createDialog.description")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: context_module_css_default.dialogField,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
							className: context_module_css_default.dialogLabel,
							htmlFor: "git-graph-branch-name",
							children: t("branch.createDialog.nameLabel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
							id: "git-graph-branch-name",
							className: context_module_css_default.dialogInput,
							value: name,
							onChange: (event) => {
								setName(event.target.value);
							},
							placeholder: t("branch.createDialog.placeholder"),
							onKeyDown: (event) => {
								if (event.key === "Enter") submit();
							},
							autoFocus: true
						})]
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: context_module_css_default.dialogError,
						children: error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: context_module_css_default.dialogActions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: context_module_css_default.dialogButton,
							onClick: onClose,
							children: t("branch.createDialog.cancel")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: context_module_css_default.dialogButtonPrimary,
							onClick: submit,
							disabled: pending || name.trim() === "",
							children: t("branch.createDialog.confirm")
						})]
					})
				]
			})] });
		}
		//#endregion
		//#region src/core/types.ts
		/**
		* Minimal lane assignment over topo-ordered rows: each lane waits for one
		* commit; the first parent continues the node's lane, further parents start
		* (or join) lanes to the right. Correct for linear, branched, and merged
		* histories; the columns alone carry the topology (the renderer draws them
		* as monospace lane text).
		* @param rows - topo-ordered rows with parents (later rows = ancestors).
		* @returns per-row lane maps.
		*/
		function computeLanes(rows) {
			const later = /* @__PURE__ */ new Set();
			for (const row of rows) for (const parent of row.parents) later.add(parent);
			const lanes = [];
			const result = [];
			for (const row of rows) {
				let nodeColumn = lanes.findIndex((pending) => pending === row.oid);
				if (nodeColumn === -1) {
					lanes.push(row.oid);
					nodeColumn = lanes.length - 1;
				}
				const columns = [];
				for (let i = 0; i < lanes.length; i += 1) {
					const pending = lanes[i];
					if (pending === null) columns.push("gap");
					else if (i === nodeColumn) columns.push(row.parents.length > 1 ? "merge" : "node");
					else if (pending === row.oid) columns.push("gap");
					else if (typeof pending === "string" && later.has(pending)) columns.push("pass");
					else columns.push("gap");
				}
				const [first, ...rest] = row.parents.filter((parent) => later.has(parent));
				for (let i = 0; i < lanes.length; i += 1) if (lanes[i] === row.oid && i !== nodeColumn) lanes[i] = null;
				lanes[nodeColumn] = first ?? null;
				for (const parent of rest) if (!lanes.includes(parent)) lanes.push(parent);
				while (lanes.length > 0 && lanes[lanes.length - 1] === null) lanes.pop();
				result.push({
					columns,
					nodeColumn,
					merge: row.parents.length > 1
				});
			}
			return result;
		}
		//#endregion
		//#region src/client/graph/GraphDialog.tsx
		/**
		* The Git graph panel: a read-only commit list with lane topology, ref
		* labels, and paging (git log --branches --tags --remotes --topo-order).
		* @module dsh-git-graph/client/graph/GraphDialog
		*/
		/** Initial page size of the graph fetch. */
		const INITIAL_LIMIT = 200;
		/** Page size of one "load more" step. */
		const PAGE_STEP = 100;
		/** Lane glyph → the rendered monospace character. */
		function glyphChar(glyph) {
			switch (glyph) {
				case "node": return "●";
				case "merge": return "◆";
				case "pass": return "│";
				case "gap": return " ";
			}
		}
		/** Seconds per time bucket (relative timestamps). */
		const MINUTE = 60;
		const HOUR = 60 * MINUTE;
		const DAY = 24 * HOUR;
		/**
		* A compact relative timestamp (GitHub-style): "just now", "5 分钟前",
		* falling back to a plain date past 30 days.
		* @param epochSeconds - commit author time in seconds.
		* @param t - the dictionary.
		* @returns the display string.
		*/
		function formatTime(epochSeconds, t) {
			const elapsed = Math.max(0, Math.floor(Date.now() / 1e3) - epochSeconds);
			if (elapsed < MINUTE) return t("graph.time.justNow");
			if (elapsed < HOUR) return t("graph.time.minutesAgo", { count: Math.floor(elapsed / MINUTE) });
			if (elapsed < DAY) return t("graph.time.hoursAgo", { count: Math.floor(elapsed / HOUR) });
			if (elapsed < 30 * DAY) return t("graph.time.daysAgo", { count: Math.floor(elapsed / DAY) });
			const date = /* @__PURE__ */ new Date(epochSeconds * 1e3);
			const pad = (n) => String(n).padStart(2, "0");
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
		}
		/**
		* The Git graph panel.
		* @param props - see {@link GraphDialogProps}.
		*/
		function GraphDialog({ graph, onClose, t }) {
			const [view, setView] = (0, react.useState)(null);
			const [error, setError] = (0, react.useState)(null);
			const [loading, setLoading] = (0, react.useState)(true);
			const load = (0, react.useCallback)((limit) => {
				setLoading(true);
				graph(limit).then((next) => {
					setView(next);
					setError(next === null ? t("error.internal") : null);
				}).catch(() => {
					setError(t("error.internal"));
				}).finally(() => {
					setLoading(false);
				});
			}, [graph, t]);
			(0, react.useEffect)(() => {
				load(INITIAL_LIMIT);
			}, [load]);
			const lanes = (0, react.useMemo)(() => {
				if (view === null) return [];
				return computeLanes(view.commits);
			}, [view]);
			const laneCount = (0, react.useMemo)(() => {
				let count = 0;
				for (const row of lanes) count = Math.max(count, row.columns.length);
				return count;
			}, [lanes]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Backdrop, { onClose }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: context_module_css_default.dialog,
				role: "dialog",
				"aria-label": t("graph.title"),
				"data-gitgraph-dialog": true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: context_module_css_default.dialogHeader,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: context_module_css_default.dialogHeading,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
								className: context_module_css_default.dialogTitle,
								children: t("graph.title")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: context_module_css_default.graphSubtitle,
								children: t("graph.subtitle", {
									count: view === null ? 0 : view.commits.length,
									lanes: laneCount
								})
							})]
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: context_module_css_default.dialogClose,
							onClick: onClose,
							"aria-label": t("graph.close"),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutline16, { size: 16 })
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: context_module_css_default.graphBody,
						children: loading && view === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: context_module_css_default.graphEmpty,
							children: t("graph.loading")
						}) : error !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: context_module_css_default.graphEmpty,
							children: error
						}) : view === null || view.commits.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: context_module_css_default.graphEmpty,
							children: t("graph.empty")
						}) : view.commits.map((commit, index) => {
							const row = lanes[index];
							if (row === void 0) return null;
							return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: context_module_css_default.graphRow,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: context_module_css_default.graphLanes,
										"aria-hidden": "true",
										"data-gitgraph-lanes": true,
										children: row.columns.map((glyph, column) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											"data-gitgraph-glyph": glyph,
											className: cx(context_module_css_default.graphLaneCell, glyph === "node" && context_module_css_default.graphLaneNode, glyph === "merge" && context_module_css_default.graphLaneMerge, glyph === "pass" && context_module_css_default.graphLanePass),
											children: glyphChar(glyph)
										}, column))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: context_module_css_default.graphOid,
										title: commit.oid,
										children: commit.oid.slice(0, 7)
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: context_module_css_default.graphMain,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: context_module_css_default.graphSubject,
											title: commit.subject,
											children: commit.subject
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											className: context_module_css_default.graphMeta,
											children: [
												commit.refs.map((ref) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													title: ref,
													"data-gitgraph-ref": true,
													"data-gitgraph-ref-current": ref === view.branch || void 0,
													className: cx(context_module_css_default.graphRef, ref === view.branch && context_module_css_default.graphRefCurrent),
													children: ref
												}, ref)),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: commit.author }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													className: context_module_css_default.graphMetaSep,
													children: "·"
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: formatTime(commit.authorTime, t) })
											]
										})]
									})
								]
							}, commit.oid);
						})
					}),
					view !== null && view.hasMore && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: context_module_css_default.graphMore,
						onClick: () => {
							load(view.commits.length + PAGE_STEP);
						},
						children: t("graph.loadMore")
					})
				]
			})] });
		}
		//#endregion
		//#region src/client/chips/BranchChip.tsx
		/**
		* The git branch selector chip, mounted above the input card. Preferred
		* seat is the selector row's context hole
		* (`conversation.input.selector.context`, session-maybe) right beside the
		* official workspace selector; on shells that dropped the hole (rc.6 and the
		* current shipped shell) the chip falls back to `conversation.input.dock`
		* (session-scoped). On the dock's hero phase the chip joins the official
		* hero row after the agent-preset seat (right of the workspace and preset
		* chips), styled from the official `dsh-client-ui-theme` tokens; on the
		* active phase it measures the input card's left edge and aligns itself
		* flush with it. The chip hides itself only when its data source is absent
		* (no session cwd, or not a git repository).
		* @module dsh-git-graph/client/chips/BranchChip
		*/
		/** Horizontal gap between the official hero-row chips (WorkspaceChip / AgentPresetSeat). */
		const HERO_CHIP_GAP = 2;
		const SKIN_CENTER_BODY_ATTR = "data-dsh-skin-center";
		const DARK_THEME_BODY_ATTR = "data-ds-dark-theme";
		const DSH_BODY_ATTR_PREFIX = "data-dsh-";
		/** Whether a body attribute belongs to an applied skin rather than the skin center shell. */
		function hasAppliedSkinBodyAttr(name) {
			return name.startsWith(DSH_BODY_ATTR_PREFIX) && name !== SKIN_CENTER_BODY_ATTR;
		}
		/** Whether the page is using the unskinned stock light theme. */
		function readStockLightTheme() {
			if (typeof document === "undefined") return false;
			const body = document.body;
			if (!body.hasAttribute(SKIN_CENTER_BODY_ATTR) || body.hasAttribute(DARK_THEME_BODY_ATTR)) return false;
			return !body.getAttributeNames().some(hasAppliedSkinBodyAttr);
		}
		/** Track stock-light theme changes from body attributes. */
		function useStockLightTheme() {
			const [stockLightTheme, setStockLightTheme] = (0, react.useState)(readStockLightTheme);
			(0, react.useEffect)(() => {
				const update = () => {
					setStockLightTheme(readStockLightTheme());
				};
				update();
				if (typeof document === "undefined" || typeof MutationObserver !== "function") return void 0;
				const observer = new MutationObserver(update);
				observer.observe(document.body, { attributes: true });
				return () => {
					observer.disconnect();
				};
			}, []);
			return stockLightTheme;
		}
		/**
		* The right edge of the rightmost painted descendant of `root`, excluding
		* `root` itself. The hero row's direct children can be display:contents
		* slot outlets, so the visible chip boundary must be found by walking.
		*/
		function paintedRight(root) {
			let right = null;
			const visit = (node) => {
				if (node !== root) {
					const rect = node.getBoundingClientRect();
					if (rect.width > 0 && rect.height > 0) right = right === null ? rect.right : Math.max(right, rect.right);
				}
				for (const child of Array.from(node.children)) visit(child);
			};
			visit(root);
			return right;
		}
		/**
		* Coalesce repeated placement updates into one animation-frame callback so
		* observer bursts in the same frame measure only once. When the environment
		* provides no requestAnimationFrame, updates run synchronously instead.
		*/
		function frameScheduler(update) {
			let pending = false;
			let frame = null;
			const flush = () => {
				pending = false;
				frame = null;
				update();
			};
			return {
				schedule: () => {
					if (pending) return;
					pending = true;
					if (typeof requestAnimationFrame === "function") frame = requestAnimationFrame(flush);
					else flush();
				},
				cancel: () => {
					pending = false;
					if (frame !== null) cancelAnimationFrame(frame);
					frame = null;
				}
			};
		}
		/**
		* The git branch selector chip.
		* @param props - the composed entry props of whichever seat it mounted in.
		*/
		function BranchChip(props) {
			const sessionId = props.sessionId;
			const blankSession = props.useSessions((state) => {
				if (sessionId === void 0) return false;
				return state.byId?.[sessionId]?.blank === true;
			});
			const dockSeat = "session" in props && "input" in props;
			const sessionSnapshot = dockSeat ? props.session : void 0;
			const heroSeat = sessionSnapshot?.composerPhase === "blank" && (sessionSnapshot.openState === "open" || blankSession === true);
			const stockLightTheme = useStockLightTheme();
			/** Repository state: undefined = loading, null = not a repository, else the snapshot. */
			const [repo, setRepo] = (0, react.useState)(void 0);
			/** Fresh branch list, fetched when the branch popover opens. */
			const [branchesView, setBranchesView] = (0, react.useState)(null);
			const [branchOpen, setBranchOpen] = (0, react.useState)(false);
			const [createOpen, setCreateOpen] = (0, react.useState)(false);
			const [graphOpen, setGraphOpen] = (0, react.useState)(false);
			/** Measured left offset between the dock row and the input card; null until measured. */
			const [dockInset, setDockInset] = (0, react.useState)(null);
			/** Measured hero-row placement (relative to the composer stack); null until measured. */
			const [heroPlacement, setHeroPlacement] = (0, react.useState)(null);
			const anchorRef = (0, react.useRef)(null);
			/** Latest `[data-composer-card]` query result for the dock measure pass. */
			const cardRef = (0, react.useRef)(null);
			(0, react.useLayoutEffect)(() => {
				if (!dockSeat || heroSeat) return;
				const anchor = anchorRef.current;
				if (anchor === null) return;
				const measure = () => {
					const card = document.querySelector("[data-composer-card]");
					cardRef.current = card;
					if (card === null) return;
					observer?.observe(card);
					const inset = Math.max(0, card.getBoundingClientRect().left - anchor.getBoundingClientRect().left);
					setDockInset((previous) => previous === inset ? previous : inset);
				};
				const scheduler = frameScheduler(measure);
				const observer = typeof ResizeObserver === "undefined" ? void 0 : new ResizeObserver(scheduler.schedule);
				observer?.observe(anchor);
				scheduler.schedule();
				const card = cardRef.current;
				if (card !== null) observer?.observe(card);
				window.addEventListener("resize", scheduler.schedule);
				return () => {
					scheduler.cancel();
					observer?.disconnect();
					window.removeEventListener("resize", scheduler.schedule);
				};
			}, [
				dockSeat,
				heroSeat,
				repo !== void 0 && repo !== null
			]);
			(0, react.useLayoutEffect)(() => {
				if (!heroSeat) return;
				const anchor = anchorRef.current;
				const outlet = anchor?.parentElement ?? null;
				const stack = outlet?.parentElement ?? null;
				const heroRow = outlet?.previousElementSibling ?? null;
				if (anchor === null || outlet === null || stack === null || heroRow === null) return;
				const measure = () => {
					const stackRect = stack.getBoundingClientRect();
					const rowRect = heroRow.getBoundingClientRect();
					const anchorRect = anchor.getBoundingClientRect();
					if (stackRect.width <= 0 || rowRect.width <= 0 || anchorRect.width <= 0) return;
					const right = paintedRight(heroRow);
					if (right === null) return;
					const left = Math.max(0, right - stackRect.left + HERO_CHIP_GAP);
					const top = Math.max(0, rowRect.top - stackRect.top + (rowRect.height - anchorRect.height) / 2);
					setHeroPlacement((previous) => {
						if (previous !== null && Math.abs(previous.left - left) < .5 && Math.abs(previous.top - top) < .5) return previous;
						return {
							left,
							top
						};
					});
				};
				const scheduler = frameScheduler(measure);
				scheduler.schedule();
				const observer = typeof ResizeObserver === "undefined" ? void 0 : new ResizeObserver(scheduler.schedule);
				for (const target of [
					anchor,
					outlet,
					stack,
					heroRow
				]) observer?.observe(target);
				window.addEventListener("resize", scheduler.schedule);
				return () => {
					scheduler.cancel();
					observer?.disconnect();
					window.removeEventListener("resize", scheduler.schedule);
				};
			}, [heroSeat, repo !== void 0 && repo !== null]);
			const refetch = (0, react.useCallback)(() => {
				let live = true;
				props.repoStatus(sessionId).then((status) => {
					if (live) setRepo(status);
				}).catch(() => {
					if (live) setRepo(null);
				});
				return () => {
					live = false;
				};
			}, [props.repoStatus, sessionId]);
			const lastFocusRefetch = (0, react.useRef)(0);
			(0, react.useEffect)(() => refetch(), [refetch]);
			(0, react.useEffect)(() => {
				const unsubscribe = props.subscribeChanges(sessionId, () => {
					refetch();
				});
				const onFocus = () => {
					const now = Date.now();
					if (now - lastFocusRefetch.current < 5e3) return;
					lastFocusRefetch.current = now;
					refetch();
				};
				window.addEventListener("focus", onFocus);
				return () => {
					unsubscribe();
					window.removeEventListener("focus", onFocus);
				};
			}, [
				props.subscribeChanges,
				sessionId,
				refetch
			]);
			const closeCreate = () => {
				setCreateOpen(false);
				refetch();
			};
			(0, react.useEffect)(() => {
				if (!branchOpen) return;
				let live = true;
				setBranchesView(null);
				props.branches(sessionId).then((view) => {
					if (live) setBranchesView(view);
				});
				return () => {
					live = false;
				};
			}, [
				branchOpen,
				props.branches,
				sessionId
			]);
			if (repo === void 0 || repo === null) return null;
			const openBranchPopover = () => {
				setBranchOpen((open) => !open);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: anchorRef,
				"data-gitgraph-chip-anchor": true,
				"data-gitgraph-stock-light": stockLightTheme || void 0,
				className: cx(context_module_css_default.anchor, dockSeat && context_module_css_default.anchorDock, heroSeat && context_module_css_default.anchorHero),
				style: heroSeat && heroPlacement !== null ? {
					left: `${heroPlacement.left}px`,
					top: `${heroPlacement.top}px`,
					paddingLeft: 0
				} : dockSeat && dockInset !== null ? { paddingLeft: `${dockInset}px` } : void 0,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: context_module_css_default.chipWrap,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Chip, {
							hero: heroSeat,
							icon: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBranchOutline16, { size: 14 }),
							label: repo.branch === "" ? props.t("branch.detached") : repo.branch,
							ariaLabel: props.t("chip.aria.branch"),
							open: branchOpen,
							onClick: openBranchPopover
						}), branchOpen && branchesView !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BranchPopover, {
							hero: heroSeat,
							view: branchesView,
							onSwitch: (branch) => props.switchBranch(sessionId, branch),
							onSwitched: refetch,
							onCreate: () => {
								setBranchOpen(false);
								setCreateOpen(true);
							},
							onGraph: () => {
								setBranchOpen(false);
								setGraphOpen(true);
							},
							onClose: () => {
								setBranchOpen(false);
							},
							t: props.t
						})]
					}),
					createOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CreateBranchDialog, {
						onCreate: (name) => props.createBranch(sessionId, name),
						onClose: closeCreate,
						t: props.t
					}),
					graphOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GraphDialog, {
						graph: (limit) => props.graph(sessionId, limit),
						onClose: () => {
							setGraphOpen(false);
						},
						t: props.t
					})
				]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** `git-graph` namespace dictionaries (branch selector + Git graph copy). */
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"branch.search": "搜索分支",
			"branch.empty": "未找到匹配分支",
			"branch.detached": "分离 HEAD",
			"branch.dirty": "未提交的更改：{count} 个文件",
			"branch.create": "创建并检出新分支…",
			"branch.graph": "Git 图谱",
			"branch.createDialog.title": "创建并检出新分支",
			"branch.createDialog.description": "基于当前 HEAD 创建一个新的本地分支，并在创建成功后立即切换过去。",
			"branch.createDialog.nameLabel": "分支名",
			"branch.createDialog.placeholder": "例如 feature/git-branch-switcher",
			"branch.createDialog.confirm": "创建并切换",
			"branch.createDialog.cancel": "取消",
			"graph.title": "Git 图谱",
			"graph.subtitle": "{count} 个提交，{lanes} 条泳道",
			"graph.loading": "加载中…",
			"graph.loadMore": "加载更多",
			"graph.close": "关闭",
			"graph.empty": "没有提交记录",
			"graph.time.justNow": "刚刚",
			"graph.time.minutesAgo": "{count} 分钟前",
			"graph.time.hoursAgo": "{count} 小时前",
			"graph.time.daysAgo": "{count} 天前",
			"error.conflictsPresent": "当前仓库还有未解决的冲突，先处理完再切换分支。",
			"error.operationInProgress": "当前仓库还有进行中的 Git 操作，完成后再切换分支。",
			"error.branchInOtherWorktree": "目标分支已在其他 worktree 中被检出，当前工作区无法直接切换。",
			"error.trackedOverwrite": "切换失败，以下已跟踪文件的修改会被目标分支覆盖：{paths}。",
			"error.untrackedOverwrite": "切换失败，以下未跟踪文件会被目标分支覆盖：{paths}。",
			"error.moreFiles": "等另外 {count} 个文件",
			"error.targetBranchNotFound": "目标分支不存在于本地仓库。",
			"error.invalidBranchName": "分支名无效，请重新输入。",
			"error.branchAlreadyExists": "分支已存在，请换一个名称。",
			"error.workspaceUnknown": "当前目录不是已注册的工作区。",
			"error.internal": "操作失败，请稍后重试。",
			"error.requestFailed": "分支操作失败：{error}",
			"toast.switchSuccess": "已切换到分支 {branchName}",
			"toast.createSuccess": "已创建并切换到分支 {branchName}",
			"chip.aria.branch": "分支"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"branch.search": "Search branches",
			"branch.empty": "No matching branches",
			"branch.detached": "Detached HEAD",
			"branch.dirty": "Uncommitted changes: {count} files",
			"branch.create": "Create and switch to new branch…",
			"branch.graph": "Git Graph",
			"branch.createDialog.title": "Create and switch to new branch",
			"branch.createDialog.description": "Create a new local branch from the current HEAD and switch to it immediately.",
			"branch.createDialog.nameLabel": "Branch name",
			"branch.createDialog.placeholder": "For example, feature/git-branch-switcher",
			"branch.createDialog.confirm": "Create and switch",
			"branch.createDialog.cancel": "Cancel",
			"graph.title": "Git Graph",
			"graph.subtitle": "{count} commits across {lanes} lanes",
			"graph.loading": "Loading…",
			"graph.loadMore": "Load more",
			"graph.close": "Close",
			"graph.empty": "No commits",
			"graph.time.justNow": "just now",
			"graph.time.minutesAgo": "{count} minutes ago",
			"graph.time.hoursAgo": "{count} hours ago",
			"graph.time.daysAgo": "{count} days ago",
			"error.conflictsPresent": "The repository still has unresolved conflicts. Resolve them before switching branches.",
			"error.operationInProgress": "Another Git operation is still in progress. Finish it before switching branches.",
			"error.branchInOtherWorktree": "That branch is already checked out in another worktree.",
			"error.trackedOverwrite": "Switch failed because tracked files would be overwritten: {paths}.",
			"error.untrackedOverwrite": "Switch failed because untracked files would be overwritten: {paths}.",
			"error.moreFiles": "{count} more files",
			"error.targetBranchNotFound": "The target branch does not exist locally.",
			"error.invalidBranchName": "The branch name is invalid. Enter a different name.",
			"error.branchAlreadyExists": "That branch already exists. Choose another name.",
			"error.workspaceUnknown": "This directory is not a registered workspace.",
			"error.internal": "The operation failed. Please try again.",
			"error.requestFailed": "Branch operation failed: {error}",
			"toast.switchSuccess": "Switched to branch {branchName}",
			"toast.createSuccess": "Created and switched to branch {branchName}",
			"chip.aria.branch": "Branch"
		};
		//#endregion
		//#region src/client/index.ts
		/** Dictionary namespace owned by this plugin. */
		const NS = "git-graph";
		/** Required services: slots for the selector-context entry, sessions for the cwd lookup, locale for the copy. */
		const inject = [
			"slots",
			"sessions",
			"connection",
			"locale"
		];
		/** The session-cwd lookup failure shared by the injected verbs. */
		const NO_WORKSPACE = {
			code: "workspace-unknown",
			message: "session has no workspace"
		};
		/**
		* How long the chip waits for the selector-context declaration before
		* falling back to the input dock. The window covers the shell's first
		* render of the input selector row after the conversation service is up;
		* shells that never declare the hole (rc.6) land on the dock after it.
		*/
		const CONTEXT_FALLBACK_MS = 2e3;
		/**
		* Client plugin body: the branch chip entry with its git verbs, on the
		* selector-context hole with an input-dock fallback.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "dsh-git-graph: dictionaries");
			const git = new GitApi();
			let fallbackTimer;
			ctx.effect(() => () => {
				if (fallbackTimer !== void 0) clearTimeout(fallbackTimer);
			}, "dsh-git-graph: context fallback timer");
			ctx.inject([
				"slots",
				"conversation",
				"sessions"
			], (scope) => {
				const sessions = scope.sessions;
				/** The session's workspace root, resolved at call time from the sessions baseline. */
				const cwdOf = (sessionId) => sessionId === void 0 ? void 0 : sessions.list.getSnapshot().byId[sessionId]?.cwd;
				/** The injected face shared by every seat this chip registers into. */
				const injected = () => {
					/** Resolve the workspace root for one git call. */
					const pathOf = (sessionId) => {
						const cwd = cwdOf(sessionId);
						if (cwd === void 0 || cwd === "") return {
							ok: false,
							error: NO_WORKSPACE
						};
						return {
							ok: true,
							path: cwd
						};
					};
					return {
						repoStatus: async (sessionId) => {
							const resolved = pathOf(sessionId);
							if (!resolved.ok) return null;
							const result = await git.status(resolved.path);
							return result.ok ? result.value : null;
						},
						branches: async (sessionId) => {
							const resolved = pathOf(sessionId);
							if (!resolved.ok) return null;
							const result = await git.branches(resolved.path);
							return result.ok ? result.value : null;
						},
						switchBranch: async (sessionId, branch) => {
							const resolved = pathOf(sessionId);
							if (!resolved.ok) return {
								ok: false,
								error: resolved.error
							};
							const result = await git.switchBranch(resolved.path, branch);
							return result.ok ? {
								ok: true,
								branch: result.value.branch
							} : result;
						},
						createBranch: async (sessionId, name) => {
							const resolved = pathOf(sessionId);
							if (!resolved.ok) return {
								ok: false,
								error: resolved.error
							};
							const result = await git.createBranch(resolved.path, name);
							return result.ok ? {
								ok: true,
								branch: result.value.branch
							} : result;
						},
						graph: async (sessionId, limit) => {
							const resolved = pathOf(sessionId);
							if (!resolved.ok) return null;
							const result = await git.graph(resolved.path, limit);
							return result.ok ? result.value : null;
						},
						subscribeChanges: (sessionId, onChange) => {
							const resolved = pathOf(sessionId);
							if (!resolved.ok) return () => {};
							return subscribeChanges(resolved.path, onChange);
						}
					};
				};
				const chipEntry = {
					id: "git-graph",
					order: 100,
					locale: NS,
					inject: injected
				};
				let mounted = false;
				const disposeContextWait = scope.slots.inject("conversation.input.selector.context", () => {
					mounted = true;
					return scope.slots.register({
						name: "conversation.input.selector.context",
						...chipEntry
					}, BranchChip);
				});
				fallbackTimer = setTimeout(() => {
					if (mounted) return;
					disposeContextWait();
					scope.slots.inject("conversation.input.dock", () => scope.slots.register({
						name: "conversation.input.dock",
						...chipEntry
					}, BranchChip));
				}, CONTEXT_FALLBACK_MS);
			});
		}
		//#endregion
		exports.BranchChip = BranchChip;
		exports.CONTEXT_FALLBACK_MS = CONTEXT_FALLBACK_MS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map