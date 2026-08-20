// 用 pnpm deploy 物化 dsh 运行时闭包到 .runtime/（--node-linker=hoisted 扁平布局，
// peer 解析正确；等价于官方 `dsh plugin add` 在 profile 里 pnpm install 的效果，但离线）。
import { spawn } from 'node:child_process'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_DIR = fileURLToPath(new URL('..', import.meta.url))
const destination = join(APP_DIR, '.runtime')
await rm(destination, { recursive: true, force: true })

const pnpmArgs = [
  '--filter', 'dsh-desktop-runtime',
  'deploy', '--prod', '--frozen-lockfile', '--legacy',
  '--node-linker=hoisted',
  '.runtime',
]

// Node 24 不再能直接 spawn Windows 批处理；经 cmd.exe 运行 pnpm。
const command = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'pnpm'
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', ['pnpm', ...pnpmArgs].join(' ')]
  : pnpmArgs

const child = spawn(command, args, { cwd: APP_DIR, stdio: 'inherit' })
const code = await new Promise((resolve, reject) => {
  child.once('error', reject)
  child.once('exit', resolve)
})
if (code !== 0) throw new Error('dsh runtime deployment failed (code=' + String(code) + ')')

// The bundled dsh-llm-pi-ai compat schema omits supportsDeveloperRole, so a
// DeepSeek gateway configured with reasoning silently falls back to pi-ai's
// default and emits the unsupported `developer` role. Keep the deployed
// runtime compatible until the upstream package exposes this field.
const piAiPath = join(destination, 'node_modules', '@deepseek-ai', 'dsh-llm-pi-ai', 'lib', 'index.js')
const piAiSource = await readFile(piAiPath, 'utf8')
const piAiReplacements = [
  [
    'const supportsReasoningEffort = entry.compat?.supportsReasoningEffort ?? route?.supportsReasoningEffort;\n\tif (thinkingFormat === void 0 && supportsReasoningEffort === void 0) return {};',
    'const supportsReasoningEffort = entry.compat?.supportsReasoningEffort ?? route?.supportsReasoningEffort;\n\tconst supportsDeveloperRole = entry.compat?.supportsDeveloperRole ?? route?.supportsDeveloperRole;\n\tif (thinkingFormat === void 0 && supportsReasoningEffort === void 0 && supportsDeveloperRole === void 0) return {};',
  ],
  [
    'if (entry.compat?.thinkingFormat !== void 0 || entry.compat?.supportsReasoningEffort !== void 0) invalid(provider, `model "${entry.id}" sets compat reasoning switches, but its api is "${api}"; thinkingFormat and supportsReasoningEffort exist only on openai-completions`);',
    'if (entry.compat?.thinkingFormat !== void 0 || entry.compat?.supportsReasoningEffort !== void 0 || entry.compat?.supportsDeveloperRole !== void 0) invalid(provider, `model "${entry.id}" sets compat switches, but its api is "${api}"; thinkingFormat, supportsReasoningEffort, and supportsDeveloperRole exist only on openai-completions`);',
  ],
  [
    '...supportsReasoningEffort === void 0 ? {} : { supportsReasoningEffort }\n\t} };',
    '...supportsReasoningEffort === void 0 ? {} : { supportsReasoningEffort },\n\t\t...supportsDeveloperRole === void 0 ? {} : { supportsDeveloperRole }\n\t} };',
  ],
  [
    'const routeCompatDefined = request.compat?.thinkingFormat !== void 0 || request.compat?.supportsReasoningEffort !== void 0;',
    'const routeCompatDefined = request.compat?.thinkingFormat !== void 0 || request.compat?.supportsReasoningEffort !== void 0 || request.compat?.supportsDeveloperRole !== void 0;',
  ],
  [
    'if (routeCompatDefined && !models.some((model) => model.api === "openai-completions")) invalid(provider, "sets compat reasoning switches, but no model on the route speaks openai-completions; thinkingFormat and supportsReasoningEffort exist only on that protocol");',
    'if (routeCompatDefined && !models.some((model) => model.api === "openai-completions")) invalid(provider, "sets compat switches, but no model on the route speaks openai-completions; thinkingFormat, supportsReasoningEffort, and supportsDeveloperRole exist only on that protocol");',
  ],
  [
    'const compatProfile = z.object({\n\tthinkingFormat: z.union(SUPPORTED_THINKING_FORMATS),\n\tsupportsReasoningEffort: z.boolean()\n});',
    'const compatProfile = z.object({\n\tthinkingFormat: z.union(SUPPORTED_THINKING_FORMATS),\n\tsupportsReasoningEffort: z.boolean(),\n\tsupportsDeveloperRole: z.boolean()\n});',
  ],
]
let patched = false
let nextPiAiSource = piAiSource
for (const [before, after] of piAiReplacements) {
  if (nextPiAiSource.includes(before)) {
    nextPiAiSource = nextPiAiSource.replace(before, after)
    patched = true
  }
}
if (patched) await writeFile(piAiPath, nextPiAiSource, 'utf8')
console.log('[runtime] DeepSeek compat:', patched ? 'supportsDeveloperRole 已启用' : '已是最新或未找到目标包')
console.log('[runtime] deployed to .runtime')
