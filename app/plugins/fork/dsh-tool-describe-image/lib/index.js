import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import { defineTool } from "@deepseek-ai/dsh-tools";
import z from "schemastery";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { launchEnvironmentOf } from "@deepseek-ai/dsh-launch-environment";
import { readFile, stat } from "node:fs/promises";
//#region src/media.ts
/** The accepted image media types, in stable order. */
const IMAGE_MEDIA_TYPES = [
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp"
];
/** Upper bound on image bytes (local files and downloaded URLs alike). */
const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
/** Whether the declared media type is one the plugin accepts. */
function isImageMimeType(value) {
	return typeof value === "string" && IMAGE_MEDIA_TYPES.includes(value);
}
/**
* Detect the image media type from magic bytes.
* @param bytes - the leading bytes of the input.
* @returns the accepted media type, or `undefined` for unknown or truncated inputs.
*/
function sniffMimeType(bytes) {
	if (bytes.length >= 8 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return "image/png";
	if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
	if (bytes.length >= 6 && bytes.subarray(0, 6).toString("ascii") === "GIF87a") return "image/gif";
	if (bytes.length >= 6 && bytes.subarray(0, 6).toString("ascii") === "GIF89a") return "image/gif";
	if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
}
/**
* Strictly decode a base64 payload: the standard alphabet, correct padding,
* and a length that is a multiple of four. Rejects anything `Buffer.from`
* would silently tolerate.
* @param encoded - the base64 text.
* @returns the decoded bytes, or `undefined` when the text is not valid base64.
*/
function decodeBase64(encoded) {
	if (encoded.length === 0 || encoded.length % 4 !== 0) return void 0;
	if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) return void 0;
	if (/=/.test(encoded) && !/={1,2}$/.test(encoded)) return void 0;
	const bytes = Buffer.from(encoded, "base64");
	if (bytes.toString("base64") !== encoded) return void 0;
	return bytes;
}
//#endregion
//#region src/attach-routes.ts
/** Request-body byte cap: base64 of a {@link DEFAULT_MAX_BYTES} image plus envelope slack. */
const MAX_ATTACH_BODY_BYTES = 16 * 1024 * 1024;
/** The failure envelope used when a non-POST request hits the route. */
const METHOD_NOT_ALLOWED = {
	code: "internal",
	message: "only POST is allowed"
};
/**
* In-memory registry of references this process's attach route persisted,
* keyed by attachment id. Text models that copy only the id out of an
* `[image attachment …]` note (instead of the whole JSON) still resolve
* through here, and the attachment store's digest verification runs on the
* read regardless. Bounded FIFO; ids are content-addressed so a stale entry
* cannot be confused with another image.
*/
const ATTACHMENT_REF_REGISTRY = /* @__PURE__ */ new Map();
/** Registry capacity; beyond it the oldest entry is dropped. */
const ATTACHMENT_REF_REGISTRY_CAP = 128;
/** Remember one persisted reference by its attachment id. */
function registerAttachmentRef(ref) {
	ATTACHMENT_REF_REGISTRY.delete(ref.attachmentId);
	ATTACHMENT_REF_REGISTRY.set(ref.attachmentId, ref);
	while (ATTACHMENT_REF_REGISTRY.size > ATTACHMENT_REF_REGISTRY_CAP) {
		const oldest = ATTACHMENT_REF_REGISTRY.keys().next().value;
		if (oldest === void 0) break;
		ATTACHMENT_REF_REGISTRY.delete(oldest);
	}
}
/** Look up a persisted reference by its bare attachment id, if still in the registry. */
function attachmentRefById(id) {
	return ATTACHMENT_REF_REGISTRY.get(id);
}
/**
* The markdown image reference inserted into the composer draft: short,
* renders as an image/link in the conversation, and carries the attachment
* id in the URL so a text model can extract it and hand it to
* describe_image (the tool resolves bare ids through the registry).
* @param id - the attachment id (e.g. `sha256:…`).
* @returns the markdown text to splice into the draft.
*/
function attachmentMarkdown(id) {
	return `![图片](/describe-image/raw/${encodeURIComponent(id).replace(/%3A/gi, ":")})`;
}
/** Build the `[image attachment …]` note text for one reference. */
function attachmentNote(ref) {
	return `[image attachment ${JSON.stringify(ref)}]`;
}
/**
* Validate an unknown upload payload and decode its bytes. Pure: no context,
* no I/O — every rejection reason is spelled in the error message.
* @param payload - the parsed request body.
* @param maxBytes - the image byte bound.
* @returns the validated payload and decoded bytes, or the rejection.
*/
function validateAttachPayload(payload, maxBytes) {
	if (typeof payload !== "object" || payload === null) return { error: {
		code: "internal",
		message: "request body must be a JSON object"
	} };
	const { data, mediaType, name } = payload;
	if (typeof data !== "string" || data.length === 0) return { error: {
		code: "rejected",
		message: "image data must be a non-empty base64 string"
	} };
	if (!isImageMimeType(mediaType)) return { error: {
		code: "rejected",
		message: "mediaType must be one of image/png, image/jpeg, image/gif, image/webp"
	} };
	if (name !== void 0 && (typeof name !== "string" || name.length === 0)) return { error: {
		code: "rejected",
		message: "name must be a non-empty string when present"
	} };
	const bytes = decodeBase64(data);
	if (bytes === void 0) return { error: {
		code: "rejected",
		message: "image data is not valid base64"
	} };
	if (bytes.length === 0) return { error: {
		code: "rejected",
		message: "image data is empty"
	} };
	if (bytes.length > maxBytes) return { error: {
		code: "rejected",
		message: `image is ${bytes.length} bytes, above the ${maxBytes}-byte bound`
	} };
	if (sniffMimeType(bytes) !== mediaType) return { error: {
		code: "rejected",
		message: `bytes do not match the declared ${mediaType} type`
	} };
	return {
		payload: {
			data,
			mediaType,
			name
		},
		bytes
	};
}
/**
* Validate and persist one upload. The declared media type is checked against
* magic bytes before any store write; the store's own validation runs before
* the reference is published.
* @param ctx - registrant context carrying the optional attachment service.
* @param maxBytes - the image byte bound.
* @param payload - the parsed request body.
* @returns the stored reference and its note text, or a structured rejection.
*/
async function handleAttach(ctx, maxBytes, payload) {
	const validated = validateAttachPayload(payload, maxBytes);
	if ("error" in validated) return {
		ok: false,
		error: validated.error
	};
	const attachments = ctx.get("attachments");
	if (attachments === void 0) return {
		ok: false,
		error: {
			code: "internal",
			message: "the attachment service is not mounted; the route cannot store images"
		}
	};
	try {
		const ref = await attachments.saveImage({
			data: validated.bytes,
			mediaType: validated.payload.mediaType,
			...validated.payload.name === void 0 ? {} : { name: validated.payload.name }
		});
		registerAttachmentRef(ref);
		return {
			ok: true,
			ref,
			note: attachmentNote(ref),
			markdown: attachmentMarkdown(ref.attachmentId)
		};
	} catch (error) {
		return {
			ok: false,
			error: {
				code: "internal",
				message: `attachment store rejected the image: ${error.message ?? String(error)}`
			}
		};
	}
}
/** Read a JSON request body up to a byte cap; null when unparseable or oversized. */
async function readJsonBody(req, cap) {
	const chunks = [];
	let total = 0;
	for await (const chunk of req) {
		const buffer = chunk;
		chunks.push(buffer);
		total += buffer.length;
		if (total > cap) return null;
	}
	const text = Buffer.concat(chunks).toString("utf8");
	if (text === "") return null;
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}
/** Write one JSON envelope response. */
function json(res, envelope, status = 200) {
	res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
	res.end(JSON.stringify(envelope));
}
/**
* Serve one stored image by its bare attachment id (the GET half of the
* prefix route). Unknown ids and store failures answer 404; the media type
* comes from the registered reference, never from the URL.
* @param ctx - registrant context carrying the optional attachment service.
* @param req - the incoming GET request.
* @param res - the outgoing response.
*/
async function serveRawImage(ctx, req, res) {
	const match = /^\/describe-image\/raw\/([^/]+)$/.exec(new URL(req.url ?? "/", "http://x").pathname);
	if (match === null) {
		res.writeHead(404);
		res.end();
		return;
	}
	const ref = attachmentRefById(decodeURIComponent(match[1]));
	if (ref === void 0) {
		res.writeHead(404);
		res.end();
		return;
	}
	const attachments = ctx.get("attachments");
	if (attachments === void 0) {
		res.writeHead(404);
		res.end();
		return;
	}
	try {
		const stored = await attachments.readImage(ref);
		res.writeHead(200, {
			"content-type": ref.mediaType,
			"content-length": String(stored.data.byteLength),
			"cache-control": "private, max-age=3600"
		});
		res.end(Buffer.from(stored.data));
	} catch {
		res.writeHead(404);
		res.end();
	}
}
/**
* Register the /describe-image/attach POST route on the shared webserver. The
* byte bound is read per request so the Settings card's maxBytes change lands
* immediately; the attachment service is resolved per call.
* @param ctx - registrant context; webServer is required.
* @param readMaxBytes - per-request byte-bound reader (defaults to the constant).
*/
function registerAttachRoute(ctx, readMaxBytes = () => DEFAULT_MAX_BYTES) {
	const webserver = ctx.get("webServer");
	if (webserver === void 0) return;
	webserver.register({
		kind: "prefix",
		path: "/describe-image",
		handler: async (req, res) => {
			if (req.method === "GET") {
				await serveRawImage(ctx, req, res);
				return;
			}
			if (req.method !== "POST") {
				json(res, {
					ok: false,
					error: METHOD_NOT_ALLOWED
				}, 405);
				return;
			}
			const body = await readJsonBody(req, MAX_ATTACH_BODY_BYTES);
			if (body === null) {
				json(res, {
					ok: false,
					error: {
						code: "internal",
						message: "request body must be JSON within 16 MiB"
					}
				}, 400);
				return;
			}
			const outcome = await handleAttach(ctx, readMaxBytes(), body);
			if (outcome.ok) {
				json(res, {
					ok: true,
					value: {
						note: outcome.note,
						markdown: outcome.markdown,
						ref: outcome.ref
					}
				});
				return;
			}
			json(res, {
				ok: false,
				error: outcome.error
			}, outcome.error.code === "rejected" ? 422 : 500);
		}
	});
}
//#endregion
//#region src/config-resolve.ts
/** Environment-variable name the API key resolves through when no inline key is configured. */
const DEFAULT_API_KEY_ENV = "VISION_API_KEY";
/** Per-call output-token cap sent to the vision model. */
const DEFAULT_MAX_OUTPUT_TOKENS = 1024;
/** Per-call vision request timeout in milliseconds. */
const DEFAULT_TIMEOUT_MS = 6e4;
/** Protocol styles the tool can speak to the configured endpoint. */
const API_STYLES = ["chat-completions", "responses"];
/** Protocol style used unless the configuration overrides it. */
const DEFAULT_API_STYLE = "chat-completions";
/** Whether conversation image references upgrade into inline thumbnails unless configured otherwise. */
const DEFAULT_RENDER_IMAGE_PREVIEW = true;
/** Instruction sent when the model does not pass its own prompt. */
const DEFAULT_PROMPT = "Analyze this image: describe what is visible factually, transcribe legible text verbatim, and call out layout, notable details, or anything anomalous.";
/** Schemastery configuration for the describe-image tool; doubles as the `describe-image` settings-section schema. */
const Config = z.object({
	baseURL: z.string(),
	model: z.string(),
	apiKey: z.string().role("secret"),
	apiKeyEnv: z.string().role("credential-ref").default(DEFAULT_API_KEY_ENV),
	defaultPrompt: z.string().default(DEFAULT_PROMPT),
	maxBytes: z.number().step(1).min(1).default(DEFAULT_MAX_BYTES),
	maxOutputTokens: z.number().step(1).min(1).default(DEFAULT_MAX_OUTPUT_TOKENS),
	timeoutMs: z.number().min(1).default(DEFAULT_TIMEOUT_MS),
	apiStyle: z.union(API_STYLES).default(DEFAULT_API_STYLE),
	renderImagePreview: z.boolean().default(true)
});
/** Settings namespace carrying the endpoint, model, and key reference the Plugins card edits. */
const DESCRIBE_IMAGE_SETTINGS_NAMESPACE = settingsNamespace("describe-image");
/**
* Resolve raw config into validated connection facts. Programmatic construction may bypass
* Schemastery normalization, so every default and bound is re-judged here; a non-empty composition
* entry is validated at load so misconfiguration fails loud (an unconfigured family mount only
* hits it per call, inside {@link apply}).
* @param config - raw plugin config.
* @returns validated facts.
*/
function resolveConfig(config) {
	const baseURL = (config.baseURL ?? "").trim().replace(/\/+$/, "");
	if (!/^https?:\/\//.test(baseURL)) throw new Error("describe-image: baseURL must be an absolute http(s) URL");
	const model = (config.model ?? "").trim();
	if (model.length === 0) throw new Error("describe-image: model must be a non-empty model id");
	const apiKey = config.apiKey;
	if (apiKey !== void 0 && apiKey.length === 0) throw new Error("describe-image: apiKey must be non-empty when set");
	let apiKeyEnv;
	const rawEnv = config.apiKeyEnv ?? "VISION_API_KEY";
	if (rawEnv.length > 0) try {
		apiKeyEnv = credentialRef(rawEnv);
	} catch {
		throw new Error(`describe-image: apiKeyEnv ${JSON.stringify(rawEnv)} is not a valid environment-variable name`);
	}
	const maxBytes = config.maxBytes ?? 10485760;
	const maxOutputTokens = config.maxOutputTokens ?? 1024;
	const timeoutMs = config.timeoutMs ?? 6e4;
	const apiStyle = config.apiStyle ?? "chat-completions";
	for (const [field, value] of [
		["maxBytes", maxBytes],
		["maxOutputTokens", maxOutputTokens],
		["timeoutMs", timeoutMs]
	]) if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`describe-image: ${field} must be a positive safe integer`);
	if (!API_STYLES.includes(apiStyle)) throw new Error(`describe-image: apiStyle must be one of ${API_STYLES.map((style) => JSON.stringify(style)).join(", ")}`);
	return {
		baseURL,
		model,
		apiKey,
		apiKeyEnv,
		defaultPrompt: config.defaultPrompt ?? "Analyze this image: describe what is visible factually, transcribe legible text verbatim, and call out layout, notable details, or anything anomalous.",
		maxBytes,
		maxOutputTokens,
		timeoutMs,
		apiStyle,
		renderImagePreview: config.renderImagePreview ?? true
	};
}
/**
* Resolve the API key for one call: an explicit inline key wins; otherwise the credential seam (which owns
* environment and managed-store layers) resolves the reference; without the seam the launch environment is
* the whole credential plane.
* @param ctx - registrant context.
* @param spec - validated configuration.
* @returns the resolved key.
*/
async function resolveApiKey(ctx, spec) {
	if (spec.apiKey !== void 0) return spec.apiKey;
	if (spec.apiKeyEnv !== void 0) {
		const credentials = ctx.get("credentials");
		if (credentials !== void 0) {
			const hit = await credentials.resolve(spec.apiKeyEnv);
			if (hit !== void 0) return hit.value;
		} else {
			const ambient = launchEnvironmentOf(ctx).get(spec.apiKeyEnv);
			if (ambient !== void 0 && ambient.value.length > 0) return ambient.value;
		}
	}
	throw new Error(`describe-image: no API key; set apiKey, store ${spec.apiKeyEnv ?? "VISION_API_KEY"} through the credentials service, or export it in the launching environment`);
}
//#endregion
//#region src/vision-client.ts
/**
* Vision HTTP client for the describe-image tool: loads one image (local path,
* http(s) URL, or a stored attachment reference), builds the endpoint request that
* matches the configured protocol style (chat-completions or responses), and reads
* back the single text answer — with a short-lifetime, capacity-capped semantic
* cache so repeat calls for the same image and prompt avoid a second round trip.
* Response bodies and error excerpts are capped before any bytes are trusted.
* @module @linxin666/dsh-tool-describe-image/vision
*/
/** Error text shown when a model-supplied attachment reference does not validate. */
const ATTACHMENT_REF_GUIDANCE = "describe-image: image is not a valid attachment reference; copy the exact JSON from the [image attachment …] note";
/** Promise rejection helper shared by both response-shape extractors. */
function unexpectedShape() {
	throw new Error("describe-image: vision endpoint returned an unexpected response shape");
}
/** Narrow an unknown value to a plain, non-array object, or undefined. */
function asRecord(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
	return value;
}
/** Whether a record field holds a positive safe integer. */
function isPositiveSafeInteger(value) {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
/** A non-empty string from a record under `key`, else undefined. */
function nonEmptyString(record, key) {
	const value = record[key];
	return typeof value === "string" && value.length > 0 ? value : void 0;
}
/** Whether `error` carries the attachment store not-found marker. */
function isAttachmentNotFound(error) {
	return asRecord(error)?.["code"] === "ATTACHMENT_NOT_FOUND";
}
/**
* Validate and narrow a model-supplied attachment reference into its typed storage
* form. Every field is re-checked (the schema is authoritative, not a cast), and a
* misshaped value fails with the copy-verbatim guidance.
* @param raw - the JSON the model copied from an `[image attachment …]` note.
* @returns the narrowed, typed reference.
*/
function parseImageAttachmentRef(raw) {
	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(ATTACHMENT_REF_GUIDANCE);
	}
	const record = asRecord(parsed);
	if (record === void 0) throw new Error(ATTACHMENT_REF_GUIDANCE);
	const attachmentId = nonEmptyString(record, "attachmentId");
	const mediaType = record["mediaType"];
	const bytes = record["bytes"];
	const width = record["width"];
	const height = record["height"];
	const name = record["name"];
	if (attachmentId === void 0 || !isImageMimeType(mediaType) || !isPositiveSafeInteger(bytes) || !isPositiveSafeInteger(width) || !isPositiveSafeInteger(height) || name !== void 0 && typeof name !== "string") throw new Error(ATTACHMENT_REF_GUIDANCE);
	return {
		attachmentId,
		mediaType,
		bytes,
		width,
		height,
		...name === void 0 ? {} : { name }
	};
}
/**
* Validate a model-supplied attachment reference and read its verified bytes.
* @param ctx - registrant context carrying the optional attachment service.
* @param raw - the raw JSON the model copied from an `[image attachment …]` note.
* @param signal - caller cancellation.
* @returns the verified stored bytes.
*/
async function readAttachment(ctx, raw, signal) {
	const attachments = ctx.get("attachments");
	if (attachments === void 0) throw new Error("describe-image: no attachment service is mounted; pass a file path or URL instead");
	const ref = parseImageAttachmentRef(raw);
	try {
		const stored = await attachments.readImage(ref, signal);
		return Buffer.from(stored.data);
	} catch (error) {
		if (isAttachmentNotFound(error)) throw new Error(`describe-image: attachment ${JSON.stringify(ref.attachmentId)} is no longer available`);
		throw error;
	}
}
/** Sniff the media type and reject empty or unsupported inputs. */
function toImage(bytes, source) {
	if (bytes.length === 0) throw new Error(`describe-image: image is empty: ${source}`);
	const mimeType = sniffMimeType(bytes);
	if (mimeType === void 0) throw new Error(`describe-image: unsupported image type (expected PNG, JPEG, GIF, or WebP): ${source}`);
	return {
		bytes,
		mimeType
	};
}
/**
* Load one image from a local absolute path, an http(s) URL, or a durable attachment reference
* (the JSON an `[image attachment …]` note carries), enforcing the byte bound before any bytes
* reach the vision model. Non-http(s) URL schemes are rejected.
* @param ctx - registrant context; supplies the optional attachment service.
* @param input - the model-supplied image reference.
* @param signal - caller cancellation.
* @param maxBytes - image byte bound.
* @returns the loaded bytes and sniffed media type.
*/
async function loadImage(ctx, input, signal, maxBytes) {
	const trimmed = input.trim();
	if (trimmed.length === 0) throw new Error("describe-image: image must be a non-empty path, URL, or attachment reference");
	if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) throw new Error("describe-image: only http(s) URLs, local file paths, and attachment references are supported");
	if (trimmed.startsWith("{")) {
		const bytes = await readAttachment(ctx, trimmed, signal);
		if (bytes.length > maxBytes) throw new Error(`describe-image: image is ${bytes.length} bytes, above the ${maxBytes}-byte bound`);
		return toImage(bytes, trimmed.slice(0, 96));
	}
	if (/^https?:\/\//i.test(trimmed)) {
		const response = await fetch(trimmed, {
			signal,
			redirect: "error"
		});
		if (!response.ok) throw new Error(`describe-image: image fetch returned HTTP ${response.status}`);
		const declared = Number(response.headers.get("content-length"));
		if (Number.isSafeInteger(declared) && declared > maxBytes) throw new Error(`describe-image: image is ${declared} bytes, above the ${maxBytes}-byte bound`);
		return toImage(await readBoundedBody(response, maxBytes), trimmed);
	}
	const registered = attachmentRefById(trimmed);
	if (registered !== void 0) {
		const bytes = await readAttachment(ctx, JSON.stringify(registered), signal);
		if (bytes.length > maxBytes) throw new Error(`describe-image: image is ${bytes.length} bytes, above the ${maxBytes}-byte bound`);
		return toImage(bytes, trimmed);
	}
	const info = await stat(trimmed, { bigint: false });
	if (!info.isFile()) throw new Error(`describe-image: image path is not a file: ${trimmed}`);
	if (info.size > maxBytes) throw new Error(`describe-image: image is ${info.size} bytes, above the ${maxBytes}-byte bound`);
	return toImage(await readFile(trimmed, { signal }), trimmed);
}
/**
* Read a response body up to a byte cap, rejecting the whole response beyond it.
* @param response - the response to drain.
* @param cap - the byte bound.
* @returns the accumulated body bytes.
*/
async function readBoundedBody(response, cap) {
	if (response.body === null) return Buffer.alloc(0);
	const reader = response.body.getReader();
	const chunks = [];
	let total = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			const chunk = Buffer.from(value);
			total += chunk.length;
			if (total > cap) throw new Error(`describe-image: response exceeds the ${cap}-byte bound`);
			chunks.push(chunk);
		}
	} finally {
		reader.releaseLock();
	}
	return Buffer.concat(chunks);
}
/**
* Read a response body as text, truncated to a character cap (error excerpts only).
* @param response - the response to drain.
* @param cap - the character cap.
* @returns the decoded text, never longer than `cap` characters.
*/
async function readBoundedText(response, cap) {
	if (response.body === null) return "";
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let text = "";
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			text += decoder.decode(value, { stream: true });
			if (text.length > cap) return text.slice(0, cap);
		}
		text += decoder.decode();
	} finally {
		reader.releaseLock();
	}
	return text.length > cap ? text.slice(0, cap) : text;
}
/** Extract the single text answer from an OpenAI-compatible chat-completions payload. */
function extractChatCompletionsContent(payload) {
	const root = asRecord(payload);
	const choices = root?.choices;
	if (root === void 0 || !Array.isArray(choices) || choices.length === 0) unexpectedShape();
	const content = asRecord(asRecord(choices[0])?.message)?.["content"];
	if (typeof content !== "string" || content.trim().length === 0) throw new Error("describe-image: vision endpoint returned no text content");
	return content;
}
/** Extract the text answer from an OpenAI Responses payload: every `output_text` part of assistant messages. */
function extractResponsesContent(payload) {
	const root = asRecord(payload);
	const output = root?.output;
	if (root === void 0 || !Array.isArray(output)) unexpectedShape();
	const parts = [];
	for (const item of output) {
		const itemRecord = asRecord(item);
		if (itemRecord === void 0) continue;
		const { type, role, content } = itemRecord;
		if (type !== "message" || role !== "assistant" || !Array.isArray(content)) continue;
		for (const part of content) {
			const block = asRecord(part);
			if (block === void 0) continue;
			if (block.type === "output_text" && typeof block.text === "string" && block.text.trim().length > 0) parts.push(block.text);
		}
	}
	const text = parts.join("\n");
	if (text.trim().length === 0) throw new Error("describe-image: vision endpoint returned no text content");
	return text;
}
/** Build the request the configured style sends: its path and JSON body. */
function buildVisionRequest(spec, prompt, image) {
	const dataUrl = `data:${image.mimeType};base64,${image.bytes.toString("base64")}`;
	if (spec.apiStyle === "responses") return {
		path: `${spec.baseURL}/responses`,
		body: JSON.stringify({
			model: spec.model,
			max_output_tokens: spec.maxOutputTokens,
			input: [{
				role: "user",
				content: [{
					type: "input_text",
					text: prompt
				}, {
					type: "input_image",
					image_url: dataUrl
				}]
			}]
		})
	};
	return {
		path: `${spec.baseURL}/chat/completions`,
		body: JSON.stringify({
			model: spec.model,
			max_tokens: spec.maxOutputTokens,
			messages: [{
				role: "user",
				content: [{
					type: "text",
					text: prompt
				}, {
					type: "image_url",
					image_url: { url: dataUrl }
				}]
			}]
		})
	};
}
/** Default semantic-cache lifetime for a successful vision answer, in milliseconds. */
const DEFAULT_CACHE_TTL_MS = 1e4;
/** Default upper bound on cached vision answers. */
const DEFAULT_CACHE_MAX_ENTRIES = 32;
/** Create a TTL-expiring, capacity-capped vision answer cache. */
function createVisionCache(options) {
	const ttlMs = options?.ttlMs ?? 1e4;
	const maxEntries = Math.max(1, options?.maxEntries ?? 32);
	const entries = /* @__PURE__ */ new Map();
	let hits = 0;
	let misses = 0;
	return {
		get(key) {
			const entry = entries.get(key);
			if (entry === void 0) {
				misses += 1;
				return;
			}
			if (entry.expiresAt <= Date.now()) {
				entries.delete(key);
				misses += 1;
				return;
			}
			hits += 1;
			return entry.text;
		},
		set(key, text) {
			const now = Date.now();
			for (const [k, entry] of entries) if (entry.expiresAt <= now) entries.delete(k);
			entries.set(key, {
				text,
				expiresAt: now + ttlMs
			});
			while (entries.size > maxEntries) {
				const oldest = entries.keys().next().value;
				if (oldest === void 0) break;
				entries.delete(oldest);
			}
		},
		get size() {
			return entries.size;
		},
		get hits() {
			return hits;
		},
		get misses() {
			return misses;
		},
		clear() {
			entries.clear();
		}
	};
}
/** The semantic identity of one vision request: endpoint fields plus the same image bytes and prompt. */
function semanticRequestKey(spec, prompt, image) {
	return JSON.stringify([
		spec.baseURL,
		spec.model,
		spec.maxOutputTokens,
		spec.apiStyle,
		image.bytes.toString("base64"),
		image.mimeType,
		prompt
	]);
}
/** Call the configured vision endpoint and return its text answer, with short-lifetime caching for repeats. */
async function callVision(spec, apiKey, prompt, image, signal, cache) {
	if (cache !== void 0) {
		const cached = cache.get(semanticRequestKey(spec, prompt, image));
		if (cached !== void 0) return cached;
	}
	const { path, body } = buildVisionRequest(spec, prompt, image);
	const response = await fetch(path, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: `Bearer ${apiKey}`
		},
		body,
		redirect: "error",
		signal: AbortSignal.any([signal, AbortSignal.timeout(spec.timeoutMs)])
	});
	if (!response.ok) {
		const excerpt = await readBoundedText(response, 200);
		throw new Error(`describe-image: vision endpoint returned HTTP ${response.status}: ${excerpt}`);
	}
	const payloadBytes = await readBoundedBody(response, spec.maxOutputTokens * 8 + 64 * 1024);
	let payload;
	try {
		payload = JSON.parse(payloadBytes.toString("utf8"));
	} catch {
		throw new Error("describe-image: vision endpoint returned invalid JSON");
	}
	const text = spec.apiStyle === "responses" ? extractResponsesContent(payload) : extractChatCompletionsContent(payload);
	if (cache !== void 0) cache.set(semanticRequestKey(spec, prompt, image), text);
	return text;
}
//#endregion
//#region src/index.ts
const name = "describe-image";
const inject = ["tools", "webServer"];
/**
* Pure call view: a generic read card, with a file location for local paths.
* @param args - the validated call arguments.
* @returns the pending-state card for one describe_image call.
*/
function describeImageCallView(args) {
	return {
		card: "generic",
		title: "Describe image",
		kind: "read",
		rawInput: args,
		.../^https?:\/\//i.test(args.image) ? {} : { locations: [{ path: args.image }] }
	};
}
/**
* Register the `describe_image` tool on `ctx.tools`. The image never enters the conversation: the
* tool returns only the vision model’s text answer. The `describe-image` settings section layers
* over the composition entry and is re-resolved per call, so the Settings → 插件配置 card's changes
* reach the very next invocation. Repeat calls for the same image and prompt reuse a short-lived
* semantic cache so the endpoint is not called twice in quick succession.
*
* Family adaptation: the aggregate mounts this plugin without configuration, so endpoint/model
* validation is lazy — an empty composition entry loads fine and the first call fails with a clear
* "unconfigured" message; a non-empty entry is still validated eagerly at load and fails loud.
* @param ctx - registrant context carrying the tool registry.
* @param config - deployment configuration.
*/
function apply(ctx, config = {}) {
	if (config.baseURL !== void 0 || config.model !== void 0) resolveConfig(config);
	let current = () => config;
	installSettingsSection(ctx, DESCRIBE_IMAGE_SETTINGS_NAMESPACE, Config, config, {
		setSource: (source) => {
			current = source;
		},
		onChange: () => {},
		validate: (value) => {
			if (value.baseURL !== void 0 || value.model !== void 0) resolveConfig(value);
		}
	});
	const spec = () => resolveConfig(current());
	const visionCache = createVisionCache();
	registerAttachRoute(ctx, () => current().maxBytes ?? 10485760);
	ctx.tools.register(defineTool({
		name: "describe_image",
		description: "Inspect one image — a local absolute path, an http(s) URL, or the JSON of an image attachment note — and return the text the user needs. Use when the user references an image file or URL, or when a task needs OCR, chart or diagram reading, screenshot or UI analysis, translation of image text, or photo understanding. Always pass an explicit `prompt` with a precise instruction — e.g. \"transcribe all text\", \"extract the table as CSV\", \"diagnose the UI layout problems\", \"translate the text into Chinese\" — instead of leaving it to the default description: a targeted instruction produces a much more useful answer. The image may be a local path, an http(s) URL, the JSON object from an `[image attachment …]` note, or — the common case when the user used this plugin's input-box image button — a short markdown image reference like `![图片](/describe-image/raw/sha256:abc…)` pasted into the conversation. In the markdown form, take the attachment id from the URL and pass that id as the `image` value (never the whole markdown, and never a made-up path); the tool resolves the id to the stored image. The image itself never enters the conversation — only the returned text is shown to you.",
		parameters: {
			image: {
				type: "string",
				required: true,
				description: "Absolute path to a local image file, an http(s) URL of the image, the JSON object from an [image attachment …] note, or the bare attachment id (e.g. sha256:abc…) taken from the markdown image reference ![图片](/describe-image/raw/<id>) that the plugin's input-box image button pasted into the conversation."
			},
			prompt: {
				type: "string",
				description: "Your precise instruction for the vision model about this image (e.g. \"transcribe all text\", \"extract the table as CSV\", \"diagnose the UI problems\", \"translate the text\"). Prefer a targeted prompt over the generic default description."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					text: {
						type: "string",
						required: true
					},
					model: {
						type: "string",
						required: true
					},
					image: {
						type: "string",
						required: true
					},
					mimeType: {
						type: "string",
						required: true,
						enum: [
							"image/png",
							"image/jpeg",
							"image/gif",
							"image/webp"
						]
					},
					bytes: {
						type: "integer",
						required: true
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: value.text
			}]
		},
		async execute(args, exec) {
			const active = spec();
			const apiKey = await resolveApiKey(ctx, active);
			const image = await loadImage(ctx, args.image, exec.signal, active.maxBytes);
			return {
				text: await callVision(active, apiKey, args.prompt ?? active.defaultPrompt, image, exec.signal, visionCache),
				model: active.model,
				image: args.image,
				mimeType: image.mimeType,
				bytes: image.bytes.length
			};
		},
		presentCall: describeImageCallView
	}));
}
//#endregion
export { API_STYLES, Config, DEFAULT_API_KEY_ENV, DEFAULT_API_STYLE, DEFAULT_CACHE_MAX_ENTRIES, DEFAULT_CACHE_TTL_MS, DEFAULT_MAX_BYTES, DEFAULT_MAX_OUTPUT_TOKENS, DEFAULT_PROMPT, DEFAULT_RENDER_IMAGE_PREVIEW, DEFAULT_TIMEOUT_MS, DESCRIBE_IMAGE_SETTINGS_NAMESPACE, apply, callVision, createVisionCache, describeImageCallView, extractChatCompletionsContent, extractResponsesContent, inject, loadImage, name, parseImageAttachmentRef, readAttachment, readBoundedBody, readBoundedText, resolveApiKey, resolveConfig, semanticRequestKey, sniffMimeType };
