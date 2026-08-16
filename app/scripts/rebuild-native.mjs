// 【可选】把 .runtime 闭包里的 NAN 原生模块按 Electron ABI 重建。
//
// 注意：node-pty 用的是 node-addon-api（N-API，ABI 稳定），自带 prebuilds，
// 在 Node 与 Electron 的 Node 里通用，无需重建（重建反而会因缺 VS 的 Spectre
// 缓解库组件而报 MSB8040）。所以默认只重建真正 NAN 且无 N-API prebuild 的模块。
import { rebuild } from '@electron/rebuild'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = join(dirname(fileURLToPath(import.meta.url)), '..')
const electronVersion = process.env.ELECTRON_VERSION || '39.8.10'

// node-pty（N-API）与 koffi（自带 prebuild）不在此列；ssh2/cpu-features 为可选加密加速，
// 即使不重建也只是回退纯 JS 实现，不影响功能。
const modules = ['ssh2', 'cpu-features']

console.log(`[rebuild] electron=${electronVersion} arch=${process.arch} modules=${modules.join(',')}`)
await rebuild({
  buildPath: join(APP, '.runtime'),
  electronVersion,
  arch: process.arch,
  force: true,
  onlyModules: modules,
})
console.log('[rebuild] native modules rebuilt for Electron ABI')
