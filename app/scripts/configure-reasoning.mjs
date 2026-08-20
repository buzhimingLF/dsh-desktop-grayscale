#!/usr/bin/env node
// 为 llm-pi-ai 的 deepseek 系列模型启用思考程度（reasoning effort）。
//
// 作用：
//   1. 让 /model 与设置页的模型卡片出现「思考程度」选择（high / max）；
//   2. 让模型输出中的 <think>…</think> 被正确解析为 reasoning 块，
//      从而在会话里渲染为「默认折叠、点击展开」的 Think 行。
//
// 幂等：重复运行只会补齐缺失的兼容字段，不会重复插入配置。
// 用法：node configure-reasoning.mjs
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const SETTINGS = process.env.DSH_HOME?.trim()
  ? join(process.env.DSH_HOME, 'settings.yaml')
  : join(homedir(), '.dsh', 'settings.yaml')

const TARGET_IDS = new Set(['deepseek-v4-pro', 'deepseek-v4-flash'])

/** 在模型条目末尾追加 compat + reasoningEfforts，缩进对齐到该条目的字段级。 */
function patchModelBlocks(text) {
  const lines = text.split('\n')
  const out = []
  let changed = false
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const m = /^(\s*)- id: ([\w.-]+)\s*$/.exec(line)
    if (!m || !TARGET_IDS.has(m[2])) {
      out.push(line)
      i += 1
      continue
    }
    const dashIndent = m[1]
    const fieldIndent = dashIndent + '  '
    // 收集该模型条目：从当前行到下一个同级/更浅缩进的 "- id:" 或非空行。
    let j = i + 1
    while (j < lines.length) {
      const l = lines[j]
      if (l.trim() === '') { j += 1; continue }
      const leading = (l.match(/^\s*/) || [''])[0]
      if (leading.length <= dashIndent.length) break
      j += 1
    }
    const block = lines.slice(i, j)
    const compatLine = block.findIndex((l) => new RegExp(`^${fieldIndent}compat:\\s*$`).test(l))
    const roleLine = block.findIndex((l) => /^\s+supportsDeveloperRole\s*:/.test(l))
    if (roleLine >= 0) {
      const expected = `${fieldIndent}  supportsDeveloperRole: false`
      if (block[roleLine] !== expected) {
        block[roleLine] = expected
        changed = true
      }
    } else if (compatLine >= 0) {
      block.splice(compatLine + 1, 0, `${fieldIndent}  supportsDeveloperRole: false`)
      changed = true
    } else {
      block.push(`${fieldIndent}compat:`, `${fieldIndent}  supportsDeveloperRole: false`)
      changed = true
    }
    if (!block.some((l) => /^\s*reasoningEfforts\s*:/.test(l))) {
      block.push(
        `${fieldIndent}reasoningEfforts:`,
        `${fieldIndent}  high: high`,
        `${fieldIndent}  max: max`,
      )
      changed = true
    }
    out.push(...block)
    i = j
  }
  return { text: out.join('\n'), changed }
}

function main() {
  if (!existsSync(SETTINGS)) {
    console.error(`未找到 settings.yaml：${SETTINGS}`)
    process.exit(1)
  }
  const original = readFileSync(SETTINGS, 'utf8')
  const { text: next, changed } = patchModelBlocks(original)
  if (!changed) {
    console.log('无需修改：deepseek 模型已具备 reasoning 与 system 角色兼容配置，或 settings.yaml 中没有这些模型。')
    return
  }
  copyFileSync(SETTINGS, `${SETTINGS}.bak-${Date.now()}`)
  writeFileSync(SETTINGS, next, 'utf8')
  console.log('已为 deepseek-v4-pro / deepseek-v4-flash 启用思考程度（high / max）。')
  console.log('重启 DSH Desktop 后生效；原文件已备份为 settings.yaml.bak-*。')
}

main()
