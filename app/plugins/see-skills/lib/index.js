// dsh-see-skills host half.
//
// 把「技能清单」结构化为可检索的证据（沿用 modlens 的结构化输出契约思想：
// 每个技能 = 名称 + 描述/触发条件 + 章节 + 参考 + 脚本，而不是一段原始 markdown）。
// 暴露两个面：
//   1. list_skills 工具（模型可见，按需查询技能库）；
//   2. GET /see-skills/skills 路由（浏览器面板取数据）。
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'see-skills'
export const inject = ['tools']

const MAX_PREVIEW = 1200

/** 极简 YAML frontmatter 解析：抓 name / description 及其它顶层标量键。 */
function parseFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!m) return { frontmatter: {}, body: raw }
  const fm = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim()
  }
  return { frontmatter: fm, body: raw.slice(m[0].length) }
}

function listDir(dir) {
  if (!existsSync(dir)) return []
  try { return readdirSync(dir) } catch { return [] }
}

/** 递归收集一个根目录下所有 SKILL.md（以及一层嵌套的 <skill>/SKILL.md）。 */
function findSkillsIn(root, out) {
  for (const entry of listDir(root)) {
    const full = join(root, entry)
    const direct = join(full, 'SKILL.md')
    if (existsSync(direct)) {
      out.push(direct)
    } else {
      // 尝试一层嵌套（root/<skill>/SKILL.md 已经是 direct；这里处理 root/<group>/<skill>/SKILL.md）
      for (const sub of listDir(full)) {
        const nested = join(full, sub, 'SKILL.md')
        if (existsSync(nested)) out.push(nested)
      }
    }
  }
}

/** 技能根目录：用户级 + 配置 + 环境。 */
function skillRoots(config) {
  const roots = []
  if (Array.isArray(config.skillsDirs)) roots.push(...config.skillsDirs)
  roots.push(join(homedir(), '.dsh', 'skills'))
  roots.push(join(homedir(), '.agents', 'skills'))
  roots.push(join(homedir(), '.codex', 'skills'))
  if (typeof process.env.DSH_BUNDLED_SKILL_DIR === 'string' && process.env.DSH_BUNDLED_SKILL_DIR !== '') {
    roots.push(process.env.DSH_BUNDLED_SKILL_DIR)
  }
  // 内置 modlens 技能（与 see-skills 同闭包，尽力定位）
  const self = fileURLToPath(import.meta.url)
  const closure = dirname(dirname(self))
  for (const candidate of [
    join(closure, '@liustack', 'modlens', 'skills'),
    join(closure, 'modlens', 'skills'),
  ]) roots.push(candidate)
  return roots
}

function buildInventory(config) {
  const roots = skillRoots(config)
  const files = []
  for (const root of roots) findSkillsIn(root, files)
  const seen = new Set()
  const skills = []
  for (const file of files) {
    try {
      const real = file
      if (seen.has(real)) continue
      seen.add(real)
      const raw = readFileSync(real, 'utf8')
      const { frontmatter, body } = parseFrontmatter(raw)
      const sections = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim())
      const dir = dirname(real)
      skills.push({
        name: frontmatter.name || basename(dir),
        description: frontmatter.description || '',
        path: real,
        dir,
        frontmatter,
        sections,
        references: listDir(join(dir, 'references')),
        scripts: listDir(join(dir, 'scripts')),
        bodyLength: body.length,
        preview: body.trim().slice(0, MAX_PREVIEW),
      })
    } catch (error) {
      console.error(`[see-skills] 读取技能失败 ${file}: ${error?.message ?? error}`)
    }
  }
  skills.sort((a, b) => a.name.localeCompare(b.name))
  return { skills, summary: { count: skills.length, roots } }
}

function renderText(inv) {
  if (inv.skills.length === 0) return '（未发现任何技能）'
  const lines = inv.skills.map((s) => `- ${s.name}: ${s.description || '（无描述）'}`)
  return `共 ${inv.skills.length} 个技能：\n` + lines.join('\n')
}

export function apply(ctx, config = {}) {
  // 1) 模型可见工具
  try {
    ctx.tools.register({
      name: 'list_skills',
      description:
        'List every installed agent skill as structured evidence: name, description/trigger conditions, markdown sections, bundled references and scripts. Use when the user asks what skills are available, or when you need to discover a skill to handle a task.',
      parameters: {
        type: 'object',
        properties: {},
      },
      output: {
        schema: { type: 'object', additionalProperties: true },
        render: (_args, value) => [{ type: 'text', text: renderText(value) }],
      },
      isConcurrencySafe: () => true,
      async execute() {
        return buildInventory(config)
      },
    })
  } catch (error) {
    console.error(`[see-skills] list_skills 注册失败: ${error?.message ?? error}`)
  }

  // 2) 浏览器面板路由
  if (typeof ctx.inject === 'function') {
    ctx.inject(['webServer'], (scope) => {
      try {
        scope.webServer.register({
          name: 'see-skills-list',
          kind: 'exact',
          path: '/see-skills/skills',
          handler: (_req, res) => {
            try {
              const body = JSON.stringify(buildInventory(config))
              res.writeHead(200, { 'content-type': 'application/json' })
              res.end(body)
            } catch (error) {
              res.writeHead(500, { 'content-type': 'application/json' })
              res.end(JSON.stringify({ error: String(error?.message ?? error) }))
            }
          },
        })
      } catch (error) {
        console.error(`[see-skills] 路由注册失败: ${error?.message ?? error}`)
      }
    })
  }
}
