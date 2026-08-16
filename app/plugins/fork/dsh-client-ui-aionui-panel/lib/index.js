import { mkdir, open, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import { createReadStream, watch } from "node:fs";
import { dirname, join, relative } from "node:path";
import { pipeline } from "node:stream/promises";
//#region src/host/gate.ts
/**
* Workspace gate for the /aionui-panel routes: canonicalize the requested
* project root and require it to be a registered workspace (or a directory
* inside one). This is the security boundary of the panel's fs/git routes -
* the browser may only read and mutate files under registered workspace
* roots, never arbitrary host directories.
* @module dsh-aionui-panel/host/gate
*/
/**
* Normalize a path for prefix comparison: collapse Windows separators to `/`
* and drop any trailing slash. On win32 the whole path is also lower-cased so
* a case-insensitive FS cannot trip the membership check (the drive letter and
* every segment are compared case-insensitively). On any other platform the
* path separator and case are left untouched.
*/
function normalizeForPrefix(value) {
	const normalized = value.replaceAll("\\", "/").replace(/\/+$/, "");
	return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}
/**
* The canonical prefix check: child must live inside (or equal) the root.
* Separator- and case-robust on Windows: `path.join` yields backslashes while
* git (`rev-parse --show-toplevel`) and the browser (`./x`) yield forward
* slashes, so both sides are normalized to forward slashes before comparing,
* and the comparison is case-insensitive on win32 (the FS is case-insensitive).
*/
function isPathInside(root, child) {
	if (root === "" || child === "") return false;
	const normRoot = normalizeForPrefix(root);
	const normChild = normalizeForPrefix(child);
	if (normChild === normRoot) return true;
	return normChild.startsWith(`${normRoot}/`);
}
/**
* Production gate: canonicalize the requested root and require it to be a
* registered workspace path (or a subdirectory of one). The host's workspace
* registry owns canonicalization, so an unowned path is rejected outright.
* @param ctx - context carrying the workspace service.
* @returns the gate.
*/
function createWorkspaceGate(ctx) {
	return async (root) => {
		if (typeof root !== "string" || root === "") return {
			ok: false,
			error: {
				code: "workspace-unknown",
				message: "empty project root"
			}
		};
		let canonical;
		try {
			canonical = await realpath(root);
		} catch {
			return {
				ok: false,
				error: {
					code: "workspace-unknown",
					message: "path does not resolve on disk"
				}
			};
		}
		const workspaces = ctx.workspaceRegistry.list();
		for (const workspace of workspaces) if (isPathInside(workspace.path, canonical)) return {
			ok: true,
			canonical
		};
		return {
			ok: false,
			error: {
				code: "workspace-unknown",
				message: "path is not inside a registered workspace"
			}
		};
	};
}
//#endregion
//#region src/host/fs-service.ts
/**
* Host filesystem service for the panel: directory listing, file read with a
* preview ceiling, text write with an mtime conflict check, filename search
* with directory pruning, delete (untracked discard), and a recursive watcher
* that emits change events. Every operation resolves against a gated project
* root and refuses to escape it (path traversal guard). Text is decoded utf-8;
* images come back as data URLs (capped) so the browser renders them without
* extra round trips.
* @module dsh-aionui-panel/host/fs-service
*/
/** Production watcher spawn over node:fs. */
const defaultSpawnWatcher = (path, options, listener) => watch(path, options, listener);
/** Preview text ceiling — mirrors AionUi's single-tab 80k-char cap. */
const TEXT_CAP_CHARS = 8e4;
/** Image read cap (data URL payload budget). */
const IMAGE_CAP_BYTES = 8 << 20;
/** Filename-search caps (results and scanned entries). */
const SEARCH_HIT_CAP = 200;
const SEARCH_SCAN_CAP = 2e4;
/** Directories skipped by search (VS Code-like noise reduction). */
const SEARCH_SKIP_DIRS = /* @__PURE__ */ new Set([".git", "node_modules"]);
/** Directories never listed in the tree. */
const TREE_SKIP_DIRS = /* @__PURE__ */ new Set([".git"]);
/** Polling fallback interval when recursive watch is unavailable. */
const POLL_FALLBACK_MS = 3e3;
/**
* Resolve a relative path against the canonical root, realpath-checking the
* existing ancestors so a symlink cannot smuggle the operation outside the
* root. A path that does not yet exist (ENOENT) is verified through its
* nearest existing ancestor — a nonexistent tail cannot itself be a symlink.
* A path whose real path escapes the root is rejected with path-outside-root.
*/
async function resolveInsideRoot(root, rel) {
	if (rel.includes("\0")) return {
		ok: false,
		error: {
			code: "path-outside-root",
			message: "invalid path"
		}
	};
	const abs = join(root, rel);
	if (!isPathInside(root, abs)) return {
		ok: false,
		error: {
			code: "path-outside-root",
			message: `path escapes root: ${rel}`
		}
	};
	let probe = abs;
	for (let hop = 0; hop < 32; hop += 1) {
		let real;
		try {
			real = await realpath(probe);
		} catch (error) {
			if (error.code !== "ENOENT") return {
				ok: true,
				abs
			};
			const parent = dirname(probe);
			if (parent === probe) return {
				ok: true,
				abs
			};
			probe = parent;
			continue;
		}
		if (!isPathInside(root, real)) return {
			ok: false,
			error: {
				code: "path-outside-root",
				message: `path resolves outside root: ${rel}`
			}
		};
		return {
			ok: true,
			abs
		};
	}
	return {
		ok: false,
		error: {
			code: "path-outside-root",
			message: `path cannot be resolved: ${rel}`
		}
	};
}
/** True when the relative path is, or passes through, a .git component. */
function isGitPath(rel) {
	return rel.split("/").some((part) => part.toLowerCase() === ".git");
}
/**
* True when the changed path lies inside node_modules or .git — the two
* directories whose churn (installs, builds, index writes) never represents
* a project-file change the panel needs to surface, and which dominate a
* recursive watch of a large workspace. Only win32 compares lower-cased
* (its filesystem is case-insensitive); POSIX compares the exact names so
* `NODE_MODULES` and `.GIT` stay ordinary project paths there.
*/
function isIgnoredWatchPath(filename) {
	return filename.split(/[\\/]/).some((part) => {
		const candidate = process.platform === "win32" ? part.toLowerCase() : part;
		return candidate === "node_modules" || candidate === ".git";
	});
}
/** Case-insensitive alpha compare (dirs first, then files). */
function compareEntries(a, b) {
	if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
	const an = a.name.toLowerCase();
	const bn = b.name.toLowerCase();
	return an < bn ? -1 : an > bn ? 1 : 0;
}
/** The image probe: parse PNG/JPEG/GIF/WebP header dimensions (undefined on failure). */
function probeImageSize(data) {
	try {
		if (data.length >= 24 && data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71) return {
			width: data.readUInt32BE(16),
			height: data.readUInt32BE(20)
		};
		if (data.length >= 10 && data[0] === 255 && data[1] === 216 && data[2] === 255) {
			let pos = 2;
			for (let segment = 0; segment < 16; segment += 1) {
				if (pos + 2 > data.length) return void 0;
				if (data[pos] !== 255) return void 0;
				while (pos < data.length && data[pos] === 255) pos += 1;
				if (pos >= data.length) return void 0;
				const marker = data[pos];
				pos += 1;
				if (marker === 1 || marker >= 208 && marker <= 215 || marker === 216) continue;
				if (marker === 192 || marker === 193 || marker === 194 || marker === 195 || marker === 197 || marker === 198 || marker === 199 || marker === 201 || marker === 202 || marker === 203 || marker === 205 || marker === 206 || marker === 207) {
					if (pos + 7 > data.length) return void 0;
					return {
						height: data.readUInt16BE(pos + 3),
						width: data.readUInt16BE(pos + 5)
					};
				}
				if (pos + 2 > data.length) return void 0;
				const length = data.readUInt16BE(pos);
				pos += length;
				if (pos < 0) return void 0;
			}
			return;
		}
		if (data.length >= 14 && data[0] === 71 && data[1] === 73 && data[2] === 70) return {
			width: data.readUInt16LE(6),
			height: data.readUInt16LE(8)
		};
		if (data.length >= 30 && data[8] === 87 && data[9] === 69 && data[10] === 66 && data[11] === 80 && data[12] === 86 && data[13] === 80 && data[14] === 56 && data[15] === 88) {
			const size = (o) => data[o] | data[o + 1] << 8 | data[o + 2] << 16;
			return {
				width: size(24) + 1,
				height: size(27) + 1
			};
		}
	} catch {
		return;
	}
}
/** Derive the mime type for a raw read from the extension, then the content. */
function imageMime(rel, data) {
	const ext = rel.split(".").pop()?.toLowerCase() ?? "";
	const byExt = {
		png: "image/png",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		gif: "image/gif",
		webp: "image/webp",
		svg: "image/svg+xml",
		ico: "image/x-icon",
		avif: "image/avif",
		bmp: "image/bmp",
		pdf: "application/pdf"
	};
	if (byExt[ext]) return byExt[ext];
	if (data.length >= 3 && data[0] === 137 && data[1] === 80 && data[2] === 78) return "image/png";
	if (data.length >= 3 && data[0] === 255 && data[1] === 216) return "image/jpeg";
	if (data.length >= 4 && data[0] === 37 && data[1] === 80 && data[2] === 68 && data[3] === 70) return "application/pdf";
	return "application/octet-stream";
}
/** Read the first 4 magic bytes of a file (empty buffer when unreadable). */
async function readMagicBytes(abs) {
	let handle;
	try {
		handle = await open(abs, "r");
		const buf = Buffer.alloc(4);
		const { bytesRead } = await handle.read(buf, 0, 4, 0);
		return buf.subarray(0, bytesRead);
	} catch {
		return Buffer.alloc(0);
	} finally {
		if (handle !== void 0) await handle.close().catch(() => {});
	}
}
/**
* Filesystem service: gated listing/read/write/search/delete plus a change
* watcher. All relative paths are resolved against the gated root.
* @param gate - the workspace gate (host: registered workspace membership).
*/
var FsService = class {
	gate;
	spawnWatcher;
	constructor(gate, spawnWatcher = defaultSpawnWatcher) {
		this.gate = gate;
		this.spawnWatcher = spawnWatcher;
	}
	/** Verify a project root against the workspace gate (used by the SSE layer). */
	verify(root) {
		return this.gate(root);
	}
	/** List one directory (relative path; '' = root). Sorted dirs-first alpha. */
	async list(root, rel) {
		const gated = await this.gate(root);
		if (!gated.ok) return gated.error;
		const resolved = await resolveInsideRoot(gated.canonical, rel);
		if (!resolved.ok) return resolved.error;
		let dirents;
		try {
			dirents = await readdir(resolved.abs, { withFileTypes: true });
		} catch {
			return {
				code: "not-found",
				message: `cannot list ${rel}`
			};
		}
		const out = [];
		for (const entry of dirents) {
			if (entry.isDirectory() && TREE_SKIP_DIRS.has(entry.name)) continue;
			const path = rel === "" ? entry.name : `${rel}/${entry.name}`;
			if (entry.isDirectory()) out.push({
				name: entry.name,
				path,
				isDir: true,
				size: 0,
				mtime: 0
			});
		}
		const files = dirents.filter((entry) => !entry.isDirectory());
		const statted = await Promise.all(files.map(async (entry) => {
			const path = rel === "" ? entry.name : `${rel}/${entry.name}`;
			try {
				const info = await stat(join(resolved.abs, entry.name));
				return {
					name: entry.name,
					path,
					isDir: false,
					size: info.size,
					mtime: info.mtimeMs
				};
			} catch {
				return {
					name: entry.name,
					path,
					isDir: false,
					size: 0,
					mtime: 0
				};
			}
		}));
		out.push(...statted);
		out.sort(compareEntries);
		return {
			root: gated.canonical,
			entries: out
		};
	}
	/** Read one file for preview: text decoded utf-8 (capped), images as data URLs. */
	async read(root, rel, asImage) {
		const gated = await this.gate(root);
		if (!gated.ok) return gated.error;
		const resolved = await resolveInsideRoot(gated.canonical, rel);
		if (!resolved.ok) return resolved.error;
		let data;
		let info;
		try {
			data = await readFile(resolved.abs);
			info = await stat(resolved.abs);
		} catch {
			return {
				code: "not-found",
				message: `cannot read ${rel}`
			};
		}
		if (info.isDirectory()) return {
			code: "is-directory",
			message: `${rel} is a directory`
		};
		if (asImage) {
			if (data.length > IMAGE_CAP_BYTES) return {
				code: "read-failed",
				message: "image exceeds preview cap"
			};
			return {
				content: `data:${imageMime(rel, data)};base64,${data.toString("base64")}`,
				truncated: false,
				size: data.length,
				mtime: info.mtimeMs,
				image: probeImageSize(data)
			};
		}
		const text = data.toString("utf8");
		const truncated = text.length > TEXT_CAP_CHARS;
		return {
			content: truncated ? text.slice(0, TEXT_CAP_CHARS) : text,
			truncated,
			size: data.length,
			mtime: info.mtimeMs
		};
	}
	/**
	* Resolve one file for raw streaming (the markdown image / pdf preview
	* route): gated, traversal-guarded, and .git-refusing. Returns the absolute
	* path with the derived mime and size — the HTTP layer streams the bytes
	* itself (createReadStream + Range), so even large files never sit in host
	* memory. Mime magic detection reads only the first few bytes.
	*/
	async readRaw(root, rel) {
		const gated = await this.gate(root);
		if (!gated.ok) return gated.error;
		if (isGitPath(rel)) return {
			code: "path-outside-root",
			message: "refusing to read .git"
		};
		const resolved = await resolveInsideRoot(gated.canonical, rel);
		if (!resolved.ok) return resolved.error;
		let info;
		try {
			info = await stat(resolved.abs);
		} catch {
			return {
				code: "not-found",
				message: `cannot read ${rel}`
			};
		}
		if (info.isDirectory()) return {
			code: "is-directory",
			message: `${rel} is a directory`
		};
		return {
			abs: resolved.abs,
			mime: imageMime(rel, await readMagicBytes(resolved.abs)),
			size: info.size
		};
	}
	/** Write text content back, refusing when the file moved on disk (mtime conflict). */
	async write(root, rel, content, baseMtime) {
		const gated = await this.gate(root);
		if (!gated.ok) return gated.error;
		if (isGitPath(rel)) return {
			code: "path-outside-root",
			message: "refusing to touch .git"
		};
		const resolved = await resolveInsideRoot(gated.canonical, rel);
		if (!resolved.ok) return resolved.error;
		try {
			let current;
			try {
				current = await stat(resolved.abs);
			} catch {
				current = { mtimeMs: 0 };
			}
			if (baseMtime !== void 0 && Number(current.mtimeMs) !== 0 && Math.abs(Number(current.mtimeMs) - baseMtime) > 1) return {
				code: "write-conflict",
				message: "file changed on disk since it was loaded"
			};
			await mkdir(dirname(resolved.abs), { recursive: true });
			await writeFile(resolved.abs, content, "utf8");
			return { mtime: (await stat(resolved.abs)).mtimeMs };
		} catch {
			return {
				code: "write-failed",
				message: `cannot write ${rel}`
			};
		}
	}
	/** Recursive filename search (case-insensitive substring), pruned at noise dirs. */
	async search(root, query) {
		const gated = await this.gate(root);
		if (!gated.ok) return gated.error;
		const needle = query.trim().toLowerCase();
		if (needle === "") return {
			query,
			hits: [],
			truncated: false
		};
		const hits = [];
		let scanned = 0;
		let truncated = false;
		const walk = async (rel, depth) => {
			if (truncated) return;
			const resolved = await resolveInsideRoot(gated.canonical, rel);
			if (!resolved.ok) return;
			let dirents;
			try {
				dirents = await readdir(resolved.abs, { withFileTypes: true });
			} catch {
				return;
			}
			for (const entry of dirents) {
				if (scanned >= SEARCH_SCAN_CAP) {
					truncated = true;
					return;
				}
				scanned += 1;
				const path = rel === "" ? entry.name : `${rel}/${entry.name}`;
				if (entry.isDirectory()) {
					if (SEARCH_SKIP_DIRS.has(entry.name)) continue;
					if (depth < 24 && !truncated) await walk(path, depth + 1);
					continue;
				}
				if (entry.name.toLowerCase().includes(needle)) {
					if (hits.length >= SEARCH_HIT_CAP) {
						truncated = true;
						return;
					}
					hits.push({
						path,
						name: entry.name,
						isDir: false
					});
				}
			}
		};
		try {
			await walk("", 0);
		} catch {
			return {
				code: "search-failed",
				message: "search walk failed"
			};
		}
		const rank = (hit) => {
			const name = hit.name.toLowerCase();
			if (name === needle) return 0;
			if (name.startsWith(needle)) return 1;
			return 2;
		};
		hits.sort((a, b) => rank(a) - rank(b) || a.path.length - b.path.length || (a.path < b.path ? -1 : 1));
		return {
			query,
			hits,
			truncated
		};
	}
	/** Delete a path (discard of untracked files). Recursive for directories. */
	async delete(root, rel) {
		const gated = await this.gate(root);
		if (!gated.ok) return gated.error;
		if (rel === "") return {
			code: "path-outside-root",
			message: "refusing to delete the root"
		};
		if (isGitPath(rel)) return {
			code: "path-outside-root",
			message: "refusing to touch .git"
		};
		const resolved = await resolveInsideRoot(gated.canonical, rel);
		if (!resolved.ok) return resolved.error;
		try {
			await rm(resolved.abs, {
				recursive: true,
				force: true
			});
			return { ok: true };
		} catch {
			return {
				code: "write-failed",
				message: `cannot delete ${rel}`
			};
		}
	}
	/**
	* Watch a root recursively and emit change events (debounced + batched).
	* Recursive watch may be unavailable; a polling fallback then compares the
	* root signature periodically (best-effort).
	* @param root - project root to watch (gated on connect).
	* @param onChange - fired (debounced) when anything under root changed.
	* @returns disposer.
	*/
	watch(root, onChange) {
		let disposed = false;
		let timer;
		let pollTimer;
		let watcher;
		const fire = () => {
			if (timer !== void 0) return;
			timer = setTimeout(() => {
				timer = void 0;
				if (!disposed) onChange();
			}, 150);
		};
		let lastSignature = "";
		const poll = () => {
			this.signature(root).then((signature) => {
				if (signature === null || signature === lastSignature) return;
				lastSignature = signature;
				fire();
			});
		};
		const startPolling = () => {
			if (pollTimer !== void 0) return;
			poll();
			pollTimer = setInterval(poll, POLL_FALLBACK_MS);
		};
		this.gate(root).then((gated) => {
			if (!gated.ok || disposed) return;
			try {
				watcher = this.spawnWatcher(gated.canonical, { recursive: true }, (_event, filename) => {
					const name = filename === null ? null : Buffer.isBuffer(filename) ? filename.toString("utf8") : filename;
					if (name !== null && isIgnoredWatchPath(name)) return;
					fire();
				});
				watcher.on("error", () => {
					if (disposed) return;
					watcher?.close();
					watcher = void 0;
					startPolling();
				});
			} catch {
				watcher = void 0;
				startPolling();
			}
		});
		return () => {
			disposed = true;
			if (timer !== void 0) clearTimeout(timer);
			if (pollTimer !== void 0) clearInterval(pollTimer);
			watcher?.close();
		};
	}
	/** Cheap root signature: entries of the root with sizes/mtimes (poll fallback). */
	async signature(root) {
		const gated = await this.gate(root);
		if (!gated.ok) return null;
		try {
			const entries = await readdir(gated.canonical, { withFileTypes: true });
			const parts = [];
			for (const entry of entries.slice(0, 200)) {
				let extra = "";
				if (!entry.isDirectory()) try {
					const info = await stat(join(gated.canonical, entry.name));
					extra = `${info.size}:${Math.round(info.mtimeMs / 1e3)}`;
				} catch {
					extra = "gone";
				}
				parts.push(`${entry.name}${entry.isDirectory() ? "/" : ""}${extra}`);
			}
			return parts.join("|");
		} catch {
			return null;
		}
	}
};
//#endregion
//#region src/host/git-service.ts
/**
* Host git service for the SCM tab: working-tree status (porcelain v1, -z),
* stage/unstage/discard batches, all scoped to the gated project root and
* executed through the managed subprocess seam. Parsing is pure and exported
* for tests; the service only wraps the runner. Discard never touches the
* staged side (the index is only ever rewritten by stage/unstage), matching
* the "discard = worktree side" contract.
* @module dsh-aionui-panel/host/git-service
*/
/** Collected-output cap for one git command. */
const OUTPUT_CAP_BYTES = 1 << 20;
/** TTL for a positive repo-top-level verdict. */
const REPO_CACHE_TTL_MS = 6e4;
/** TTL for a negative (null) repo-top-level verdict. */
const NO_REPO_CACHE_TTL_MS = 3e4;
/** Production runner over `ctx.subprocess`: one managed child per command. */
function subprocessRunner(ctx) {
	return { async run(argv, cwd) {
		const spec = {
			argv: ["git", ...argv],
			cwd,
			stdio: {
				stdin: "ignore",
				stdout: { maxBytes: OUTPUT_CAP_BYTES },
				stderr: { maxBytes: OUTPUT_CAP_BYTES }
			},
			graceMs: 1e4
		};
		let handle;
		try {
			handle = ctx.subprocess.spawn(spec);
		} catch (error) {
			console.error("[dsh-aionui-panel] git spawn failed:", error);
			return {
				exitCode: 127,
				stdout: "",
				stderr: "git: spawn failed: " + (error instanceof Error ? error.message : String(error))
			};
		}
		try {
			const outcome = await handle.done;
			const stdout = handle.collected.stdout?.readFrom(0).text ?? "";
			const stderr = handle.collected.stderr?.readFrom(0).text ?? "";
			return {
				exitCode: outcome.exitCode,
				stdout,
				stderr
			};
		} catch (error) {
			console.error("[dsh-aionui-panel] git run failed:", error);
			return {
				exitCode: 127,
				stdout: "",
				stderr: "git: run failed: " + (error instanceof Error ? error.message : String(error))
			};
		}
	} };
}
/** Map one porcelain letter to the row state (unknown letters stay unknown). */
function porcelainState(letter) {
	switch (letter) {
		case "A": return "created";
		case "M": return "modified";
		case "D": return "deleted";
		case "R": return "renamed";
		case "C": return "created";
		case "U": return "conflicted";
		case "?": return "untracked";
		default: return "unknown";
	}
}
/**
* Parse `git status --porcelain=v1 -z` output into staged/unstaged/untracked
* rows. With -z every entry is NUL-terminated; rename entries carry two paths
* (old and new). Pure — exported for tests.
* @param output - raw porcelain v1 -z output.
* @returns the three change groups.
*/
function parsePorcelain(output) {
	const staged = [];
	const unstaged = [];
	const untracked = [];
	if (output === "") return {
		staged,
		unstaged,
		untracked
	};
	const fields = output.split("\0");
	for (let i = 0; i < fields.length; i += 1) {
		const field = fields[i];
		if (field === "") continue;
		const x = field[0] ?? " ";
		const y = field[1] ?? " ";
		const path = field.slice(3);
		if (x === "?" && y === "?") {
			untracked.push({
				path,
				state: "untracked",
				staged: false
			});
			continue;
		}
		if (x === "R" || x === "C") {
			const oldPath = path;
			const newPath = fields[i + 1] ?? oldPath;
			i += 1;
			staged.push({
				path: newPath,
				oldPath,
				state: porcelainState(x),
				staged: true
			});
			if (y !== " ") unstaged.push({
				path: newPath,
				oldPath,
				state: porcelainState(y),
				staged: false
			});
			continue;
		}
		if (x !== " ") staged.push({
			path,
			state: porcelainState(x),
			staged: true
		});
		if (y !== " ") unstaged.push({
			path,
			state: porcelainState(y),
			staged: false
		});
	}
	return {
		staged,
		unstaged,
		untracked
	};
}
/** Parse the porcelain row set into the status view shape. */
function parseStatusView(root, branch, output) {
	const { staged, unstaged, untracked } = parsePorcelain(output);
	return {
		root,
		branch,
		staged,
		unstaged,
		untracked
	};
}
/** The not-a-repository verdict for status reads. */
const NO_REPO = {
	code: "git-unavailable",
	message: "not a git repository"
};
/**
* Workspace-scoped git operations. Gated methods pass the gate, resolve the
* repository root, and reject non-repositories with a stable error; the
* `Canonical` variants trust an already-gated canonical root (the SSE poll)
* and skip the gate.
* @param runner - the spawn seam.
* @param gate - workspace-membership gate.
* @param fsDelete - delete seam for untracked discard (host: FsService.delete).
*/
var GitService = class {
	runner;
	gate;
	fsDelete;
	constructor(runner, gate, fsDelete) {
		this.runner = runner;
		this.gate = gate;
		this.fsDelete = fsDelete;
	}
	/** Cached one-shot git binary probe; never re-probes after the first call. */
	availablePromise;
	/**
	* Cached repo-top-level resolution per canonical workspace, with a TTL so
	* running `git init` (positive self-heal) or deleting `.git` (negative
	* self-heal) is discovered by a later probe. Positive verdicts live 60s,
	* negative (null) verdicts 30s; exitCode 127 is never cached because it
	* means spawn/run failed rather than "not a repository".
	*/
	repoCache = /* @__PURE__ */ new Map();
	/**
	* Probe the git binary once (git --version) and cache the verdict for the
	* service lifetime. A machine without git then degrades every operation to
	* the stable "not a git repository" state after a single failed spawn,
	* instead of re-spawning ENOENT on every poll tick. The cache stays false
	* even if git is installed later; the host restart picks it up.
	*/
	gitAvailable() {
		if (this.availablePromise === void 0) this.availablePromise = this.runner.run(["--version"], "/").then((result) => result.exitCode === 0).catch(() => false);
		return this.availablePromise;
	}
	/**
	* Resolve the repo top-level for one canonical root. Verdicts are cached
	* with a TTL: a positive repo path for 60s, a negative null for 30s. After
	* expiry the next call re-runs `rev-parse --show-toplevel`, so a repo
	* created or removed while the host is running is picked up later. An
	* exitCode 127 means the spawn/run itself failed; it returns null but is
	* deliberately not cached so the next call retries. Any other failure is
	* cached as a negative verdict for its TTL.
	*/
	repoOf(root) {
		const now = Date.now();
		const cached = this.repoCache.get(root);
		if (cached !== void 0 && cached.expiresAt > now) return cached.value;
		const entry = {
			value: Promise.resolve(null),
			expiresAt: Number.POSITIVE_INFINITY
		};
		entry.value = this.run(["rev-parse", "--show-toplevel"], root).then((result) => {
			if (result.exitCode === 127) {
				if (this.repoCache.get(root) === entry) this.repoCache.delete(root);
				return null;
			}
			if (result.exitCode !== 0) {
				entry.expiresAt = now + NO_REPO_CACHE_TTL_MS;
				return null;
			}
			const repo = result.stdout.trim();
			const found = repo !== "" && isPathInside(repo, root) ? repo : null;
			entry.expiresAt = now + (found === null ? NO_REPO_CACHE_TTL_MS : REPO_CACHE_TTL_MS);
			return found;
		}).catch(() => {
			entry.expiresAt = now + NO_REPO_CACHE_TTL_MS;
			return null;
		});
		this.repoCache.set(root, entry);
		return entry.value;
	}
	/**
	* Whether an already-gated canonical root is a git repository. Skips the
	* workspace gate so the SSE poll does not double-gate every 2s tick; the
	* underlying repoOf cache keeps rev-parse probes at TTL cadence.
	*/
	isRepositoryCanonical(canonicalRoot) {
		return this.repoOf(canonicalRoot).then((repo) => repo !== null);
	}
	/**
	* Whether a workspace root is a git repository. Gates the root first (POST
	* route entry point); the SSE poll should use `isRepositoryCanonical`.
	*/
	async isRepository(root) {
		const gated = await this.gate(root);
		if (!gated.ok) return false;
		return await this.isRepositoryCanonical(gated.canonical);
	}
	/** Resolve the gated canonical root and the repository top-level. */
	async repo(root) {
		const gated = await this.gate(root);
		if (!gated.ok) return {
			ok: false,
			error: gated.error
		};
		const repo = await this.repoOf(gated.canonical);
		if (repo === null) return {
			ok: false,
			error: NO_REPO
		};
		return {
			ok: true,
			root: gated.canonical,
			repo
		};
	}
	/** Run one git invocation and classify failures. */
	async run(argv, cwd) {
		return this.runner.run(argv, cwd);
	}
	/** The repo status view; null when the root is not a repository. */
	async status(root) {
		if (!await this.gitAvailable()) return null;
		const repo = await this.repo(root);
		if (!repo.ok) return repo.error.code === "git-unavailable" ? null : repo.error;
		return this.statusAt(repo.root, repo.repo);
	}
	/**
	* The repo status view for an already-gated canonical root; null when it is
	* not a repository. Skips the workspace gate (SSE subscribers were gated at
	* connect) and reuses the same repoOf cache + status parsing as `status`.
	*/
	async statusCanonical(canonicalRoot) {
		const repo = await this.repoOf(canonicalRoot);
		if (repo === null) return null;
		return this.statusAt(canonicalRoot, repo);
	}
	/** Run branch + porcelain status for one resolved repo and parse the view. */
	async statusAt(root, repo) {
		const [branchResult, statusResult] = await Promise.all([this.run([
			"rev-parse",
			"--abbrev-ref",
			"HEAD"
		], repo), this.run([
			"status",
			"--porcelain=v1",
			"-z",
			"--untracked-files=all"
		], repo)]);
		return parseStatusView(root, branchResult.stdout.trim() === "HEAD" ? "" : branchResult.stdout.trim(), statusResult.stdout);
	}
	/** The repo root for the watch layer (null when not a repository). */
	async repoRoot(root) {
		const repo = await this.repo(root);
		return repo.ok ? repo.repo : null;
	}
	/**
	* The unified diff of one path ('' when there is no diff to show). Staged
	* paths diff the index against HEAD (`--cached`); unstaged paths diff the
	* worktree against the index. Untracked paths have no index/HEAD entry, so
	* they diff against /dev/null (the canonical new-file shape); its exit code
	* is 1 — differences exist — which is a success here, not a failure.
	*/
	async diff(root, path, staged) {
		const repo = await this.repo(root);
		if (!repo.ok) return repo.error;
		const abs = join(repo.repo, path);
		if (!isPathInside(repo.repo, abs)) return {
			code: "path-outside-root",
			message: "path outside the repository"
		};
		const rel = relative(repo.repo, abs);
		const result = (await this.run([
			"ls-files",
			"--error-unmatch",
			"--",
			rel
		], repo.repo)).exitCode !== 0 ? await this.run([
			"diff",
			"--no-index",
			"--",
			"/dev/null",
			rel
		], repo.repo) : staged ? await this.run([
			"diff",
			"--cached",
			"--",
			rel
		], repo.repo) : await this.run([
			"diff",
			"--",
			rel
		], repo.repo);
		if (result.exitCode !== 0 && result.exitCode !== 1) return {
			code: "git-failed",
			message: "git diff failed"
		};
		return { content: result.stdout };
	}
	/** Verify paths stay inside the repo root (defense in depth). */
	pathsInside(repo, paths) {
		return paths.map((p) => join(repo, p)).filter((p) => isPathInside(repo, p)).map((p) => p);
	}
	/** Stage paths (git add). Batch result reflects the post-op status. */
	async stage(root, paths) {
		return this.batch(root, paths, async (repo, inside) => {
			return (await this.run([
				"add",
				"--",
				...inside
			], repo)).exitCode === 0;
		});
	}
	/** Unstage paths (git restore --staged). */
	async unstage(root, paths) {
		return this.batch(root, paths, async (repo, inside) => {
			return (await this.run([
				"restore",
				"--staged",
				"--",
				...inside
			], repo)).exitCode === 0;
		});
	}
	/**
	* Discard paths (worktree side only). Tracked paths are restored from the
	* index; untracked paths are deleted through the fs seam. The batch reports
	* applied/failed per path.
	*/
	async discard(root, paths) {
		const repo = await this.repo(root);
		if (!repo.ok) return repo.error;
		const inside = this.pathsInside(repo.repo, paths);
		const applied = [];
		const failed = [];
		for (const p of paths) {
			const abs = join(repo.repo, p);
			if (!inside.includes(abs)) {
				failed.push(p);
				continue;
			}
			if ((await this.run([
				"ls-files",
				"--error-unmatch",
				"--",
				":(literal)" + p
			], repo.repo)).exitCode !== 0) {
				try {
					const real = await realpath(join(repo.repo, p));
					if (!isPathInside(repo.repo, real)) {
						failed.push(p);
						continue;
					}
				} catch {}
				const rel = relative(repo.root, join(repo.repo, p));
				if (rel === ".." || rel.startsWith("../")) {
					failed.push(p);
					continue;
				}
				const deleted = await this.fsDelete(repo.root, rel);
				if ("ok" in deleted && deleted.ok) applied.push(p);
				else failed.push(p);
				continue;
			}
			if ((await this.run([
				"restore",
				"--worktree",
				"--",
				":(literal)" + p
			], repo.repo)).exitCode === 0) applied.push(p);
			else failed.push(p);
		}
		return {
			applied,
			failed
		};
	}
	/** Shared batch plumbing: gate, repo resolve, path filter, run the op. */
	async batch(root, paths, op) {
		const repo = await this.repo(root);
		if (!repo.ok) return repo.error;
		const inside = this.pathsInside(repo.repo, paths);
		const ok = inside.length > 0 ? await op(repo.repo, inside) : true;
		if (!ok) return {
			code: "git-failed",
			message: "git operation failed"
		};
		return {
			applied: ok ? paths.filter((p) => inside.includes(join(repo.repo, p))) : [],
			failed: paths.filter((p) => !inside.includes(join(repo.repo, p)))
		};
	}
};
//#endregion
//#region src/host/poll-guard.ts
const DEFAULT_TIMERS = {
	set: (fn, ms) => setTimeout(fn, ms),
	clear: (handle) => {
		clearTimeout(handle);
	}
};
/**
* Owns one bounded poll loop.
*
* Guarantees: at most one task runs at a time (a scheduled tick whose turn
* arrives while a run is in flight is dropped); consecutive failures double
* the delay up to maxBackoffMs and reset on the first success; the loop
* stops forever at deadlineMs and cancels its timer.
*/
var PollGuard = class {
	options;
	handle;
	running = false;
	startedAt = 0;
	stopped = false;
	failures = 0;
	/** @param options - loop bounds; interval/deadline/backoff/onRun are required, the rest optional. */
	constructor(options) {
		this.options = {
			timers: DEFAULT_TIMERS,
			onDeadline: () => {},
			onSettled: () => {},
			...options
		};
	}
	/** Start the loop. Safe to call once; later calls are ignored. */
	start() {
		if (this.startedAt !== 0) return;
		this.startedAt = Date.now();
		this.schedule(this.options.intervalMs);
	}
	/** Stop the loop permanently and drop any pending tick. */
	stop() {
		this.stopped = true;
		this.options.timers.clear(this.handle);
		this.handle = void 0;
	}
	schedule(delayMs) {
		if (this.stopped) return;
		this.handle = this.options.timers.set(() => {
			this.tick();
		}, delayMs);
	}
	delay() {
		const backoff = this.options.intervalMs * 2 ** Math.min(this.failures, 8);
		return Math.min(backoff, this.options.maxBackoffMs);
	}
	async tick() {
		if (this.stopped) return;
		if (this.running) return;
		if (Date.now() - this.startedAt >= this.options.deadlineMs) {
			this.stopped = true;
			this.options.onDeadline();
			return;
		}
		this.running = true;
		try {
			await this.options.onRun();
			this.failures = 0;
		} catch {
			this.failures += 1;
		} finally {
			this.running = false;
			this.options.onSettled(this.failures);
			this.schedule(this.delay());
		}
	}
};
//#endregion
//#region src/host/routes.ts
const OK = (value) => ({
	ok: true,
	value
});
const FAIL = (error) => ({
	ok: false,
	error
});
/** Structural request failure (never a workspace fault). */
const BAD_REQUEST = {
	code: "internal",
	message: "malformed request"
};
/**
* Poll interval for git-status changes while subscribers are connected.
* Kept deliberately long (30s): on Windows a cold git.exe costs ~0.7s per
* spawn, and the SCM panel already refreshes event-driven (fs watch for
* file edits) and on window focus — the poll only needs to catch
* out-of-band .git writes (commits/checkouts from other tools).
*/
const GIT_POLL_MS = 3e4;
/** SSE keep-alive comment interval (proxies drop idle connections). */
const HEARTBEAT_MS = 15e3;
/**
* Parse a single-range `bytes=start-end` header against the file size.
* Returns null when no range was requested, 'invalid' for malformed or
* unsatisfiable ranges (the caller answers 416), or the clamped start/end
* (inclusive). Multi-range requests are treated as invalid — the panel only
* ever serves single ranges. Suffix ranges (`bytes=-N`) select the last N
* bytes. Range support added after human review on #242 (pdf seeking).
*/
function parseRangeHeader(header, size) {
	if (header === void 0) return null;
	const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
	if (match === null || match[1] === "" && match[2] === "") return "invalid";
	if (match[1] === "") {
		const suffix = Number(match[2]);
		if (suffix <= 0 || size === 0) return "invalid";
		return {
			start: Math.max(0, size - suffix),
			end: size - 1
		};
	}
	const start = Number(match[1]);
	const end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
	if (size === 0 || start > end || start >= size) return "invalid";
	return {
		start,
		end
	};
}
/**
* Deadline for one git-status subprocess inside pollGit. Not an execution
* timeout — the subprocess' own graceMs limits a single binary run; this is
* the route layer's guard against a hung status (e.g. a wedged git daemon on
* a cold path) that would otherwise leave the anti-overlap guard (owned by
* PollGuard) wedged forever and silence SCM. Owned here so the deadline is independent
* of any service-level setting.
*/
const GIT_STATUS_TIMEOUT_MS = 15e3;
/**
* PollGuard loop bounds. The poll is stopped by the SSE subscriber lifecycle
* (start on first subscriber, stop when the last disconnects), so the guard's
* own deadline is never reached in practice (MAX_SAFE_INTEGER ms ~ no
* deadline), preserving the former setInterval which kept polling as long as
* any stream was connected. maxBackoffMs equals the interval so a rejected
* run retries at the same cadence as a healthy one (interval unchanged).
*/
const GIT_POLL_DEADLINE_MS = Number.MAX_SAFE_INTEGER;
const GIT_POLL_MAX_BACKOFF_MS = GIT_POLL_MS;
/**
* Loopback trust fence — the same judgment dsh-ssh applies to its host
* routes: a loopback socket address AND a loopback Host header, plus browser
* same-origin markers. The /aionui-panel operations read/write real workspace
* files and run git, so a LAN-exposed dsh web must not serve them to unpaired
* devices. The socket address is authoritative; X-Forwarded-For is never
* trusted (matching dsh-ssh).
*/
function isLoopbackRequest(request) {
	const address = request.socket.remoteAddress;
	if (address !== "127.0.0.1" && address !== "::1" && address !== "::ffff:127.0.0.1") return false;
	const host = request.headers.host;
	if (typeof host !== "string") return false;
	let hostUrl;
	try {
		hostUrl = new URL(`http://${host}`);
	} catch {
		return false;
	}
	if (hostUrl.hostname !== "127.0.0.1" && hostUrl.hostname !== "localhost" && hostUrl.hostname !== "[::1]") return false;
	if (request.headers["sec-fetch-site"] === "cross-site") return false;
	const origin = request.headers.origin;
	if (origin === void 0) return true;
	try {
		return new URL(origin).host === hostUrl.host;
	} catch {
		return false;
	}
}
/** Write the shared non-loopback rejection (same body as dsh-ssh). */
function forbidden(res) {
	res.writeHead(403, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify({ error: "forbidden: loopback-only" }));
}
/** Read a JSON request body into an unknown value; null when unparseable. */
async function readJsonBody(req) {
	const chunks = [];
	let total = 0;
	for await (const chunk of req) {
		const buffer = chunk;
		chunks.push(buffer);
		total += buffer.length;
		if (total > 1 << 20) return null;
	}
	const text = Buffer.concat(chunks).toString("utf8");
	if (text === "") return null;
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}
/** Extract the required string field from a JSON object payload. */
function strField(payload, key) {
	if (typeof payload !== "object" || payload === null) return null;
	const value = payload[key];
	return typeof value === "string" && value !== "" ? value : null;
}
/** Extract a string field, accepting the empty string as a value. */
function strOrEmpty(payload, key) {
	if (typeof payload !== "object" || payload === null) return null;
	const value = payload[key];
	return typeof value === "string" ? value : null;
}
/** Extract a string array field (defaults to []). */
function strArray(payload, key) {
	if (typeof payload !== "object" || payload === null) return null;
	const value = payload[key];
	if (value === void 0) return [];
	if (!Array.isArray(value)) return null;
	if (!value.every((item) => typeof item === "string")) return null;
	return value;
}
/** Write one JSON envelope response. */
function json(res, envelope, status = 200) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(envelope));
}
/**
* Register the /aionui-panel routes (prefix for JSON, exact for the SSE
* stream — longest-prefix-wins keeps them disjoint).
* @param ctx - context carrying the webServer service.
* @param fs - the gated filesystem service.
* @param git - the gated git service.
* @returns the route disposers.
*/
function registerPanelRoutes(ctx, fs, git) {
	const subscribers = /* @__PURE__ */ new Set();
	let gitPoll;
	let heartbeatTimer;
	const push = (subscriber, payload) => {
		subscriber.res.write(`event: change\ndata: ${JSON.stringify(payload)}\n\n`);
	};
	let gitProbed = false;
	let gitUnavailable = false;
	const pollGit = async () => {
		if (!gitProbed) {
			gitProbed = true;
			if (!await git.gitAvailable()) {
				gitUnavailable = true;
				ctx.logger.warn("dsh-aionui-panel: git binary unavailable, SCM polling disabled");
				for (const subscriber of subscribers) push(subscriber, { kind: "gitUnavailable" });
			}
		}
		if (gitUnavailable) return;
		await Promise.all([...subscribers].map(async (subscriber) => {
			try {
				if (!await git.isRepositoryCanonical(subscriber.root)) return;
				const status = await Promise.race([git.statusCanonical(subscriber.root), new Promise((_, reject) => {
					setTimeout(() => reject(/* @__PURE__ */ new Error("git status timed out")), GIT_STATUS_TIMEOUT_MS);
				})]);
				if (status === null) return;
				const key = `${status.branch}|${JSON.stringify(status.staged)}|${JSON.stringify(status.unstaged)}|${JSON.stringify(status.untracked)}`;
				if (key === subscriber.lastGit) return;
				subscriber.lastGit = key;
				push(subscriber, {
					kind: "git",
					status
				});
			} catch (error) {
				ctx.logger.warn(`dsh-aionui-panel: git poll failed for ${subscriber.root}: ${String(error)}`);
			}
		}));
	};
	const startGitPoll = () => {
		if (gitPoll !== void 0) return;
		gitPoll = new PollGuard({
			intervalMs: GIT_POLL_MS,
			deadlineMs: GIT_POLL_DEADLINE_MS,
			maxBackoffMs: GIT_POLL_MAX_BACKOFF_MS,
			onRun: pollGit
		});
		gitPoll.start();
	};
	const stopGitPoll = () => {
		if (gitPoll === void 0) return;
		gitPoll.stop();
		gitPoll = void 0;
	};
	/**
	* GET /aionui-panel/raw: stream one workspace file (markdown image srcs,
	* pdf preview). Gated like every other operation; FsService.readRaw only
	* resolves and stats the path, the bytes are piped straight from disk with
	* the derived mime — the whole file never sits in host memory. Single byte
	* ranges are honored (206/416) so the browser pdf viewer can seek large
	* files. No validators are negotiated, so the browser revalidates every
	* time — a re-edited file never shows stale bytes.
	*/
	const serveRaw = async (req, url, res) => {
		const root = url.searchParams.get("root");
		const path = url.searchParams.get("path");
		if (root === null || root === "" || path === null || path === "") {
			json(res, FAIL(BAD_REQUEST), 400);
			return;
		}
		const result = await fs.readRaw(root, path);
		if (!("abs" in result)) {
			const status = result.code === "path-outside-root" || result.code === "is-directory" ? 403 : 404;
			json(res, FAIL(result), status);
			return;
		}
		const range = parseRangeHeader(req.headers.range, result.size);
		if (range === "invalid") {
			res.writeHead(416, { "content-range": `bytes */${result.size}` });
			res.end();
			return;
		}
		const headers = {
			"content-type": result.mime,
			"cache-control": "no-cache",
			"x-content-type-options": "nosniff",
			"accept-ranges": "bytes"
		};
		if (range === null) {
			headers["content-length"] = result.size;
			res.writeHead(200, headers);
		} else {
			headers["content-range"] = `bytes ${range.start}-${range.end}/${result.size}`;
			headers["content-length"] = range.end - range.start + 1;
			res.writeHead(206, headers);
		}
		try {
			await pipeline(createReadStream(result.abs, range === null ? void 0 : {
				start: range.start,
				end: range.end
			}), res);
		} catch {
			res.destroy();
		}
	};
	const handler = async (req, res) => {
		if (!isLoopbackRequest(req)) {
			forbidden(res);
			return;
		}
		if (req.method === "GET") {
			const url = new URL(req.url ?? "/", "http://x");
			if (url.pathname === "/aionui-panel/raw") {
				await serveRaw(req, url, res);
				return;
			}
			res.writeHead(405);
			res.end();
			return;
		}
		if (req.method !== "POST") {
			res.writeHead(405);
			res.end();
			return;
		}
		if (!(req.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
			json(res, FAIL(BAD_REQUEST), 415);
			return;
		}
		const pathname = new URL(req.url ?? "/", "http://x").pathname;
		const payload = await readJsonBody(req);
		if (payload === null) {
			json(res, FAIL(BAD_REQUEST));
			return;
		}
		const root = strField(payload, "root");
		if (root === null) {
			json(res, FAIL(BAD_REQUEST));
			return;
		}
		switch (pathname) {
			case "/aionui-panel/list": {
				const path = strField(payload, "path") ?? "";
				const result = await fs.list(root, path);
				json(res, "entries" in result ? OK(result) : FAIL(result));
				return;
			}
			case "/aionui-panel/read": {
				const path = strField(payload, "path");
				if (path === null) {
					json(res, FAIL(BAD_REQUEST));
					return;
				}
				const asImage = typeof payload === "object" && payload !== null ? payload.asImage === true : false;
				const result = await fs.read(root, path, asImage);
				json(res, "content" in result ? OK(result) : FAIL(result));
				return;
			}
			case "/aionui-panel/write": {
				const path = strField(payload, "path");
				const content = strOrEmpty(payload, "content");
				if (path === null || content === null) {
					json(res, FAIL(BAD_REQUEST));
					return;
				}
				const rawBase = typeof payload === "object" && payload !== null ? payload.baseMtime : void 0;
				const baseMtime = typeof rawBase === "number" && Number.isFinite(rawBase) ? rawBase : void 0;
				const result = await fs.write(root, path, content, baseMtime);
				json(res, "mtime" in result ? OK(result) : FAIL(result));
				return;
			}
			case "/aionui-panel/search": {
				const query = strField(payload, "query") ?? "";
				const result = await fs.search(root, query);
				json(res, "hits" in result ? OK(result) : FAIL(result));
				return;
			}
			case "/aionui-panel/delete": {
				const path = strField(payload, "path");
				if (path === null) {
					json(res, FAIL(BAD_REQUEST));
					return;
				}
				const result = await fs.delete(root, path);
				json(res, "ok" in result ? OK(result) : FAIL(result));
				return;
			}
			case "/aionui-panel/git-status": {
				const result = await git.status(root);
				json(res, result === null ? OK(null) : "root" in result ? OK(result) : FAIL(result));
				return;
			}
			case "/aionui-panel/git-diff": {
				const path = strField(payload, "path");
				if (path === null) {
					json(res, FAIL(BAD_REQUEST));
					return;
				}
				const staged = typeof payload === "object" && payload !== null ? payload.staged === true : false;
				const result = await git.diff(root, path, staged);
				json(res, "content" in result ? OK(result) : FAIL(result));
				return;
			}
			case "/aionui-panel/git-stage": {
				const paths = strArray(payload, "paths");
				if (paths === null) {
					json(res, FAIL(BAD_REQUEST));
					return;
				}
				const result = await git.stage(root, paths);
				json(res, "applied" in result ? OK(result) : FAIL(result));
				return;
			}
			case "/aionui-panel/git-unstage": {
				const paths = strArray(payload, "paths");
				if (paths === null) {
					json(res, FAIL(BAD_REQUEST));
					return;
				}
				const result = await git.unstage(root, paths);
				json(res, "applied" in result ? OK(result) : FAIL(result));
				return;
			}
			case "/aionui-panel/git-discard": {
				const paths = strArray(payload, "paths");
				if (paths === null) {
					json(res, FAIL(BAD_REQUEST));
					return;
				}
				const result = await git.discard(root, paths);
				json(res, "applied" in result ? OK(result) : FAIL(result));
				return;
			}
			default:
				res.writeHead(404);
				res.end();
		}
	};
	const sse = async (req, res) => {
		if (!isLoopbackRequest(req)) {
			forbidden(res);
			return;
		}
		const root = new URL(req.url ?? "/", "http://x").searchParams.get("root");
		if (root === null || root === "") {
			res.writeHead(400);
			res.end();
			return;
		}
		const gated = await fs.verify(root);
		if (!gated.ok) {
			json(res, FAIL(gated.error), 400);
			return;
		}
		res.writeHead(200, {
			"content-type": "text/event-stream; charset=utf-8",
			"cache-control": "no-cache",
			connection: "keep-alive"
		});
		res.write("retry: 2000\n\n");
		const subscriber = {
			root: gated.canonical,
			lastGit: "",
			res
		};
		subscribers.add(subscriber);
		if (gitUnavailable) push(subscriber, { kind: "gitUnavailable" });
		startGitPoll();
		if (heartbeatTimer === void 0) heartbeatTimer = setInterval(() => {
			for (const current of subscribers) current.res.write(": ping\n\n");
		}, HEARTBEAT_MS);
		const disposeWatch = fs.watch(gated.canonical, () => {
			push(subscriber, { kind: "fs" });
		});
		req.on("close", () => {
			disposeWatch();
			subscribers.delete(subscriber);
			if (subscribers.size === 0) {
				stopGitPoll();
				if (heartbeatTimer !== void 0) clearInterval(heartbeatTimer);
				heartbeatTimer = void 0;
			}
		});
	};
	const disposers = [ctx.webServer.register({
		kind: "prefix",
		path: "/aionui-panel",
		handler
	}), ctx.webServer.register({
		kind: "exact",
		path: "/aionui-panel/events",
		handler: sse
	})];
	return () => {
		for (const dispose of disposers) dispose();
		stopGitPoll();
		if (heartbeatTimer !== void 0) clearInterval(heartbeatTimer);
		for (const subscriber of subscribers) subscriber.res.end();
		subscribers.clear();
	};
}
//#endregion
//#region src/index.ts
/** Required services: the route registry, the managed subprocess seam, the workspace registry, and the prompt band. */
const inject = [
	"webServer",
	"subprocess",
	"workspaceRegistry",
	"systemPrompt"
];
/** Order of the announcement section within the tool-guidance band. */
const SECTION_ORDER = 210;
/** Model-facing announcement: plugin presence, capabilities, and limits. */
const AIONUI_PANEL_GUIDANCE = "本机已安装 dsh-aionui-panel 插件（DSH Web GUI 的右侧面板系统）：项目会话打开时，聊天区右侧出现「预览」与「文件/变更」两块面板。能力：Explorer 文件树（点击文件在预览面板打开、整行点击展开文件夹、按文件名搜索定位）；Preview 多 tab 预览（markdown/html/code/diff/csv/pdf/office/图片/文本等格式，支持源码/预览切换、分屏编辑、保存）；SCM 变更面板（真实 git stage/unstage/discard）；面板宽度可拖拽调整（Explorer 220~500px、Preview 340~1200px），双击把手复位默认宽度，折叠状态与宽度按项目持久化（localStorage）。数据源为当前会话工作目录的真实文件系统与真实 git 仓库，宿主进程经 /aionui-panel/* 路由提供。用户提到「右侧面板 / 预览面板 / 文件树 / 变更面板」时即指本插件，请据此协作。";
/**
* Mount the panel data services and their routes.
* @param ctx - context carrying webServer, subprocess, workspaceRegistry, systemPrompt.
*/
function apply(ctx) {
	const gate = createWorkspaceGate(ctx);
	const fs = new FsService(gate);
	const git = new GitService(subprocessRunner(ctx), gate, (root, rel) => fs.delete(root, rel));
	ctx.effect(() => registerPanelRoutes(ctx, fs, git), "dsh-aionui-panel: /aionui-panel routes");
	ctx.effect(() => ctx.systemPrompt.section({
		name: "plugin:aionui-panel",
		order: SECTION_ORDER,
		text: AIONUI_PANEL_GUIDANCE
	}), "dsh-aionui-panel: prompt section");
}
//#endregion
export { AIONUI_PANEL_GUIDANCE, apply, inject };
