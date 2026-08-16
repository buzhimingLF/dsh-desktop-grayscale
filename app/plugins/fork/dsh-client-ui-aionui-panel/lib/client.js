window.__ModuleLoader__.load({
	id: "@linxin666/dsh-client-ui-aionui-panel",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_dom_client = require("react-dom/client");
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let react_dom = require("react-dom");
		//#region src/client/api.ts
		/** Transport failure (fetch threw or the response was not JSON). */
		const TRANSPORT_ERROR = {
			code: "internal",
			message: "panel route unavailable"
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
		/** Typed panel operations over the wire. */
		var PanelApi = class {
			/** List one directory of the project root (rel path; '' = root). */
			list(root, path) {
				return post("/aionui-panel/list", {
					root,
					path
				});
			}
			/** Read one file (text or image data URL). */
			read(root, path, asImage) {
				return post("/aionui-panel/read", {
					root,
					path,
					asImage
				});
			}
			/** Write text content back with an optional mtime conflict base. */
			write(root, path, content, baseMtime) {
				return post("/aionui-panel/write", {
					root,
					path,
					content,
					baseMtime
				});
			}
			/** Filename search under the root. */
			search(root, query) {
				return post("/aionui-panel/search", {
					root,
					query
				});
			}
			/** Delete a path (untracked discard). */
			delete(root, path) {
				return post("/aionui-panel/delete", {
					root,
					path
				});
			}
			/** The repo status view; null when the root is not a repository. */
			gitStatus(root) {
				return post("/aionui-panel/git-status", { root });
			}
			/** The unified diff text of one path (staged = index vs HEAD). */
			gitDiff(root, path, staged) {
				return post("/aionui-panel/git-diff", {
					root,
					path,
					staged
				});
			}
			/** Stage paths. */
			gitStage(root, paths) {
				return post("/aionui-panel/git-stage", {
					root,
					paths
				});
			}
			/** Unstage paths. */
			gitUnstage(root, paths) {
				return post("/aionui-panel/git-unstage", {
					root,
					paths
				});
			}
			/** Discard paths (worktree side; untracked paths are deleted). */
			gitDiscard(root, paths) {
				return post("/aionui-panel/git-discard", {
					root,
					paths
				});
			}
		};
		/**
		* Subscribe to host-pushed changes for one project root (fs watch events and
		* git status polls). Reconnects are handled by the EventSource; the caller
		* re-subscribes when the root changes.
		* @param root - project root to watch.
		* @param onChange - fired on every pushed change.
		* @returns the disposer closing the stream.
		*/
		function subscribePanelEvents(root, onChange) {
			const source = new EventSource(`/aionui-panel/events?root=${encodeURIComponent(root)}`);
			source.addEventListener("change", (raw) => {
				try {
					onChange(JSON.parse(raw.data));
				} catch {}
			});
			return () => {
				source.close();
			};
		}
		//#endregion
		//#region src/client/drag.ts
		/** Whether a pointer event is the primary (left) button or touch. */
		function isPrimaryPointer(event) {
			return event.pointerType === "touch" || event.button === 0;
		}
		/**
		* Handle one pointer-down: wire capture + window listeners, run the rAF
		* loop, and end on any of the five termination paths. Call from a
		* onPointerDown handler (React or plain DOM).
		* @param event - the raw pointerdown event.
		* @param el - the handle element (capture target + reverse marker source).
		* @param opts - drag behavior.
		* @returns a disposer (idempotent; also called internally on end).
		*/
		function handlePointerDragStart(event, el, opts) {
			if (!isPrimaryPointer(event)) return () => {};
			event.preventDefault();
			const startX = event.clientX;
			const startWidth = opts.getStartWidth();
			const pointerId = event.pointerId;
			const reverse = opts.reverse;
			let rafId = null;
			let pendingWidth = null;
			let latestWidth = startWidth;
			let isDragging = true;
			let cleanup = null;
			const flushPending = () => {
				if (pendingWidth === null) return;
				latestWidth = pendingWidth;
				opts.onFrame(pendingWidth);
			};
			const addWindowListener = (key, handler) => {
				window.addEventListener(key, handler);
				return () => window.removeEventListener(key, handler);
			};
			const computeWidth = (clientX) => {
				const deltaX = reverse ? startX - clientX : clientX - startX;
				return opts.compute(startWidth, deltaX);
			};
			const finishDrag = (e) => {
				if (!isDragging) return;
				isDragging = false;
				if (rafId !== null) {
					cancelAnimationFrame(rafId);
					rafId = null;
				}
				flushPending();
				let finalWidth = latestWidth;
				if (e !== void 0 && "clientX" in e && typeof e.clientX === "number") finalWidth = computeWidth(e.clientX);
				opts.onEnd(finalWidth);
				cleanup?.();
			};
			const handlePointerMove = (e) => {
				if (!isDragging) return;
				if (e.buttons === 0) {
					finishDrag(e);
					return;
				}
				pendingWidth = computeWidth(e.clientX);
				if (rafId === null) rafId = requestAnimationFrame(() => {
					rafId = null;
					flushPending();
				});
			};
			const handlePointerUp = (e) => finishDrag(e);
			const handlePointerCancel = (e) => finishDrag(e);
			const handleMouseUp = (e) => finishDrag(e);
			const handleLostCapture = () => finishDrag();
			const previousUserSelect = document.body.style.userSelect;
			const previousCursor = document.body.style.cursor;
			document.body.style.userSelect = "none";
			document.body.style.cursor = "col-resize";
			const frame = el.closest("[data-dsh-frame]");
			frame?.setAttribute("data-aionui-instant", "");
			const restore = () => {
				document.body.style.userSelect = previousUserSelect;
				document.body.style.cursor = previousCursor;
				frame?.removeAttribute("data-aionui-instant");
			};
			if (el.setPointerCapture) try {
				el.setPointerCapture(pointerId);
				el.addEventListener("lostpointercapture", handleLostCapture);
			} catch {}
			const releaseCapture = () => {
				try {
					if (el.releasePointerCapture && el.hasPointerCapture?.(pointerId)) el.releasePointerCapture(pointerId);
				} catch {}
				el.removeEventListener("lostpointercapture", handleLostCapture);
			};
			const listeners = [
				addWindowListener("pointermove", handlePointerMove),
				addWindowListener("pointerup", handlePointerUp),
				addWindowListener("pointercancel", handlePointerCancel),
				addWindowListener("mouseup", handleMouseUp),
				addWindowListener("blur", () => finishDrag())
			];
			cleanup = () => {
				restore();
				releaseCapture();
				for (const dispose of listeners) dispose();
			};
			return cleanup;
		}
		//#endregion
		//#region src/client/fileType.ts
		/** Markdown extensions. */
		const MARKDOWN_EXT = /* @__PURE__ */ new Set([
			"md",
			"markdown",
			"mdx"
		]);
		/** HTML extensions. */
		const HTML_EXT = /* @__PURE__ */ new Set([
			"html",
			"htm",
			"xhtml"
		]);
		/** Diff extensions. */
		const DIFF_EXT = /* @__PURE__ */ new Set(["diff", "patch"]);
		/** CSV. */
		const CSV_EXT = /* @__PURE__ */ new Set(["csv"]);
		/** PDF. */
		const PDF_EXT = /* @__PURE__ */ new Set(["pdf"]);
		/** Office documents. */
		const WORD_EXT = /* @__PURE__ */ new Set([
			"doc",
			"docx",
			"odt",
			"rtf"
		]);
		const EXCEL_EXT = /* @__PURE__ */ new Set([
			"xls",
			"xlsx",
			"ods"
		]);
		const PPT_EXT = /* @__PURE__ */ new Set([
			"ppt",
			"pptx",
			"odp"
		]);
		/** Images. */
		const IMAGE_EXT = /* @__PURE__ */ new Set([
			"png",
			"jpg",
			"jpeg",
			"gif",
			"webp",
			"svg",
			"ico",
			"bmp",
			"avif"
		]);
		/** Extensions treated as editable code/text. */
		const CODE_EXT = /* @__PURE__ */ new Set([
			"ts",
			"tsx",
			"js",
			"jsx",
			"mjs",
			"cjs",
			"json",
			"jsonc",
			"css",
			"scss",
			"less",
			"yml",
			"yaml",
			"toml",
			"xml",
			"sh",
			"bash",
			"zsh",
			"fish",
			"rs",
			"py",
			"go",
			"java",
			"c",
			"h",
			"cpp",
			"hpp",
			"cc",
			"cs",
			"sql",
			"php",
			"rb",
			"swift",
			"kt",
			"vue",
			"svelte",
			"astro",
			"txt",
			"log",
			"ini",
			"env",
			"conf",
			"cfg",
			"gitignore",
			"dockerfile",
			"makefile",
			"graphql",
			"proto",
			"prisma",
			"zig",
			"lua",
			"r",
			"dart",
			"ex",
			"exs",
			"erl",
			"hs",
			"clj",
			"scala",
			"groovy",
			"vb",
			"ps1",
			"bat",
			"cmd",
			"pl",
			"pm",
			"tcl",
			"asm",
			"s",
			"f",
			"f90",
			"jl",
			"nim",
			"ml",
			"elm",
			"purs",
			"solidity",
			"sol",
			"tf",
			"hcl",
			"dockerignore",
			"editorconfig",
			"prettierrc",
			"eslintrc",
			"babelrc",
			"npmrc",
			"nix",
			"lock",
			"map"
		]);
		/** No-extension names that are plain text. */
		const TEXT_NAMES = /* @__PURE__ */ new Set([
			"license",
			"licence",
			"readme",
			"changelog",
			"contributing",
			"authors",
			"notice",
			"makefile",
			"dockerfile",
			"justfile",
			"gemfile",
			"rakefile",
			"procfile"
		]);
		/**
		* Leading-dot config dotfiles whose full (dotted) basename is plain text. The
		* de-dot rule below maps most single-dot files (`.gitignore` -> ext `gitignore`)
		* into CODE_EXT; these multi-suffix / uncommon ones have no useful extension
		* (`.env.local` -> `local`), so we match them by their whole dotted name.
		*/
		const DOTFILE_TEXT_NAMES = /* @__PURE__ */ new Set([
			".gitignore",
			".gitattributes",
			".gitmodules",
			".env",
			".env.local",
			".env.production",
			".env.development",
			".env.test",
			".npmrc",
			".npmrc.template",
			".prettierrc",
			".prettierrc.json",
			".prettierrc.yaml",
			".babelrc",
			".babelrc.json",
			".eslintrc",
			".eslintrc.json",
			".eslintrc.js",
			".editorconfig",
			".dockerignore",
			".eslintignore",
			".prettierignore",
			".gitignore.local",
			".hgignore"
		]);
		/** Detect the preview content type of a file by name (lowercased). */
		function detectContentType(name) {
			const lower = (name.split("/").pop() ?? name).toLowerCase();
			const dot = lower.lastIndexOf(".");
			const ext = lower[0] === "." ? dot > 0 ? lower.slice(dot + 1) : lower.slice(1) : dot > 0 ? lower.slice(dot + 1) : "";
			const stem = dot > 0 ? lower.slice(0, dot) : lower;
			if (lower[0] === "." && DOTFILE_TEXT_NAMES.has(lower)) return "text";
			if (ext === "" && TEXT_NAMES.has(stem)) return "text";
			if (ext === "") return "unsupported";
			if (MARKDOWN_EXT.has(ext)) return "markdown";
			if (HTML_EXT.has(ext)) return "html";
			if (DIFF_EXT.has(ext)) return "diff";
			if (CSV_EXT.has(ext)) return "csv";
			if (PDF_EXT.has(ext)) return "pdf";
			if (WORD_EXT.has(ext)) return "word";
			if (EXCEL_EXT.has(ext)) return "excel";
			if (PPT_EXT.has(ext)) return "ppt";
			if (IMAGE_EXT.has(ext)) return "image";
			if (CODE_EXT.has(ext)) return "code";
			return "unsupported";
		}
		/** Whether the type can be edited and saved back. */
		function isEditableType(type) {
			return type === "markdown" || type === "html" || type === "code" || type === "csv" || type === "text";
		}
		/** Whether the type reads its content as text (vs image data URL). */
		function isTextType(type) {
			return type !== "image" && type !== "pdf" && type !== "word" && type !== "excel" && type !== "ppt" && type !== "unsupported" && type !== "url";
		}
		/** A stable tab id from the file identity (root + path + type). */
		function tabIdOf(root, path, type) {
			return `${root}\u0000${path}\u0000${type}`;
		}
		/** The parent relative path of a path ('' for a root-level item). */
		function parentRel(path) {
			const idx = path.lastIndexOf("/");
			return idx > 0 ? path.slice(0, idx) : "";
		}
		/**
		* The streaming URL a pdf tab renders: the host raw route serves the bytes
		* with mime application/pdf, so the preview iframe loads them directly — no
		* base64 round-trip and no read-size cap. The nonce defeats browser caching
		* when the tab is refreshed after the file changed on disk.
		*
		* Contributed by EricWang1358 (#239).
		*/
		function pdfPreviewUrl(root, path, nonce) {
			return `/aionui-panel/raw?root=${encodeURIComponent(root)}&path=${encodeURIComponent(path)}&v=${nonce}`;
		}
		//#endregion
		//#region src/client/persist.ts
		/**
		* Persistence helpers for panel preferences: range-validated reads (invalid
		* stored values fall back to defaults — a broken or hand-edited value must
		* never produce a 0px or NaN panel), debounced writes, and the LRU registry
		* for preview scopes (at most 12 scopes; the oldest savedAt evicts).
		*
		* Keys follow the AionUi contract verbatim:
		*   chat-workspace-width-px, chat-preview-width-px, preview-panel-split-ratio,
		*   project-panel-collapse:<root>, explorer-ui:<root>, scm-ui:<root>,
		*   preview-ui:<root>.
		* @module dsh-aionui-panel/client/persist
		*/
		/** Read a stored number, validating it against [min, max]; fallback otherwise. */
		function readStoredNumber(key, min, max, fallback) {
			try {
				const raw = localStorage.getItem(key);
				if (raw === null) return fallback;
				const value = Number(raw);
				if (!Number.isFinite(value)) return fallback;
				if (value < min || value > max) return fallback;
				return value;
			} catch {
				return fallback;
			}
		}
		/** Write a number if it differs from the stored value (avoids churn). */
		function writeStoredNumber(key, value) {
			try {
				const raw = String(Math.round(value));
				if (localStorage.getItem(key) === raw) return;
				localStorage.setItem(key, raw);
			} catch {}
		}
		/** Create one debounced scheduler (default 150ms). */
		function createDebounced(delayMs = 150) {
			let timer;
			let pending = null;
			const flush = () => {
				if (timer !== void 0) clearTimeout(timer);
				timer = void 0;
				const fn = pending;
				pending = null;
				if (fn !== null) fn();
			};
			return {
				schedule(fn) {
					pending = fn;
					if (timer !== void 0) clearTimeout(timer);
					timer = setTimeout(flush, delayMs);
				},
				flush,
				dispose() {
					if (timer !== void 0) clearTimeout(timer);
					timer = void 0;
					pending = null;
				}
			};
		}
		/** The preview-ui scope registry: keys, savedAt values, eviction. */
		const PREVIEW_SCOPE_PREFIX = "preview-ui:";
		/**
		* Collect every stored key under a prefix. localStorage has no prefix index,
		* so the whole store is swept once, then filtered to the package's own keys
		* — enumeration is never interleaved with removal (removals would shift the
		* indices mid-loop and skip entries).
		*/
		function listStoredKeysByPrefix(prefix) {
			const keys = [];
			try {
				for (let i = 0; i < localStorage.length; i += 1) {
					const key = localStorage.key(i);
					if (key !== null && key.startsWith(prefix)) keys.push(key);
				}
			} catch {
				return [];
			}
			return keys;
		}
		/** All stored preview scopes with their savedAt timestamps, oldest first. */
		function listPreviewScopes() {
			const out = [];
			for (const key of listStoredKeysByPrefix(PREVIEW_SCOPE_PREFIX)) {
				const root = key.slice(11);
				let savedAt = 0;
				try {
					const raw = localStorage.getItem(key);
					if (raw !== null) {
						const parsed = JSON.parse(raw);
						if (typeof parsed.savedAt === "number") savedAt = parsed.savedAt;
					}
				} catch {
					savedAt = 0;
				}
				out.push({
					root,
					savedAt
				});
			}
			out.sort((a, b) => a.savedAt - b.savedAt);
			return out;
		}
		/** Evict the oldest scopes beyond the cap. */
		function evictPreviewScopes(keep) {
			const scopes = listPreviewScopes().filter((scope) => scope.root !== keep);
			let excess = scopes.length - 11;
			for (const scope of scopes) {
				if (excess <= 0) break;
				try {
					localStorage.removeItem(`${PREVIEW_SCOPE_PREFIX}${scope.root}`);
				} catch {}
				excess -= 1;
			}
		}
		/** Serialize a JSON value with a size guard (quota failures degrade silently). */
		function writeJson(key, value) {
			try {
				localStorage.setItem(key, JSON.stringify(value));
				return true;
			} catch {
				try {
					localStorage.removeItem(key);
				} catch {}
				return false;
			}
		}
		/** Parse a stored JSON value; fallback on any failure. */
		function readJson(key, fallback) {
			try {
				const raw = localStorage.getItem(key);
				if (raw === null) return fallback;
				const parsed = JSON.parse(raw);
				if (parsed === null || typeof parsed !== "object") return fallback;
				return parsed;
			} catch {
				return fallback;
			}
		}
		//#endregion
		//#region src/client/store.ts
		/** Internal channel for the stored-layout flush used by pagehide flushing. */
		const FLUSH_PERSIST = Symbol("flushPersist");
		/** Create a state handle with an immutable snapshot (new object per update). */
		function createState(initial) {
			let state = initial;
			const listeners = /* @__PURE__ */ new Set();
			return {
				getSnapshot: () => state,
				subscribe(listener) {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				update(fn) {
					const next = fn(state);
					if (next === state) return;
					state = next;
					for (const listener of listeners) listener();
				}
			};
		}
		const MAX_PREVIEW_REGION_PX = 1200;
		/** Storage keys (AionUi contract, verbatim). */
		const KEY_EXPLORER_WIDTH = "chat-workspace-width-px";
		const KEY_PREVIEW_WIDTH = "chat-preview-width-px";
		const KEY_COLLAPSE = "project-panel-collapse:";
		const KEY_EXPLORER_UI = "explorer-ui:";
		const KEY_SCM_UI = "scm-ui:";
		/**
		* Explorer clamp (runs first): reserve chat's floor plus the preview region
		* (min + chrome) when open, so the explorer never grows into the preview's
		* space; floor at the explorer minimum so a narrow container cannot squeeze
		* it to nothing.
		*/
		function clampExplorerWidth(requested, available, previewOpen) {
			const maxByContainer = Math.max(220, available - (360 + (previewOpen ? 364 : 0)));
			return Math.min(requested, maxByContainer);
		}
		/**
		* Preview clamp (runs after the explorer clamp): reserve chat's floor plus
		* the already-clamped explorer width plus the region chrome. The ordered pair
		* guarantees chat = available - explorer - preview >= 360.
		*/
		function clampPreviewWidth(requested, available, explorerWidth) {
			const maxByContainer = Math.max(340, available - 360 - explorerWidth - 24);
			return Math.min(requested, maxByContainer);
		}
		/** Storage key of the collapse preference for one root. */
		const collapseKey = (root) => `${KEY_COLLAPSE}${root}`;
		/** Create the layout store (reads persisted widths on init). */
		function createLayoutStore() {
			const handle = createState({
				root: "",
				explorerWidth: readStoredNumber(KEY_EXPLORER_WIDTH, 220, 500, 260),
				previewWidth: readStoredNumber(KEY_PREVIEW_WIDTH, 340, MAX_PREVIEW_REGION_PX, 480),
				explorerCollapsed: false,
				previewOpen: false,
				availableWidth: 0,
				dragging: false
			});
			return Object.assign(handle, {
				explorerWidthPx(state) {
					return state.explorerCollapsed ? 0 : clampExplorerWidth(state.explorerWidth, state.availableWidth, state.previewOpen);
				},
				previewWidthPx(state) {
					if (!state.previewOpen) return 0;
					const explorer = state.explorerCollapsed ? 0 : clampExplorerWidth(state.explorerWidth, state.availableWidth, true);
					return clampPreviewWidth(state.previewWidth, state.availableWidth, explorer);
				},
				shrinkToFit(state) {
					if (state.availableWidth <= 0) return;
					const explorer = clampExplorerWidth(state.explorerWidth, state.availableWidth, state.previewOpen);
					if (state.explorerWidth > explorer && !state.explorerCollapsed) {
						writeStoredNumber(KEY_EXPLORER_WIDTH, explorer);
						handle.update((prev) => ({
							...prev,
							explorerWidth: explorer
						}));
					}
					const preview = clampPreviewWidth(state.previewWidth, state.availableWidth, explorer);
					if (state.previewOpen && state.previewWidth > preview) {
						writeStoredNumber(KEY_PREVIEW_WIDTH, preview);
						handle.update((prev) => ({
							...prev,
							previewWidth: preview
						}));
					}
				}
			});
		}
		/** Switch the layout to a project root (restores collapse + widths). */
		function layoutSetRoot(store, root, previewOpen) {
			store.update((prev) => {
				if (prev.root === root && prev.previewOpen === previewOpen) return prev;
				let collapsed = prev.explorerCollapsed;
				if (prev.root !== root) try {
					collapsed = localStorage.getItem(collapseKey(root)) === "collapsed";
				} catch {
					collapsed = false;
				}
				return {
					...prev,
					root,
					explorerCollapsed: collapsed,
					previewOpen
				};
			});
		}
		/** Read the persisted explorer UI state for a root (range-guarded). */
		function readExplorerUi(root) {
			const stored = readJson(`${KEY_EXPLORER_UI}${root}`, {});
			return {
				expanded: Array.isArray(stored.expanded) ? stored.expanded.filter((item) => typeof item === "string") : [],
				selected: typeof stored.selected === "string" ? stored.selected : null
			};
		}
		const EMPTY_SEARCH = {
			query: "",
			status: "idle",
			hits: [],
			truncated: false
		};
		/** Create the explorer store (per-root persistence, debounced writes). */
		function createExplorerStore(api) {
			const handle = createState({
				root: "",
				dirs: {},
				expanded: [],
				selected: null,
				loading: [],
				activeTab: "files",
				search: { ...EMPTY_SEARCH },
				version: 0
			});
			const persistDebounced = createDebounced();
			const searchDebounced = createDebounced();
			let fsVersion = 0;
			let persistRoot = "";
			let persistExpanded = [];
			let persistSelected = null;
			const persistWrite = () => {
				if (persistRoot !== "") writeJson(`${KEY_EXPLORER_UI}${persistRoot}`, {
					expanded: persistExpanded,
					selected: persistSelected
				});
			};
			const flushPersist = () => {
				persistDebounced.flush();
			};
			const schedulePersist = (root, expanded, selected) => {
				if (root === "") return;
				persistRoot = root;
				persistExpanded = expanded;
				persistSelected = selected;
				persistDebounced.schedule(persistWrite);
			};
			/** Load one dir's listing into the cache (no-op when already present). */
			const ensureDir = async (root, rel) => {
				const state = handle.getSnapshot();
				if (state.root !== root || state.dirs[rel] !== void 0 || state.loading.includes(rel)) return;
				handle.update((prev) => ({
					...prev,
					loading: [...prev.loading, rel]
				}));
				const result = await api.list(root, rel);
				handle.update((prev) => {
					if (prev.root !== root) return prev;
					if (rel !== "" && !prev.expanded.includes(rel)) return {
						...prev,
						loading: prev.loading.filter((item) => item !== rel)
					};
					const dirs = { ...prev.dirs };
					if (result.ok) dirs[rel] = result.value.entries;
					else delete dirs[rel];
					return {
						...prev,
						dirs,
						loading: prev.loading.filter((item) => item !== rel)
					};
				});
			};
			/** Drop cached subtrees under a collapsed dir (its own key included). */
			const dropSubtree = (dirs, rel) => {
				const prefix = rel === "" ? "" : `${rel}/`;
				const next = {};
				for (const key of Object.keys(dirs)) {
					if (rel !== "" && (key === rel || key.startsWith(prefix))) continue;
					next[key] = dirs[key];
				}
				return next;
			};
			/** A dir's ancestor chain ('' .. parent). */
			const ancestors = (rel) => {
				const out = [];
				const parts = rel.split("/").filter(Boolean);
				let acc = "";
				for (const part of parts) {
					acc = acc === "" ? part : `${acc}/${part}`;
					out.push(acc);
				}
				return out;
			};
			const store = Object.assign(handle, {
				setRoot(root) {
					handle.update((prev) => {
						if (prev.root === root) return prev;
						const ui = readExplorerUi(root);
						return {
							...prev,
							root,
							dirs: {},
							expanded: ui.expanded,
							selected: ui.selected,
							loading: [],
							search: { ...EMPTY_SEARCH }
						};
					});
					ensureDir(root, "");
				},
				setActiveTab(tab) {
					handle.update((prev) => prev.activeTab === tab ? prev : {
						...prev,
						activeTab: tab
					});
				},
				toggleDir(rel) {
					const state = handle.getSnapshot();
					const isExpanded = state.expanded.includes(rel);
					if (isExpanded) handle.update((prev) => ({
						...prev,
						expanded: prev.expanded.filter((item) => item !== rel),
						dirs: dropSubtree(prev.dirs, rel)
					}));
					else {
						handle.update((prev) => ({
							...prev,
							expanded: [...prev.expanded, rel]
						}));
						ensureDir(state.root, rel);
					}
					schedulePersist(state.root, isExpanded ? state.expanded.filter((item) => item !== rel) : [...state.expanded, rel], state.selected);
				},
				select(rel) {
					handle.update((prev) => prev.selected === rel ? prev : {
						...prev,
						selected: rel
					});
					const state = handle.getSnapshot();
					schedulePersist(state.root, state.expanded, rel);
				},
				reveal(rel) {
					const state = handle.getSnapshot();
					const missing = ancestors(rel).filter((item) => !state.expanded.includes(item));
					handle.update((prev) => {
						const expanded = [...prev.expanded];
						for (const item of missing) if (!expanded.includes(item)) expanded.push(item);
						return {
							...prev,
							expanded,
							selected: rel,
							search: { ...EMPTY_SEARCH }
						};
					});
					for (const item of missing) ensureDir(state.root, item);
					schedulePersist(state.root, [...state.expanded, ...missing], rel);
				},
				setSearchQuery(query) {
					const trimmed = query.trim();
					handle.update((prev) => {
						if (trimmed === "" && prev.search.query === "") return prev;
						return {
							...prev,
							search: trimmed === "" ? { ...EMPTY_SEARCH } : {
								...prev.search,
								query: trimmed,
								status: "searching"
							}
						};
					});
					searchDebounced.dispose();
					if (trimmed === "") return;
					const root = handle.getSnapshot().root;
					searchDebounced.schedule(() => {
						api.search(root, trimmed).then((result) => {
							handle.update((prev) => {
								if (prev.root !== root || prev.search.query !== trimmed) return prev;
								return {
									...prev,
									search: result.ok ? {
										query: trimmed,
										status: "done",
										hits: result.value.hits,
										truncated: result.value.truncated
									} : {
										...prev.search,
										status: "error",
										hits: []
									}
								};
							});
						});
					});
				},
				cancelSearch() {
					searchDebounced.dispose();
					handle.update((prev) => prev.search.query === "" ? prev : {
						...prev,
						search: { ...EMPTY_SEARCH }
					});
				},
				async handleFsChange() {
					const state = handle.getSnapshot();
					const root = state.root;
					if (root === "") return;
					const dirs = [.../* @__PURE__ */ new Set(["", ...state.expanded])];
					const seq = ++fsVersion;
					const results = await Promise.allSettled(dirs.map((rel) => api.list(root, rel)));
					handle.update((prev) => {
						if (prev.root !== root || seq !== fsVersion) return prev;
						const nextDirs = { ...prev.dirs };
						results.forEach((result, index) => {
							const rel = dirs[index];
							if (result.status !== "fulfilled" || !result.value.ok) return;
							if (rel !== "" && !prev.expanded.includes(rel)) return;
							nextDirs[rel] = result.value.value.entries;
						});
						return {
							...prev,
							dirs: nextDirs,
							version: prev.version + 1
						};
					});
					if (state.search.query !== "") api.search(root, state.search.query).then((result) => {
						handle.update((prev) => {
							if (prev.root !== root || prev.search.query !== state.search.query) return prev;
							return {
								...prev,
								search: result.ok ? {
									query: state.search.query,
									status: "done",
									hits: result.value.hits,
									truncated: result.value.truncated
								} : prev.search
							};
						});
					});
				}
			});
			store[FLUSH_PERSIST] = flushPersist;
			return store;
		}
		/** Read the persisted scm UI state for a root (guarded). */
		function readScmUi(root) {
			const stored = readJson(`${KEY_SCM_UI}${root}`, {});
			return {
				viewMode: stored.viewMode === "tree" ? "tree" : "list",
				sectionCollapsed: typeof stored.sectionCollapsed === "object" && stored.sectionCollapsed !== null ? Object.fromEntries(Object.entries(stored.sectionCollapsed).filter(([, v]) => typeof v === "boolean")) : {},
				treeExpanded: Array.isArray(stored.treeExpanded) ? stored.treeExpanded.filter((item) => typeof item === "string") : [],
				selected: typeof stored.selected === "string" ? stored.selected : null
			};
		}
		/** Create the scm store (host status is the only truth — no optimistic rows). */
		function createScmStore(api) {
			const handle = createState({
				root: "",
				status: null,
				gitMissing: false,
				loading: false,
				busy: [],
				failed: [],
				viewMode: "list",
				sectionCollapsed: {},
				treeExpanded: [],
				selected: null
			});
			const persistDebounced = createDebounced();
			let persistState = null;
			let loadSeq = 0;
			const persistWrite = () => {
				if (persistState !== null && persistState.root !== "") writeJson(`${KEY_SCM_UI}${persistState.root}`, {
					viewMode: persistState.viewMode,
					sectionCollapsed: persistState.sectionCollapsed,
					treeExpanded: persistState.treeExpanded,
					selected: persistState.selected
				});
			};
			const flushPersist = () => {
				persistDebounced.flush();
			};
			const schedulePersist = (state) => {
				if (state.root === "") return;
				persistState = state;
				persistDebounced.schedule(persistWrite);
			};
			/** Fetch the status and land it (guarded against root switches + out-of-order). */
			const load = async (root, keepBusy = []) => {
				const seq = ++loadSeq;
				handle.update((prev) => ({
					...prev,
					loading: true
				}));
				const result = await api.gitStatus(root);
				handle.update((prev) => {
					if (prev.root !== root || seq !== loadSeq) return prev;
					return {
						...prev,
						status: result.ok ? result.value : prev.status,
						gitMissing: result.ok && result.value !== null ? false : prev.gitMissing,
						loading: false,
						busy: keepBusy
					};
				});
			};
			const store = Object.assign(handle, {
				setRoot(root) {
					handle.update((prev) => {
						if (prev.root === root) return prev;
						const ui = readScmUi(root);
						return {
							...prev,
							root,
							status: null,
							gitMissing: false,
							loading: true,
							busy: [],
							failed: [],
							viewMode: ui.viewMode,
							sectionCollapsed: ui.sectionCollapsed,
							treeExpanded: ui.treeExpanded,
							selected: ui.selected
						};
					});
					load(root);
				},
				async refresh() {
					const root = handle.getSnapshot().root;
					if (root !== "") await load(root);
				},
				async stage(paths) {
					const root = handle.getSnapshot().root;
					if (root === "" || paths.length === 0) return;
					handle.update((prev) => ({
						...prev,
						busy: [...prev.busy, ...paths]
					}));
					const result = await api.gitStage(root, paths);
					handle.update((prev) => ({
						...prev,
						failed: result.ok && Array.isArray(result.value?.failed) ? result.value.failed : result.ok ? [] : paths,
						busy: prev.busy.filter((item) => !paths.includes(item))
					}));
					await load(root);
				},
				async unstage(paths) {
					const root = handle.getSnapshot().root;
					if (root === "" || paths.length === 0) return;
					handle.update((prev) => ({
						...prev,
						busy: [...prev.busy, ...paths]
					}));
					const result = await api.gitUnstage(root, paths);
					handle.update((prev) => ({
						...prev,
						failed: result.ok && Array.isArray(result.value?.failed) ? result.value.failed : result.ok ? [] : paths,
						busy: prev.busy.filter((item) => !paths.includes(item))
					}));
					await load(root);
				},
				async discard(paths) {
					const root = handle.getSnapshot().root;
					if (root === "" || paths.length === 0) return;
					handle.update((prev) => ({
						...prev,
						busy: [...prev.busy, ...paths]
					}));
					const result = await api.gitDiscard(root, paths);
					handle.update((prev) => ({
						...prev,
						failed: result.ok && Array.isArray(result.value?.failed) ? result.value.failed : result.ok ? [] : paths,
						busy: prev.busy.filter((item) => !paths.includes(item))
					}));
					await load(root);
				},
				async discardAll() {
					const state = handle.getSnapshot();
					const paths = [...state.status?.unstaged ?? [], ...state.status?.untracked ?? []].map((row) => row.path);
					await this.discard(paths);
				},
				setViewMode(mode) {
					handle.update((prev) => prev.viewMode === mode ? prev : {
						...prev,
						viewMode: mode
					});
					schedulePersist(handle.getSnapshot());
				},
				setSectionCollapsed(id, collapsed) {
					handle.update((prev) => ({
						...prev,
						sectionCollapsed: {
							...prev.sectionCollapsed,
							[id]: collapsed
						}
					}));
					schedulePersist(handle.getSnapshot());
				},
				setTreeExpanded(keys) {
					handle.update((prev) => ({
						...prev,
						treeExpanded: keys
					}));
					schedulePersist(handle.getSnapshot());
				},
				setFailed(paths) {
					handle.update((prev) => ({
						...prev,
						failed: paths
					}));
				},
				select(path) {
					handle.update((prev) => prev.selected === path ? prev : {
						...prev,
						selected: path
					});
					schedulePersist(handle.getSnapshot());
				}
			});
			store[FLUSH_PERSIST] = flushPersist;
			return store;
		}
		/** Read persisted tabs for a root (guarded, content-less). */
		function readPreviewTabs(root) {
			const stored = readJson(`preview-ui:${root}`, {});
			if (!Array.isArray(stored.tabs)) return [];
			const out = [];
			for (const item of stored.tabs) {
				if (typeof item !== "object" || item === null) continue;
				const record = item;
				if (typeof record.id !== "string" || typeof record.path !== "string") continue;
				const rawDiff = record.diff;
				const diff = typeof rawDiff === "object" && rawDiff !== null && typeof rawDiff.staged === "boolean" ? { staged: rawDiff.staged } : void 0;
				out.push({
					id: record.id,
					title: typeof record.title === "string" ? record.title : record.path,
					root: typeof record.root === "string" ? record.root : root,
					path: record.path,
					contentType: typeof record.contentType === "string" ? record.contentType : "text",
					diff,
					savedAt: typeof record.savedAt === "number" ? record.savedAt : 0
				});
			}
			return out;
		}
		/** Create the preview store (per-root tab persistence with LRU scopes). */
		function createPreviewStore(api) {
			const handle = createState({
				root: "",
				open: false,
				tabs: [],
				activeTabId: null,
				version: 0
			});
			const persistDebounced = createDebounced();
			const persistWrite = () => {
				const current = handle.getSnapshot();
				if (current.root === "") return;
				const meta = current.tabs.map((tab) => ({
					id: tab.id,
					title: tab.title,
					root: tab.root,
					path: tab.path,
					contentType: tab.contentType,
					diff: tab.diff,
					savedAt: tab.savedAt
				}));
				writeJson(`preview-ui:${current.root}`, {
					savedAt: Date.now(),
					tabs: meta
				});
				evictPreviewScopes(current.root);
			};
			const flushPersist = () => {
				persistDebounced.flush();
			};
			const schedulePersist = (state) => {
				if (state.root === "") return;
				persistDebounced.schedule(persistWrite);
			};
			/** Load content for one tab (text or image data URL, or git diff). */
			const loadContent = async (root, id) => {
				const tab = handle.getSnapshot().tabs.find((item) => item.id === id);
				if (tab === void 0 || tab.content !== null || tab.loading) return;
				handle.update((prev) => ({
					...prev,
					tabs: prev.tabs.map((item) => item.id === id ? {
						...item,
						loading: true,
						error: null
					} : item)
				}));
				if (tab.contentType === "pdf") {
					handle.update((prev) => {
						if (prev.root !== root) return prev;
						return {
							...prev,
							tabs: prev.tabs.map((item) => item.id === id ? {
								...item,
								loading: false,
								content: pdfPreviewUrl(root, item.path, Date.now()),
								updated: false
							} : item)
						};
					});
					return;
				}
				const asImage = tab.contentType === "image";
				const result = tab.diff !== void 0 ? await api.gitDiff(root, tab.path, tab.diff.staged) : await api.read(root, tab.path, asImage);
				handle.update((prev) => {
					if (prev.root !== root) return prev;
					return {
						...prev,
						tabs: prev.tabs.map((item) => {
							if (item.id !== id) return item;
							if (!result.ok) return {
								...item,
								loading: false,
								error: result.error.message
							};
							if (item.dirty) return {
								...item,
								loading: false
							};
							const loaded = result.value;
							return {
								...item,
								loading: false,
								content: loaded.content,
								image: loaded.image,
								mtime: loaded.mtime,
								truncated: loaded.truncated ?? false,
								updated: false
							};
						})
					};
				});
			};
			/** Touch a tab's savedAt (LRU order within the scope). */
			const touch = (id) => {
				handle.update((prev) => ({
					...prev,
					tabs: prev.tabs.map((item) => item.id === id ? {
						...item,
						savedAt: Date.now()
					} : item)
				}));
			};
			/**
			* Re-fetch every loaded diff tab of the root in place (fs/git change
			* events). In-flight or not-yet-loaded tabs are skipped — the next load or
			* event covers them; landing guards keep a newer edit from being clobbered.
			*/
			const refreshDiffs = async (root) => {
				if (handle.getSnapshot().root !== root) return;
				const diffs = handle.getSnapshot().tabs.filter((tab) => tab.diff !== void 0);
				await Promise.all(diffs.map(async (tab) => {
					if (tab.content === null || tab.loading) return;
					const result = await api.gitDiff(root, tab.path, tab.diff.staged);
					handle.update((prev) => {
						if (prev.root !== root) return prev;
						return {
							...prev,
							tabs: prev.tabs.map((item) => {
								if (item.id !== tab.id || !result.ok) return item;
								if (item.dirty || item.loading) return item;
								return {
									...item,
									content: result.value.content,
									error: null
								};
							})
						};
					});
				}));
			};
			const store = Object.assign(handle, {
				setRoot(root) {
					handle.update((prev) => {
						if (prev.root === root) return prev;
						const tabs = readPreviewTabs(root).map((meta) => ({
							id: meta.id,
							title: meta.title,
							root: meta.root,
							path: meta.path,
							contentType: meta.contentType,
							diff: meta.diff,
							content: null,
							dirty: false,
							updated: false,
							loading: false,
							truncated: false,
							error: null,
							savedAt: meta.savedAt
						}));
						const activeTabId = tabs.length > 0 ? tabs[tabs.length - 1].id : null;
						return {
							...prev,
							root,
							tabs,
							activeTabId,
							open: tabs.length > 0
						};
					});
					const state = handle.getSnapshot();
					if (state.activeTabId !== null) loadContent(root, state.activeTabId);
				},
				openFile(root, path) {
					const type = detectContentType(path);
					const id = tabIdOf(root, path, type);
					if (handle.getSnapshot().tabs.find((tab) => tab.id === id) !== void 0) {
						handle.update((prev) => ({
							...prev,
							root,
							open: true,
							activeTabId: id,
							tabs: prev.tabs.map((tab) => tab.id === id ? {
								...tab,
								savedAt: Date.now()
							} : tab)
						}));
						loadContent(root, id);
						schedulePersist(handle.getSnapshot());
						return;
					}
					handle.update((prev) => {
						if (prev.root !== root) return prev;
						const tab = {
							id,
							title: path.split("/").pop() ?? path,
							root,
							path,
							contentType: type,
							content: null,
							dirty: false,
							updated: false,
							loading: false,
							truncated: false,
							error: null,
							savedAt: Date.now()
						};
						return {
							...prev,
							open: true,
							tabs: [...prev.tabs, tab],
							activeTabId: id
						};
					});
					loadContent(root, id);
					schedulePersist(handle.getSnapshot());
				},
				openDiff(root, path, staged) {
					const id = `scm-diff:${staged ? "s" : "u"}\u0000${root}\u0000${path}`;
					if (handle.getSnapshot().tabs.find((tab) => tab.id === id) !== void 0) {
						handle.update((prev) => ({
							...prev,
							root,
							open: true,
							activeTabId: id,
							tabs: prev.tabs.map((tab) => tab.id === id ? {
								...tab,
								savedAt: Date.now()
							} : tab)
						}));
						loadContent(root, id);
						schedulePersist(handle.getSnapshot());
						return;
					}
					handle.update((prev) => {
						if (prev.root !== root) return prev;
						const tab = {
							id,
							title: path.split("/").pop() ?? path,
							root,
							path,
							contentType: "diff",
							diff: { staged },
							content: null,
							dirty: false,
							updated: false,
							loading: false,
							truncated: false,
							error: null,
							savedAt: Date.now()
						};
						return {
							...prev,
							open: true,
							tabs: [...prev.tabs, tab],
							activeTabId: id
						};
					});
					loadContent(root, id);
					schedulePersist(handle.getSnapshot());
				},
				switchTab(id) {
					const state = handle.getSnapshot();
					if (state.activeTabId === id) return;
					handle.update((prev) => ({
						...prev,
						activeTabId: id
					}));
					touch(id);
					const tab = handle.getSnapshot().tabs.find((item) => item.id === id);
					if (tab !== void 0 && tab.content === null) loadContent(state.root, id);
					schedulePersist(handle.getSnapshot());
				},
				closeTabs(ids) {
					const state = handle.getSnapshot();
					const remaining = state.tabs.filter((tab) => !ids.includes(tab.id));
					const activeTabId = remaining.some((tab) => tab.id === state.activeTabId) ? state.activeTabId : remaining.length > 0 ? remaining[Math.min(state.tabs.findIndex((tab) => tab.id === state.activeTabId), remaining.length - 1)]?.id ?? remaining[remaining.length - 1].id : null;
					handle.update((prev) => ({
						...prev,
						tabs: remaining,
						activeTabId,
						open: remaining.length > 0 ? prev.open : false
					}));
					schedulePersist(handle.getSnapshot());
				},
				updateContent(id, content) {
					handle.update((prev) => ({
						...prev,
						tabs: prev.tabs.map((tab) => tab.id === id ? {
							...tab,
							content,
							dirty: true,
							updated: false
						} : tab)
					}));
				},
				async saveTab(id) {
					const state = handle.getSnapshot();
					const tab = state.tabs.find((item) => item.id === id);
					if (tab === void 0 || tab.content === null || !isTextType(tab.contentType) || tab.diff !== void 0) return;
					const sentContent = tab.content;
					handle.update((prev) => ({
						...prev,
						tabs: prev.tabs.map((item) => item.id === id ? {
							...item,
							loading: true,
							error: null
						} : item)
					}));
					const result = await api.write(state.root, tab.path, tab.content, tab.mtime);
					handle.update((prev) => {
						if (prev.root !== state.root) return prev;
						return {
							...prev,
							tabs: prev.tabs.map((item) => {
								if (item.id !== id) return item;
								if (!result.ok) return {
									...item,
									loading: false,
									error: result.error.code === "write-conflict" ? "文件已在磁盘上被修改，保存冲突：请刷新后重试" : result.error.message
								};
								if (item.content !== sentContent) return {
									...item,
									loading: false,
									mtime: result.value.mtime,
									error: null
								};
								return {
									...item,
									loading: false,
									dirty: false,
									mtime: result.value.mtime,
									error: null
								};
							})
						};
					});
				},
				async reloadTab(id) {
					const state = handle.getSnapshot();
					const tab = state.tabs.find((item) => item.id === id);
					if (tab === void 0) return;
					if (tab.contentType === "url") {
						handle.update((prev) => ({
							...prev,
							tabs: prev.tabs.map((item) => item.id === id ? {
								...item,
								reloadNonce: (item.reloadNonce ?? 0) + 1
							} : item)
						}));
						return;
					}
					if (tab.contentType === "pdf") {
						handle.update((prev) => ({
							...prev,
							tabs: prev.tabs.map((item) => item.id === id ? {
								...item,
								content: pdfPreviewUrl(state.root, item.path, Date.now()),
								updated: false,
								error: null
							} : item)
						}));
						return;
					}
					handle.update((prev) => ({
						...prev,
						tabs: prev.tabs.map((item) => item.id === id ? {
							...item,
							loading: true
						} : item)
					}));
					const result = tab.diff !== void 0 ? await api.gitDiff(state.root, tab.path, tab.diff.staged) : await api.read(state.root, tab.path, tab.contentType === "image");
					handle.update((prev) => {
						if (prev.root !== state.root) return prev;
						return {
							...prev,
							tabs: prev.tabs.map((item) => {
								if (item.id !== id) return item;
								if (!result.ok) return {
									...item,
									loading: false,
									error: result.error.message
								};
								const loaded = result.value;
								return {
									...item,
									loading: false,
									content: loaded.content,
									image: loaded.image,
									mtime: loaded.mtime,
									truncated: loaded.truncated ?? false,
									updated: false,
									dirty: false,
									error: null
								};
							})
						};
					});
				},
				setOpen(open) {
					handle.update((prev) => prev.open === open ? prev : {
						...prev,
						open
					});
				},
				async handleFsChange() {
					const state = handle.getSnapshot();
					if (state.root === "") return;
					handle.update((prev) => ({
						...prev,
						version: prev.version + 1
					}));
					await refreshDiffs(state.root);
					const active = handle.getSnapshot().tabs.find((tab) => tab.id === handle.getSnapshot().activeTabId);
					if (active === void 0 || active.content === null || active.dirty || active.diff !== void 0 || !isTextType(active.contentType)) return;
					const result = await api.read(state.root, active.path, false);
					handle.update((prev) => {
						if (prev.root !== state.root) return prev;
						return {
							...prev,
							tabs: prev.tabs.map((tab) => {
								if (tab.id !== active.id || tab.dirty) return tab;
								if (!result.ok) return tab;
								return {
									...tab,
									updated: tab.mtime !== void 0 && result.value.mtime > tab.mtime + 1
								};
							})
						};
					});
				},
				async handleGitChange(root) {
					await refreshDiffs(root);
				}
			});
			store[FLUSH_PERSIST] = flushPersist;
			return store;
		}
		/** Create the full store bundle. */
		function createPanelStores(api) {
			const layout = createLayoutStore();
			const explorer = createExplorerStore(api);
			const scm = createScmStore(api);
			const preview = createPreviewStore(api);
			const flushNow = () => {
				for (const store of [
					explorer,
					scm,
					preview
				]) {
					const flush = store[FLUSH_PERSIST];
					if (typeof flush === "function") flush();
				}
			};
			return {
				layout,
				explorer,
				scm,
				preview,
				flushNow
			};
		}
		//#endregion
		//#region src/client/layout.ts
		/**
		* The DOM layout controller: extends the web shell's three-column frame
		* (`[data-dsh-frame]`, a grid) with two trailing grid tracks — the preview
		* region and the explorer column — by mirroring the shell's own inline
		* grid-template-columns string and re-appending the two panel tracks on every
		* shell update (MutationObserver, same frame before paint). Also owns the
		* absolute drag handles (12px explorer / 20px preview hit zones), the
		* floating expand button, and the collapse-as-width-0 keep-mounted behavior.
		*
		* The shell's inline style is the source of truth for the sidebar and details
		* tracks; this controller never guesses their widths. Handles are out-of-flow
		* (absolute), so appending tracks never disturbs the shell's own children.
		*
		* AionUi Layout architecture (Apache-2.0, re-implemented): the explorer
		* column collapses to width 0 while staying mounted; the preview region keeps
		* a 1px left border only (no outer margins — gaps would expose the window
		* background, jarring in dark mode).
		* @module dsh-aionui-panel/client/layout
		*/
		/** The frame grid element (portals target it). */
		let frameElement = null;
		/**
		* Locate the frame grid element the two panel columns append into. The web-ui
		* aggregate's compat shim stamps `data-dsh-frame` onto the grid, but a
		* STANDALONE install of this package has no shim (the attribute never
		* appears), so the panel would wait forever and never mount (issue #56). Fall
		* back to the rc.6-native structure: the frame grid is the parent of the
		* sidebar column, exactly the element the shim would stamp.
		*/
		function findFrame() {
			const stamped = document.querySelector("[data-dsh-frame]");
			if (stamped !== null) return stamped;
			return document.querySelector("[class*=\"sidebarCol\"]")?.parentElement ?? null;
		}
		/**
		* Parse an inline grid-template-columns string into its tracks. Handles
		* "minmax(0, 1fr)" (spaces inside parens must not split). Empty on failure.
		*/
		function parseGridTracks(input) {
			const tracks = [];
			let depth = 0;
			let current = "";
			for (const char of input) {
				if (char === "(") depth += 1;
				if (char === ")") depth = Math.max(0, depth - 1);
				if (char === " " && depth === 0) {
					if (current !== "") {
						tracks.push(current);
						current = "";
					}
					continue;
				}
				current += char;
			}
			if (current !== "") tracks.push(current);
			return tracks;
		}
		/** Extract a px width from one track (0 for fr/minmax/non-px tracks). */
		function trackPx(track) {
			const match = /^(-?[\d.]+)px$/.exec(track.trim());
			return match === null ? 0 : Number(match[1]);
		}
		/** The layout controller: frame sync, handles, floating button, width math. */
		var PanelLayoutController = class {
			layout;
			frame = null;
			previewCol = null;
			explorerCol = null;
			explorerHandle = null;
			previewHandle = null;
			floatingButton = null;
			styleObserver = null;
			sizeObserver = null;
			waitObserver = null;
			frameWidth = 0;
			/** The shell's own 3 tracks (sidebar, center, details) — mirror of its inline style. */
			shellTracks = [];
			instantTimer;
			disposers = [];
			constructor(layout) {
				this.layout = layout;
			}
			/** Start watching for the frame and attach once it appears. */
			mount() {
				const tryAttach = () => {
					if (this.frame !== null) return;
					const frame = findFrame();
					if (frame === null) return;
					this.attach(frame);
				};
				this.waitObserver = new MutationObserver(() => {
					tryAttach();
				});
				this.waitObserver.observe(document.body, {
					childList: true,
					subtree: true
				});
				tryAttach();
			}
			/** Attach to the frame: columns, handles, observers, store subscription. */
			attach(frame) {
				this.frame = frame;
				frameElement = frame;
				const previewCol = document.createElement("div");
				previewCol.dataset.aionuiPreviewCol = "";
				previewCol.className = "aionui-preview-col";
				previewCol.style.minWidth = "0";
				previewCol.style.overflow = "hidden";
				previewCol.style.display = "flex";
				previewCol.style.flexDirection = "column";
				previewCol.style.borderLeft = "1px solid var(--aion-bg-3, #e5e6eb)";
				const explorerCol = document.createElement("div");
				explorerCol.dataset.aionuiExplorerCol = "";
				explorerCol.className = "aionui-explorer-col";
				explorerCol.style.minWidth = "0";
				explorerCol.style.overflow = "hidden";
				explorerCol.style.display = "flex";
				explorerCol.style.flexDirection = "column";
				explorerCol.style.borderLeft = "1px solid var(--aion-bg-3, #e5e6eb)";
				frame.appendChild(previewCol);
				frame.appendChild(explorerCol);
				this.previewCol = previewCol;
				this.explorerCol = explorerCol;
				this.explorerHandle = this.createHandle("aionui-explorer-handle", 12, true, "explorer");
				this.previewHandle = this.createHandle("aionui-preview-handle", 20, true, "preview");
				frame.appendChild(this.explorerHandle);
				frame.appendChild(this.previewHandle);
				this.floatingButton = document.createElement("button");
				this.floatingButton.type = "button";
				this.floatingButton.className = "aionui-floating-expand";
				this.floatingButton.setAttribute("aria-label", "Expand explorer");
				this.floatingButton.innerHTML = "<svg viewBox=\"0 0 16 16\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M6 3l5 5-5 5\"/></svg>";
				this.floatingButton.addEventListener("click", () => {
					this.toggleExplorer();
				});
				document.body.appendChild(this.floatingButton);
				const syncGrid = () => {
					const el = this.frame;
					if (el === null) return;
					const inline = el.style.gridTemplateColumns;
					if (inline === "") return;
					const tracks = parseGridTracks(inline);
					if (tracks.length >= 2 && tracks.length <= 3) {
						this.shellTracks = tracks;
						this.applyGrid();
						return;
					}
					if (tracks.length === 5 && this.shellTracks.length === 3) return;
				};
				this.styleObserver = new MutationObserver(syncGrid);
				this.styleObserver.observe(frame, {
					attributes: true,
					attributeFilter: ["style"]
				});
				const measure = () => {
					if (this.frame === null) return;
					this.frameWidth = this.frame.getBoundingClientRect().width;
					const sidebar = this.shellTracks.length >= 1 ? trackPx(this.shellTracks[0]) : 0;
					const details = this.shellTracks.length >= 3 ? trackPx(this.shellTracks[2]) : 0;
					const available = Math.max(0, this.frameWidth - sidebar - details);
					const state = this.layout.getSnapshot();
					if (Math.abs(state.availableWidth - available) > .5) this.layout.update((prev) => ({
						...prev,
						availableWidth: available
					}));
					this.layout.shrinkToFit(this.layout.getSnapshot());
				};
				this.sizeObserver = new ResizeObserver(() => {
					measure();
					this.applyGrid();
				});
				this.sizeObserver.observe(frame);
				this.disposers.push(this.layout.subscribe(() => this.applyGrid()));
				const initial = frame.style.gridTemplateColumns;
				if (initial !== "") {
					const tracks = parseGridTracks(initial);
					if (tracks.length >= 2 && tracks.length <= 3) this.shellTracks = tracks;
					else if (tracks.length === 5 && trackPx(tracks[0]) > 0) this.shellTracks = tracks.slice(0, 3);
				}
				measure();
				this.applyGrid();
			}
			/** Create one drag handle element with its pointer wiring. */
			createHandle(className, hitWidth, reverse, kind) {
				const el = document.createElement("div");
				el.className = className;
				el.style.position = "absolute";
				el.style.top = "0";
				el.style.bottom = "0";
				el.style.zIndex = "30";
				el.style.cursor = "col-resize";
				el.style.width = `${hitWidth}px`;
				if (reverse) el.style.marginLeft = `-${hitWidth}px`;
				el.addEventListener("pointerdown", (event) => {
					const isExplorer = kind === "explorer";
					handlePointerDragStart(event, el, {
						reverse,
						getStartWidth: () => {
							const state = this.layout.getSnapshot();
							return isExplorer ? state.explorerWidth : state.previewWidth;
						},
						compute: (startWidth, deltaX) => {
							if (isExplorer) return Math.min(500, Math.max(220, startWidth + deltaX));
							return Math.min(MAX_PREVIEW_REGION_PX, Math.max(340, startWidth + deltaX));
						},
						onFrame: (width) => {
							this.layout.update((prev) => isExplorer ? {
								...prev,
								explorerWidth: width
							} : {
								...prev,
								previewWidth: width
							});
						},
						onEnd: (width) => {
							writeStoredNumber(isExplorer ? KEY_EXPLORER_WIDTH : KEY_PREVIEW_WIDTH, width);
						}
					});
				});
				el.addEventListener("dblclick", () => {
					this.instant(() => {
						const width = kind === "explorer" ? 260 : 480;
						this.layout.update((prev) => kind === "explorer" ? {
							...prev,
							explorerWidth: width
						} : {
							...prev,
							previewWidth: width
						});
						writeStoredNumber(kind === "explorer" ? KEY_EXPLORER_WIDTH : KEY_PREVIEW_WIDTH, width);
						this.applyGrid();
					});
				});
				return el;
			}
			/** Toggle explorer collapse (width 0, kept mounted; no transition). */
			toggleExplorer() {
				const state = this.layout.getSnapshot();
				const next = !state.explorerCollapsed;
				this.instant(() => {
					this.layout.update((prev) => ({
						...prev,
						explorerCollapsed: next
					}));
					try {
						localStorage.setItem(`project-panel-collapse:${state.root}`, next ? "collapsed" : "expanded");
					} catch {}
					this.applyGrid();
				});
			}
			/** Toggle the preview region (open = tabs exist; close keeps tabs). */
			setPreviewOpen(open) {
				this.instant(() => {
					this.layout.update((prev) => ({
						...prev,
						previewOpen: open
					}));
					this.applyGrid();
				});
			}
			/** Apply one store update with transitions disabled for exactly one frame. */
			instant(fn) {
				const frame = this.frame;
				if (frame === null) {
					fn();
					return;
				}
				frame.setAttribute("data-aionui-instant", "");
				if (this.instantTimer !== void 0) clearTimeout(this.instantTimer);
				this.instantTimer = setTimeout(() => {
					this.instantTimer = void 0;
					frame.removeAttribute("data-aionui-instant");
				}, 0);
				fn();
			}
			/** Re-write the frame grid and reposition handles + floating button. */
			applyGrid() {
				const frame = this.frame;
				if (frame === null) return;
				if (this.shellTracks.length !== 3) return;
				const state = this.layout.getSnapshot();
				const explorer = this.layout.explorerWidthPx(state);
				const preview = this.layout.previewWidthPx(state);
				frame.style.gridTemplateColumns = `${this.shellTracks[0]} minmax(0, 1fr) ${this.shellTracks[2]} ${Math.round(preview)}px ${Math.round(explorer)}px`;
				if (this.explorerCol !== null) this.explorerCol.style.visibility = explorer > 0 ? "visible" : "hidden";
				if (this.previewCol !== null) this.previewCol.style.visibility = preview > 0 ? "visible" : "hidden";
				const width = this.frameWidth > 0 ? this.frameWidth : frame.getBoundingClientRect().width;
				if (this.explorerHandle !== null) {
					const left = Math.round(width - explorer);
					this.explorerHandle.style.left = `${left}px`;
					this.explorerHandle.style.marginLeft = `${-12 / 2}px`;
					this.explorerHandle.style.display = explorer > 0 && state.root !== "" ? "block" : "none";
				}
				if (this.previewHandle !== null) {
					const left = Math.round(width - explorer - preview);
					this.previewHandle.style.left = `${left}px`;
					this.previewHandle.style.display = preview > 0 && state.root !== "" ? "block" : "none";
				}
				if (this.floatingButton !== null) {
					const show = state.root !== "" && state.explorerCollapsed;
					this.floatingButton.style.display = show ? "flex" : "none";
				}
			}
			/** Detach everything (plugin unload). */
			dispose() {
				this.waitObserver?.disconnect();
				this.styleObserver?.disconnect();
				this.sizeObserver?.disconnect();
				for (const dispose of this.disposers) dispose();
				this.previewCol?.remove();
				this.explorerCol?.remove();
				this.explorerHandle?.remove();
				this.previewHandle?.remove();
				this.floatingButton?.remove();
				if (this.instantTimer !== void 0) clearTimeout(this.instantTimer);
				if (frameElement === this.frame) frameElement = null;
				this.frame = null;
			}
		};
		//#endregion
		//#region src/client/locales.ts
		/**
		* Locale strings for the panel surfaces (zh/en). The client registers the
		* dictionary through the locale service like the sibling plugins; copy is
		* deliberately short and technical.
		* @module dsh-aionui-panel/client/locales
		*/
		const zh = {
			"explorer.tabs.files": "文件",
			"explorer.tabs.changes": "变更",
			"explorer.search.placeholder": "按文件名搜索",
			"explorer.search.searching": "搜索中…",
			"explorer.search.empty": "没有匹配的文件",
			"explorer.search.error": "搜索失败",
			"explorer.search.truncated": "结果过多，仅显示前 {count} 条",
			"explorer.tree.empty": "项目为空",
			"explorer.collapse": "收起面板",
			"explorer.expand": "展开面板",
			"explorer.openPreview": "打开预览",
			"explorer.drag.dropHint": "松手插入文件路径",
			"scm.repositories": "存储库",
			"scm.changes": "变更",
			"scm.staged": "已暂存",
			"scm.unstaged": "变更",
			"scm.untracked": "未跟踪",
			"scm.conflicted": "冲突",
			"scm.stage": "暂存",
			"scm.unstage": "取消暂存",
			"scm.discard": "放弃更改",
			"scm.stageAll": "全部暂存",
			"scm.discardAll": "全部放弃",
			"scm.empty": "没有更改",
			"scm.notRepo": "当前目录不是 git 仓库",
			"scm.gitMissing": "未检测到 git，请先安装 git 后重试",
			"scm.loading": "读取状态中…",
			"scm.failed": "操作失败",
			"scm.viewList": "列表视图",
			"scm.viewTree": "树视图",
			"scm.discardConfirmTracked": "放弃对 {count} 个文件的更改？此操作不可恢复。",
			"scm.discardConfirmUntracked": "删除 {count} 个未跟踪文件？此操作不可恢复。",
			"preview.noTabs": "没有打开的预览",
			"preview.newUrlTab": "新建 URL 预览",
			"preview.collapsePanel": "收起预览面板",
			"preview.source": "源码",
			"preview.preview": "预览",
			"preview.editor": "编辑器",
			"preview.split": "分屏",
			"preview.refresh": "刷新",
			"preview.refresh.updated": "文件已在磁盘更新",
			"preview.save": "保存",
			"preview.download": "下载",
			"preview.openExternal": "在系统应用中打开",
			"preview.dirty": "未保存的更改",
			"preview.closeLeft": "关闭左侧",
			"preview.closeRight": "关闭右侧",
			"preview.closeOthers": "关闭其他",
			"preview.closeAll": "关闭全部",
			"preview.closeConfirmTitle": "关闭未保存的标签页",
			"preview.closeConfirmBody": "{count} 个标签页有未保存的更改，关闭将丢失这些更改。",
			"preview.saved": "已保存",
			"preview.saveConflict": "文件已在磁盘上被修改，保存冲突：请刷新后重试",
			"preview.errorOversized": "文件过大，仅加载前 80,000 字符",
			"preview.unsupported": "此格式暂不支持预览",
			"preview.downloadHint": "可在系统应用中打开或下载查看",
			"preview.url.placeholder": "输入网址，回车打开",
			"preview.url.hint": "按 Esc 还原",
			"common.cancel": "取消",
			"common.confirm": "确定",
			"common.close": "关闭",
			"common.delete": "删除",
			"common.copyPath": "复制路径",
			"common.copied": "已复制"
		};
		const en = {
			"explorer.tabs.files": "Files",
			"explorer.tabs.changes": "Changes",
			"explorer.search.placeholder": "Search file names",
			"explorer.search.searching": "Searching…",
			"explorer.search.empty": "No matching files",
			"explorer.search.error": "Search failed",
			"explorer.search.truncated": "Too many results, showing first {count}",
			"explorer.tree.empty": "The project is empty",
			"explorer.collapse": "Collapse panel",
			"explorer.expand": "Expand panel",
			"explorer.openPreview": "Open preview",
			"explorer.drag.dropHint": "Release to insert the file path",
			"scm.repositories": "Repositories",
			"scm.changes": "Changes",
			"scm.staged": "Staged",
			"scm.unstaged": "Changes",
			"scm.untracked": "Untracked",
			"scm.conflicted": "Conflict",
			"scm.stage": "Stage",
			"scm.unstage": "Unstage",
			"scm.discard": "Discard",
			"scm.stageAll": "Stage all",
			"scm.discardAll": "Discard all",
			"scm.empty": "No changes",
			"scm.notRepo": "Not a git repository",
			"scm.gitMissing": "Git is not installed. Install git and reload to use the changes panel",
			"scm.loading": "Loading status…",
			"scm.failed": "Operation failed",
			"scm.viewList": "List view",
			"scm.viewTree": "Tree view",
			"scm.discardConfirmTracked": "Discard changes in {count} files? This cannot be undone.",
			"scm.discardConfirmUntracked": "Delete {count} untracked files? This cannot be undone.",
			"preview.noTabs": "No open previews",
			"preview.newUrlTab": "New URL preview",
			"preview.collapsePanel": "Collapse preview panel",
			"preview.source": "Source",
			"preview.preview": "Preview",
			"preview.editor": "Editor",
			"preview.split": "Split",
			"preview.refresh": "Refresh",
			"preview.refresh.updated": "File updated on disk",
			"preview.save": "Save",
			"preview.download": "Download",
			"preview.openExternal": "Open in system app",
			"preview.dirty": "Unsaved changes",
			"preview.closeLeft": "Close left",
			"preview.closeRight": "Close right",
			"preview.closeOthers": "Close others",
			"preview.closeAll": "Close all",
			"preview.closeConfirmTitle": "Close unsaved tabs",
			"preview.closeConfirmBody": "{count} tabs have unsaved changes. Closing will lose them.",
			"preview.saved": "Saved",
			"preview.saveConflict": "File changed on disk. Save conflict: refresh and retry",
			"preview.errorOversized": "File too large, only the first 80,000 characters loaded",
			"preview.unsupported": "Preview not supported for this format",
			"preview.downloadHint": "Open in a system app or download to view",
			"preview.url.placeholder": "Enter a URL and press Enter",
			"preview.url.hint": "Press Esc to revert",
			"common.cancel": "Cancel",
			"common.confirm": "OK",
			"common.close": "Close",
			"common.delete": "Delete",
			"common.copyPath": "Copy path",
			"common.copied": "Copied"
		};
		/** The dictionary namespace this plugin owns. */
		const NS = "aionui-panel";
		/** Format one copy string with {name} placeholders. */
		function format(template, params) {
			return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
		}
		/** Simple dictionary access (zh/en by a global flag the client sets). */
		const dictionaries = {
			zh,
			en
		};
		let currentLanguage = "zh";
		/** Set the active language (the client mirrors the locale service). */
		function setLanguage(language) {
			currentLanguage = language === "en" ? "en" : "zh";
		}
		/** Translate one key with optional params. */
		function t(key, params) {
			const template = (dictionaries[currentLanguage] ?? zh)[key] ?? zh[key];
			return params === void 0 ? template : format(template, params);
		}
		//#endregion
		//#region src/client/hooks/useStore.ts
		/**
		* React bindings for the framework-free stores: useSyncExternalStore with a
		* stable snapshot (the stores return immutable snapshots, so selector-free
		* subscription is safe), plus a stable-callback helper for event handlers.
		* @module dsh-aionui-panel/client/hooks/useStore
		*/
		/** Subscribe a component to one store (full snapshot). */
		function useStore(store) {
			return (0, react.useSyncExternalStore)(store.subscribe, store.getSnapshot, store.getSnapshot);
		}
		//#endregion
		//#region src/client/components/icons.tsx
		const base = (size) => ({
			width: size,
			height: size,
			viewBox: "0 0 16 16",
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 1.3,
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": true
		});
		function FolderIcon({ size = 16, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				...base(size),
				className,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2 3.5h4l1.5 2H14a1 1 0 0 1 1 1V12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" })
			});
		}
		function FolderOpenIcon({ size = 16, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base(size),
				className,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2 3.5h4l1.5 2H14a1 1 0 0 1 1 1v1H3.5a1 1 0 0 0-.96.72L1 13.5V4.5a1 1 0 0 1 1-1Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2.8 11.5 4 7.5h11l-1.4 4a1 1 0 0 1-.96.72H3.76a1 1 0 0 1-.96-.72Z" })]
			});
		}
		function FileIcon({ size = 16, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base(size),
				className,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 2h5l3 3v9H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 2v3h3" })]
			});
		}
		function FileCodeIcon({ size = 16, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base(size),
				className,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 2h5l3 3v9H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 2v3h3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6.2 8.6-1.4 1.4 1.4 1.4M9.8 8.6l1.4 1.4-1.4 1.4" })
				]
			});
		}
		function FileImageIcon({ size = 16, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base(size),
				className,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 2h5l3 3v9H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 2v3h3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "6.2",
						cy: "6.8",
						r: "1"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m5 11 1.8-1.8 1.4 1.4 1.3-1.3L12 12" })
				]
			});
		}
		function FileTextIcon({ size = 16, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base(size),
				className,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 2h5l3 3v9H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M9 2v3h3" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6 9h4M6 11.2h4" })
				]
			});
		}
		function ChevronRightIcon({ size = 14, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				...base(size),
				className,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 3.5 4.5 4.5L6 12.5" })
			});
		}
		function CloseIcon({ size = 12, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				...base(size),
				className,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m3.5 3.5 9 9M12.5 3.5l-9 9" })
			});
		}
		function PlusIcon({ size = 14, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				...base(size),
				className,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 3v10M3 8h10" })
			});
		}
		function MinusIcon({ size = 14, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				...base(size),
				className,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 8h10" })
			});
		}
		function UndoIcon({ size = 14, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base(size),
				className,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 3.5 2.5 6 5 8.5" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2.5 6h8a3.5 3.5 0 0 1 0 7h-3" })]
			});
		}
		function RefreshIcon({ size = 14, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base(size),
				className,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M13 8a5 5 0 1 1-1.6-3.65" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M13.5 2v2.8h-2.8" })]
			});
		}
		function SplitIcon({ size = 14, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base(size),
				className,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
					x: "2",
					y: "2.5",
					width: "12",
					height: "11",
					rx: "1"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 2.5v11" })]
			});
		}
		function CodeIcon({ size = 14, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				...base(size),
				className,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m5.5 4.5-4 3.5 4 3.5M10.5 4.5l4 3.5-4 3.5" })
			});
		}
		function EyeIcon({ size = 14, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base(size),
				className,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "8",
					cy: "8",
					r: "2"
				})]
			});
		}
		function SaveIcon({ size = 14, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base(size),
				className,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M3 2.5h8l2.5 2.5v8.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M5 2.5v3.5h4.5V2.5M5 13.5V9.5h6v4" })]
			});
		}
		function DownloadIcon({ size = 14, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base(size),
				className,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M8 2v7.5M4.5 6.5 8 10l3.5-3.5" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2.5 13h11" })]
			});
		}
		function SearchIcon({ size = 14, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base(size),
				className,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
					cx: "7",
					cy: "7",
					r: "4.5"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m10.5 10.5 3 3" })]
			});
		}
		function BranchIcon({ size = 14, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base(size),
				className,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "4",
						cy: "3.5",
						r: "1.5"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "4",
						cy: "12.5",
						r: "1.5"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
						cx: "12",
						cy: "6.5",
						r: "1.5"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M4 5v5M4 10.5c0-2 2-2.5 4-2.5s4-.5 4-1.5" })
				]
			});
		}
		function ListIcon({ size = 14, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				...base(size),
				className,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2.5 4h11M2.5 8h11M2.5 12h11" })
			});
		}
		function TreeIcon({ size = 14, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base(size),
				className,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2.5 3.5h6M8.5 8h5M2.5 8h2" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6 3.5v7" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M11 8v4.5h-2.5" })
				]
			});
		}
		function ShrinkIcon({ size = 14, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				...base(size),
				className,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M14 14 10 10M10 14v-4h4" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M2 2l4 4M6 2v4H2" })]
			});
		}
		function ExpandRightIcon({ size = 16, className }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				...base(size),
				className,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M6 3.5 11.5 8 6 12.5" })
			});
		}
		//#endregion
		//#region src/client/components/FileIcon.tsx
		/** The icon for one tree entry (16x16, currentColor). */
		function FileTypeIcon({ name, isDir, expanded, className }) {
			if (isDir) return expanded ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderOpenIcon, {
				size: 16,
				className
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FolderIcon, {
				size: 16,
				className
			});
			switch (detectContentType(name)) {
				case "image": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileImageIcon, {
					size: 16,
					className
				});
				case "markdown":
				case "text": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileTextIcon, {
					size: 16,
					className
				});
				case "code":
				case "diff":
				case "csv":
				case "html": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileCodeIcon, {
					size: 16,
					className
				});
				default: return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileIcon, {
					size: 16,
					className
				});
			}
		}
		//#endregion
		//#region src/client/components/overlay.tsx
		/**
		* Minimal overlay primitives for the panel: a toast and a context menu,
		* rendered through plain DOM + portals so they can live outside the grid
		* columns (fixed positioning, high z-index).
		* @module dsh-aionui-panel/client/components/overlay
		*/
		/** The shared context-menu portal host (one at a time). */
		function ContextMenu({ state, onClose }) {
			const [position, setPosition] = (0, react.useState)(null);
			(0, react.useLayoutEffect)(() => {
				if (state === null) {
					setPosition(null);
					return;
				}
				const width = 180;
				const height = state.entries.length * 28 + 12;
				setPosition({
					x: Math.min(state.x, window.innerWidth - width - 8),
					y: Math.min(state.y, window.innerHeight - height - 8)
				});
			}, [state]);
			(0, react.useEffect)(() => {
				if (state === null) return;
				const close = (event) => {
					if (event.target instanceof Element && event.target.closest("[data-menu-root]") !== null) return;
					onClose();
				};
				const key = (event) => {
					if (event.key === "Escape") onClose();
				};
				window.addEventListener("pointerdown", close, { capture: true });
				window.addEventListener("blur", onClose);
				window.addEventListener("keydown", key);
				window.addEventListener("contextmenu", onClose);
				return () => {
					window.removeEventListener("pointerdown", close, { capture: true });
					window.removeEventListener("blur", onClose);
					window.removeEventListener("keydown", key);
					window.removeEventListener("contextmenu", onClose);
				};
			}, [state, onClose]);
			if (state === null || position === null) return null;
			return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "aionui-menu",
				"data-menu-root": "",
				style: {
					left: position.x,
					top: position.y
				},
				onPointerDown: (event) => event.stopPropagation(),
				onContextMenu: (event) => event.preventDefault(),
				children: state.entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: entry.label === "---" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "aionui-menu-sep" }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: `aionui-menu-item${entry.disabled === true ? " aionui-menu-item-disabled" : ""}`,
					onClick: () => {
						if (entry.disabled === true) return;
						onClose();
						entry.onSelect();
					},
					role: "menuitem",
					children: entry.label
				}) }, entry.key))
			}), document.body);
		}
		/** A confirmation dialog (dirty-close confirm, discard confirm). */
		function ConfirmDialog({ title, body, confirmLabel, danger, onConfirm, onCancel }) {
			(0, react.useEffect)(() => {
				const key = (event) => {
					if (event.key === "Escape") onCancel();
				};
				window.addEventListener("keydown", key);
				return () => window.removeEventListener("keydown", key);
			}, [onCancel]);
			return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "aionui-overlay",
				onPointerDown: onCancel,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "aionui-dialog",
					onPointerDown: (event) => event.stopPropagation(),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "aionui-dialog-title",
							children: title
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "aionui-dialog-body",
							children: body
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "aionui-dialog-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "aionui-btn",
								onClick: onCancel,
								children: t("common.cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: `aionui-btn ${danger === true ? "aionui-btn-danger" : "aionui-btn-primary"}`,
								onClick: onConfirm,
								children: confirmLabel ?? t("common.confirm")
							})]
						})
					]
				})
			}), document.body);
		}
		//#endregion
		//#region src/client/components/a11y.ts
		/**
		* Keyboard activation parity for focusable rows/divs styled as buttons
		* (role="button" + tabIndex={0}): Enter and Space trigger the same action as
		* a click, and events bubbling out of nested interactive elements (a row's
		* inline action buttons, a tab's close control) are ignored so they never
		* double-activate the row.
		* @param handler - the activation handler (the element's click action).
		* @returns a keydown handler for the focusable element.
		*/
		function activateOnKey(handler) {
			return (event) => {
				if (event.target !== event.currentTarget) return;
				if (event.key === "Enter" || event.key === " ") {
					event.preventDefault();
					handler();
				}
			};
		}
		//#endregion
		//#region \0dsh-css:packages/dsh-aionui-panel/src/client/styles/scm.module.css.mjs
		const css$4 = ".lK0Kdq_panel{flex-direction:column;height:100%;min-height:0;display:flex}.lK0Kdq_section{flex-direction:column;flex-shrink:0;min-height:0;display:flex}.lK0Kdq_sectionHeader{cursor:pointer;user-select:none;background:var(--aion-bg-1);flex-shrink:0;align-items:center;gap:6px;height:24px;padding:0 8px;display:flex}.lK0Kdq_sectionHeader:hover{background:var(--aion-bg-hover)}.lK0Kdq_sectionHeader:active{background:var(--aion-bg-active)}.lK0Kdq_sectionHeader:focus-visible{box-shadow:inset 0 0 0 2px var(--aion-primary)}.lK0Kdq_sectionTitle{color:var(--aion-text-primary);text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;font-size:12px;font-weight:600;overflow:hidden}.lK0Kdq_sectionChevron{color:var(--aion-text-secondary);align-items:center;transition:transform .15s cubic-bezier(.4,0,.2,1);display:flex}.lK0Kdq_sectionChevronOpen{transform:rotate(90deg)}.lK0Kdq_sectionAction{width:22px;height:22px;color:var(--aion-text-secondary);cursor:pointer;background:0 0;border:none;border-radius:4px;flex-shrink:0;justify-content:center;align-items:center;padding:0;transition:background-color .15s cubic-bezier(.4,0,.2,1);display:flex}.lK0Kdq_sectionAction:hover{background:var(--aion-bg-3);color:var(--aion-text-primary)}.lK0Kdq_sectionAction:active{background:var(--aion-bg-active)}.lK0Kdq_sectionAction:focus-visible{outline:2px solid var(--aion-primary);outline-offset:2px}.lK0Kdq_sectionAction:disabled{opacity:.4;cursor:default}.lK0Kdq_sectionAction:disabled:hover{color:var(--aion-text-secondary);background:0 0}.lK0Kdq_sectionBody{flex-shrink:1;min-height:0;overflow:hidden auto}.lK0Kdq_branchRow{height:26px;color:var(--aion-text-primary);align-items:center;gap:6px;padding:0 8px 0 12px;font-size:13px;display:flex}.lK0Kdq_branchName{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.lK0Kdq_changeRow{cursor:pointer;white-space:nowrap;align-items:center;gap:6px;height:26px;padding:0 8px 0 12px;transition:background-color .12s;display:flex}.lK0Kdq_changeRow:hover{background:var(--aion-fill-2)}.lK0Kdq_changeRow:active{background:var(--aion-bg-active)}.lK0Kdq_changeRow:focus-visible{box-shadow:inset 0 0 0 2px var(--aion-primary)}.lK0Kdq_changeRowSelected,.lK0Kdq_changeRowSelected:hover{background:var(--aion-fill-3)}.lK0Kdq_badge{width:16px;height:16px;font-size:11px;font-weight:600;font-family:var(--aion-font-mono);border-radius:3px;flex-shrink:0;justify-content:center;align-items:center;display:flex}.lK0Kdq_badgeCreated{color:var(--aion-success);background:color-mix(in srgb, var(--aion-success) 14%, transparent)}.lK0Kdq_badgeModified{color:var(--aion-warning);background:color-mix(in srgb, var(--aion-warning) 14%, transparent)}.lK0Kdq_badgeDeleted{color:var(--aion-danger);background:color-mix(in srgb, var(--aion-danger) 14%, transparent)}.lK0Kdq_badgeConflicted{color:var(--aion-danger);background:color-mix(in srgb, var(--aion-danger) 18%, transparent);border:1px solid var(--aion-danger)}.lK0Kdq_badgeUntracked{color:var(--aion-text-tertiary);background:var(--aion-fill-2)}.lK0Kdq_changeName{text-overflow:ellipsis;color:var(--aion-text-primary);flex:1;min-width:0;font-size:13px;overflow:hidden}.lK0Kdq_changeDir{text-overflow:ellipsis;color:var(--aion-text-tertiary);flex-shrink:1;min-width:0;font-size:11px;overflow:hidden}.lK0Kdq_rowActions{opacity:0;flex-shrink:0;align-items:center;gap:2px;transition:opacity .15s cubic-bezier(.4,0,.2,1);display:flex}.lK0Kdq_changeRow:hover .lK0Kdq_rowActions,.lK0Kdq_changeRow:focus-within .lK0Kdq_rowActions,.lK0Kdq_rowActionsVisible{opacity:1}.lK0Kdq_rowAction{width:22px;height:22px;color:var(--aion-text-secondary);cursor:pointer;background:0 0;border:none;border-radius:4px;justify-content:center;align-items:center;padding:0;transition:background-color .15s cubic-bezier(.4,0,.2,1);display:flex}.lK0Kdq_rowAction:hover{background:var(--aion-bg-3);color:var(--aion-text-primary)}.lK0Kdq_rowAction:active{background:var(--aion-bg-active)}.lK0Kdq_rowAction:focus-visible{outline:2px solid var(--aion-primary);outline-offset:2px}.lK0Kdq_rowAction:disabled{opacity:.4;cursor:default}.lK0Kdq_rowAction:disabled:hover{color:var(--aion-text-secondary);background:0 0}.lK0Kdq_rowFailed{color:var(--aion-danger)}.lK0Kdq_groupTitle{height:22px;color:var(--aion-text-tertiary);background:var(--aion-bg-2);flex-shrink:0;align-items:center;gap:6px;padding:0 8px 0 12px;font-size:11px;font-weight:600;display:flex}.lK0Kdq_groupAction{width:18px;height:18px;color:var(--aion-text-secondary);cursor:pointer;background:0 0;border:none;border-radius:3px;justify-content:center;align-items:center;padding:0;display:flex}.lK0Kdq_groupAction:hover{background:var(--aion-bg-3);color:var(--aion-text-primary)}.lK0Kdq_groupAction:active{background:var(--aion-bg-active)}.lK0Kdq_groupAction:focus-visible{outline:2px solid var(--aion-primary);outline-offset:2px}.lK0Kdq_groupAction:disabled{opacity:.4;cursor:default}.lK0Kdq_groupAction:disabled:hover{color:var(--aion-text-secondary);background:0 0}.lK0Kdq_dirRow{cursor:pointer;white-space:nowrap;align-items:center;gap:4px;height:26px;transition:background-color .12s;display:flex}.lK0Kdq_dirRow:hover{background:var(--aion-fill-2)}.lK0Kdq_dirRow:active{background:var(--aion-bg-active)}.lK0Kdq_dirRow:focus-visible{box-shadow:inset 0 0 0 2px var(--aion-primary)}.lK0Kdq_dirArrow{color:var(--aion-text-tertiary);align-items:center;transition:transform .15s cubic-bezier(.4,0,.2,1);display:flex}.lK0Kdq_dirArrowOpen{transform:rotate(90deg)}.lK0Kdq_empty,.lK0Kdq_loading{color:var(--aion-text-tertiary);padding:16px 12px;font-size:12px}.lK0Kdq_notRepo{color:var(--aion-text-tertiary);padding:16px 12px;font-size:12px;line-height:1.6}";
		const tagId$4 = "@linxin666/dsh-client-ui-aionui-panel/scm.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@linxin666/dsh-client-ui-aionui-panel";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		var scm_module_css_default = {
			"badge": "lK0Kdq_badge",
			"badgeConflicted": "lK0Kdq_badgeConflicted",
			"badgeCreated": "lK0Kdq_badgeCreated",
			"badgeDeleted": "lK0Kdq_badgeDeleted",
			"badgeModified": "lK0Kdq_badgeModified",
			"badgeUntracked": "lK0Kdq_badgeUntracked",
			"branchName": "lK0Kdq_branchName",
			"branchRow": "lK0Kdq_branchRow",
			"changeDir": "lK0Kdq_changeDir",
			"changeName": "lK0Kdq_changeName",
			"changeRow": "lK0Kdq_changeRow",
			"changeRowSelected": "lK0Kdq_changeRowSelected",
			"dirArrow": "lK0Kdq_dirArrow",
			"dirArrowOpen": "lK0Kdq_dirArrowOpen",
			"dirRow": "lK0Kdq_dirRow",
			"empty": "lK0Kdq_empty",
			"groupAction": "lK0Kdq_groupAction",
			"groupTitle": "lK0Kdq_groupTitle",
			"loading": "lK0Kdq_loading",
			"notRepo": "lK0Kdq_notRepo",
			"panel": "lK0Kdq_panel",
			"rowAction": "lK0Kdq_rowAction",
			"rowActions": "lK0Kdq_rowActions",
			"rowActionsVisible": "lK0Kdq_rowActionsVisible",
			"rowFailed": "lK0Kdq_rowFailed",
			"section": "lK0Kdq_section",
			"sectionAction": "lK0Kdq_sectionAction",
			"sectionBody": "lK0Kdq_sectionBody",
			"sectionChevron": "lK0Kdq_sectionChevron",
			"sectionChevronOpen": "lK0Kdq_sectionChevronOpen",
			"sectionHeader": "lK0Kdq_sectionHeader",
			"sectionTitle": "lK0Kdq_sectionTitle"
		};
		//#endregion
		//#region src/client/components/ScmPanel.tsx
		/**
		* The Changes (SCM) panel: per-repo working-tree status grouped into staged /
		* unstaged / untracked, with stage/unstage/discard actions on every row and
		* bulk actions in the section header. The host status is the only truth — no
		* optimistic rows; a failed batch surfaces its paths and the next refresh
		* clears the flag. Discard confirms with copy split by recoverability
		* (untracked = delete vs tracked = irreversible restore).
		*
		* AionUi ScmPanel behavior (Apache-2.0, re-implemented): window focus
		* refreshes (external editors write without git events), unknown states
		* render as a quiet '?', conflicted rows are visually distinct AND have no
		* actions.
		* @module dsh-aionui-panel/client/components/ScmPanel
		*/
		/** Minimum gap between window-focus SCM refreshes (ms). */
		const FOCUS_REFRESH_MIN_MS = 5e3;
		/** Badge letter + color class per state. */
		const BADGE = {
			created: {
				letter: "A",
				className: scm_module_css_default.badgeCreated
			},
			modified: {
				letter: "M",
				className: scm_module_css_default.badgeModified
			},
			deleted: {
				letter: "D",
				className: scm_module_css_default.badgeDeleted
			},
			renamed: {
				letter: "R",
				className: scm_module_css_default.badgeCreated
			},
			conflicted: {
				letter: "!",
				className: scm_module_css_default.badgeConflicted
			},
			untracked: {
				letter: "?",
				className: scm_module_css_default.badgeUntracked
			},
			unknown: {
				letter: "?",
				className: scm_module_css_default.badgeUntracked
			}
		};
		/** The parent dir of a path ('' for root-level). */
		function dirOf$1(path) {
			const idx = path.lastIndexOf("/");
			return idx > 0 ? path.slice(0, idx) : "";
		}
		/** Build a display-only directory tree from rows. */
		function buildTree(rows) {
			const byDir = /* @__PURE__ */ new Map();
			for (const row of rows) {
				const dir = dirOf$1(row.path);
				const list = byDir.get(dir);
				if (list === void 0) byDir.set(dir, [row]);
				else list.push(row);
			}
			return byDir;
		}
		/** The SCM tab body.
		* @param stores - the panel store bundle.
		*/
		function ScmPanel({ stores }) {
			const scm = stores.scm;
			const preview = stores.preview;
			const state = useStore(scm);
			const [discardTargets, setDiscardTargets] = (0, react.useState)(null);
			const lastFocusRefresh = (0, react.useRef)(-Infinity);
			(0, react.useEffect)(() => {
				const onFocus = () => {
					const now = Date.now();
					if (now - lastFocusRefresh.current < FOCUS_REFRESH_MIN_MS) return;
					lastFocusRefresh.current = now;
					scm.refresh();
				};
				window.addEventListener("focus", onFocus);
				return () => window.removeEventListener("focus", onFocus);
			}, [scm]);
			const status = state.status;
			const changesSectionOpen = state.sectionCollapsed["changes"] !== true;
			const requestDiscard = (rows) => {
				if (rows.length === 0) return;
				setDiscardTargets(rows);
			};
			const confirmDiscard = () => {
				if (discardTargets === null) return;
				scm.discard(discardTargets.map((row) => row.path));
				setDiscardTargets(null);
			};
			if (state.loading && status === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: `aionui-root ${scm_module_css_default.panel}`,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: scm_module_css_default.loading,
					children: t("scm.loading")
				})
			});
			if (state.gitMissing) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: `aionui-root ${scm_module_css_default.panel}`,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: scm_module_css_default.notRepo,
					children: t("scm.gitMissing")
				})
			});
			if (status === null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: `aionui-root ${scm_module_css_default.panel}`,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: scm_module_css_default.notRepo,
					children: t("scm.notRepo")
				})
			});
			const staged = status.staged;
			const unstaged = status.unstaged;
			const untracked = status.untracked;
			const hasChanges = staged.length + unstaged.length + untracked.length > 0;
			const allUntracked = discardTargets !== null && discardTargets.every((row) => row.state === "untracked");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `aionui-root ${scm_module_css_default.panel}`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: scm_module_css_default.section,
					style: {
						flex: changesSectionOpen ? 1 : void 0,
						maxHeight: changesSectionOpen ? void 0 : 24
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: scm_module_css_default.sectionHeader,
						onClick: () => scm.setSectionCollapsed("changes", changesSectionOpen),
						onKeyDown: activateOnKey(() => {
							scm.setSectionCollapsed("changes", changesSectionOpen);
						}),
						role: "button",
						tabIndex: 0,
						"aria-expanded": changesSectionOpen,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: `${scm_module_css_default.sectionChevron}${changesSectionOpen ? ` ${scm_module_css_default.sectionChevronOpen}` : ""}`,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChevronRightIcon, { size: 13 })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: scm_module_css_default.sectionTitle,
								children: t("scm.changes")
							}),
							status.branch !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: scm_module_css_default.branchName,
								style: {
									fontSize: 11,
									color: "var(--aion-text-tertiary)",
									display: "flex",
									alignItems: "center",
									gap: 4
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BranchIcon, { size: 12 }), status.branch]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								style: {
									display: "flex",
									alignItems: "center",
									gap: 2,
									marginLeft: "auto"
								},
								onClick: (event) => event.stopPropagation(),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: scm_module_css_default.sectionAction,
										title: t("scm.stageAll"),
										onClick: () => void scm.stage(unstaged.map((row) => row.path)),
										disabled: unstaged.length === 0,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlusIcon, { size: 13 })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: scm_module_css_default.sectionAction,
										title: t("scm.discardAll"),
										onClick: () => requestDiscard([...unstaged, ...untracked]),
										disabled: unstaged.length + untracked.length === 0,
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UndoIcon, { size: 13 })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: `${scm_module_css_default.sectionAction}${state.viewMode === "list" ? "" : ""}`,
										title: t("scm.viewList"),
										style: { color: state.viewMode === "list" ? "var(--aion-brand)" : void 0 },
										onClick: () => scm.setViewMode("list"),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ListIcon, { size: 13 })
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: scm_module_css_default.sectionAction,
										title: t("scm.viewTree"),
										style: { color: state.viewMode === "tree" ? "var(--aion-brand)" : void 0 },
										onClick: () => scm.setViewMode("tree"),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TreeIcon, { size: 13 })
									})
								]
							})
						]
					}), changesSectionOpen && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: scm_module_css_default.sectionBody,
						children: [
							!hasChanges && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: scm_module_css_default.empty,
								children: t("scm.empty")
							}),
							hasChanges && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Group, {
								scm,
								preview,
								title: staged.length > 0 ? t("scm.staged") : void 0,
								rows: staged,
								bulkLabel: t("scm.unstage"),
								onBulk: (rows) => void scm.unstage(rows.map((row) => row.path)),
								onDiscard: requestDiscard
							}),
							hasChanges && unstaged.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Group, {
								scm,
								preview,
								rows: unstaged,
								bulkLabel: t("scm.stage"),
								onBulk: (rows) => void scm.stage(rows.map((row) => row.path)),
								onDiscard: requestDiscard
							}),
							untracked.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Group, {
								scm,
								preview,
								title: t("scm.untracked"),
								rows: untracked,
								bulkLabel: t("scm.stage"),
								onBulk: (rows) => void scm.stage(rows.map((row) => row.path)),
								onDiscard: requestDiscard
							})
						]
					})]
				}), discardTargets !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConfirmDialog, {
					title: t("scm.discard"),
					body: allUntracked ? format(t("scm.discardConfirmUntracked"), { count: discardTargets.length }) : format(t("scm.discardConfirmTracked"), { count: discardTargets.length }),
					confirmLabel: t("common.delete"),
					danger: true,
					onConfirm: confirmDiscard,
					onCancel: () => setDiscardTargets(null)
				})]
			});
		}
		/** One change group (staged / unstaged / untracked) with list or tree body. */
		function Group({ scm, preview, rows, title, bulkLabel, onBulk, onDiscard }) {
			const state = useStore(scm);
			const tree = (0, react.useMemo)(() => buildTree(rows), [rows]);
			const viewTree = state.viewMode === "tree";
			const allActionable = rows.filter((row) => row.state !== "conflicted");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [title !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: scm_module_css_default.groupTitle,
				children: [title, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: scm_module_css_default.groupAction,
					title: bulkLabel,
					onClick: () => onBulk(allActionable),
					disabled: allActionable.length === 0,
					children: bulkLabel === t("scm.unstage") ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MinusIcon, { size: 12 }) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlusIcon, { size: 12 })
				})]
			}), viewTree ? [...tree.entries()].map(([dir, dirRows]) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DirNode, {
				dir,
				rows: dirRows,
				depth: 0,
				state,
				scm,
				preview,
				onDiscard
			}, dir === "" ? "\0" : dir)) : rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChangeRow, {
				row,
				state,
				scm,
				preview,
				onDiscard
			}, `${row.staged ? "s" : "u"}:${row.path}`))] });
		}
		/** Tree-view directory node (expandable). */
		function DirNode({ dir, rows, depth, state, scm, preview, onDiscard }) {
			const expanded = state.treeExpanded.includes(dir);
			const label = dir === "" ? "/" : dir.split("/").pop() ?? dir;
			const toggleExpanded = () => {
				const next = expanded ? state.treeExpanded.filter((item) => item !== dir) : [...state.treeExpanded, dir];
				scm.setTreeExpanded(next);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: scm_module_css_default.dirRow,
				style: { paddingLeft: 12 + depth * 12 },
				title: dir,
				role: "button",
				tabIndex: 0,
				"aria-expanded": expanded,
				onClick: toggleExpanded,
				onKeyDown: activateOnKey(toggleExpanded),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${scm_module_css_default.dirArrow}${expanded ? ` ${scm_module_css_default.dirArrowOpen}` : ""}`,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChevronRightIcon, { size: 13 })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileTypeIcon, {
						name: label,
						isDir: true,
						expanded
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: {
							fontSize: 13,
							color: "var(--aion-text-primary)"
						},
						children: label
					})
				]
			}), expanded && rows.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChangeRow, {
				row,
				state,
				scm,
				preview,
				onDiscard,
				indent: depth + 1,
				hideDir: true
			}, `${row.staged ? "s" : "u"}:${row.path}`))] });
		}
		/** One change row: badge + name + dimmed dir + hover actions.
		* Clicking the row opens the path's diff in the preview panel (every state
		* has a diff — deleted rows show the removal, untracked rows a new-file diff).
		*/
		function ChangeRow({ row, state, scm, preview, onDiscard, indent = 0, hideDir = false }) {
			const badge = BADGE[row.state] ?? BADGE.unknown;
			const busy = state.busy.includes(row.path);
			const failed = state.failed.includes(row.path);
			const conflicted = row.state === "conflicted";
			const displayName = row.oldPath !== void 0 ? `${row.oldPath.split("/").pop()} -> ${row.path.split("/").pop()}` : row.path.split("/").pop() ?? row.path;
			const dir = dirOf$1(row.path);
			const openInPreview = () => {
				scm.select(row.path);
				preview.openDiff(state.root, row.path, row.staged);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `${scm_module_css_default.changeRow}${state.selected === row.path ? ` ${scm_module_css_default.changeRowSelected}` : ""}${failed ? ` ${scm_module_css_default.rowFailed}` : ""}`,
				style: { paddingLeft: 12 + indent * 12 },
				title: row.path,
				onClick: openInPreview,
				onKeyDown: activateOnKey(openInPreview),
				role: "button",
				tabIndex: 0,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${scm_module_css_default.badge} ${badge.className}`,
						children: badge.letter
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: scm_module_css_default.changeName,
						children: displayName
					}),
					!hideDir && dir !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: scm_module_css_default.changeDir,
						children: dir
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${scm_module_css_default.rowActions}${busy || failed ? ` ${scm_module_css_default.rowActionsVisible}` : ""}`,
						children: conflicted ? null : row.staged ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: scm_module_css_default.rowAction,
							title: t("scm.unstage"),
							disabled: busy,
							onClick: (event) => {
								event.stopPropagation();
								scm.unstage([row.path]);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MinusIcon, { size: 13 })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: scm_module_css_default.rowAction,
							title: t("scm.discard"),
							disabled: busy,
							onClick: (event) => {
								event.stopPropagation();
								onDiscard([row]);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UndoIcon, { size: 13 })
						})] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: scm_module_css_default.rowAction,
							title: t("scm.stage"),
							disabled: busy,
							onClick: (event) => {
								event.stopPropagation();
								scm.stage([row.path]);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlusIcon, { size: 13 })
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: scm_module_css_default.rowAction,
							title: t("scm.discard"),
							disabled: busy,
							onClick: (event) => {
								event.stopPropagation();
								onDiscard([row]);
							},
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UndoIcon, { size: 13 })
						})] })
					})
				]
			});
		}
		//#endregion
		//#region src/client/drag/file-drag.ts
		/**
		* Pure drag-to-composer helpers shared by the explorer rows (the drag
		* source) and the composer dock inlay (the drop target): the custom MIME
		* type, the drag-state detector, and the draft-splicing rule. Deliberately
		* framework-free so the splicing math is unit-testable in isolation.
		*
		* The composer host only accepts OS image drops (its document-level drop
		* handler checks `dataTransfer.types` for `Files` and routes through the
		* image pipeline), so a workspace file needs its own MIME. A plain relative
		* path is inserted into the draft — the agent reads the file through its
		* existing tools without any prefix grammar.
		* @module dsh-aionui-panel/client/drag/file-drag
		*/
		/** Custom MIME carrying a workspace-relative file path. */
		const FILE_DRAG_MIME = "application/x-dsh-file";
		/**
		* Whether a drag event carries our file payload.
		* @param types - the live `dataTransfer.types` list (read-only during drag).
		* @returns true when our MIME is present.
		*/
		function hasFileDrag(types) {
			return types !== void 0 && types.includes("application/x-dsh-file");
		}
		/**
		* Splice a workspace-relative path into a composer draft at the caret.
		*
		* Separator rule: one space is added before the path unless the caret sits
		* at the start of the draft or right after whitespace; one space is added
		* after the path unless the caret sits at the end of the draft or right
		* before whitespace. Empty path or an out-of-range caret are no-ops.
		*
		* @param draft - the current draft text.
		* @param path - the relative path to insert.
		* @param caret - insertion offset (default: the end of the draft).
		* @returns the next draft; the caller owns writing it through the input
		* facade.
		*/
		function insertPathIntoDraft(draft, path, caret) {
			if (path === "") return draft;
			const at = caret === void 0 ? draft.length : Math.min(Math.max(caret, 0), draft.length);
			const before = draft.slice(0, at);
			const after = draft.slice(at);
			const needBefore = before !== "" && !/\s$/.test(before);
			const needAfter = after !== "" && !/^\s/.test(after);
			return before + (needBefore ? " " : "") + path + (needAfter ? " " : "") + after;
		}
		//#endregion
		//#region \0dsh-css:packages/dsh-aionui-panel/src/client/styles/explorer.module.css.mjs
		const css$3 = ".-NprXq_tabBar{z-index:30;border-bottom:1px solid var(--aion-bg-3);background:var(--aion-bg-1);flex-shrink:0;align-items:center;gap:4px;padding:4px 8px 4px 12px;display:flex;position:relative}.-NprXq_tabBtn{height:28px;color:var(--aion-text-secondary);font-size:13px;font-family:var(--aion-font-sans);cursor:pointer;white-space:nowrap;background:0 0;border:none;border-radius:2px;padding:0 8px;transition:background-color .15s cubic-bezier(.4,0,.2,1)}.-NprXq_tabBtn:hover{background:var(--aion-fill-2)}.-NprXq_tabBtn:active{background:var(--aion-bg-active)}.-NprXq_tabBtn:focus-visible{outline:2px solid var(--aion-primary);outline-offset:2px}.-NprXq_tabBtnActive{background:var(--aion-bg-2);height:28px;color:var(--aion-text-primary);font-size:13px;font-family:var(--aion-font-sans);cursor:pointer;white-space:nowrap;border:none;border-radius:2px;padding:0 8px;font-weight:500;transition:background-color .15s cubic-bezier(.4,0,.2,1)}.-NprXq_tabBtnActive:active{background:var(--aion-bg-active)}.-NprXq_tabBtnActive:focus-visible{outline:2px solid var(--aion-primary);outline-offset:2px}.-NprXq_searchArea{flex-shrink:0;padding:8px 8px 4px 12px}.-NprXq_searchBox{background:var(--aion-bg-base);border:1px solid #0000;border-radius:2px;align-items:center;gap:6px;height:28px;padding:0 8px;transition:border-color .15s cubic-bezier(.4,0,.2,1);display:flex}.-NprXq_searchBoxFocus{border-color:var(--aion-primary)}.-NprXq_searchBox:focus-within{box-shadow:0 0 0 2px transparent, 0 0 0 4px var(--aion-primary)}.-NprXq_searchIcon{color:var(--aion-text-secondary);flex-shrink:0;align-items:center;display:flex}.-NprXq_searchInput{min-width:0;height:100%;color:var(--aion-text-primary);font-size:13px;font-family:var(--aion-font-sans);background:0 0;border:none;outline:none;flex:1}.-NprXq_searchInput::placeholder{color:var(--aion-text-tertiary)}.-NprXq_searchClear{width:16px;height:16px;color:var(--aion-text-tertiary);cursor:pointer;background:0 0;border:none;border-radius:2px;justify-content:center;align-items:center;padding:0;display:none}.-NprXq_searchClear:hover{color:var(--aion-text-primary);background:var(--aion-fill-2)}.-NprXq_searchClear:active{background:var(--aion-bg-active)}.-NprXq_searchClear:focus-visible{outline:2px solid var(--aion-primary);outline-offset:2px}.-NprXq_searchAreaFocus .-NprXq_searchClear{display:flex}.-NprXq_scrollArea{flex:1;min-height:0;overflow:hidden auto}.-NprXq_tree{user-select:none;padding:2px 0 8px 12px}.-NprXq_treeRow{cursor:pointer;white-space:nowrap;border-radius:0;align-items:center;gap:4px;min-width:0;height:34px;padding-right:8px;transition:background-color .12s;display:flex}.-NprXq_treeRow:hover{background-color:var(--aion-fill-2)}.-NprXq_treeRow:active{background-color:var(--aion-bg-active)}.-NprXq_treeRowDragging{cursor:grabbing;opacity:.55}.-NprXq_treeRow:focus-visible{box-shadow:inset 0 0 0 2px var(--aion-primary)}.-NprXq_treeRowSelected,.-NprXq_treeRowSelected:hover{background-color:var(--aion-fill-3)}.-NprXq_treeArrow{width:14px;height:14px;color:var(--aion-text-tertiary);flex-shrink:0;justify-content:center;align-items:center;transition:transform .15s cubic-bezier(.4,0,.2,1);display:flex}.-NprXq_treeArrowOpen{transform:rotate(90deg)}.-NprXq_treeArrowEmpty{visibility:hidden}.-NprXq_treeName{text-overflow:ellipsis;color:var(--aion-text-primary);font-size:13px;overflow:hidden}.-NprXq_treeRowSelected .-NprXq_treeName{color:var(--aion-text-primary)}.-NprXq_treeMeta{color:var(--aion-text-tertiary);flex-shrink:0;margin-left:auto;padding-right:4px;font-size:11px}.-NprXq_resultRow{cursor:pointer;white-space:nowrap;align-items:center;gap:6px;height:30px;padding:0 8px 0 12px;transition:background-color .12s;display:flex}.-NprXq_resultRow:hover{background-color:var(--aion-fill-2)}.-NprXq_resultRow:active{background-color:var(--aion-bg-active)}.-NprXq_resultRow:focus-visible{box-shadow:inset 0 0 0 2px var(--aion-primary)}.-NprXq_resultName{text-overflow:ellipsis;color:var(--aion-text-primary);font-size:13px;overflow:hidden}.-NprXq_resultPath{text-overflow:ellipsis;color:var(--aion-text-tertiary);flex-shrink:1;min-width:0;font-size:11px;overflow:hidden}.-NprXq_resultMeta{color:var(--aion-text-tertiary);flex-shrink:0;font-size:11px}.-NprXq_searchStatus{color:var(--aion-text-tertiary);padding:12px;font-size:12px}.-NprXq_emptyState{color:var(--aion-text-tertiary);text-align:center;padding:24px 16px;font-size:12px}";
		const tagId$3 = "@linxin666/dsh-client-ui-aionui-panel/explorer.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@linxin666/dsh-client-ui-aionui-panel";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var explorer_module_css_default = {
			"emptyState": "-NprXq_emptyState",
			"resultMeta": "-NprXq_resultMeta",
			"resultName": "-NprXq_resultName",
			"resultPath": "-NprXq_resultPath",
			"resultRow": "-NprXq_resultRow",
			"scrollArea": "-NprXq_scrollArea",
			"searchArea": "-NprXq_searchArea",
			"searchAreaFocus": "-NprXq_searchAreaFocus",
			"searchBox": "-NprXq_searchBox",
			"searchBoxFocus": "-NprXq_searchBoxFocus",
			"searchClear": "-NprXq_searchClear",
			"searchIcon": "-NprXq_searchIcon",
			"searchInput": "-NprXq_searchInput",
			"searchStatus": "-NprXq_searchStatus",
			"tabBar": "-NprXq_tabBar",
			"tabBtn": "-NprXq_tabBtn",
			"tabBtnActive": "-NprXq_tabBtnActive",
			"tree": "-NprXq_tree",
			"treeArrow": "-NprXq_treeArrow",
			"treeArrowEmpty": "-NprXq_treeArrowEmpty",
			"treeArrowOpen": "-NprXq_treeArrowOpen",
			"treeMeta": "-NprXq_treeMeta",
			"treeName": "-NprXq_treeName",
			"treeRow": "-NprXq_treeRow",
			"treeRowDragging": "-NprXq_treeRowDragging",
			"treeRowSelected": "-NprXq_treeRowSelected"
		};
		//#endregion
		//#region \0dsh-css:packages/dsh-aionui-panel/src/client/styles/tokens.module.css.mjs
		const css$2 = ":root{--aion-bg-base:#fff;--aion-bg-1:#f9fafb;--aion-bg-2:#f2f3f5;--aion-bg-3:#e5e6eb;--aion-bg-hover:#f3f4f6;--aion-bg-active:#e5e6eb;--aion-text-primary:#000;--aion-text-secondary:#454d5f;--aion-text-tertiary:#86909c;--aion-text-disabled:#c9cdd4;--aion-primary:#165dff;--aion-success:#00b42a;--aion-warning:#ff7d00;--aion-danger:#f53f3f;--aion-brand:#7583b2;--aion-aou-1:#eff0f6;--aion-aou-2:#e5e7f0;--aion-aou-3:#d1d5e5;--aion-aou-4:#b5bcd6;--aion-aou-5:#97a0c5;--aion-aou-6:#7583b2;--aion-fill-2:#f2f3f5;--aion-fill-3:#e5e6eb;--aion-border-base:#e5e6eb;--aion-overlay-shadow:0 8px 24px #0f172a1f;--aion-font-sans:-apple-system, \"system-ui\", \"Segoe UI\", Roboto, \"Helvetica Neue\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif;--aion-font-mono:ui-monospace, \"SF Mono\", SFMono-Regular, Menlo, Consolas, \"Liberation Mono\", monospace}body[data-ds-dark-theme]{--aion-bg-base:#0e0e0e;--aion-bg-1:#1a1a1a;--aion-bg-2:#262626;--aion-bg-3:#333;--aion-bg-hover:#1f1f1f;--aion-bg-active:#2d2d2d;--aion-text-primary:#fff;--aion-text-secondary:#ced3da;--aion-text-tertiary:#737373;--aion-text-disabled:#737373;--aion-primary:#4d9fff;--aion-success:#23c343;--aion-warning:#ff9a2e;--aion-danger:#f76560;--aion-brand:#a1aacb;--aion-aou-1:#2a2a2a;--aion-aou-2:#3d4150;--aion-aou-3:#525a77;--aion-aou-4:#6a749b;--aion-aou-5:#838fba;--aion-aou-6:#a1aacb;--aion-fill-2:#ffffff14;--aion-fill-3:#ffffff1f;--aion-border-base:#333;--aion-overlay-shadow:0 12px 32px #00000073;color-scheme:dark}.aionui-root{font-family:var(--aion-font-sans);color:var(--aion-text-primary);background-color:var(--aion-bg-1);font-size:13px}.aionui-root *,.aionui-root :before,.aionui-root :after{box-sizing:border-box}.aionui-root ::-webkit-scrollbar{width:8px;height:8px}.aionui-root ::-webkit-scrollbar-thumb{background:var(--aion-bg-3);border-radius:4px}.aionui-root ::-webkit-scrollbar-thumb:hover{background:var(--aion-bg-4,#c9cdd4)}.aionui-root ::-webkit-scrollbar-track{background:0 0}@media (prefers-reduced-motion:reduce){.aionui-root *,.aionui-root :before,.aionui-root :after{transition:none!important;animation:none!important}}[data-dsh-frame][data-aionui-instant]{transition:none!important}.aionui-preview-col,.aionui-explorer-col{background-color:var(--aion-bg-1);z-index:30;flex-direction:column;min-width:0;display:flex;overflow:hidden}.aionui-preview-col{border-left:1px solid var(--aion-bg-3)}.aionui-explorer-col{border-left:1px solid var(--aion-bg-3)}.aionui-preview-col.aionui-preview-enter{animation:.25s cubic-bezier(.4,0,.2,1) sMwK2a_aionui-preview-enter}@keyframes sMwK2a_aionui-preview-enter{0%{opacity:0;transform:translate(20px)}to{opacity:1;transform:translate(0)}}.aionui-explorer-handle,.aionui-preview-handle{touch-action:none}.aionui-explorer-handle:after,.aionui-preview-handle:after{content:\"\";background-color:var(--aion-bg-3);opacity:.9;pointer-events:none;border-radius:9999px;width:2px;transition:width .15s cubic-bezier(.4,0,.2,1),background-color .15s cubic-bezier(.4,0,.2,1);position:absolute;top:0;bottom:0;left:0}.aionui-explorer-handle:hover:after,.aionui-explorer-handle:active:after,.aionui-preview-handle:hover:after,.aionui-preview-handle:active:after{background-color:var(--aion-brand);width:6px}.aionui-preview-handle:after{opacity:.3;left:auto;right:0}.aionui-preview-handle:hover:after,.aionui-preview-handle:active:after{opacity:1}.aionui-floating-expand{background-color:var(--aion-bg-2);width:20px;height:64px;color:var(--aion-text-secondary);cursor:pointer;z-index:100;border:none;border-top-left-radius:10px;border-bottom-left-radius:10px;justify-content:center;align-items:center;transition:background-color .15s cubic-bezier(.4,0,.2,1);display:none;position:fixed;top:50%;right:0;transform:translateY(-50%);box-shadow:0 8px 20px #0000001f}.aionui-floating-expand:hover{background-color:var(--aion-bg-3);color:var(--aion-text-primary)}.aionui-floating-expand:active{background-color:var(--aion-bg-active)}.aionui-floating-expand:focus-visible{outline:2px solid var(--aion-primary);outline-offset:2px}.aionui-collapse-chevron{top:calc(6px + env(sMwK2a_titlebar-area-height,0px));z-index:30;width:24px;height:24px;color:var(--aion-text-secondary);cursor:pointer;background:0 0;border:none;border-radius:4px;justify-content:center;align-items:center;transition:background-color .15s cubic-bezier(.4,0,.2,1);display:flex;position:absolute;right:8px}.aionui-collapse-chevron:hover{background-color:var(--aion-bg-3);color:var(--aion-text-primary)}.aionui-collapse-chevron:active{background-color:var(--aion-bg-active)}.aionui-collapse-chevron:focus-visible{outline:2px solid var(--aion-primary);outline-offset:2px}.aionui-overlay{z-index:1000;background:#00000059;justify-content:center;align-items:center;display:flex;position:fixed;inset:0}.aionui-dialog{background:var(--aion-bg-base);width:400px;max-width:calc(100vw - 48px);box-shadow:var(--aion-overlay-shadow);font-family:var(--aion-font-sans);border-radius:16px;overflow:hidden}.aionui-dialog-title{color:var(--aion-text-primary);padding:16px 20px 8px;font-size:14px;font-weight:600}.aionui-dialog-body{color:var(--aion-text-secondary);padding:0 20px;font-size:13px;line-height:1.6}.aionui-dialog-actions{justify-content:flex-end;gap:8px;padding:16px 20px 20px;display:flex}.aionui-btn{border:1px solid var(--aion-bg-3);background:var(--aion-bg-base);height:28px;color:var(--aion-text-primary);cursor:pointer;border-radius:4px;padding:0 14px;font-size:13px;transition:background-color .15s cubic-bezier(.4,0,.2,1)}.aionui-btn:hover{background:var(--aion-bg-hover)}.aionui-btn:active{background:var(--aion-bg-active)}.aionui-btn:focus-visible{outline:2px solid var(--aion-primary);outline-offset:2px}.aionui-btn-primary{background:var(--aion-primary);border-color:var(--aion-primary);color:#fff}.aionui-btn-primary:hover{background:var(--aion-primary);opacity:.9}.aionui-btn-primary:active{opacity:.75;filter:saturate(.9)}.aionui-btn-danger{background:var(--aion-danger);border-color:var(--aion-danger);color:#fff}.aionui-btn-danger:hover{opacity:.9}.aionui-btn-danger:active{opacity:.75}.aionui-menu{z-index:1100;background:var(--aion-bg-base);min-width:160px;box-shadow:var(--aion-overlay-shadow);border:1px solid var(--aion-bg-3);font-family:var(--aion-font-sans);border-radius:8px;padding:4px;position:fixed}.aionui-menu-item{height:28px;color:var(--aion-text-primary);cursor:pointer;white-space:nowrap;border-radius:4px;align-items:center;padding:0 10px;font-size:13px;display:flex}.aionui-menu-item:hover{background:var(--aion-fill-2)}.aionui-menu-item:focus-visible{outline:2px solid var(--aion-primary);outline-offset:-2px}.aionui-menu-item-disabled{color:var(--aion-text-disabled);cursor:default}.aionui-menu-item-disabled:hover{background:0 0}.aionui-menu-sep{background:var(--aion-bg-3);height:1px;margin:4px 8px}.aionui-toast{z-index:1200;background:var(--aion-bg-base);max-width:70vw;color:var(--aion-text-primary);font-size:13px;font-family:var(--aion-font-sans);box-shadow:var(--aion-overlay-shadow);border:1px solid var(--aion-bg-3);border-radius:6px;padding:8px 14px;animation:.2s cubic-bezier(.4,0,.2,1) sMwK2a_aionui-toast-in;position:fixed;bottom:32px;left:50%;transform:translate(-50%)}@keyframes sMwK2a_aionui-toast-in{0%{opacity:0;transform:translate(-50%)translateY(8px)}to{opacity:1;transform:translate(-50%)translateY(0)}}";
		const tagId$2 = "@linxin666/dsh-client-ui-aionui-panel/tokens.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@linxin666/dsh-client-ui-aionui-panel";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region src/client/components/ExplorerPanel.tsx
		/**
		* The Explorer column: Files/Changes tab bar (37px), the persistent filename
		* search at the top of the Files tab (150ms debounced; a hit click REVEALS
		* the file in the tree — expand ancestors + select — never opens preview),
		* the lazy file tree (34px rows, full-row expand/collapse, 16px icons), and
		* the in-column collapse chevron.
		*
		* AionUi Explorer behavior (Apache-2.0, re-implemented): row click toggles
		* folders (no need to hit the arrow), search results are reveal-only, and
		* clicking a file opens it in the preview panel (dedup focuses the tab).
		* @module dsh-aionui-panel/client/components/ExplorerPanel
		*/
		/** Row indent step per tree depth (px). */
		const INDENT_STEP = 16;
		/**
		* The whole explorer column content.
		* @param stores - the panel store bundle.
		* @param onToggleCollapse - collapse the column (host chrome).
		*/
		function ExplorerPanel({ stores, onToggleCollapse }) {
			const state = useStore(stores.explorer);
			const [searchFocus, setSearchFocus] = (0, react.useState)(false);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "aionui-root",
				style: {
					display: "flex",
					flexDirection: "column",
					height: "100%",
					minHeight: 0
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: explorer_module_css_default.tabBar,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: state.activeTab === "files" ? explorer_module_css_default.tabBtnActive : explorer_module_css_default.tabBtn,
								onClick: () => stores.explorer.setActiveTab("files"),
								children: t("explorer.tabs.files")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: state.activeTab === "changes" ? explorer_module_css_default.tabBtnActive : explorer_module_css_default.tabBtn,
								onClick: () => stores.explorer.setActiveTab("changes"),
								children: t("explorer.tabs.changes")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "aionui-collapse-chevron",
								style: { marginLeft: "auto" },
								onClick: onToggleCollapse,
								title: t("explorer.collapse"),
								"aria-label": t("explorer.collapse"),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExpandRightIcon, { size: 16 })
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							display: state.activeTab === "files" ? "flex" : "none",
							flexDirection: "column",
							flex: 1,
							minHeight: 0
						},
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchArea, {
							stores,
							searchFocus,
							onFocusChange: setSearchFocus
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileTree, { stores })]
					}),
					state.activeTab === "changes" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScmPanel, { stores })
				]
			});
		}
		/** The search box + results (the tree stays mounted underneath). */
		function SearchArea({ stores, searchFocus, onFocusChange }) {
			const explorer = stores.explorer;
			const search = useStore(explorer).search;
			const active = search.query !== "";
			const inputRef = (0, react.useRef)(null);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					minHeight: 0,
					flex: active ? 1 : void 0
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: explorer_module_css_default.searchArea,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: `${explorer_module_css_default.searchBox}${searchFocus ? ` ${explorer_module_css_default.searchAreaFocus}` : ""}`,
						style: { borderColor: searchFocus ? "var(--aion-primary)" : void 0 },
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: explorer_module_css_default.searchIcon,
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchIcon, { size: 14 })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								ref: inputRef,
								className: explorer_module_css_default.searchInput,
								value: search.query,
								placeholder: t("explorer.search.placeholder"),
								"aria-label": t("explorer.search.placeholder"),
								onFocus: () => onFocusChange(true),
								onBlur: () => onFocusChange(false),
								onChange: (event) => explorer.setSearchQuery(event.target.value)
							}),
							search.query !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: explorer_module_css_default.searchClear,
								onClick: () => {
									explorer.cancelSearch();
									inputRef.current?.focus();
								},
								"aria-label": t("common.close"),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CloseIcon, { size: 12 })
							})
						]
					})
				}), active ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchResults, { stores }) : null]
			});
		}
		/** The flat search-result stream (click = reveal in tree). */
		function SearchResults({ stores }) {
			const explorer = stores.explorer;
			const search = useStore(explorer).search;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: explorer_module_css_default.scrollArea,
				children: [
					search.status === "searching" && search.hits.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: explorer_module_css_default.searchStatus,
						children: t("explorer.search.searching")
					}),
					search.status === "error" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: explorer_module_css_default.searchStatus,
						children: t("explorer.search.error")
					}),
					search.status === "done" && search.hits.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: explorer_module_css_default.searchStatus,
						children: t("explorer.search.empty")
					}),
					search.hits.map((hit) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: explorer_module_css_default.resultRow,
						role: "button",
						tabIndex: 0,
						title: hit.path,
						onClick: () => {
							explorer.reveal(hit.path);
						},
						onKeyDown: activateOnKey(() => {
							explorer.reveal(hit.path);
						}),
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileTypeIcon, {
								name: hit.name,
								isDir: hit.isDir,
								expanded: false
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: explorer_module_css_default.resultName,
								children: hit.name
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: explorer_module_css_default.resultPath,
								children: parentRel(hit.path)
							})
						]
					}, hit.path)),
					search.truncated && search.hits.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: explorer_module_css_default.searchStatus,
						children: t("explorer.search.truncated", { count: search.hits.length })
					})
				]
			});
		}
		/** The lazy file tree. */
		function FileTree({ stores }) {
			const explorer = stores.explorer;
			stores.preview;
			const state = useStore(explorer);
			if (state.root === "") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: explorer_module_css_default.emptyState,
				children: t("explorer.tree.empty")
			});
			const entries = state.dirs[""];
			if (entries === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: explorer_module_css_default.searchStatus,
				children: t("scm.loading")
			});
			if (entries.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: explorer_module_css_default.emptyState,
				children: t("explorer.tree.empty")
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: `${explorer_module_css_default.scrollArea} ${explorer_module_css_default.tree}`,
				children: entries.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TreeRow, {
					entry,
					depth: 0,
					expanded: state.expanded,
					selected: state.selected,
					dirs: state.dirs,
					root: state.root,
					stores
				}, entry.path))
			});
		}
		/** One tree row (recursive for children). */
		function TreeRowBase({ entry, depth, expanded, selected, dirs, root, stores }) {
			const explorer = stores.explorer;
			const preview = stores.preview;
			const isExpanded = expanded.includes(entry.path);
			const isSelected = selected === entry.path;
			const children = entry.isDir ? dirs[entry.path] : void 0;
			const [draggingRow, setDraggingRow] = (0, react.useState)(false);
			const handleClick = () => {
				if (entry.isDir) {
					explorer.toggleDir(entry.path);
					return;
				}
				explorer.select(entry.path);
				preview.openFile(root, entry.path);
			};
			const onDragStart = (event) => {
				if (entry.isDir) return;
				event.dataTransfer.setData(FILE_DRAG_MIME, entry.path);
				event.dataTransfer.setData("text/plain", entry.path);
				event.dataTransfer.effectAllowed = "copy";
				setDraggingRow(true);
			};
			const onDragEnd = () => {
				setDraggingRow(false);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `${explorer_module_css_default.treeRow}${isSelected ? ` ${explorer_module_css_default.treeRowSelected}` : ""}${draggingRow ? ` ${explorer_module_css_default.treeRowDragging}` : ""}`,
				style: { paddingLeft: 20 + depth * INDENT_STEP },
				onClick: handleClick,
				onKeyDown: activateOnKey(handleClick),
				onDoubleClick: (event) => {
					event.stopPropagation();
				},
				draggable: !entry.isDir,
				onDragStart,
				onDragEnd,
				role: "button",
				tabIndex: 0,
				"aria-expanded": entry.isDir ? isExpanded : void 0,
				title: entry.path,
				children: [
					entry.isDir ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: `${explorer_module_css_default.treeArrow}${isExpanded ? ` ${explorer_module_css_default.treeArrowOpen}` : ""}`,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ChevronRightIcon, { size: 13 })
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: explorer_module_css_default.treeArrowEmpty }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FileTypeIcon, {
						name: entry.name,
						isDir: entry.isDir,
						expanded: isExpanded
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: explorer_module_css_default.treeName,
						children: entry.name
					})
				]
			}), entry.isDir && isExpanded && children !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: children.map((child) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TreeRow, {
				entry: child,
				depth: depth + 1,
				expanded,
				selected,
				dirs,
				root,
				stores
			}, child.path)) })] });
		}
		/**
		* A memoized tree row so the whole tree does not re-render on every explorer
		* state change (search keystrokes, tab switches, fs version bumps). The row
		* takes the `state` fields it actually reads as individual props — `expanded`,
		* `selected`, `dirs` — whose references only change when the corresponding
		* data changed, so the default shallow comparison skips rows whose own entry,
		* ancestor, expansion or selection are unaffected. A `dirs` re-fetch (an fs
		* event that relists the expanded dirs) still re-renders the rows under those
		* dirs — the unavoidable O(open-dirs) cost — but transient UI state no longer
		* invalidates the tree.
		*/
		const TreeRow = (0, react.memo)(TreeRowBase);
		//#endregion
		//#region \0dsh-css:packages/dsh-aionui-panel/src/client/styles/preview.module.css.mjs
		const css$1 = ".YElu8a_panel{background:var(--aion-bg-1);flex-direction:column;height:100%;min-height:0;display:flex}.YElu8a_tabBar{z-index:30;background:var(--aion-bg-2);border-bottom:1px solid var(--aion-bg-3);flex-shrink:0;align-items:stretch;height:36px;display:flex;position:relative}.YElu8a_tabScroll{scrollbar-width:none;flex:1;align-items:stretch;min-width:0;display:flex;overflow:auto hidden}.YElu8a_tabScroll::-webkit-scrollbar{display:none}.YElu8a_tab{cursor:pointer;user-select:none;border-right:1px solid #0000;flex-shrink:0;align-items:center;gap:6px;max-width:180px;height:100%;padding:0 10px;transition:background-color .15s cubic-bezier(.4,0,.2,1);display:flex}.YElu8a_tabActive{background:var(--aion-bg-1);color:var(--aion-text-primary)}.YElu8a_tabInactive{color:var(--aion-text-secondary)}.YElu8a_tabInactive:hover{background:var(--aion-bg-3)}.YElu8a_tab:active{background:var(--aion-bg-active)}.YElu8a_tab:focus-visible{box-shadow:inset 0 0 0 2px var(--aion-primary)}.YElu8a_tabTitle{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:12px;overflow:hidden}.YElu8a_tabFavicon{object-fit:contain;border-radius:2px;flex-shrink:0;width:12px;height:12px}.YElu8a_tabDot{border-radius:9999px;flex-shrink:0;width:6px;height:6px}.YElu8a_tabDotDirty{background:var(--aion-primary);border-radius:9999px;flex-shrink:0;width:6px;height:6px}.YElu8a_tabDotAgent{background:var(--aion-success);border-radius:9999px;flex-shrink:0;width:6px;height:6px;animation:1.6s ease-in-out infinite YElu8a_aionui-pulse}@keyframes YElu8a_aionui-pulse{0%,to{opacity:1}50%{opacity:.4}}.YElu8a_tabClose{width:16px;height:16px;color:var(--aion-text-secondary);border-radius:4px;flex-shrink:0;justify-content:center;align-items:center;transition:background-color .15s cubic-bezier(.4,0,.2,1);display:flex}.YElu8a_tabClose:hover{background:var(--aion-bg-3);color:var(--aion-text-primary)}.YElu8a_tabClose:active{background:var(--aion-bg-active)}.YElu8a_tabClose:focus-visible{box-shadow:inset 0 0 0 2px var(--aion-primary)}.YElu8a_tabPlus{width:24px;height:24px;color:var(--aion-text-secondary);cursor:pointer;border-radius:4px;flex-shrink:0;justify-content:center;align-self:center;align-items:center;margin:0 4px;transition:background-color .15s cubic-bezier(.4,0,.2,1);display:flex}.YElu8a_tabPlus:hover{background:var(--aion-bg-3);color:var(--aion-text-primary)}.YElu8a_tabPlus:active{background:var(--aion-bg-active)}.YElu8a_tabPlus:focus-visible{box-shadow:inset 0 0 0 2px var(--aion-primary)}.YElu8a_tabBarRight{flex-shrink:0;align-items:center;padding:0 10px;display:flex}.YElu8a_panelCollapse{width:20px;height:20px;color:var(--aion-text-secondary);cursor:pointer;border-radius:4px;justify-content:center;align-items:center;transition:background-color .15s cubic-bezier(.4,0,.2,1);display:flex}.YElu8a_panelCollapse:hover{background:var(--aion-bg-3);color:var(--aion-text-primary)}.YElu8a_panelCollapse:active{background:var(--aion-bg-active)}.YElu8a_panelCollapse:focus-visible{box-shadow:inset 0 0 0 2px var(--aion-primary)}.YElu8a_tabFade{pointer-events:none;z-index:2;width:32px;position:absolute;top:0;bottom:0}.YElu8a_tabFadeLeft{pointer-events:none;z-index:2;background:linear-gradient(90deg, var(--aion-bg-2) 0%, transparent 100%);width:32px;position:absolute;top:0;bottom:0;left:0}.YElu8a_tabFadeRight{pointer-events:none;z-index:2;background:linear-gradient(270deg, var(--aion-bg-2) 0%, transparent 100%);width:32px;position:absolute;top:0;bottom:0;right:0}.YElu8a_noTabs{color:var(--aion-text-tertiary);flex:1;align-items:center;padding:0 10px;font-size:12px;display:flex}.YElu8a_toolbar{background:var(--aion-bg-2);border-bottom:1px solid var(--aion-bg-3);scrollbar-width:none;flex-shrink:0;align-items:center;gap:2px;height:32px;padding:0 10px;display:flex;overflow-x:auto}.YElu8a_toolbar::-webkit-scrollbar{display:none}.YElu8a_toolbarSpacer{flex:1}.YElu8a_toolbarBtn{height:24px;color:var(--aion-text-secondary);font-size:12px;font-family:var(--aion-font-sans);cursor:pointer;white-space:nowrap;background:0 0;border:none;border-radius:4px;flex-shrink:0;align-items:center;gap:4px;padding:0 8px;transition:background-color .15s cubic-bezier(.4,0,.2,1),color .15s cubic-bezier(.4,0,.2,1);display:flex}.YElu8a_toolbarBtn:hover{background:var(--aion-bg-3);color:var(--aion-text-primary)}.YElu8a_toolbarBtn:active{background:var(--aion-bg-active);color:var(--aion-text-primary)}.YElu8a_toolbarBtn:focus-visible{outline:2px solid var(--aion-primary);outline-offset:2px}.YElu8a_toolbarBtn:disabled{opacity:.4;cursor:default}.YElu8a_toolbarBtn:disabled:hover{color:var(--aion-text-secondary);background:0 0}.YElu8a_toolbarBtnActive{color:var(--aion-brand);background:var(--aion-aou-2);border-bottom:4px solid var(--aion-brand)}.YElu8a_toolbarBtnWarn{color:var(--aion-warning)}.YElu8a_content{flex-direction:column;flex:1;min-height:0;display:flex;position:relative}.YElu8a_mdViewer{min-height:0;color:var(--aion-text-primary);word-wrap:break-word;flex:1;padding:16px 20px 32px;font-size:15px;line-height:1.7;overflow:hidden auto}.YElu8a_mdViewer h1{border-bottom:1px solid var(--aion-bg-3);margin:24px 0 12px;padding-bottom:8px;font-size:24px;font-weight:600;line-height:1.3}.YElu8a_mdViewer h1:first-child{margin-top:4px}.YElu8a_mdViewer h2{margin:22px 0 10px;font-size:20px;font-weight:600;line-height:1.3}.YElu8a_mdViewer h3{margin:18px 0 8px;font-size:17px;font-weight:600;line-height:1.3}.YElu8a_mdViewer h4,.YElu8a_mdViewer h5,.YElu8a_mdViewer h6{margin:14px 0 6px;font-size:15px;font-weight:600;line-height:1.3}.YElu8a_mdViewer p{margin:8px 0}.YElu8a_mdViewer ul,.YElu8a_mdViewer ol{margin:8px 0;padding-left:24px}.YElu8a_mdViewer li{margin:3px 0}.YElu8a_mdViewer code{font-family:var(--aion-font-mono);background:var(--aion-bg-2);color:var(--aion-text-primary);border-radius:3px;padding:1px 5px;font-size:.9em}.YElu8a_mdViewer pre{background:var(--aion-bg-2);border-radius:6px;margin:10px 0;padding:12px 14px;line-height:1.5;overflow-x:auto}.YElu8a_mdViewer pre code{color:var(--aion-text-primary);background:0 0;padding:0;font-size:13px}.YElu8a_mdViewer blockquote{border-left:3px solid var(--aion-bg-3);color:var(--aion-text-secondary);margin:10px 0;padding:4px 14px}.YElu8a_mdViewer blockquote p{margin:4px 0}.YElu8a_mdViewer a{color:var(--aion-primary);text-decoration:none}.YElu8a_mdViewer a:hover{text-decoration:underline}.YElu8a_mdViewer hr{border:none;border-top:1px solid var(--aion-bg-3);margin:20px 0}.YElu8a_mdViewer table{border-collapse:collapse;width:100%;margin:10px 0;font-size:14px}.YElu8a_mdViewer th,.YElu8a_mdViewer td{border:1px solid var(--aion-bg-3);text-align:left;padding:6px 10px}.YElu8a_mdViewer th{background:var(--aion-bg-2);font-weight:600}.YElu8a_mdViewer img{border-radius:4px;max-width:100%}.YElu8a_codeViewer{min-height:0;font-family:var(--aion-font-mono);color:var(--aion-text-primary);tab-size:2;white-space:pre;flex:1;margin:0;padding:12px 14px;font-size:13px;line-height:1.6;overflow:auto}.YElu8a_diffViewer{min-height:0;font-family:var(--aion-font-mono);flex:1;padding:4px 0 16px;font-size:12.5px;line-height:1.55;overflow:auto}.YElu8a_diffLine{white-space:pre;min-height:20px;padding:0 12px;display:flex}.YElu8a_diffLineAdd{background:color-mix(in srgb, var(--aion-success) 12%, transparent);color:var(--aion-text-primary)}.YElu8a_diffLineDel{background:color-mix(in srgb, var(--aion-danger) 12%, transparent);color:var(--aion-text-primary)}.YElu8a_diffLineHunk{background:color-mix(in srgb, var(--aion-primary) 10%, transparent);color:var(--aion-text-secondary)}.YElu8a_diffLineMeta{color:var(--aion-text-tertiary)}.YElu8a_csvViewer{flex:1;min-height:0;padding:12px;overflow:auto}.YElu8a_csvTable{border-collapse:collapse;font-size:13px;font-family:var(--aion-font-mono)}.YElu8a_csvTable th,.YElu8a_csvTable td{border:1px solid var(--aion-bg-3);white-space:nowrap;text-overflow:ellipsis;max-width:480px;padding:4px 10px;overflow:hidden}.YElu8a_csvTable th{background:var(--aion-bg-2);font-weight:600;position:sticky;top:0}.YElu8a_imageViewer{background:var(--aion-bg-base);flex:1;justify-content:center;align-items:center;min-height:0;padding:16px;display:flex;overflow:auto}.YElu8a_imageViewer img{object-fit:contain;border-radius:2px;max-width:100%;max-height:100%}.YElu8a_imageMeta{color:var(--aion-text-tertiary);background:var(--aion-bg-2);border-radius:9999px;padding:2px 10px;font-size:11px;position:absolute;bottom:12px;left:50%;transform:translate(-50%)}.YElu8a_pdfViewer{background:var(--aion-bg-base);border:none;flex:1;min-height:0}.YElu8a_urlBar{background:var(--aion-bg-2);border-bottom:1px solid var(--aion-bg-3);flex-shrink:0;align-items:center;gap:6px;height:32px;padding:0 10px;display:flex}.YElu8a_urlInput{background:var(--aion-bg-base);min-width:0;height:24px;color:var(--aion-text-primary);font-size:12px;font-family:var(--aion-font-sans);border:none;border-radius:4px;outline:none;flex:1;padding:0 8px}.YElu8a_urlInput:focus-visible{box-shadow:inset 0 0 0 2px var(--aion-primary)}.YElu8a_urlFrame{background:var(--aion-bg-base);border:none;flex:1;width:100%;min-height:0}.YElu8a_placeholder{min-height:0;color:var(--aion-text-secondary);text-align:center;flex-direction:column;flex:1;justify-content:center;align-items:center;gap:8px;padding:24px;font-size:13px;display:flex}.YElu8a_placeholderTitle{color:var(--aion-text-primary);font-size:14px;font-weight:500}.YElu8a_placeholderMeta{color:var(--aion-text-tertiary);font-size:12px}.YElu8a_placeholderError{color:var(--aion-danger);font-size:12px}.YElu8a_splitPane{flex:1;min-height:0;display:flex;position:relative;overflow:hidden}.YElu8a_splitPaneLeft,.YElu8a_splitPaneRight{flex-direction:column;min-width:0;height:100%;display:flex}.YElu8a_splitHeader{background:var(--aion-bg-2);height:40px;color:var(--aion-text-secondary);border-bottom:1px solid var(--aion-bg-3);flex-shrink:0;align-items:center;padding:0 12px;font-size:12px;display:flex}.YElu8a_splitBody{flex:1;min-height:0;overflow:hidden}.YElu8a_splitHandle{z-index:20;cursor:col-resize;touch-action:none;width:12px;position:absolute;top:0;bottom:0}.YElu8a_splitHandle:after{content:\"\";background:var(--aion-bg-3);opacity:.9;pointer-events:none;border-radius:9999px;width:2px;transition:width .15s cubic-bezier(.4,0,.2,1),background-color .15s cubic-bezier(.4,0,.2,1);position:absolute;top:0;bottom:0;left:50%;transform:translate(-50%)}.YElu8a_splitHandle:hover:after,.YElu8a_splitHandle:active:after{background:var(--aion-brand);width:6px}.YElu8a_textEditor{resize:none;background:var(--aion-bg-base);width:100%;height:100%;color:var(--aion-text-primary);font-family:var(--aion-font-mono);tab-size:2;border:none;outline:none;padding:12px 14px;font-size:13px;line-height:1.6}.YElu8a_textEditor:focus-visible{box-shadow:inset 0 0 0 2px var(--aion-primary)}.YElu8a_saveBanner{z-index:5;background:var(--aion-bg-2);border:1px solid var(--aion-bg-3);color:var(--aion-text-secondary);text-overflow:ellipsis;white-space:nowrap;border-radius:4px;max-width:60%;padding:4px 10px;font-size:12px;position:absolute;top:8px;right:12px;overflow:hidden}.YElu8a_saveBannerError{color:var(--aion-danger);border-color:var(--aion-danger)}.YElu8a_truncatedNote{color:var(--aion-warning);background:color-mix(in srgb, var(--aion-warning) 10%, transparent);flex-shrink:0;padding:6px 20px;font-size:12px}";
		const tagId$1 = "@linxin666/dsh-client-ui-aionui-panel/preview.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@linxin666/dsh-client-ui-aionui-panel";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var preview_module_css_default = {
			"aionui-pulse": "YElu8a_aionui-pulse",
			"codeViewer": "YElu8a_codeViewer",
			"content": "YElu8a_content",
			"csvTable": "YElu8a_csvTable",
			"csvViewer": "YElu8a_csvViewer",
			"diffLine": "YElu8a_diffLine",
			"diffLineAdd": "YElu8a_diffLineAdd",
			"diffLineDel": "YElu8a_diffLineDel",
			"diffLineHunk": "YElu8a_diffLineHunk",
			"diffLineMeta": "YElu8a_diffLineMeta",
			"diffViewer": "YElu8a_diffViewer",
			"imageMeta": "YElu8a_imageMeta",
			"imageViewer": "YElu8a_imageViewer",
			"mdViewer": "YElu8a_mdViewer",
			"noTabs": "YElu8a_noTabs",
			"panel": "YElu8a_panel",
			"panelCollapse": "YElu8a_panelCollapse",
			"pdfViewer": "YElu8a_pdfViewer",
			"placeholder": "YElu8a_placeholder",
			"placeholderError": "YElu8a_placeholderError",
			"placeholderMeta": "YElu8a_placeholderMeta",
			"placeholderTitle": "YElu8a_placeholderTitle",
			"saveBanner": "YElu8a_saveBanner",
			"saveBannerError": "YElu8a_saveBannerError",
			"splitBody": "YElu8a_splitBody",
			"splitHandle": "YElu8a_splitHandle",
			"splitHeader": "YElu8a_splitHeader",
			"splitPane": "YElu8a_splitPane",
			"splitPaneLeft": "YElu8a_splitPaneLeft",
			"splitPaneRight": "YElu8a_splitPaneRight",
			"tab": "YElu8a_tab",
			"tabActive": "YElu8a_tabActive",
			"tabBar": "YElu8a_tabBar",
			"tabBarRight": "YElu8a_tabBarRight",
			"tabClose": "YElu8a_tabClose",
			"tabDot": "YElu8a_tabDot",
			"tabDotAgent": "YElu8a_tabDotAgent",
			"tabDotDirty": "YElu8a_tabDotDirty",
			"tabFade": "YElu8a_tabFade",
			"tabFadeLeft": "YElu8a_tabFadeLeft",
			"tabFadeRight": "YElu8a_tabFadeRight",
			"tabFavicon": "YElu8a_tabFavicon",
			"tabInactive": "YElu8a_tabInactive",
			"tabPlus": "YElu8a_tabPlus",
			"tabScroll": "YElu8a_tabScroll",
			"tabTitle": "YElu8a_tabTitle",
			"textEditor": "YElu8a_textEditor",
			"toolbar": "YElu8a_toolbar",
			"toolbarBtn": "YElu8a_toolbarBtn",
			"toolbarBtnActive": "YElu8a_toolbarBtnActive",
			"toolbarBtnWarn": "YElu8a_toolbarBtnWarn",
			"toolbarSpacer": "YElu8a_toolbarSpacer",
			"truncatedNote": "YElu8a_truncatedNote",
			"urlBar": "YElu8a_urlBar",
			"urlFrame": "YElu8a_urlFrame",
			"urlInput": "YElu8a_urlInput"
		};
		/** Fade indicator width. */
		const FADE_WIDTH = 32;
		/** The tab strip. */
		function PreviewTabs({ tabs, activeTabId, onSwitch, onClose, onContextMenu, onNewUrlTab, onClosePanel }) {
			const scrollRef = (0, react.useRef)(null);
			const [fade, setFade] = (0, react.useState)({
				left: false,
				right: false
			});
			(0, react.useEffect)(() => {
				const el = scrollRef.current;
				if (el === null) return;
				const update = () => {
					const next = {
						left: el.scrollLeft > 1,
						right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1
					};
					setFade((prev) => prev.left === next.left && prev.right === next.right ? prev : next);
				};
				const observer = new ResizeObserver(update);
				observer.observe(el);
				el.addEventListener("scroll", update, { passive: true });
				window.addEventListener("resize", update);
				update();
				return () => {
					observer.disconnect();
					el.removeEventListener("scroll", update);
					window.removeEventListener("resize", update);
				};
			}, [tabs.length]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: preview_module_css_default.tabBar,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						ref: scrollRef,
						className: preview_module_css_default.tabScroll,
						children: [
							tabs.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: preview_module_css_default.noTabs,
								children: t("preview.noTabs")
							}),
							tabs.map((tab) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: `${preview_module_css_default.tab}${tab.id === activeTabId ? ` ${preview_module_css_default.tabActive}` : ` ${preview_module_css_default.tabInactive}`}`,
								style: { maxWidth: 180 },
								role: "button",
								tabIndex: 0,
								title: tab.path,
								"aria-label": tab.title,
								onClick: () => onSwitch(tab.id),
								onKeyDown: activateOnKey(() => {
									onSwitch(tab.id);
								}),
								onContextMenu: (event) => onContextMenu(event, tab),
								onAuxClick: (event) => {
									if (event.button !== 1) return;
									event.preventDefault();
									event.stopPropagation();
									onClose(tab.id);
								},
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: preview_module_css_default.tabTitle,
										title: tab.path,
										children: tab.title
									}),
									tab.dirty && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: preview_module_css_default.tabDotDirty,
										title: t("preview.dirty")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: preview_module_css_default.tabClose,
										role: "button",
										tabIndex: 0,
										title: t("common.close"),
										"aria-label": t("common.close"),
										onClick: (event) => {
											event.stopPropagation();
											onClose(tab.id);
										},
										onKeyDown: activateOnKey(() => {
											onClose(tab.id);
										}),
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CloseIcon, { size: 12 })
									})
								]
							}, tab.id)),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: preview_module_css_default.tabPlus,
								role: "button",
								tabIndex: 0,
								onClick: onNewUrlTab,
								onKeyDown: activateOnKey(onNewUrlTab),
								title: t("preview.newUrlTab"),
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PlusIcon, { size: 14 })
							})
						]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: preview_module_css_default.tabBarRight,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: preview_module_css_default.panelCollapse,
							role: "button",
							tabIndex: 0,
							onClick: onClosePanel,
							onKeyDown: activateOnKey(onClosePanel),
							title: t("preview.collapsePanel"),
							"aria-label": t("preview.collapsePanel"),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShrinkIcon, { size: 14 })
						})
					}),
					fade.left && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: preview_module_css_default.tabFadeLeft,
						style: { width: FADE_WIDTH }
					}),
					fade.right && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: preview_module_css_default.tabFadeRight,
						style: { width: FADE_WIDTH }
					})
				]
			});
		}
		//#endregion
		//#region src/client/preview/PreviewToolbar.tsx
		/** Derive the refresh state for one tab. */
		function refreshStateFor(contentType, hasContent, loading, updated) {
			if (contentType === "url") return "idle";
			if (contentType === "word" || contentType === "excel" || contentType === "ppt" || contentType === "unsupported" || contentType === "image") return "hidden";
			if (!hasContent || loading) return "disabled";
			return updated ? "updated" : "idle";
		}
		/** Download the current tab's content as a file. */
		function downloadTab(tab) {
			if (tab.content === null) return;
			const isDataUrl = tab.content.startsWith("data:");
			const isRouteUrl = tab.content.startsWith("/aionui-panel/raw");
			const href = isDataUrl || isRouteUrl ? tab.content : URL.createObjectURL(new Blob([tab.content], { type: "text/plain;charset=utf-8" }));
			const anchor = document.createElement("a");
			anchor.href = href;
			anchor.download = tab.title;
			anchor.style.display = "none";
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			if (!isDataUrl && !isRouteUrl) setTimeout(() => URL.revokeObjectURL(href), 1e4);
		}
		/** The toolbar. */
		function PreviewToolbar({ contentType, hasContent, loading, dirty, updated, viewMode, canToggleView, split, canSplit, onViewModeChange, onSplitChange, onRefresh, onSave, onDownload }) {
			const refreshState = refreshStateFor(contentType, hasContent, loading, updated);
			const editable = isEditableType(contentType);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: preview_module_css_default.toolbar,
				children: [
					canToggleView && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `${preview_module_css_default.toolbarBtn}${viewMode === "source" ? ` ${preview_module_css_default.toolbarBtnActive}` : ""}`,
						onClick: () => onViewModeChange("source"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CodeIcon, { size: 13 }), t("preview.source")]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `${preview_module_css_default.toolbarBtn}${viewMode === "preview" ? ` ${preview_module_css_default.toolbarBtnActive}` : ""}`,
						onClick: () => onViewModeChange("preview"),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(EyeIcon, { size: 13 }), t("preview.preview")]
					})] }),
					canSplit && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `${preview_module_css_default.toolbarBtn}${split ? ` ${preview_module_css_default.toolbarBtnActive}` : ""}`,
						title: t("preview.split"),
						onClick: () => onSplitChange(!split),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SplitIcon, { size: 13 }), t("preview.split")]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: preview_module_css_default.toolbarBtn,
						title: t("preview.download"),
						disabled: !hasContent,
						onClick: onDownload,
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DownloadIcon, { size: 13 })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: preview_module_css_default.toolbarSpacer }),
					refreshState !== "hidden" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: `${preview_module_css_default.toolbarBtn}${refreshState === "updated" ? ` ${preview_module_css_default.toolbarBtnWarn}` : ""}`,
						title: refreshState === "updated" ? t("preview.refresh.updated") : t("preview.refresh"),
						disabled: refreshState === "disabled",
						onClick: onRefresh,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RefreshIcon, { size: 13 }), t("preview.refresh")]
					}),
					editable && dirty && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
						type: "button",
						className: preview_module_css_default.toolbarBtn,
						onClick: onSave,
						disabled: loading,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SaveIcon, { size: 13 }), t("preview.save")]
					})
				]
			});
		}
		//#endregion
		//#region src/client/hooks/useResizableSplit.ts
		/**
		* The panel system's single drag engine hook — a thin React wrapper over the
		* framework-free machinery in drag.ts (AionUi's useResizableSplit
		* architecture, re-implemented): px or ratio units, range-validated
		* localStorage persistence, double-click reset to the default width.
		* @module dsh-aionui-panel/client/hooks/useResizableSplit
		*/
		/**
		* Resizable-split engine.
		* @param options - width contract + persistence key.
		* @returns current width, the committed setter, handle props, and the clamp.
		*/
		function useResizableSplit(options = {}) {
			const { defaultWidth = 50, minWidth = 20, maxWidth = 80, storageKey, unit = "ratio" } = options;
			const isPx = unit === "px";
			const [width, setWidthState] = (0, react.useState)(() => storageKey === void 0 ? defaultWidth : readStoredNumber(storageKey, minWidth, maxWidth, defaultWidth));
			const widthRef = (0, react.useRef)(width);
			(0, react.useEffect)(() => {
				widthRef.current = width;
			}, [width]);
			/** The committed setter: state + storage (validated) + resize event. */
			const setWidth = (0, react.useCallback)((value) => {
				setWidthState(value);
				if (storageKey !== void 0) writeStoredNumber(storageKey, value);
				try {
					window.dispatchEvent(new CustomEvent("preview-panel-resize", { detail: { width: value } }));
				} catch {}
			}, [storageKey]);
			const clamp = (0, react.useCallback)((value) => {
				return Math.min(maxWidth, Math.max(minWidth, value));
			}, [minWidth, maxWidth]);
			return {
				width,
				setWidth,
				handleProps: {
					onPointerDown: (0, react.useCallback)((event) => {
						const el = event.currentTarget;
						handlePointerDragStart(event.nativeEvent, el, {
							reverse: el.dataset.reverse === "true",
							getStartWidth: () => widthRef.current,
							compute: (startWidth, deltaX) => clamp(startWidth + deltaX),
							onFrame: (value) => setWidthState(value),
							onEnd: (value) => setWidth(value)
						});
					}, [clamp, setWidth]),
					onDoubleClick: (0, react.useCallback)(() => {
						setWidth(defaultWidth);
					}, [defaultWidth, setWidth])
				},
				clamp,
				isPx
			};
		}
		//#endregion
		//#region src/client/preview/markdown.ts
		/**
		* A compact markdown renderer for the preview panel: headings, paragraphs,
		* fenced + inline code, bold/italic, links/images, lists, blockquotes, hr,
		* and tables. All HTML is escaped before transformation — the output only
		* ever contains the renderer's own tags. Pure and exported for tests.
		* @module dsh-aionui-panel/client/preview/markdown
		*/
		/** Escape HTML special characters. */
		function escapeHtml(text) {
			return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
		}
		/** Directory of a workspace-relative file path ('' when at the root). */
		function dirOf(filePath) {
			const slash = filePath.lastIndexOf("/");
			return slash === -1 ? "" : filePath.slice(0, slash);
		}
		/** Collapse . and .. segments; null when .. escapes the base. */
		function normalizeRelPath(rel) {
			const out = [];
			for (const part of rel.split("/")) {
				if (part === "" || part === ".") continue;
				if (part === "..") {
					if (out.length === 0) return null;
					out.pop();
					continue;
				}
				out.push(part);
			}
			return out.join("/");
		}
		/** Percent-decode a path portion (best effort; never throws). */
		function decodePathPart(raw) {
			try {
				return decodeURIComponent(raw);
			} catch {
				return raw;
			}
		}
		/**
		* Resolve one markdown image src against the markdown file's location:
		* - Absolute URLs (http/https/data:/...) and fragment-only srcs are left to
		*   the browser ('absolute').
		* - Root-relative srcs (/img.png) resolve from the project root; other
		*   relative srcs resolve against the file's directory. `..` escaping the
		*   project root is rejected ('escape').
		* - The path portion is percent-decoded (markdown authors encode spaces in
		*   filenames) and any ?query#fragment suffix is preserved verbatim, so
		*   cache-busting srcs like ./img.png?v=2 still fetch img.png.
		*/
		function resolveMarkdownImage(filePath, src) {
			const trimmed = src.trim();
			if (trimmed === "" || trimmed.startsWith("#")) return { kind: "absolute" };
			if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return { kind: "absolute" };
			const decoded = decodePathPart(trimmed);
			const q = decoded.indexOf("?");
			const h = decoded.indexOf("#");
			let cut = decoded.length;
			if (q !== -1) cut = Math.min(cut, q);
			if (h !== -1) cut = Math.min(cut, h);
			const pathPart = decoded.slice(0, cut);
			const suffix = decoded.slice(cut);
			const base = pathPart.startsWith("/") ? "" : dirOf(filePath);
			const normalized = normalizeRelPath(base === "" ? pathPart : `${base}/${pathPart}`);
			if (normalized === null) return { kind: "escape" };
			return {
				kind: "relative",
				path: normalized,
				suffix
			};
		}
		/**
		* Guard a raw link/image target against dangerous protocols. Returns the
		* (trimmed) raw string when safe, else null. Only these schemes are allowed:
		* http:, https:, mailto: and fragment anchors (#...). Scheme-less relative
		* paths (./ ../ / and plain filenames) pass through unchanged. Anything with
		* a scheme outside the allow-list — javascript:, data:, vbscript:, etc. —
		* is rejected so the value never reaches dangerouslySetInnerHTML.
		*/
		function safeUrl(raw) {
			const trimmed = raw.trim();
			if (trimmed === "") return null;
			if (trimmed.startsWith("#")) return trimmed;
			const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed);
			if (scheme === null) return trimmed;
			const name = scheme[1].toLowerCase();
			return name === "http" || name === "https" || name === "mailto" ? trimmed : null;
		}
		/** Inline pass: code spans, bold, italic, images, links. */
		function renderInline(text, options) {
			let out = "";
			let i = 0;
			const n = text.length;
			while (i < n) {
				const char = text[i];
				if (char === "`") {
					const end = text.indexOf("`", i + 1);
					if (end !== -1) {
						out += `<code>${escapeHtml(text.slice(i + 1, end))}</code>`;
						i = end + 1;
						continue;
					}
				}
				if (char === "!" && text[i + 1] === "[") {
					const close = text.indexOf("](", i + 2);
					if (close !== -1) {
						const parenEnd = text.indexOf(")", close + 2);
						if (parenEnd !== -1) {
							const alt = text.slice(i + 2, close);
							const safe = safeUrl(text.slice(close + 2, parenEnd));
							if (safe === null) out += escapeHtml(alt);
							else {
								let target = safe;
								if (options?.resolveImageSrc !== void 0) target = options.resolveImageSrc(safe);
								if (target === null) out += escapeHtml(alt);
								else {
									const srcEsc = escapeHtml(target).replace(/\s+/g, "%20");
									out += `<img alt="${escapeHtml(alt)}" src="${srcEsc}" />`;
								}
							}
							i = parenEnd + 1;
							continue;
						}
					}
				}
				if (char === "[") {
					const close = text.indexOf("](", i + 1);
					if (close !== -1) {
						const parenEnd = text.indexOf(")", close + 2);
						if (parenEnd !== -1) {
							const label = text.slice(i + 1, close);
							const safe = safeUrl(text.slice(close + 2, parenEnd));
							if (safe === null) out += renderInline(label, options);
							else out += `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${renderInline(label, options)}</a>`;
							i = parenEnd + 1;
							continue;
						}
					}
				}
				if (char === "*" && text[i + 1] === "*") {
					const end = text.indexOf("**", i + 2);
					if (end !== -1) {
						out += `<strong>${renderInline(text.slice(i + 2, end), options)}</strong>`;
						i = end + 2;
						continue;
					}
				}
				if (char === "*" && text[i - 1] !== "*" && text[i + 1] !== "*") {
					const end = text.indexOf("*", i + 1);
					if (end !== -1 && text[end + 1] !== "*") {
						out += `<em>${renderInline(text.slice(i + 1, end), options)}</em>`;
						i = end + 1;
						continue;
					}
				}
				if (char === "~" && text[i + 1] === "~") {
					const end = text.indexOf("~~", i + 2);
					if (end !== -1) {
						out += `<del>${renderInline(text.slice(i + 2, end), options)}</del>`;
						i = end + 2;
						continue;
					}
				}
				out += escapeHtml(char);
				i += 1;
			}
			return out;
		}
		/** Render a markdown document to HTML (block pass). */
		function renderMarkdown(source, options) {
			const lines = source.replace(/\r\n/g, "\n").split("\n");
			const out = [];
			let i = 0;
			const n = lines.length;
			const flushParagraph = (buffer) => {
				if (buffer.length === 0) return;
				out.push(`<p>${renderInline(buffer.join("\n"), options)}</p>`);
				buffer.length = 0;
			};
			let paragraph = [];
			while (i < n) {
				const line = lines[i];
				const fence = /^```([\w+-]*)\s*$/.exec(line);
				if (fence !== null) {
					flushParagraph(paragraph);
					const lang = fence[1] ?? "";
					i += 1;
					const code = [];
					while (i < n && !/^```\s*$/.test(lines[i])) {
						code.push(lines[i]);
						i += 1;
					}
					i += 1;
					const langAttr = lang === "" ? "" : ` class="language-${escapeHtml(lang)}"`;
					out.push(`<pre${langAttr}><code>${escapeHtml(code.join("\n"))}</code></pre>`);
					continue;
				}
				const heading = /^(#{1,6})\s+(.*)$/.exec(line);
				if (heading !== null) {
					flushParagraph(paragraph);
					const level = heading[1].length;
					out.push(`<h${level}>${renderInline(heading[2] ?? "", options)}</h${level}>`);
					i += 1;
					continue;
				}
				if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
					flushParagraph(paragraph);
					out.push("<hr />");
					i += 1;
					continue;
				}
				if (line.includes("|") && i + 1 < n && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes("-")) {
					flushParagraph(paragraph);
					const headerCells = splitTableRow(line);
					i += 2;
					const rows = [];
					while (i < n && lines[i].includes("|")) {
						rows.push(splitTableRow(lines[i]));
						i += 1;
					}
					out.push("<table>");
					out.push(`<thead><tr>${headerCells.map((cell) => `<th>${renderInline(cell, options)}</th>`).join("")}</tr></thead>`);
					if (rows.length > 0) out.push(`<tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell, options)}</td>`).join("")}</tr>`).join("")}</tbody>`);
					out.push("</table>");
					continue;
				}
				if (/^>\s?(.*)$/.exec(line) !== null) {
					flushParagraph(paragraph);
					const body = [];
					while (i < n) {
						const q = /^>\s?(.*)$/.exec(lines[i]);
						if (q === null) break;
						body.push(q[1] ?? "");
						i += 1;
					}
					out.push(`<blockquote><p>${body.map((line) => renderInline(line, options)).join("<br />")}</p></blockquote>`);
					continue;
				}
				if (/^\s*([-*+])\s+(.*)$/.exec(line) !== null) {
					flushParagraph(paragraph);
					const items = [];
					while (i < n) {
						const item = /^\s*([-*+])\s+(.*)$/.exec(lines[i]);
						if (item === null) break;
						items.push(`<li>${renderInline(item[2] ?? "", options)}</li>`);
						i += 1;
					}
					out.push(`<ul>${items.join("")}</ul>`);
					continue;
				}
				if (/^\s*\d+[.)]\s+(.*)$/.exec(line) !== null) {
					flushParagraph(paragraph);
					const items = [];
					while (i < n) {
						const item = /^\s*\d+[.)]\s+(.*)$/.exec(lines[i]);
						if (item === null) break;
						items.push(`<li>${renderInline(item[1] ?? "", options)}</li>`);
						i += 1;
					}
					out.push(`<ol>${items.join("")}</ol>`);
					continue;
				}
				if (line.trim() === "") {
					flushParagraph(paragraph);
					i += 1;
					continue;
				}
				paragraph.push(line);
				i += 1;
			}
			flushParagraph(paragraph);
			return out.join("\n");
		}
		/** Split one table row into cells (respecting the leading/trailing pipes). */
		function splitTableRow(line) {
			const trimmed = line.trim();
			const inner = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
			return (inner.endsWith("|") ? inner.slice(0, -1) : inner).split("|").map((cell) => cell.trim());
		}
		//#endregion
		//#region src/client/preview/content.tsx
		/**
		* Preview content routing: the renderers for every content type plus the
		* split-screen editor|preview layout. View mode (source/preview) resets to
		* preview when the displayed FILE changes (keyed on path+type, not tab id —
		* AionUi contract), and the split ratio is persisted under
		* preview-panel-split-ratio with a 20..80 clamp.
		* @module dsh-aionui-panel/client/preview/content
		*/
		/** Split-ratio persistence key (AionUi contract). */
		const KEY_SPLIT_RATIO = "preview-panel-split-ratio";
		/** The rendered content of one tab (viewMode/split are controlled by the panel). */
		function TabContent({ tab, viewMode, split, onContentChange, onSave }) {
			if (tab.error !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: preview_module_css_default.placeholder,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: preview_module_css_default.placeholderTitle,
					children: tab.title
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: preview_module_css_default.placeholderError,
					children: tab.error
				})]
			});
			const editable = tab.contentType === "markdown" || tab.contentType === "html" || tab.contentType === "code" || tab.contentType === "csv" || tab.contentType === "text";
			if (split && editable) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SplitPane, {
				tab,
				onContentChange,
				onSave
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: preview_module_css_default.content,
				children: [
					tab.truncated && tab.content !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: preview_module_css_default.truncatedNote,
						children: t("preview.errorOversized")
					}),
					tab.contentType === "markdown" && tab.content !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkdownViewer, {
						content: tab.content,
						root: tab.root,
						path: tab.path,
						sourceMode: viewMode === "source",
						onContentChange
					}),
					tab.contentType === "html" && tab.content !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HtmlViewer, {
						content: tab.content,
						sourceMode: viewMode === "source",
						onContentChange
					}),
					(tab.contentType === "code" || tab.contentType === "text") && tab.content !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CodeViewer, {
						content: tab.content,
						language: tab.title.split(".").pop() ?? ""
					}),
					tab.contentType === "csv" && tab.content !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CsvViewer, { content: tab.content }),
					tab.contentType === "diff" && tab.content !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiffViewer, { content: tab.content }),
					tab.contentType === "image" && tab.content !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImageViewer, {
						src: tab.content,
						meta: `${tab.image?.width ?? ""}${tab.image ? " x " : ""}${tab.image?.height ?? ""}`
					}),
					tab.contentType === "pdf" && tab.content !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PdfViewer, {
						dataUrl: tab.content,
						title: tab.title
					}),
					tab.contentType === "url" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UrlViewer, { tab }),
					(tab.contentType === "word" || tab.contentType === "excel" || tab.contentType === "ppt" || tab.contentType === "unsupported") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UnsupportedViewer, { tab }),
					tab.content === null && !tab.loading && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: preview_module_css_default.placeholder,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: preview_module_css_default.placeholderTitle,
							children: tab.title
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: preview_module_css_default.placeholderMeta,
							children: t("preview.downloadHint")
						})]
					}),
					tab.loading && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: preview_module_css_default.placeholder,
						children: t("scm.loading")
					})
				]
			});
		}
		/** Split screen: textarea editor | rendered preview, ratio persisted. */
		function SplitPane({ tab, onContentChange, onSave }) {
			const { width: splitRatio, handleProps } = useResizableSplit({
				unit: "ratio",
				defaultWidth: 50,
				minWidth: 20,
				maxWidth: 80,
				storageKey: KEY_SPLIT_RATIO
			});
			const content = tab.content ?? "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: preview_module_css_default.splitPane,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: preview_module_css_default.splitPaneLeft,
						style: { width: `${splitRatio}%` },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: preview_module_css_default.splitHeader,
							children: t("preview.editor")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: preview_module_css_default.splitBody,
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
								className: preview_module_css_default.textEditor,
								value: content,
								spellCheck: false,
								onChange: (event) => onContentChange(event.target.value),
								onKeyDown: (event) => {
									if ((event.metaKey || event.ctrlKey) && event.key === "s") {
										event.preventDefault();
										onSave();
									}
								}
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: preview_module_css_default.splitHandle,
						"data-reverse": "false",
						style: { left: `calc(${splitRatio}% - 6px)` },
						...handleProps
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: preview_module_css_default.splitPaneRight,
						style: { width: `${100 - splitRatio}%` },
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: preview_module_css_default.splitHeader,
							children: t("preview.preview")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: preview_module_css_default.splitBody,
							children: [
								tab.contentType === "markdown" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkdownViewer, {
									content,
									root: tab.root,
									path: tab.path
								}),
								tab.contentType === "html" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(HtmlViewer, { content }),
								tab.contentType === "csv" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CsvViewer, { content }),
								tab.contentType === "code" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CodeViewer, {
									content,
									language: tab.title.split(".").pop() ?? ""
								})
							]
						})]
					})
				]
			});
		}
		/** Markdown viewer with an optional source mode (textarea). */
		function MarkdownViewer({ content, root, path, sourceMode = false, onContentChange }) {
			const resolveImageSrc = (0, react.useCallback)((src) => {
				if (root === "" || path === "") return null;
				const resolution = resolveMarkdownImage(path, src);
				if (resolution.kind === "absolute") return src;
				if (resolution.kind === "escape") return null;
				return `/aionui-panel/raw?root=${encodeURIComponent(root)}&path=${encodeURIComponent(resolution.path)}${resolution.suffix}`;
			}, [root, path]);
			const html = (0, react.useMemo)(() => renderMarkdown(content, { resolveImageSrc }), [content, resolveImageSrc]);
			if (sourceMode && onContentChange !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: preview_module_css_default.content,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
					className: preview_module_css_default.textEditor,
					value: content,
					spellCheck: false,
					onChange: (event) => onContentChange(event.target.value)
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: preview_module_css_default.mdViewer,
				dangerouslySetInnerHTML: { __html: html }
			});
		}
		/** HTML viewer: sandboxed iframe (scripts off) or source textarea. */
		function HtmlViewer({ content, sourceMode = false, onContentChange }) {
			const srcDoc = (0, react.useMemo)(() => {
				return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;font-family:-apple-system,"system-ui","Segoe UI",Roboto,"PingFang SC",sans-serif;color:#1d2129}@media (prefers-color-scheme:dark){body{color:rgba(255,255,255,0.9)}}</style></head><body>${content}</body></html>`;
			}, [content]);
			if (sourceMode && onContentChange !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: preview_module_css_default.content,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
					className: preview_module_css_default.textEditor,
					value: content,
					spellCheck: false,
					onChange: (event) => onContentChange(event.target.value)
				})
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
				className: preview_module_css_default.pdfViewer,
				srcDoc,
				sandbox: "",
				title: "html preview"
			});
		}
		/** Plain code/text viewer. */
		function CodeViewer({ content, language }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
				className: preview_module_css_default.codeViewer,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: content })
			});
		}
		/**
		* One memoized CSV row. The cells array reference is stable (it comes from the
		* memoized parsed rows), so an untouched row skips re-rendering when a sibling
		* cell changes or the panel re-renders for another reason.
		*/
		const CsvRow = (0, react.memo)(function CsvRow({ cells, isHeader }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", { children: cells.map((cell, cellIndex) => isHeader ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", { children: cell }, cellIndex) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", { children: cell }, cellIndex)) });
		});
		/**
		* Stable, content-derived key for a CSV row. Rows have no ids, so the cell
		* content (JSON, occurrence-disambiguated for duplicates) anchors the key
		* instead of the array position — a reordered or shifted table keeps stable
		* React identities instead of reusing DOM nodes by index.
		* @param row - the raw row cells.
		* @param occurrence - how many identical rows were already keyed.
		*/
		function csvRowKey(row, occurrence) {
			return `${JSON.stringify(row)}\u0000${occurrence}`;
		}
		/** CSV table. */
		function CsvViewer({ content }) {
			const rows = (0, react.useMemo)(() => parseCsv(content), [content]);
			const keyedRows = (0, react.useMemo)(() => {
				const counts = /* @__PURE__ */ new Map();
				return rows.map((row) => {
					const seen = counts.get(JSON.stringify(row)) ?? 0;
					counts.set(JSON.stringify(row), seen + 1);
					return {
						cells: row,
						key: csvRowKey(row, seen)
					};
				});
			}, [rows]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: preview_module_css_default.csvViewer,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("table", {
					className: preview_module_css_default.csvTable,
					children: keyedRows.map((entry, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CsvRow, {
						cells: entry.cells,
						isHeader: index === 0
					}, entry.key))
				})
			});
		}
		/** Parse CSV lines (quoted cells with escaped quotes). */
		function parseCsv(text) {
			const rows = [];
			let row = [];
			let cell = "";
			let inQuotes = false;
			for (let i = 0; i < text.length; i += 1) {
				const char = text[i];
				if (inQuotes) {
					if (char === "\"") if (text[i + 1] === "\"") {
						cell += "\"";
						i += 1;
					} else inQuotes = false;
					else cell += char;
					continue;
				}
				if (char === "\"") {
					inQuotes = true;
					continue;
				}
				if (char === ",") {
					row.push(cell);
					cell = "";
					continue;
				}
				if (char === "\n") {
					row.push(cell);
					rows.push(row);
					row = [];
					cell = "";
					continue;
				}
				if (char !== "\r") cell += char;
			}
			row.push(cell);
			if (row.length > 1 || row[0] !== "") rows.push(row);
			return rows;
		}
		/** Unified diff viewer. */
		function DiffViewer({ content }) {
			const lines = content.split("\n");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: preview_module_css_default.diffViewer,
				children: lines.map((line, index) => {
					let className = preview_module_css_default.diffLineMeta;
					if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("diff ") || line.startsWith("index ")) className = preview_module_css_default.diffLineMeta;
					else if (line.startsWith("@@")) className = preview_module_css_default.diffLineHunk;
					else if (line.startsWith("+")) className = preview_module_css_default.diffLineAdd;
					else if (line.startsWith("-")) className = preview_module_css_default.diffLineDel;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className,
						children: line === "" ? " " : line
					}, index);
				})
			});
		}
		/** Image viewer. */
		function ImageViewer({ src, meta }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: preview_module_css_default.content,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: preview_module_css_default.imageViewer,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
						src,
						alt: ""
					})
				}), meta.trim() !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: preview_module_css_default.imageMeta,
					children: meta
				})]
			});
		}
		/** PDF viewer: streamed route URL (iframe src) or a legacy data URL (blob). */
		function PdfViewer({ dataUrl, title }) {
			const [url, setUrl] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				if (!dataUrl.startsWith("data:")) {
					setUrl(dataUrl === "" ? null : dataUrl);
					return;
				}
				const blob = dataUrlToBlob(dataUrl);
				if (blob === null) {
					setUrl(null);
					return;
				}
				const objectUrl = URL.createObjectURL(blob);
				setUrl(objectUrl);
				return () => URL.revokeObjectURL(objectUrl);
			}, [dataUrl]);
			return url === null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: preview_module_css_default.placeholder,
				children: t("preview.unsupported")
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
				className: preview_module_css_default.pdfViewer,
				src: url,
				title
			});
		}
		/** Convert a data URL to a Blob (null on failure). */
		function dataUrlToBlob(dataUrl) {
			const comma = dataUrl.indexOf(",");
			if (comma === -1) return null;
			const meta = dataUrl.slice(0, comma);
			const mime = /data:([^;]+)/.exec(meta)?.[1] ?? "application/octet-stream";
			try {
				const binary = atob(dataUrl.slice(comma + 1));
				const bytes = new Uint8Array(binary.length);
				for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
				return new Blob([bytes], { type: mime });
			} catch {
				return null;
			}
		}
		/** URL tab: address bar + iframe. */
		function UrlViewer({ tab }) {
			const [input, setInput] = (0, react.useState)(tab.content ?? "");
			const [url, setUrl] = (0, react.useState)(() => normalizeUrl(tab.content ?? ""));
			const frameRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				setInput(tab.content ?? "");
				setUrl(normalizeUrl(tab.content ?? ""));
			}, [tab.id, tab.content]);
			const guardFrameNavigation = () => {
				const frame = frameRef.current;
				if (frame === null) return;
				try {
					const href = frame.contentWindow?.location.href;
					if (href !== void 0 && !href.startsWith("about:") && new URL(href).origin === window.location.origin) frame.src = "about:blank";
				} catch {}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: preview_module_css_default.content,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: preview_module_css_default.urlBar,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: preview_module_css_default.urlInput,
						value: input,
						placeholder: t("preview.url.placeholder"),
						spellCheck: false,
						onChange: (event) => setInput(event.target.value),
						onKeyDown: (event) => {
							if (event.key === "Enter") setUrl(normalizeUrl(input));
							if (event.key === "Escape") {
								setInput(tab.content ?? "");
								setUrl(normalizeUrl(tab.content ?? ""));
							}
						},
						onFocus: (event) => event.currentTarget.select()
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("iframe", {
					ref: frameRef,
					className: preview_module_css_default.urlFrame,
					src: url,
					title: tab.title,
					sandbox: "allow-scripts allow-forms allow-popups",
					allow: "autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write",
					allowFullScreen: true,
					onLoad: guardFrameNavigation
				}, `${url}\u0000${tab.reloadNonce ?? 0}`)]
			});
		}
		/** Bare domains get https://; whitespace queries go to a search engine. */
		function normalizeUrl(input) {
			const trimmed = input.trim();
			if (trimmed === "") return "about:blank";
			if (/\s/.test(trimmed)) return `https://www.bing.com/search?q=${encodeURIComponent(trimmed)}`;
			const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
			if (typeof window !== "undefined") try {
				if (new URL(candidate).origin === window.location.origin) return "about:blank";
			} catch {}
			return candidate;
		}
		/** Office / unsupported placeholder. */
		function UnsupportedViewer({ tab }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: preview_module_css_default.placeholder,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: preview_module_css_default.placeholderTitle,
						children: tab.title
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: preview_module_css_default.placeholderMeta,
						children: t("preview.unsupported")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: preview_module_css_default.placeholderMeta,
						children: t("preview.downloadHint")
					})
				]
			});
		}
		//#endregion
		//#region src/client/preview/PreviewPanel.tsx
		/**
		* The preview panel root: tab strip + toolbar + content router, the tab
		* context menu (close left/right/others/all), the dirty-close confirmation
		* (the single entry for every batch close — middle-click included), and the
		* panel collapse button. View mode and split live here so the toolbar and the
		* content share one source; both reset when the displayed file changes.
		* @module dsh-aionui-panel/client/preview/PreviewPanel
		*/
		/** The preview panel (mounted in the preview grid column). */
		function PreviewPanel({ stores }) {
			const preview = stores.preview;
			const state = useStore(preview);
			const [menu, setMenu] = (0, react.useState)(null);
			const [closingIds, setClosingIds] = (0, react.useState)(null);
			const [viewMode, setViewMode] = (0, react.useState)("preview");
			const [split, setSplit] = (0, react.useState)(false);
			const lastDirtyCheck = (0, react.useRef)(/* @__PURE__ */ new Set());
			const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId) ?? null;
			(0, react.useEffect)(() => {
				setViewMode("preview");
				setSplit(false);
			}, [activeTab === null ? "" : `${activeTab.path}\u0000${activeTab.contentType}`]);
			/** Close a batch; dirty tabs route through the confirmation first. */
			const requestClose = (ids) => {
				const dirty = state.tabs.filter((tab) => ids.includes(tab.id) && tab.dirty);
				if (dirty.length === 0) {
					preview.closeTabs(ids);
					return;
				}
				lastDirtyCheck.current = new Set(dirty.map((tab) => tab.id));
				setClosingIds(ids);
			};
			const closeMenuFor = (event, tab) => {
				event.preventDefault();
				event.stopPropagation();
				const index = state.tabs.findIndex((item) => item.id === tab.id);
				setMenu({
					x: event.clientX,
					y: event.clientY,
					entries: [
						{
							key: "close-left",
							label: t("preview.closeLeft"),
							disabled: index <= 0,
							onSelect: () => requestClose(state.tabs.slice(0, index).map((item) => item.id))
						},
						{
							key: "close-right",
							label: t("preview.closeRight"),
							disabled: index >= state.tabs.length - 1,
							onSelect: () => requestClose(state.tabs.slice(index + 1).map((item) => item.id))
						},
						{
							key: "sep-1",
							label: "---",
							onSelect: () => {}
						},
						{
							key: "close-others",
							label: t("preview.closeOthers"),
							disabled: state.tabs.length <= 1,
							onSelect: () => requestClose(state.tabs.filter((item) => item.id !== tab.id).map((item) => item.id))
						},
						{
							key: "close-all",
							label: t("preview.closeAll"),
							onSelect: () => requestClose(state.tabs.map((item) => item.id))
						}
					]
				});
			};
			/** A fresh url tab (empty address; the viewer owns the input). */
			const newUrlTab = () => {
				const stamp = Date.now();
				const tab = {
					id: `url:${stamp}`,
					title: "new tab",
					root: state.root,
					path: `url:${stamp}`,
					contentType: "url",
					content: "",
					dirty: false,
					updated: false,
					loading: false,
					truncated: false,
					error: null,
					savedAt: Date.now()
				};
				preview.update((prev) => ({
					...prev,
					open: true,
					tabs: [...prev.tabs, tab],
					activeTabId: tab.id
				}));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: `aionui-root ${preview_module_css_default.panel}`,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PreviewTabs, {
						tabs: state.tabs,
						activeTabId: state.activeTabId,
						onSwitch: (id) => preview.switchTab(id),
						onClose: (id) => requestClose([id]),
						onContextMenu: closeMenuFor,
						onNewUrlTab: newUrlTab,
						onClosePanel: () => preview.setOpen(false)
					}),
					activeTab !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PreviewToolbar, {
						contentType: activeTab.contentType,
						hasContent: activeTab.content !== null,
						loading: activeTab.loading,
						dirty: activeTab.dirty,
						updated: activeTab.updated,
						viewMode,
						canToggleView: activeTab.contentType === "markdown" || activeTab.contentType === "html",
						split,
						canSplit: isEditableType(activeTab.contentType) && activeTab.content !== null,
						onViewModeChange: setViewMode,
						onSplitChange: setSplit,
						onRefresh: () => void preview.reloadTab(activeTab.id),
						onSave: () => void preview.saveTab(activeTab.id),
						onDownload: () => downloadTab(activeTab)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TabContent, {
						tab: activeTab,
						viewMode,
						split,
						onContentChange: (content) => preview.updateContent(activeTab.id, content),
						onSave: () => void preview.saveTab(activeTab.id)
					})] }),
					menu !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContextMenu, {
						state: menu,
						onClose: () => setMenu(null)
					}),
					closingIds !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ConfirmDialog, {
						title: t("preview.closeConfirmTitle"),
						body: format(t("preview.closeConfirmBody"), { count: lastDirtyCheck.current.size }),
						confirmLabel: t("common.close"),
						danger: true,
						onConfirm: () => {
							preview.closeTabs(closingIds);
							setClosingIds(null);
						},
						onCancel: () => setClosingIds(null)
					})
				]
			});
		}
		//#endregion
		//#region src/client/mount.tsx
		/**
		* DOM mounting: two React roots rendered into the panel columns the layout
		* controller appends to the frame grid. The roots wait for their columns
		* (the shell mounts asynchronously), and everything is wrapped so a DOM
		* failure degrades the panels, never the GUI boot.
		* @module dsh-aionui-panel/client/mount
		*/
		const EXPLORER_COL_SELECTOR = "[data-aionui-explorer-col]";
		const PREVIEW_COL_SELECTOR = "[data-aionui-preview-col]";
		/** Wait for one selector (the shell/frame mounts after boot settlement). */
		function waitForElement(selector, onFound) {
			let disposed = false;
			let observer;
			const tryFind = () => {
				if (disposed) return;
				const el = document.querySelector(selector);
				if (el !== null) {
					observer?.disconnect();
					onFound(el);
				}
			};
			observer = new MutationObserver(() => {
				tryFind();
			});
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
			tryFind();
			return () => {
				disposed = true;
				observer?.disconnect();
			};
		}
		/**
		* Mount both panel roots.
		* @param stores - the panel store bundle.
		* @param onToggleExplorer - collapse toggle (owned by the layout controller).
		* @returns a disposer unmounting both trees.
		*/
		function mountPanels(stores, onToggleExplorer) {
			let explorerRoot;
			let previewRoot;
			const disposers = [];
			disposers.push(waitForElement(EXPLORER_COL_SELECTOR, (el) => {
				explorerRoot = (0, react_dom_client.createRoot)(el);
				explorerRoot.render(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExplorerPanel, {
					stores,
					onToggleCollapse: onToggleExplorer
				}));
			}));
			disposers.push(waitForElement(PREVIEW_COL_SELECTOR, (el) => {
				previewRoot = (0, react_dom_client.createRoot)(el);
				previewRoot.render(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PreviewPanel, { stores }));
			}));
			return () => {
				for (const dispose of disposers) dispose();
				explorerRoot?.unmount();
				previewRoot?.unmount();
			};
		}
		//#endregion
		//#region \0dsh-css:packages/dsh-aionui-panel/src/client/styles/drag.module.css.mjs
		const css = ".YLsg1q_strip{box-sizing:border-box;width:100%;max-width:var(--dsh-composer-card-max-width,720px);border:1px dashed var(--aion-primary);color:var(--aion-text-primary);background-color:color-mix(in srgb, var(--aion-primary) 10%, transparent);border-radius:8px;justify-content:center;align-items:center;margin:0 auto;display:none}.YLsg1q_stripActive{height:26px;display:flex}.YLsg1q_stripText{font-size:12px;line-height:18px}";
		const tagId = "@linxin666/dsh-client-ui-aionui-panel/drag.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@linxin666/dsh-client-ui-aionui-panel";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var drag_module_css_default = {
			"strip": "YLsg1q_strip",
			"stripActive": "YLsg1q_stripActive",
			"stripText": "YLsg1q_stripText"
		};
		//#endregion
		//#region src/client/drag/DragFileInlay.tsx
		/**
		* Composer dock inlay: the drop target for explorer file drags. It mounts
		* in the official `conversation.input.dock` band (a session-scoped list
		* slot declared by the shipped ui-conversation rc.6 shell), so it stacks
		* with the git-graph chip above the composer card. While a file row is
		* dragged over the page it shows a hint strip; on drop it splices the
		* workspace-relative path into the active session's draft through the
		* conversation input facade.
		*
		* The document-level listeners only claim drags carrying our custom MIME —
		* the composer host's own drop handling (OS image files) is untouched. The
		* host's `dragover` refuses every drop it does not claim, so this inlay
		* must `preventDefault` its own drags to make the drop land.
		* @module dsh-aionui-panel/client/drag/DragFileInlay
		*/
		/**
		* The composer dock entry: a zero-height anchor that shows a hint strip
		* while a file row is dragged over the page and inserts the path on drop.
		* @param props - the composed dock entry props.
		*/
		function DragFileInlay(props) {
			const [active, setActive] = (0, react.useState)(false);
			const depth = (0, react.useRef)(0);
			(0, react.useEffect)(() => {
				const reset = () => {
					depth.current = 0;
					setActive(false);
				};
				const onDragOver = (event) => {
					if (!hasFileDrag(event.dataTransfer?.types)) return;
					event.preventDefault();
					depth.current += 1;
					setActive(true);
				};
				const onDragLeave = (event) => {
					if (!hasFileDrag(event.dataTransfer?.types)) return;
					depth.current = Math.max(0, depth.current - 1);
					if (depth.current === 0) setActive(false);
				};
				const onDrop = (event) => {
					if (!hasFileDrag(event.dataTransfer?.types)) return;
					event.preventDefault();
					const path = event.dataTransfer?.getData("application/x-dsh-file") ?? "";
					reset();
					if (path !== "") props.insertPath(path);
				};
				const onDragEnd = () => reset();
				document.addEventListener("dragover", onDragOver);
				document.addEventListener("dragleave", onDragLeave);
				document.addEventListener("drop", onDrop);
				window.addEventListener("dragend", onDragEnd);
				return () => {
					document.removeEventListener("dragover", onDragOver);
					document.removeEventListener("dragleave", onDragLeave);
					document.removeEventListener("drop", onDrop);
					window.removeEventListener("dragend", onDragEnd);
				};
			}, [props.insertPath]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: active ? `${drag_module_css_default.strip} ${drag_module_css_default.stripActive}` : drag_module_css_default.strip,
				"data-testid": "aionui-drag-inlay",
				"aria-live": "polite",
				children: active ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: drag_module_css_default.stripText,
					children: t("explorer.drag.dropHint")
				}) : null
			});
		}
		//#endregion
		//#region src/client/index.ts
		/** Required services: sessions for the project root, locale for the copy. */
		const inject = ["sessions", "locale"];
		/** Apply the browser half. */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, dictionaries), "dsh-aionui-panel: dictionaries");
			ctx.inject([
				"slots",
				"conversation",
				"sessions"
			], (scope) => {
				const sessions = scope.sessions;
				const conversation = scope.conversation;
				scope.slots.inject("conversation.input.dock", () => scope.slots.register({
					name: "conversation.input.dock",
					id: "aionui-drag-file",
					order: 90,
					locale: NS,
					inject: (sessionId) => ({ insertPath: (path) => {
						if (sessionId === void 0) return false;
						const actx = sessions.scope(sessionId);
						if (actx === void 0) return false;
						const input = conversation.input;
						if (input === void 0) return false;
						const shell = input.for(actx);
						const draft = shell.state.getSnapshot().draft;
						shell.setDraft(insertPathIntoDraft(draft, path));
						return true;
					} })
				}, DragFileInlay));
			});
			ctx.effect(() => {
				const stores = createPanelStores(new PanelApi());
				const layout = new PanelLayoutController(stores.layout);
				const disposers = [];
				let disposeEvents;
				let currentRoot = "";
				let lastPreviewOpen = false;
				const bindRoot = () => {
					const snapshot = ctx.sessions.list.getSnapshot();
					const sessionId = snapshot.current;
					const cwd = sessionId === void 0 ? void 0 : snapshot.byId[sessionId]?.cwd;
					const root = typeof cwd === "string" && cwd !== "" ? cwd : "";
					if (root === currentRoot) return;
					currentRoot = root;
					disposeEvents?.();
					disposeEvents = void 0;
					const previewOpen = stores.preview.getSnapshot().open;
					lastPreviewOpen = previewOpen;
					layoutSetRoot(stores.layout, root, previewOpen);
					stores.explorer.setRoot(root);
					stores.scm.setRoot(root);
					stores.preview.setRoot(root);
					if (root === "") return;
					disposeEvents = subscribePanelEvents(root, (event) => {
						if (event.kind === "fs") {
							stores.explorer.handleFsChange();
							stores.preview.handleFsChange();
						}
						if (event.kind === "git") {
							stores.scm.update((prev) => prev.root !== root ? prev : {
								...prev,
								status: event.status,
								loading: false
							});
							stores.preview.handleGitChange(root);
						}
						if (event.kind === "gitUnavailable") stores.scm.update((prev) => prev.root !== root ? prev : {
							...prev,
							status: null,
							loading: false,
							gitMissing: true
						});
					});
				};
				disposers.push(ctx.sessions.list.subscribe(bindRoot));
				bindRoot();
				const mirrorPreviewOpen = () => {
					const open = stores.preview.getSnapshot().open;
					if (open === lastPreviewOpen) return;
					lastPreviewOpen = open;
					stores.layout.update((prev) => ({
						...prev,
						previewOpen: open
					}));
					if (open) {
						const col = document.querySelector("[data-aionui-preview-col]");
						col?.classList.add("aionui-preview-enter");
						setTimeout(() => col?.classList.remove("aionui-preview-enter"), 300);
					}
				};
				disposers.push(stores.preview.subscribe(mirrorPreviewOpen));
				let langObserver;
				const syncLanguage = () => {
					setLanguage(document.documentElement.lang?.startsWith("zh") ? "zh" : "en");
				};
				langObserver = new MutationObserver(syncLanguage);
				langObserver.observe(document.documentElement, {
					attributes: true,
					attributeFilter: ["lang"]
				});
				syncLanguage();
				try {
					layout.mount();
					mountPanels(stores, () => layout.toggleExplorer());
				} catch (error) {
					console.error("[dsh-aionui-panel] mount failed:", error);
				}
				const flushOnHide = () => stores.flushNow();
				const onVisibilityChange = () => {
					if (document.visibilityState === "hidden") flushOnHide();
				};
				window.addEventListener("pagehide", flushOnHide);
				document.addEventListener("visibilitychange", onVisibilityChange);
				return () => {
					flushOnHide();
					window.removeEventListener("pagehide", flushOnHide);
					document.removeEventListener("visibilitychange", onVisibilityChange);
					disposeEvents?.();
					langObserver?.disconnect();
					for (const dispose of disposers) dispose();
					layout.dispose();
				};
			}, "dsh-aionui-panel: wiring");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map