/**
 * 预装插件机制：把内置运行时的 3 个插件（+ 极简灰度皮肤）「seat」进 web profile。
 *
 * DSH 的插件挂载通道（官方 CLI `dsh plugin add` 的内部行为）：
 *   1. 包名写进 `<DSH_HOME>/profiles/web/package.json` 的 `dsh.profile.bundles`；
 *   2. 包本体通过 `<DSH_HOME>/profiles/node_modules/<pkg>` 符号链接可被解析；
 *   3. 启动时 DSH 读取每个 bundle 包的 `dsh.bundle.patch`（cordis.patch.yml）里的 `insert` 行完成挂载。
 *
 * 关键坑（实测发现）：`@linxin666/dsh-web-ui-all` 的 patch 会 insert 它的 12 个子包
 * （task-board / git-graph / skin-center …），而 DSH 是从 **profile 目录**按名字解析这些子包。
 * pnpm 隔离布局下这些子包嵌套在 `.pnpm/` 里，profile 的 node_modules 看不到它们 → 启动即崩。
 * 所以预装时要把闭包的整个依赖图「拍平」符号链接到 `profiles/node_modules`
 * （等价于官方 `dsh plugin add` 在 profile 里跑一次 `pnpm install` 的效果，但离线、幂等）。
 *
 * 参考：upstream/dsh-desktop/src/main/bundled-plugin.ts（单插件版），这里泛化成多插件 + 拍平闭包。
 */

import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'

export const WEB_PROFILE = 'web'

/**
 * 我们要预装的插件（包名必须与 npm 包名一致，作为 bundles 条目）。
 * 说明：dsh-web-ui 不用聚合包 @linxin666/dsh-web-ui-all（其内置 dsh-liangshen 会在 DSH rc.6 上原生崩溃，
 * 且会拉入 pet/remote/ssh 等不需要的包）；改为精选子包直挂，符合"精简改造"方向。
 */
export const BUNDLED_PLUGIN_NAMES = [
  '@liustack/modlens',
  '@liustack/modsearch',
  'dsh-better-sidebar',
  '@linxin666/dsh-client-ui-task-board',
  '@linxin666/dsh-client-ui-git-graph',
  '@linxin666/dsh-client-ui-aionui-panel',
  '@linxin666/dsh-tool-describe-image',
  '@linxin666/dsh-client-ui-skin-center',
  'dsh-skin-grayscale',
  'dsh-see-skills',
  'dsh-routing-suite',
  'dsh-ux-enhance',
] as const

/** 今天旧版本曾写入 profile、但当前运行时已不再随包提供的插件。 */
const RETIRED_BUNDLED_PLUGIN_NAMES = [
  '@linxin666/dsh-client-ui-web-ui-settings',
  '@deepseek-ai/dsh-client-ui-aqua',
] as const

interface ProfileManifest {
  dependencies?: Record<string, string>
  dsh?: { profile?: { bundles?: string[] } }
}

interface PluginManifest {
  dsh?: {
    desktop?: {
      presets?: Array<{ id?: string; path?: string }>
    }
  }
}

export interface SeatResult {
  seated: string[]
  added: string[]
  missing: string[]
  flattened: number
  presetsAdded: string[]
}

function profileDir(dshHome: string): string {
  return join(dshHome, 'profiles', WEB_PROFILE)
}

function manifestPath(dshHome: string): string {
  return join(profileDir(dshHome), 'package.json')
}

function readManifest(dshHome: string): ProfileManifest | undefined {
  try {
    const parsed = JSON.parse(readFileSync(manifestPath(dshHome), 'utf8')) as ProfileManifest | null
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
    return parsed
  } catch {
    // 首次运行还没有 profile（DSH 会在 boot 时生成），或读取失败——都视为无可编辑对象。
    return undefined
  }
}

/** 与 DSH 写入 profile 相同的 2 空格 + 换行格式，原子写避免半截 JSON。 */
function writeManifest(dshHome: string, manifest: ProfileManifest): void {
  const dest = manifestPath(dshHome)
  const tmp = dest + '.' + String(process.pid) + '.tmp'
  writeFileSync(tmp, JSON.stringify(manifest, undefined, 2) + '\n')
  try {
    renameSync(tmp, dest)
  } catch {
    try {
      rmSync(dest, { force: true })
      renameSync(tmp, dest)
    } catch (error) {
      rmSync(tmp, { force: true })
      throw error
    }
  }
}

/** 用户自己装过同名包时，不要覆盖（用户拥有优先权）。 */
function userOwned(manifest: ProfileManifest, name: string): boolean {
  return Object.hasOwn(manifest.dependencies ?? {}, name)
}

/** 启动前移除桌面版历史遗留的 bundle 引用，避免 DSH 在加载 profile 时直接退出。 */
function removeRetiredBundledPlugins(dshHome: string): string[] {
  const manifest = readManifest(dshHome)
  if (manifest === undefined) return []
  const bundles = manifest.dsh?.profile?.bundles
  if (!Array.isArray(bundles)) return []
  const retired = bundles.filter(
    (name): name is (typeof RETIRED_BUNDLED_PLUGIN_NAMES)[number] =>
      (RETIRED_BUNDLED_PLUGIN_NAMES as readonly string[]).includes(name) && !userOwned(manifest, name),
  )
  if (retired.length === 0 || manifest.dsh?.profile === undefined) return []
  manifest.dsh.profile.bundles = bundles.filter((name) => !retired.includes(name as (typeof RETIRED_BUNDLED_PLUGIN_NAMES)[number]))
  try {
    writeManifest(dshHome, manifest)
    return retired
  } catch (error) {
    console.error(`[desktop] 清理历史插件引用失败: ${error instanceof Error ? error.message : String(error)}`)
    return []
  }
}

/** 幂等建立符号链接（Windows 用 junction）。已指向同目标的链接直接跳过。 */
function ensureLink(link: string, src: string): boolean {
  let existing: ReturnType<typeof lstatSync> | undefined
  try {
    existing = lstatSync(link)
  } catch {
    existing = undefined
  }
  if (existing !== undefined) {
    if (!existing.isSymbolicLink()) return false // 真实目录，不属于我们，不碰
    if (readlinkSync(link) === src) return true
    rmSync(link, { force: true })
  }
  mkdirSync(dirname(link), { recursive: true })
  symlinkSync(src, link, process.platform === 'win32' ? 'junction' : 'dir')
  return true
}

/** Copy a small preset tree without Node's native recursive cp implementation. */
function copyPresetTree(source: string, target: string): void {
  mkdirSync(target, { recursive: true })
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = join(source, entry.name)
    const to = join(target, entry.name)
    if (entry.isDirectory()) copyPresetTree(from, to)
    else if (entry.isFile()) copyFileSync(from, to)
  }
}

/**
 * 把闭包 node_modules 的依赖图拍平到 profiles/node_modules。
 * 闭包由 `pnpm deploy --node-linker=hoisted` 物化，包都在顶层（@scope 在 @scope/* 下），
 * peer 解析已在 deploy 阶段定对；这里只枚举顶层，绝不碰 .pnpm（那里的 peer 变体会选错）。
 */
function flattenClosure(nmRoot: string, dshHome: string): number {
  const target = join(dshHome, 'profiles', 'node_modules')
  let linked = 0

  const linkPackage = (name: string, src: string): void => {
    if (!existsSync(join(src, 'package.json'))) return
    const link = join(target, name)
    try {
      if (ensureLink(link, src)) linked++
    } catch (error) {
      console.error(`[desktop] 拍平链接失败 ${name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  for (const entry of readdirSync(nmRoot)) {
    if (entry.startsWith('.') || entry === 'node_modules') continue
    if (entry.startsWith('@')) {
      const scopeDir = join(nmRoot, entry)
      if (!existsSync(scopeDir)) continue
      for (const pkg of readdirSync(scopeDir)) {
        linkPackage(entry + '/' + pkg, join(scopeDir, pkg))
      }
    } else {
      linkPackage(entry, join(nmRoot, entry))
    }
  }
  return linked
}

/**
 * 会话命名策略：标题优先提取用户第一条消息的关键内容（deterministic fallback），
 * 并禁用 LLM 标题生成（session-title-llm / first-prompt-llm），避免标题变成 AI 第一条回复的摘要。
 *
 * 通过 profile 的 cordis.patch.yml 实现 —— DSH 的用户 patch 层在所有 bundle 层之后应用，
 * 按 row id 覆盖（last write wins）。幂等：已存在合法条目时跳过；若检测到今天旧版本
 * 写入的非法流式数组，只迁移本函数生成的条目，不覆盖用户后续手改的内容。
 */
function applySessionTitlePolicy(dshHome: string): boolean {
  const patchPath = join(profileDir(dshHome), 'cordis.patch.yml')
  try {
    const raw = readFileSync(patchPath, 'utf8')
    const entries = [
      '# dsh-desktop：会话标题优先取用户第一条消息（fallback），禁用 LLM 自动命名。',
      '- id: session-title-llm',
      '  disabled: true',
      '',
      '- id: session-title',
      '  config:',
      '    fallbackMaxWords: 6',
      '    fallbackMaxBytes: 60',
      '    maxTitleBytes: 80',
    ].join('\n')
    const trimmed = raw.replace(/\s+$/, '')
    let next: string
    // DSH 初次生成的 profile patch 是带注释的空流式数组（`[ ... ]`）。
    // 追加块式列表项到流式数组内部会生成非法 YAML，因此将空数组转换成
    // 与 bundle patch 一致的顶层块式数组；非空用户 patch 保持不动。
    const withoutComments = raw
      .split(/\r?\n/)
      .filter((line) => !/^\s*#/.test(line))
      .join('\n')
      .trim()
    const isLegacyInvalidFlowPatch =
      withoutComments.startsWith('[') &&
      withoutComments.endsWith(']') &&
      /\r?\n  - id: session-title-llm/.test(raw)
    if (isLegacyInvalidFlowPatch) {
      // 兼容今天旧版本已经写入磁盘的非法格式：只迁移本函数生成的
      // `- id: session-title-llm` 流式数组，保留其它用户 patch 不动。
      const open = raw.indexOf('[')
      const close = raw.lastIndexOf(']')
      const body = raw.slice(open + 1, close).replace(/^  /gm, '')
      next = raw.slice(0, open) + body + raw.slice(close + 1).replace(/^\s*/, '')
      if (!next.endsWith('\n')) next += '\n'
    } else if (withoutComments === '[]') {
      const open = raw.indexOf('[')
      const close = raw.lastIndexOf(']')
      next = raw.slice(0, open) + entries + '\n' + raw.slice(close + 1).replace(/^\s*/, '')
      if (!next.endsWith('\n')) next += '\n'
    } else if (withoutComments.startsWith('[') && withoutComments.endsWith(']')) {
      // 内容结构异常或已有用户 patch 时不强行改写，避免破坏用户手写内容。
      return false
    } else if (trimmed.endsWith(']')) {
      return false
    } else if (raw.includes('id: session-title-llm')) {
      return false
    } else {
      // 内容结构异常时不强行改写，避免破坏用户手写的 patch。
      return false
    }
    const tmp = patchPath + '.' + String(process.pid) + '.tmp'
    writeFileSync(tmp, next)
    try {
      renameSync(tmp, patchPath)
    } catch {
      try {
        rmSync(patchPath, { force: true })
        renameSync(tmp, patchPath)
      } catch (error) {
        rmSync(tmp, { force: true })
        throw error
      }
    }
    return true
  } catch {
    return false
  }
}

/**
 * 把闭包里的插件全部 seat 进 web profile。
 * @param pluginDirs 包名 → 插件目录（闭包内路径）
 * @param nmRoot     闭包 node_modules 根（dev 为 workspace 根，packaged 为 resourcesPath/dsh-runtime/node_modules）
 * @param dshHome    官方 DSH 数据目录（~/.dsh）
 */
export function seatBundledPlugins(pluginDirs: Map<string, string>, nmRoot: string, dshHome: string): SeatResult {
  const result: SeatResult = { seated: [], added: [], missing: [], flattened: 0, presetsAdded: [] }
  result.presetsAdded = materializeBundledPresets(pluginDirs, dshHome)
  const retired = removeRetiredBundledPlugins(dshHome)
  if (retired.length > 0) console.log('[desktop] 清理 profile 中已废弃插件引用: ' + retired.join(', '))
  const manifest = readManifest(dshHome)
  // 首次运行还没有 profile：等 boot 生成后，下一轮再 seat。
  if (manifest === undefined) {
    for (const name of pluginDirs.keys()) result.missing.push(name)
    return result
  }

  // 先把闭包依赖图拍平到 profile，保证子包（dsh-web-ui-all 的 12 个子插件）可解析。
  try {
    result.flattened = flattenClosure(nmRoot, dshHome)
  } catch (error) {
    console.error(`[desktop] 闭包拍平失败: ${error instanceof Error ? error.message : String(error)}`)
  }

  for (const [name, dir] of pluginDirs) {
    if (!existsSync(join(dir, 'package.json'))) {
      result.missing.push(name)
      continue
    }
    if (userOwned(manifest, name)) {
      result.seated.push(name)
      continue
    }
    try {
      // 双保险：顶层插件名也确保在 profile 的 node_modules 有链接（拍平已覆盖，这里兜底）。
      ensureLink(join(dshHome, 'profiles', 'node_modules', name), dir)
      const bundles = manifest.dsh?.profile?.bundles
      if (!Array.isArray(bundles)) {
        result.missing.push(name)
        continue
      }
      if (bundles.includes(name)) {
        result.seated.push(name)
        continue
      }
      bundles.push(name)
      writeManifest(dshHome, manifest)
      result.seated.push(name)
      result.added.push(name)
    } catch (error) {
      result.missing.push(name)
      console.error(`[desktop] 预装插件 ${name} 失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  // 会话标题策略：禁用 LLM 自动命名，标题回落到用户第一条消息（幂等）。
  try {
    if (applySessionTitlePolicy(dshHome)) console.log('[desktop] 会话标题策略已写入 profile cordis.patch.yml')
  } catch (error) {
    console.error(`[desktop] 会话标题策略写入失败: ${error instanceof Error ? error.message : String(error)}`)
  }
  return result
}

/**
 * Materialize package-declared Agent presets before the DSH process boots.
 * DSH rc.6 reads user presets from `<DSH_HOME>/.agent-presets`; the public
 * plugin manifest only declares the source path and does not copy it there.
 * Existing user presets are never overwritten.
 */
export function materializeBundledPresets(pluginDirs: Map<string, string>, dshHome: string): string[] {
  const added: string[] = []
  const targetRoot = join(dshHome, '.agent-presets')

  for (const [packageName, packageDir] of pluginDirs) {
    let manifest: PluginManifest
    try {
      manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as PluginManifest
    } catch {
      continue
    }
    for (const preset of manifest.dsh?.desktop?.presets ?? []) {
      const id = preset.id?.trim()
      const sourcePath = preset.path?.trim()
      if (id === undefined || sourcePath === undefined || !/^[a-z0-9][a-z0-9-]*$/i.test(id)) continue
      const source = resolve(packageDir, sourcePath)
      const sourceRelative = relative(resolve(packageDir), source)
      if (sourceRelative.startsWith('..') || isAbsolute(sourceRelative) || !existsSync(source)) {
        console.error(`[desktop] 跳过不安全或不存在的 preset ${packageName}:${id}`)
        continue
      }
      const target = join(targetRoot, id)
      if (existsSync(target)) continue
      try {
        mkdirSync(targetRoot, { recursive: true })
        copyPresetTree(source, target)
        added.push(id)
        console.log(`[desktop] 已物化 Agent preset: ${packageName}:${id}`)
      } catch (error) {
        console.error(`[desktop] Agent preset 物化失败 ${packageName}:${id}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
  return added
}

/** 反向操作：把某个包从 bundles 里移除（出错兜底用）。 */
export function withdrawBundledPlugin(dshHome: string, name: string): boolean {
  const manifest = readManifest(dshHome)
  if (manifest === undefined || userOwned(manifest, name)) return false
  const bundles = manifest.dsh?.profile?.bundles
  if (!Array.isArray(bundles)) return false
  const next = bundles.filter((entry) => entry !== name)
  if (next.length === bundles.length) return false
  if (manifest.dsh?.profile !== undefined) manifest.dsh.profile.bundles = next
  try {
    writeManifest(dshHome, manifest)
    return true
  } catch {
    return false
  }
}
