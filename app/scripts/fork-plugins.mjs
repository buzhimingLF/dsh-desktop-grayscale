// 把插件从 .runtime/node_modules 固化为我们自己的本地 fork（workspace 包），
// 摆脱「npm 原版直装」，拥有代码可自由改造。只保留运行时所需文件，剥离 devDependencies。
import { cpSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(APP, '.runtime', 'node_modules')
const OUT = join(APP, 'plugins', 'fork')

const packages = [
  '@liustack/modlens',
  'dsh-better-sidebar',
]

for (const name of packages) {
  const src = join(SRC, name)
  if (!existsSync(join(src, 'package.json'))) {
    console.error('MISSING source package: ' + src)
    process.exit(1)
  }
  const pkg = JSON.parse(readFileSync(join(src, 'package.json'), 'utf8'))
  const dirName = basename(name) // modlens / dsh-better-sidebar
  const outDir = join(OUT, dirName)
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })

  // 1) 复制整个包目录（.runtime 是 pnpm deploy 的生产闭包，只含运行时文件）。
  cpSync(src, outDir, { recursive: true })

  // 2) 重写 package.json：去掉 devDependencies/scripts，保留运行时关键字段。
  const keep = ['name', 'version', 'description', 'type', 'main', 'exports', 'bin',
    'dependencies', 'peerDependencies', 'peerDependenciesMeta', 'optionalDependencies', 'dsh', 'engines']
  const slim = {}
  for (const k of keep) if (pkg[k] !== undefined) slim[k] = pkg[k]
  // 私有 fork：标记来源，避免与 npm 同名包混淆。
  slim.forkedFrom = name + '@' + pkg.version
  writeFileSync(join(outDir, 'package.json'), JSON.stringify(slim, null, 2) + '\n')

  console.log('forked ' + name + '@' + pkg.version + ' -> ' + outDir)
}
console.log('done. vendored packages in ' + OUT)
