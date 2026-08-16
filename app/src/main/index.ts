/**
 * DSH Desktop（极简灰度）Electron 主进程。
 *
 * 职责（消费 DSH 的公开边界，不改 DSH 源码）：
 *   1. 解析 dsh 命令（优先内置运行时，否则回退 PATH 上的 dsh）；
 *   2. 把 3 个插件预装进 web profile；
 *   3. spawn `dsh web --port 0`，解析 readiness 行；
 *   4. 探活后把官方 Web UI 加载进 BrowserWindow；
 *   5. 生命周期：退出时杀掉子进程、单实例锁。
 *
 * 参考 upstream/dsh-desktop/src/main/index.ts（这里做了大幅精简，去掉更新/远程连接/托盘等）。
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { BUNDLED_PLUGIN_NAMES, seatBundledPlugins, withdrawBundledPlugin } from './bundled-plugins.ts'

// 构建产物位于 .build/main.mjs，`..` 即 app/ 根目录。
const APP_DIR = fileURLToPath(new URL('..', import.meta.url))

/** 官方 DSH 数据目录（与 dsh CLI / 浏览器 Web UI 共享会话与凭据）。 */
function childHome(): string {
  const override = process.env.DSH_HOME
  return override && override.trim() !== '' ? override : join(homedir(), '.dsh')
}

/**
 * 桌面端的工作区（DSH 的会话/配置按「工作区目录」隔离）。
 * 从 ~/.dsh/storages/workspace.json 读最近使用的工作区路径，这样桌面端能直接打开
 * 用户在网页端用的项目、看到相同的对话；没有记录时回退到用户主目录。
 */
function resolveWorkspace(): string {
  try {
    const file = join(childHome(), 'storages', 'workspace.json')
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as {
      tables?: { workspaces?: Record<string, { path?: string; updatedAt?: string }> }
    }
    const workspaces = parsed.tables?.workspaces
    if (workspaces) {
      let best: { path: string; updatedAt: string } | undefined
      for (const ws of Object.values(workspaces)) {
        if (typeof ws.path !== 'string' || ws.path.trim() === '') continue
        if (best === undefined || (ws.updatedAt ?? '') > (best.updatedAt ?? '')) {
          best = { path: ws.path, updatedAt: ws.updatedAt ?? '' }
        }
      }
      if (best !== undefined && existsSync(best.path)) return best.path
    }
  } catch {
    /* workspace.json 缺失或格式变化时走默认 */
  }
  return homedir()
}

/**
 * 闭包 node_modules 根：统一用 pnpm deploy 物化的 .runtime/node_modules（hoisted 平铺，
 * peer 解析正确）；packaged 时它作为 extraResources 随包分发到 dsh-runtime/node_modules。
 */
function runtimeNodeModules(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'dsh-runtime', 'node_modules')
  }
  return join(APP_DIR, '.runtime', 'node_modules')
}

/** 内置 dsh CLI 入口绝对路径。 */
function bundledBinPath(): string | undefined {
  const bin = join(runtimeNodeModules(), '@deepseek-ai', 'dsh', 'lib', 'bin.js')
  return existsSync(bin) ? bin : undefined
}

/** 内置插件目录（闭包内）。 */
function pluginDirFor(name: string): string | undefined {
  const dir = join(runtimeNodeModules(), name)
  return existsSync(join(dir, 'package.json')) ? dir : undefined
}

/** 运行 dsh 子进程用的 Node：packaged 用 Electron 自带 Node，dev 用系统 node。 */
function nodeForChild(): string {
  if (app.isPackaged) return process.execPath
  return process.env.DSH_DESKTOP_NODE ?? 'node'
}

interface DshCommand {
  command: string
  args: string[]
  source: 'bundled' | 'path'
  label: string
}

function resolveDshCommand(): DshCommand {
  const bin = bundledBinPath()
  if (bin !== undefined) {
    return {
      command: nodeForChild(),
      // Electron 的 Node 模式缺 cordis-plugin-hmr 需要的 loader，须加 --expose-internals。
      args: [...(app.isPackaged ? ['--expose-internals'] : []), bin],
      source: 'bundled',
      label: bin,
    }
  }
  return { command: 'dsh', args: [], source: 'path', label: 'dsh' }
}

/** readiness 行形如 `dsh web: http://127.0.0.1:PORT`。 */
function parseReadiness(line: string): string | undefined {
  const match = /^dsh web:\s+(\S+)/.exec(line)
  const candidate = match?.[1]
  if (candidate === undefined) return undefined
  try {
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:' ? candidate : undefined
  } catch {
    return undefined
  }
}

/** 探活：问一句 /api/host.describe，确认 harness 真的能服务。 */
async function probeWebUi(base: string, timeoutMs = 1_500): Promise<boolean> {
  try {
    const response = await fetch(base + '/api/host.describe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'desktop-probe', method: 'host.describe', payload: {} }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok) return false
    const body = (await response.json()) as { result?: { ok?: boolean } }
    return body.result?.ok === true
  } catch {
    return false
  }
}

async function waitForReady(base: string): Promise<void> {
  const deadline = Date.now() + 15_000
  while (Date.now() < deadline) {
    if (await probeWebUi(base, 300)) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('dsh web 已打印 readiness，但 API 未就绪')
}

let child: ChildProcess | null = null
let mainWindow: BrowserWindow | null = null
let quitting = false

function openExternal(url: string): void {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') void shell.openExternal(url)
  } catch {
    /* ignore */
  }
}

function createWindow(targetUrl: string): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 600,
    show: false,
    backgroundColor: '#141414',
    title: 'DSH Desktop',
    frame: false, // 无边框窗口，标题栏由 preload 注入的自定义标题栏接管
    webPreferences: {
      preload: join(APP_DIR, '.build', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // 最大化状态变化 → 通知渲染进程切换按钮图标。
  mainWindow.on('maximize', () => mainWindow?.webContents.send('desktop:window:maximized', true))
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('desktop:window:maximized', false))

  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const target = new URL(url)
    const allowed = new URL(targetUrl)
    if (target.origin !== allowed.origin) {
      event.preventDefault()
      openExternal(url)
    }
  })
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  void mainWindow.loadURL(targetUrl)
}

/** 启动运行时，返回 Web UI origin。首启会先建 profile、再重启一次以装载插件。 */
async function startRuntime(allowRestart: boolean): Promise<string> {
  const dsh = resolveDshCommand()
  console.log('[desktop] dsh runtime: ' + dsh.source + ' (' + dsh.label + ')')

  const pluginDirs = new Map<string, string>()
  for (const name of BUNDLED_PLUGIN_NAMES) {
    const dir = pluginDirFor(name)
    if (dir !== undefined) pluginDirs.set(name, dir)
  }

  // 启动前先 seat 一次（profile 已存在时本轮就生效）。
  const before = seatBundledPlugins(pluginDirs, runtimeNodeModules(), childHome())
  console.log('[desktop] 预装插件(启动前): ' + JSON.stringify(before))

  return new Promise<string>((resolve, reject) => {
    mkdirSync(childHome(), { recursive: true })
    const proc = spawn(dsh.command, [...dsh.args, 'web', '--port', '0'], {
      cwd: resolveWorkspace(),
      env: {
        ...process.env,
        DSH_HOME: childHome(),
        ...(app.isPackaged && dsh.command === process.execPath ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child = proc

    let settled = false
    let stdoutBuffer = ''

    proc.stdout.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString()
      const lines = stdoutBuffer.split('\n')
      stdoutBuffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed === '') continue
        const url = parseReadiness(line)
        if (url !== undefined) {
          void waitForReady(url).then(
            async () => {
              if (settled) return
              // profile 可能是本次 boot 才生成的：再 seat 一次，若新写入则重启一次装载插件。
              const after = seatBundledPlugins(pluginDirs, runtimeNodeModules(), childHome())
              if (after.added.length > 0 && allowRestart) {
                console.log('[desktop] profile 本轮生成，重启一次以装载插件: ' + after.added.join(', '))
                // 关键：先标记 settled，避免下面 proc.kill() 触发 exit 处理器把这个 promise 提前 reject。
                settled = true
                proc.kill()
                try {
                  resolve(await startRuntime(false))
                } catch (error) {
                  reject(error)
                }
                return
              }
              settled = true
              resolve(url)
            },
            (error: unknown) => {
              if (settled) return
              settled = true
              reject(error instanceof Error ? error : new Error(String(error)))
            },
          )
        }
      }
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      process.stderr.write('[dsh web] ' + chunk.toString())
    })

    proc.on('error', (error) => {
      if (settled) return
      settled = true
      reject(error)
    })

    proc.on('exit', (code) => {
      if (settled) return
      settled = true
      reject(new Error('dsh web 在就绪前退出（code=' + String(code) + '）'))
    })
  })
}

function stopChild(): void {
  const proc = child
  child = null
  if (proc === null || proc.exitCode !== null) return
  if (process.platform === 'win32' && proc.pid !== undefined) {
    spawn('taskkill', ['/pid', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }).on('error', () => proc.kill())
  } else {
    proc.kill()
  }
}

function fail(message: string): void {
  dialog.showErrorBox('DSH Desktop', message)
  app.quit()
}

// ---------------------------------------------------------------------------
// App 生命周期
// ---------------------------------------------------------------------------

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow !== null) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    // 去掉 Electron 默认的 File/Edit/View/Window/Help 菜单栏（Codex 式无菜单栏窗口）。
    Menu.setApplicationMenu(null)

    // 自定义标题栏的窗口控制 IPC。
    ipcMain.on('desktop:window:minimize', () => mainWindow?.minimize())
    ipcMain.on('desktop:window:toggle-maximize', () => {
      if (mainWindow === null) return
      if (mainWindow.isMaximized()) mainWindow.unmaximize()
      else mainWindow.maximize()
    })
    ipcMain.on('desktop:window:close', () => mainWindow?.close())

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0 && child !== null && child.exitCode === null) {
        // macOS 下点 dock 恢复窗口；这里简化处理。
      }
    })

    app.on('before-quit', () => {
      quitting = true
    })
    app.on('will-quit', () => {
      stopChild()
    })
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') app.quit()
    })

    void startRuntime(true)
      .then((url) => {
        if (quitting) return
        console.log('[desktop] Web UI ready: ' + url)
        createWindow(url)
      })
      .catch((error: unknown) => {
        if (quitting) return
        fail('dsh web 启动失败：' + (error instanceof Error ? error.message : String(error)))
      })
  })
}
