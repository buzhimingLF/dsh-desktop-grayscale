// 验证 see-skills 路由：boot → seat 全部插件 → curl /see-skills/skills。
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, existsSync, symlinkSync, lstatSync, rmSync, renameSync, mkdirSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = join(dirname(fileURLToPath(import.meta.url)), '..')
const BIN = join(APP, '.runtime', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
const NM = join(APP, '.runtime', 'node_modules')
const ALL = ['@liustack/modlens', 'dsh-better-sidebar', '@linxin666/dsh-client-ui-task-board', '@linxin666/dsh-client-ui-git-graph', '@linxin666/dsh-client-ui-aionui-panel', '@linxin666/dsh-client-ui-web-ui-settings', '@linxin666/dsh-tool-describe-image', '@linxin666/dsh-client-ui-skin-center', 'dsh-skin-grayscale', 'dsh-see-skills']

function ensureLink(link, src) {
  let ex; try { ex = lstatSync(link) } catch { ex = undefined }
  if (ex !== undefined) { if (!ex.isSymbolicLink()) return; try { if (require('node:fs').readlinkSync(link) === src) return } catch {}; rmSync(link, { force: true }) }
  mkdirSync(dirname(link), { recursive: true }); symlinkSync(src, link, process.platform === 'win32' ? 'junction' : 'dir')
}
function flatten(home) {
  let n = 0
  const linkPkg = (name, src) => { if (existsSync(join(src, 'package.json'))) { try { ensureLink(join(home, 'profiles', 'node_modules', name), src); n++ } catch {} } }
  for (const e of readdirSync(NM)) { if (e.startsWith('.') || e === 'node_modules') continue; if (e.startsWith('@')) { const sd = join(NM, e); for (const p of readdirSync(sd)) linkPkg(e + '/' + p, join(sd, p)) } else linkPkg(e, join(NM, e)) }
  return n
}
function seat(home) {
  const mp = join(home, 'profiles', 'web', 'package.json')
  const m = JSON.parse(readFileSync(mp, 'utf8')); flatten(home)
  for (const name of ALL) { if (!m.dsh.profile.bundles.includes(name)) m.dsh.profile.bundles.push(name) }
  const t = mp + '.tmp'; writeFileSync(t, JSON.stringify(m, null, 2) + '\n'); renameSync(t, mp)
}
function boot(home, timeoutMs) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [BIN, 'web', '--port', '0'], { cwd: home, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = '', err = ''; p.stdout.on('data', (c) => out += c); p.stderr.on('data', (c) => err += c)
    let done = false; const finish = (r) => { if (!done) { done = true; clearTimeout(t); clearInterval(i); resolve(r) } }
    const t = setTimeout(() => finish({ url: null, out, err }), timeoutMs)
    p.on('exit', () => finish({ url: null, out, err }))
    const i = setInterval(() => { const m = /^dsh web:\s+(\S+)/m.exec(out); if (m) finish({ url: m[1], out, err, p }) }, 200)
  })
}

const home = mkdtempSync(join(tmpdir(), 'dsh-route-'))
const first = await boot(home, 30000); first.p?.kill(); await new Promise((r) => setTimeout(r, 500))
seat(home)
const second = await boot(home, 40000)
if (!second.url) { console.log('boot failed:\n' + second.err.slice(-1500)); rmSync(home, { recursive: true, force: true }); process.exit(1) }
await new Promise((r) => setTimeout(r, 3000))
try {
  const res = await fetch(second.url + '/see-skills/skills', { signal: AbortSignal.timeout(5000) })
  const body = await res.text()
  console.log('HTTP ' + res.status + '\n' + body.slice(0, 1500))
} catch (e) { console.log('curl failed: ' + (e?.message ?? e)) }
second.p?.kill()
rmSync(home, { recursive: true, force: true })
console.log('cleaned')
