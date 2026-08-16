import { contextBridge, ipcRenderer } from 'electron'

// 页面侧可访问的最小桥（无害的平台/版本信息）。
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
})

// ---------------------------------------------------------------------------
// 无边框窗口的自定义标题栏：顶部 34px 拖拽区 + 最小化/最大化/关闭按钮。
// 在 preload 里直接注入 DOM（与页面共享），按钮通过 ipcRenderer 控制窗口。
// ---------------------------------------------------------------------------
const TITLEBAR_CSS = [
  '#dsh-titlebar{position:fixed;top:0;left:0;right:0;height:34px;display:flex;align-items:stretch;-webkit-app-region:drag;z-index:2147483647;background:#161616;border-bottom:1px solid rgba(255,255,255,.06);user-select:none;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}',
  '#dsh-titlebar .dsh-drag{flex:1}',
  '#dsh-titlebar .dsh-title{display:flex;align-items:center;padding-left:12px;font-size:12px;color:#8a8a8a;letter-spacing:.2px}',
  '#dsh-titlebar button{-webkit-app-region:no-drag;width:46px;height:34px;border:0;background:transparent;color:#8a8a8a;font-size:12px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}',
  '#dsh-titlebar button:hover{background:rgba(255,255,255,.08);color:#e6e6e6}',
  '#dsh-titlebar #dsh-tb-close:hover{background:#e81123;color:#fff}',
  '#root{padding-top:34px!important;box-sizing:border-box}',
].join('\n')

function injectTitleBar(): void {
  if (document.getElementById('dsh-titlebar') !== null || document.body === null) return
  const style = document.createElement('style')
  style.id = 'dsh-titlebar-style'
  style.textContent = TITLEBAR_CSS
  document.head.appendChild(style)

  const bar = document.createElement('div')
  bar.id = 'dsh-titlebar'
  bar.innerHTML =
    '<div class="dsh-title">DSH Desktop</div>' +
    '<div class="dsh-drag"></div>' +
    '<button id="dsh-tb-min" title="最小化" aria-label="最小化">&#x2500;</button>' +
    '<button id="dsh-tb-max" title="最大化 / 还原" aria-label="最大化">&#x2750;</button>' +
    '<button id="dsh-tb-close" title="关闭" aria-label="关闭">&#x2715;</button>'
  document.body.appendChild(bar)

  const maxBtn = bar.querySelector('#dsh-tb-max') as HTMLButtonElement | null
  bar.querySelector('#dsh-tb-min')?.addEventListener('click', () => ipcRenderer.send('desktop:window:minimize'))
  bar.querySelector('#dsh-tb-max')?.addEventListener('click', () => ipcRenderer.send('desktop:window:toggle-maximize'))
  bar.querySelector('#dsh-tb-close')?.addEventListener('click', () => ipcRenderer.send('desktop:window:close'))
  // 双击拖拽区 = 最大化/还原（Windows 习惯）。
  bar.querySelector('.dsh-drag')?.addEventListener('dblclick', () => ipcRenderer.send('desktop:window:toggle-maximize'))
  ipcRenderer.on('desktop:window:maximized', (_event, isMax: boolean) => {
    if (maxBtn !== null) maxBtn.textContent = isMax ? '\u2751' : '\u2750'
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectTitleBar, { once: true })
} else {
  injectTitleBar()
}
