import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { SettingsConflictError, settingsNamespace } from "@deepseek-ai/dsh-settings";
//#region src/allowlist.ts
/**
* rc.6 compatibility allowlist for the settings bridge.
*
* rc.6 host-apiproxy never reads settings.yaml for a namespace allowlist: its
* WEB_SETTINGS_NAMESPACES set is hard-coded. Users configure
* web_settings_namespaces expecting the configuration page to honor it, so
* this package reads that key itself (host side) and maps the entries — which
* users spell as package names like dsh-client-ui-task-board — onto the real
* settings namespaces the plugins register (task-board and friends). When the
* key is absent, a built-in family fallback list keeps every family plugin's
* configuration form visible out of the box. The final allowlist is always
* intersected with the namespaces actually registered in the host settings
* seam, so an unknown entry can never surface a form or accept a write.
*/
/** Settings namespaces the dsh-web-ui family plugins register. */
const FAMILY_NAMESPACES = [
	"dsh-ssh",
	"task-board",
	"remote-web-ui",
	"live-stats",
	"pet",
	"describe-image",
	"skin-background"
];
/**
* Package names and plugin ids to their settings namespace. A null value
* means the package owns no settings namespace (its configuration lives
* elsewhere, e.g. localStorage), so the entry is intentionally ignored.
*/
const NAMESPACE_ALIASES = {
	"dsh-ssh": "dsh-ssh",
	ssh: "dsh-ssh",
	"dsh-client-ui-task-board": "task-board",
	"dsh-task-board": "task-board",
	"task-board": "task-board",
	"dsh-live-stats": "live-stats",
	"live-stats": "live-stats",
	"dsh-remote-web-ui": "remote-web-ui",
	"remote-web-ui": "remote-web-ui",
	"dsh-pet": "pet",
	pet: "pet",
	"dsh-skins": "skin-background",
	"dsh-client-ui-skin-center": "skin-background",
	"skin-center": "skin-background",
	"skin-background": "skin-background",
	"describe-image": "describe-image",
	"dsh-tool-describe-image": "describe-image",
	"dsh-aionui-panel": null,
	"dsh-client-ui-aionui-panel": null,
	"dsh-git-graph": null,
	"dsh-client-ui-git-graph": null,
	"dsh-web-ui": null,
	"dsh-web-ui-all": null,
	"dsh-client-ui-web-ui-settings": null
};
/**
* Resolve one user-configured allowlist entry to a settings namespace.
* @param entry - raw entry from the user's allowlist.
* @returns the settings namespace, or undefined when the entry names nothing
*   configurable (unknown name, or a package without a settings namespace).
*/
function resolveNamespaceEntry(entry) {
	const key = entry.trim();
	if (key === "") return void 0;
	if (Object.hasOwn(NAMESPACE_ALIASES, key)) return NAMESPACE_ALIASES[key] ?? void 0;
	if (FAMILY_NAMESPACES.includes(key)) return key;
}
/**
* Compose the effective bridge allowlist.
* @param userEntries - normalized web_settings_namespaces entries; the empty
*   list selects the built-in family fallback list.
* @param registered - namespaces currently registered in the host settings
*   seam (the only namespaces a form or write can target).
* @returns the allowlist: resolved entries intersected with the registered
*   set, sorted for a stable wire view.
*/
function composeAllowlist(userEntries, registered) {
	const requested = userEntries.length === 0 ? FAMILY_NAMESPACES : userEntries;
	const resolved = /* @__PURE__ */ new Set();
	for (const entry of requested) {
		const ns = resolveNamespaceEntry(entry);
		if (ns !== void 0) resolved.add(ns);
	}
	const registeredSet = new Set(registered);
	return [...resolved].filter((ns) => registeredSet.has(ns)).sort();
}
/** Strip one YAML scalar's quoting (single or double quotes). */
function stripQuotes(value) {
	const trimmed = value.trim();
	if (trimmed.length >= 2 && (trimmed[0] === "'" || trimmed[0] === "\"") && trimmed[trimmed.length - 1] === trimmed[0]) return trimmed.slice(1, -1).trim();
	return trimmed;
}
/** Trim one YAML list or map item down to its entry name. */
function entryOfItem(item) {
	let value = item.trim();
	if (value.startsWith("- ")) value = value.slice(2).trim();
	if (value === "") return void 0;
	const colon = value.indexOf(":");
	if (colon >= 0) value = value.slice(0, colon).trim();
	const name = stripQuotes(value);
	return name === "" ? void 0 : name;
}
/**
* Extract the web_settings_namespaces entries from raw settings.yaml text.
* Accepts a block list, a block map, and an inline flow list — the shapes
* users have actually tried. Returns the empty list when the key is absent
* or unparseable.
* @param text - raw settings.yaml content (the empty string is fine).
* @returns the configured entries in document order.
*/
function extractWebSettingsNamespaces(text) {
	if (text.trim() === "") return [];
	const inline = /(?:^|\n)\s*web_settings_namespaces\s*:\s*\[([^\]]*)\]/m.exec(text);
	if (inline !== null) {
		const entries = [];
		for (const part of inline[1].split(",")) {
			const name = stripQuotes(part);
			if (name !== "") entries.push(name);
		}
		return entries;
	}
	const lines = text.split(/\r?\n/);
	const start = lines.findIndex((line) => /^\s*web_settings_namespaces\s*:\s*$/.test(line.trim()));
	if (start < 0) return [];
	const entries = [];
	for (const line of lines.slice(start + 1)) {
		if (line.trim() === "") break;
		if (!/^\s/.test(line)) break;
		const trimmed = line.trim();
		if (trimmed.startsWith("#")) continue;
		const name = entryOfItem(trimmed);
		if (name !== void 0) entries.push(name);
	}
	return entries;
}
//#endregion
//#region src/bridge.ts
/** Cap on JSON request bodies (a single mutate is tiny). */
const MAX_JSON_BODY_BYTES = 64 * 1024;
/** Loopback literal check plus browser same-origin markers (mirrors the dsh-ssh route fence). */
function isLoopbackRequest(request) {
	const address = request.socket.remoteAddress;
	if (address !== "127.0.0.1" && address !== "::1" && address !== "::ffff:127.0.0.1") return false;
	const host = request.headers.host;
	if (typeof host !== "string") return false;
	let hostUrl;
	try {
		hostUrl = new URL("http://" + host);
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
/** One JSON response. */
function writeJson(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"referrer-policy": "no-referrer"
	});
	res.end(payload);
}
/** Read a JSON request body (undefined when too large or unparseable). */
async function readJsonBody(req) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		const buffer = chunk;
		size += buffer.length;
		if (size > MAX_JSON_BODY_BYTES) return void 0;
		chunks.push(buffer);
	}
	try {
		return JSON.parse(Buffer.concat(chunks).toString("utf8"));
	} catch {
		return;
	}
}
/** Project one settings descriptor onto the bridge wire view. */
function toView(descriptor) {
	return {
		ns: String(descriptor.ns),
		schema: descriptor.schema,
		value: descriptor.value,
		...descriptor.base === void 0 ? {} : { base: descriptor.base },
		...descriptor.user === void 0 ? {} : { user: descriptor.user },
		...descriptor.secrets === void 0 ? {} : { secrets: descriptor.secrets.map((secret) => ({
			path: [...secret.path],
			set: secret.set
		})) },
		revision: descriptor.revision
	};
}
/** Map a seam failure onto the official-shaped refusal envelope. */
function failureOf(error) {
	if (error instanceof SettingsConflictError) return {
		ok: false,
		code: "settings-conflict",
		message: error.message
	};
	const message = error instanceof Error ? error.message : String(error);
	if (/is not registered/.test(message)) return {
		ok: false,
		code: "settings-rejected",
		message
	};
	return {
		ok: false,
		code: "settings-rejected",
		message
	};
}
/**
* Build the bridge handlers. The allowlist is re-read on every call so edits
* to settings.yaml take effect without a host restart.
* @param deps - the settings seam and the settings.yaml reader.
* @returns the handlers.
*/
function makeBridgeHandlers(deps) {
	const allowlisted = () => {
		const registered = deps.settings.describe({ redactSecrets: true }).map((descriptor) => String(descriptor.ns));
		return composeAllowlist(extractWebSettingsNamespaces(deps.readSettingsYaml()), registered);
	};
	return {
		async describe() {
			const descriptors = deps.settings.describe({ redactSecrets: true });
			return {
				ok: true,
				value: {
					namespaces: allowlisted().map((ns) => descriptors.find((descriptor) => String(descriptor.ns) === ns)).filter((descriptor) => descriptor !== void 0).map(toView),
					writable: deps.settings.writable !== false
				}
			};
		},
		async mutate(request) {
			const body = request;
			if (body === null || typeof body !== "object" || typeof body.ns !== "string" || !Array.isArray(body.ops)) return {
				ok: false,
				code: "settings-rejected",
				message: "malformed bridge settings request"
			};
			const { ns } = body;
			if (!allowlisted().includes(ns)) return {
				ok: false,
				code: "settings-not-exposed",
				message: "settings namespace \"" + ns + "\" is not exposed to configuration clients"
			};
			const expectedRevision = typeof body.expectedRevision === "number" ? body.expectedRevision : void 0;
			try {
				await deps.settings.mutate(settingsNamespace(ns), body.ops, expectedRevision);
			} catch (error) {
				return failureOf(error);
			}
			const descriptor = deps.settings.describe({ redactSecrets: true }).find((candidate) => String(candidate.ns) === ns);
			if (descriptor === void 0) return {
				ok: false,
				code: "internal",
				message: "settings namespace \"" + ns + "\" was disposed after the mutate"
			};
			return {
				ok: true,
				value: toView(descriptor)
			};
		}
	};
}
/**
* Build the loopback-only bridge routes.
* @param deps - handler dependencies.
* @returns the exact-path route registrations.
*/
function makeBridgeRoutes(deps) {
	const handlers = makeBridgeHandlers(deps);
	const guard = (req, res) => {
		if (!isLoopbackRequest(req)) {
			writeJson(res, 403, { error: "loopback requests only" });
			return false;
		}
		if (req.method !== "POST") {
			writeJson(res, 405, { error: "method not allowed: " + (req.method ?? "") });
			return false;
		}
		return true;
	};
	return [{
		kind: "exact",
		path: "/api/dsh-web-ui-settings/describe",
		handler: async (req, res) => {
			if (!guard(req, res)) return;
			writeJson(res, 200, await handlers.describe());
		}
	}, {
		kind: "exact",
		path: "/api/dsh-web-ui-settings/mutate",
		handler: async (req, res) => {
			if (!guard(req, res)) return;
			const body = await readJsonBody(req);
			if (body === void 0) {
				writeJson(res, 400, {
					ok: false,
					code: "settings-rejected",
					message: "unreadable JSON body"
				});
				return;
			}
			writeJson(res, 200, await handlers.mutate(body));
		}
	}];
}
//#endregion
//#region src/index.ts
/**
* Host half of the dsh-web-ui-settings group. Mounts the rc.6 compatibility
* settings bridge: a loopback-only HTTP pair that serves the family plugins'
* settings namespaces through the host settings seam, gated by the user's
* web_settings_namespaces allowlist from settings.yaml (with the built-in
* family fallback list). The browser half uses it only when the official
* settings scope reports the namespace unavailable, so hosts whose apiproxy
* already exposes the namespaces never touch the bridge.
*/
/** Required services before the bridge routes can mount. */
const inject = ["webServer"];
/**
* Mount the settings bridge when a settings seam exists (the seam is what the
* bridge serves, so without one there is nothing to expose).
* @param ctx - host plugin context.
*/
function apply(ctx) {
	ctx.inject(["settings"], (sctx) => {
		const settingsYamlPath = sctx.settings.documentPath ?? join(homedir(), ".dsh", "settings.yaml");
		sctx.effect(() => {
			const disposers = makeBridgeRoutes({
				settings: sctx.settings,
				readSettingsYaml: () => {
					try {
						return readFileSync(settingsYamlPath, "utf8");
					} catch {
						return "";
					}
				}
			}).map((route) => sctx.webServer.register(route));
			return () => {
				for (const dispose of disposers) dispose();
			};
		}, "web-ui-settings: settings bridge");
	});
}
//#endregion
export { apply, inject };
