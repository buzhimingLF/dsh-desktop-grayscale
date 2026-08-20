import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_DIR = fileURLToPath(new URL('..', import.meta.url))
const NODE_MODULES = join(APP_DIR, '.runtime', 'node_modules')

// Keep this list aligned with src/main/bundled-plugins.ts. Failing before
// electron-builder prevents publishing an installer with a half-empty runtime.
const requiredPackages = [
  '@deepseek-ai/dsh',
  '@liustack/modlens',
  'dsh-better-sidebar',
  '@linxin666/dsh-client-ui-task-board',
  '@linxin666/dsh-client-ui-git-graph',
  '@linxin666/dsh-client-ui-aionui-panel',
  '@linxin666/dsh-tool-describe-image',
  '@linxin666/dsh-client-ui-skin-center',
  'dsh-skin-grayscale',
  'dsh-see-skills',
  'dsh-routing-suite',
]

const missing = []
for (const name of requiredPackages) {
  const packageDir = join(NODE_MODULES, ...name.split('/'))
  const packageJson = join(packageDir, 'package.json')
  if (!existsSync(packageJson)) {
    missing.push(`${name} (package.json)`)
  }
}

const dshBin = join(NODE_MODULES, '@deepseek-ai', 'dsh', 'lib', 'bin.js')
if (!existsSync(dshBin)) missing.push('@deepseek-ai/dsh/lib/bin.js')

if (missing.length > 0) {
  throw new Error(`runtime verification failed; missing:\n- ${missing.join('\n- ')}`)
}

const dshManifest = JSON.parse(readFileSync(join(NODE_MODULES, '@deepseek-ai', 'dsh', 'package.json'), 'utf8'))
console.log(`[runtime] verified ${requiredPackages.length} packages (dsh ${String(dshManifest.version ?? 'unknown')})`)
