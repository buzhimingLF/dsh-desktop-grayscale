// 生成「极简灰度」皮肤包：从 blue-fantasy 参考皮肤提取完整 token CSS，
// 把所有颜色按 Rec.709 感知亮度去色为等价灰度，保留明暗层次。
// 产出 app/plugins/dsh-skin-grayscale/（skin.json + cordis.patch.yml + package.json + lib/*）。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REF = join(ROOT, '..', 'upstream', 'dsh-web-ui', 'packages', 'skins', 'blue-fantasy', 'lib', 'client.js')
const OUT = join(ROOT, 'plugins', 'dsh-skin-grayscale')

const raw = readFileSync(REF, 'utf8')
// 注意：CSS 里含转义双引号（font-family 的 \"SF Pro Display\"、content:\"\"; 等），
// 且中间会出现 `";`（如 content:\"\";）。必须锚定到行尾的 `";\n` 才能截取完整字符串。
const m = raw.match(/const css = "([\s\S]*?)";\r?\n/)
if (!m) {
  console.error('cannot extract css from reference client.js')
  process.exit(1)
}
let css = m[1]

// 1) 选择器换成灰度皮肤的 bodyAttr。
css = css.replace(/body\[data-dsh-blue-fantasy\]/g, 'body[data-dsh-grayscale]')

// 2) 所有十六进制颜色按感知亮度去色（保留 8 位色里的 alpha）。
function grayscaleHex(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('')
  if (h.length !== 6 && h.length !== 8) return hex // 不认识就原样保留
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const alpha = h.length === 8 ? h.slice(6, 8) : ''
  const L = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)
  const gg = L.toString(16).padStart(2, '0')
  return '#' + gg + gg + gg + alpha
}

let count = 0
css = css.replace(/#[0-9a-fA-F]{3,8}\b/g, (hex) => {
  count++
  return grayscaleHex(hex)
})

console.log(`grayscaled ${count} hex colors; css length=${css.length}`)

// 3) 写皮肤包文件。
const clientJs = `window.__ModuleLoader__.load({
	id: "dsh-skin-grayscale",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const css = "${css}";
		const tagId = "dsh-skin-grayscale/grayscale.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-skin-grayscale";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		// 深度灰度：皮肤 token 覆盖不到的地方（better-sidebar 编辑器语法色、xterm 终端）按亮度去色。
		const DEEP_CSS = "body[data-dsh-grayscale] .cm-editor, body[data-dsh-grayscale] .xterm { filter: grayscale(1); }";
		function apply(ctx) {
			const body = document.body;
			body.dataset.dshGrayscale = "";
			const deep = document.createElement("style");
			deep.dataset.plugin = "dsh-skin-grayscale";
			deep.dataset.pluginCss = "dsh-skin-grayscale/deep.module.css";
			deep.textContent = DEEP_CSS;
			document.head.appendChild(deep);
			ctx.effect(() => () => {
				delete body.dataset.dshGrayscale;
				deep.remove();
			}, "ui-skin-grayscale");
		}
		exports.apply = apply;
		return module.exports;
	}
});
`

const indexJs = `// Host loader entry for the browser-only grayscale skin plugin.
function apply() {}
export { apply };
`

mkdirSync(join(OUT, 'lib'), { recursive: true })
writeFileSync(join(OUT, 'lib', 'client.js'), clientJs)
writeFileSync(join(OUT, 'lib', 'index.js'), indexJs)

writeFileSync(join(OUT, 'package.json'), JSON.stringify({
  name: 'dsh-skin-grayscale',
  version: '0.1.0',
  description: '极简灰度皮肤：把全部 DSH 设计 token 按亮度去色，黑白灰极简视觉',
  type: 'module',
  main: 'lib/index.js',
  exports: {
    '.': './lib/index.js',
    './client': './lib/client.js',
    './package.json': './package.json',
  },
  dsh: {
    bundle: { patch: './cordis.patch.yml' },
    client: { inject: [], platform: 'web' },
  },
  files: ['lib', 'cordis.patch.yml', 'skin.json'],
  license: 'MIT',
}, null, 2) + '\n')

writeFileSync(join(OUT, 'cordis.patch.yml'), `# 极简灰度皮肤 bundle patch：插入 dshClient 行到 web 插件列表。
- insert:
    - id: ui-skin-grayscale
      name: 'dsh-skin-grayscale'
`)

writeFileSync(join(OUT, 'skin.json'), JSON.stringify({
  id: 'grayscale',
  name: '极简灰度',
  nameEn: 'Grayscale Minimal',
  author: 'DSH Desktop',
  tagline: '黑白灰极简 · 全 token 去色 · 单一中性强调',
  description: '把 DSH 全部设计 token 按感知亮度去色为灰度，保留明暗层次，去掉品牌蓝与所有彩色，仅保留中性灰。',
  tags: ['grayscale', 'minimal', 'monochrome', 'flat'],
  accent: '#6b6b6b',
  bodyAttr: 'data-dsh-grayscale',
  package: 'dsh-skin-grayscale',
  wiring: { id: 'ui-skin-grayscale', bundleWired: false },
  preview: {},
  order: 100,
}, null, 2) + '\n')

console.log('written skin package to ' + OUT)
