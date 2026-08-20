// 安全更新 ~/.dsh/.credentials.yaml 里的 DEEPSEEK_API_KEY（不打印 key，不留痕）。
// 用法：先设置环境变量 DEEPSEEK_NEWKEY，再运行本脚本。
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const CRED = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', 'Users', 'mianshi-huiyi', '.dsh', '.credentials.yaml')
const CRED2 = 'C:/Users/mianshi-huiyi/.dsh/.credentials.yaml'

const newKey = process.env.DEEPSEEK_NEWKEY
if (!newKey || newKey.trim() === '') {
  console.error('请先设置环境变量 DEEPSEEK_NEWKEY 为新的官方 DeepSeek API key')
  process.exit(1)
}
if (!/^sk-[\w-]{20,}$/.test(newKey.trim())) {
  console.error('key 格式可疑（应以 sk- 开头且足够长），已中止，请确认')
  process.exit(1)
}
const path = CRED2
const raw = readFileSync(path, 'utf8')
// 备份
copyFileSync(path, path + '.bak')
// 替换 DEEPSEEK_API_KEY 的值（保留其它内容）
const updated = raw.replace(/^(DEEPSEEK_API_KEY\s*:\s*)(["']?)[^\s"']+/m, (_, pre, q) => pre + q + newKey.trim() + (q || ''))
writeFileSync(path, updated, { mode: 0o600 })
console.log('已更新 DEEPSEEK_API_KEY（长度 ' + newKey.trim().length + '，备份在 .credentials.yaml.bak）')
