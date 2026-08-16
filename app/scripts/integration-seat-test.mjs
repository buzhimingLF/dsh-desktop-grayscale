// 集成冒烟：验证「预装 4 插件」后 dsh web 能正常启动。
// 流程：首启生成 profile → seat 4 个插件 → 二启 → 检查是否存活并探活 API。
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, symlinkSync, lstatSync, rmSync, renameSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = join(dirname(fileURLToPath(import.meta.url)), '..')
const BIN = join(APP, 'runtime', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
const NM = join(APP, 'node_modules')
const PLUGINS = [
  ['@liustack/modlens', '@liustack/modlens'],
  ['dsh-better-sidebar', 'dsh-better-sidebar'],
  ['@linxin666/dsh-web-ui-all', '@linxin666/dsh-web-ui-all'],
  ['dsh-skin-grayscale', 'dsh-skin-grayscale'],
]

const home = mkdtempSync(join(tmpdir(), 'dsh-seat-test-'))

function boot(timeoutMs) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [BIN, 'web', '--port', '0'], {
      cwd: home,
      env: { ...process.env, DSH_HOME: home },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let out = ''
    let err = ''
    proc.stdout.on('data', (c) => { out += c })
    proc.stderr.on('data', (c) => { err += c })
    let settled = false
    const finish = (r) => { if (!settled) { settled = true; resolve(r) } }
    const timer = setTimeout(() => { finish({ url: null, out, err, timedOut: true, proc }) }, timeoutMs)
    proc.on('exit', (code) => { clearTimeout(timer); finish({ url: null, out, err, timedOut: false, exitCode: code }) })
    const check = setInterval(() => {
      const m = /^dsh web:\s+(\S+)/m.exec(out)
      if (m) { clearInterval(check); clearTimeout(timer); finish({ url: m[1], out, err, proc }) }
    }, 200)
  })
}

async function probe(base) {
  try {
    const r = await fetch(base + '/api/host.describe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 't', method: 'host.describe', payload: {} }),
      signal: AbortSignal.timeout(3000),
    })
    const b = await r.json()
    return b?.result?.ok === true
  } catch { return false }
}

function ensureLink(link, src) {
  let existing
  try { existing = lstatSync(link) } catch { existing = undefined }
  if (existing !== undefined) {
    if (!existing.isSymbolicLink()) return false
    if (existing && readlink(link) === src) return true
    rmSync(link, { force: true })
  }
  mkdirSync(dirname(link), { recursive: true })
  symlinkSync(src, link, process.platform === 'win32' ? 'junction' : 'dir')
  return true
}

function readlink(p) { try { return require('node:fs').readlinkSync(p) } catch { return undefined } }

function flatten() {
  const target = join(home, 'profiles', 'node_modules')
  let n = 0
  const linkPackage = (name, src) => {
    if (!existsSync(join(src, 'package.json'))) return
    try { if (ensureLink(join(target, name), src)) n++ } catch {}
  }
  const store = join(NM, '.pnpm')
  if (existsSync(store)) {
    for (const storeDir of readdirSync(store)) {
      const inner = join(store, storeDir, 'node_modules')
      if (!existsSync(inner)) continue
      for (const entry of readdirSync(inner)) {
        if (entry === '.bin' || entry === 'node_modules') continue
        if (entry.startsWith('@')) {
          const sd = join(inner, entry)
          if (!existsSync(sd)) continue
          for (const pkg of readdirSync(sd)) linkPackage(entry + '/' + pkg, join(sd, pkg))
        } else {
          linkPackage(entry, join(inner, entry))
        }
      }
    }
  }
  return n
}

function seat() {
  const manifestPath = join(home, 'profiles', 'web', 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const bundles = manifest.dsh.profile.bundles
  const flattened = flatten()
  const added = []
  for (const [name, dirName] of PLUGINS) {
    const dir = join(APP, 'runtime', 'node_modules', dirName)
    if (!existsSync(join(dir, 'package.json'))) { console.log('MISSING plugin dir: ' + dir); continue }
    const link = join(home, 'profiles', 'node_modules', name)
    ensureLink(link, dir)
    if (!bundles.includes(name)) { bundles.push(name); added.push(name) }
  }
  const tmp = manifestPath + '.tmp'
  writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n')
  renameSync(tmp, manifestPath)
  return { added, flattened }
}

// 1) 首启：只生成 profile，然后立刻停。
const first = await boot(30000)
if (first.proc) first.proc.kill()
console.log('first boot readiness: ' + (first.url ?? '(none)'))
if (first.err.includes('ERR') || first.err.toLowerCase().includes('error')) console.log('first stderr:\n' + first.err.slice(0, 500))

// 2) seat 插件。
const { added, flattened } = seat()
console.log('seated bundles (newly added): ' + JSON.stringify(added) + ' flattened=' + flattened)

// 3) 二启：带插件。
const second = await boot(90000)
if (second.url) {
  const ok = await probe(second.url)
  console.log('second boot url=' + second.url + ' apiOk=' + ok)
  console.log('second stdout (tail 1200):\n' + second.out.slice(-1200))
  console.log('second stderr (tail 800):\n' + second.err.slice(-800))
  second.proc?.kill()
} else {
  console.log('second boot: NO readiness, timedOut=' + second.timedOut + ' exitCode=' + second.exitCode)
  console.log('second stdout (tail 1500):\n' + second.out.slice(-1500))
  console.log('second stderr (tail 2000):\n' + second.err.slice(-2000))
  if (second.proc) second.proc.kill()
}

rmSync(home, { recursive: true, force: true })
console.log('cleaned ' + home)
