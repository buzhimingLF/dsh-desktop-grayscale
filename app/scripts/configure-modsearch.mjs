// 一键配置 modsearch 搜索引擎（Tavily 免费 key）。
// 用法：先注册 https://tavily.com 拿免费 API key，设置环境变量 TAVILY_NEWKEY，再运行本脚本。
import { spawnSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const MS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'plugins', 'fork', 'modsearch', 'dist', 'main.js')
const MS2 = 'D:/dsh-desktop-v012-installed/resources/dsh-runtime/node_modules/@liustack/modsearch/dist/main.js'

const key = process.env.TAVILY_NEWKEY
if (!key || key.trim() === '') {
  console.error('请先设置环境变量 TAVILY_NEWKEY 为你的 Tavily API key（在 https://tavily.com 免费注册获取）')
  process.exit(1)
}

// 用内置闭包的 modsearch CLI 配置 ~/.modsearch/config.json（与桌面版共享）。
const cli = require('node:fs').existsSync(MS) ? MS : MS2
const run = (args) => {
  const r = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', env: { ...process.env } })
  if (r.status !== 0) console.error(r.stderr || r.stdout)
  return r.status === 0
}

console.log('配置 Tavily 引擎...')
run(['config', 'set', 'tavily.apiKey', key.trim()])
run(['config', 'set', 'provider', 'tavily'])
console.log('完成！已把 modsearch 默认引擎设为 Tavily。')
console.log('验证: modsearch doctor 或直接问 agent "搜索一下 xxx"')
