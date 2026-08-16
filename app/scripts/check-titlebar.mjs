// 通过 CDP 验证无边框标题栏是否已注入到页面 DOM。
// 用法：先带 --remote-debugging-port=9222 启动 app，再跑本脚本。
const base = 'http://127.0.0.1:9222'
async function main() {
  const list = await (await fetch(base + '/json/list')).json()
  const page = list.find((t) => t.type === 'page')
  if (!page) { console.log('NO PAGE TARGET'); process.exit(1) }
  console.log('page url=' + page.url)
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('ws timeout')), 8000)
    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: "JSON.stringify({titlebar: !!document.getElementById('dsh-titlebar'), min: !!document.getElementById('dsh-tb-min'), max: !!document.getElementById('dsh-tb-max'), close: !!document.getElementById('dsh-tb-close'), rootPad: getComputedStyle(document.getElementById('root')||document.body).paddingTop})", returnByValue: true } }))
    }
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id === 1) { clearTimeout(timer); resolve(msg.result?.result?.value) }
    }
    ws.onerror = reject
  })
  console.log('check result: ' + result)
  ws.close()
  process.exit(0)
}
main().catch((e) => { console.error('ERR: ' + e.message); process.exit(1) })
