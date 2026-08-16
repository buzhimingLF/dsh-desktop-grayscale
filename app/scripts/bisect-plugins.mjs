// 逐个插件 seat + boot，定位哪个插件导致崩溃。
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, existsSync, symlinkSync, lstatSync, rmSync, renameSync, mkdirSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = join(dirname(fileURLToPath(import.meta.url)), '..')
const BIN = join(APP, '.runtime', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
const NM = join(APP, '.runtime', 'node_modules')
const ALL = [
  '@liustack/modlens',
  'dsh-better-sidebar',
  '@linxin666/dsh-client-ui-task-board',
  '@linxin666/dsh-client-ui-git-graph',
  '@linxin666/dsh-client-ui-aionui-panel',
  '@linxin666/dsh-client-ui-web-ui-settings',
  '@linxin666/dsh-tool-describe-image',
  '@linxin666/dsh-client-ui-skin-center',
  'dsh-skin-grayscale',
  'dsh-see-skills',
  '@deepseek-ai/dsh-client-ui-aqua',
]

function ensureLink(link, src) {
  let existing
  try { existing = lstatSync(link) } catch { existing = undefined }
  if (existing !== undefined) {
    if (!existing.isSymbolicLink()) return false
    try { if (readFileSync ? false : false) {} } catch {}
    try { const t = require('node:fs').readlinkSync(link); if (t === src) return true } catch {}
    rmSync(link, { force: true })
  }
  mkdirSync(dirname(link), { recursive: true })
  symlinkSync(src, link, process.platform === 'win32' ? 'junction' : 'dir')
  return true
}

function flatten(home) {
  const target = join(home, 'profiles', 'node_modules')
  let n = 0
  const linkPackage = (name, src) => {
    if (!existsSync(join(src, 'package.json'))) return
    try { if (ensureLink(join(target, name), src)) n++ } catch {}
  }
  for (const entry of readdirSync(NM)) {
    if (entry.startsWith('.') || entry === 'node_modules') continue
    if (entry.startsWith('@')) {
      const sd = join(NM, entry)
      if (!existsSync(sd)) continue
      for (const pkg of readdirSync(sd)) linkPackage(entry + '/' + pkg, join(sd, pkg))
    } else {
      linkPackage(entry, join(NM, entry))
    }
  }
  return n
}

function seat(home, names) {
  const mp = join(home, 'profiles', 'web', 'package.json')
  const manifest = JSON.parse(readFileSync(mp, 'utf8'))
  const bundles = manifest.dsh.profile.bundles
  flatten(home) // 把闭包依赖图拍平进 profile
  const added = []
  for (const name of names) {
    const dir = join(APP, '.runtime', 'node_modules', name)
    ensureLink(join(home, 'profiles', 'node_modules', name), dir)
    if (!bundles.includes(name)) { bundles.push(name); added.push(name) }
  }
  const tmp = mp + '.tmp'
  writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n')
  renameSync(tmp, mp)
  return added
}

function boot(home, timeoutMs) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [BIN, 'web', '--port', '0'], {
      cwd: home, env: { ...process.env, DSH_HOME: home }, stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = '', err = ''
    proc.stdout.on('data', (c) => { out += c })
    proc.stderr.on('data', (c) => { err += c })
    let settled = false
    const finish = (r) => { if (!settled) { settled = true; clearTimeout(timer); clearInterval(check); resolve(r) } }
    const timer = setTimeout(() => finish({ ok: false, why: 'timeout', out, err }), timeoutMs)
    proc.on('exit', (code) => finish({ ok: false, why: 'exit:' + code, out, err }))
    const check = setInterval(() => {
      const m = /^dsh web:\s+(\S+)/m.exec(out)
      if (m) finish({ ok: true, url: m[1], out, err, proc })
    }, 200)
  })
}

// 首次 boot 生成 profile
const home = mkdtempSync(join(tmpdir(), 'dsh-bisect-'))
const first = await boot(home, 30000)
if (!first.ok) { console.log('first boot failed: ' + first.why); process.exit(1) }
if (first.proc) first.proc.kill()
await new Promise((r) => setTimeout(r, 500))
console.log('first boot ok (profile created)')

for (const name of ALL) {
  const before = JSON.parse(readFileSync(join(home, 'profiles', 'web', 'package.json'), 'utf8'))
  const added = seat(home, [name])
  const res = await boot(home, 30000)
  console.log(`[${name}] added=${JSON.stringify(added)} result=${res.ok ? 'OK ' + res.url : res.why}`)
  if (!res.ok && res.err) {
    console.log('   stderr HEAD: ' + res.err.slice(0, 900).replace(/\n/g, ' | '))
    console.log('   stderr TAIL: ' + res.err.slice(-300).replace(/\n/g, ' '))
  }
  if (res.proc) res.proc.kill()
  await new Promise((r) => setTimeout(r, 300))
}

rmSync(home, { recursive: true, force: true })
console.log('cleaned')
