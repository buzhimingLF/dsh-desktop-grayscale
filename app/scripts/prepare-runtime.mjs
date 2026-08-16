// 用 pnpm deploy 物化 dsh 运行时闭包到 .runtime/（--node-linker=hoisted 扁平布局，
// peer 解析正确；等价于官方 `dsh plugin add` 在 profile 里 pnpm install 的效果，但离线）。
import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
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
console.log('[runtime] deployed to .runtime')
