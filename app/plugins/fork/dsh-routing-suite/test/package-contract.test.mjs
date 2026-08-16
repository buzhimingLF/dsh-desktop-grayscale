import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const patch = await readFile(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
const host = await readFile(new URL('../src/index.ts', import.meta.url), 'utf8')
const client = await readFile(new URL('../src/client/index.ts', import.meta.url), 'utf8')
const preset = await readFile(new URL('../preset/routing-suite/agent.cordis.yml', import.meta.url), 'utf8')
const presetMetadata = await readFile(new URL('../preset/routing-suite/preset.yml', import.meta.url), 'utf8')

test('package is an MIT DSH bundle with a declared selectable preset', () => {
  assert.equal(manifest.name, 'dsh-routing-suite')
  assert.equal(manifest.license, 'MIT')
  assert.equal(manifest.author, 'rpg_zaun <2311993475@qq.com>')
  assert.equal(manifest.bin, undefined)
  assert.equal(manifest.scripts.preinstall, undefined)
  assert.equal(manifest.scripts.install, undefined)
  assert.equal(manifest.scripts.postinstall, undefined)
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.deepEqual(manifest.dsh.desktop.presets, [{ id: 'routing-suite', path: './preset/routing-suite' }])
  assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-ui-settings'))
  assert.equal(manifest.peerDependencies, undefined)
  assert.match(patch, /id: dsh-routing-suite/)
  assert.match(patch, /enabled: true/)
  assert.match(patch, /strategy: auto/)
  assert.match(preset, /name: '@deepseek-ai\/dsh-tool-fs'/)
  assert.match(preset, /name: '@deepseek-ai\/dsh-tool-subagent'/)
  assert.match(presetMetadata, /^name: 智能路由模式$/m)
  assert.match(presetMetadata, /^order: 5$/m)
})

test('Host has no injector, filesystem, process, tool-filter, or extra-LLM capability', () => {
  assert.match(host, /export const inject = \['systemPrompt', 'webServer'\]/)
  assert.doesNotMatch(host, /node:(?:fs|path|os|child_process|process)/)
  assert.doesNotMatch(host, /new Function|spawn|exec|junction|symlink|loader|timer|ctx\.tools|ctx\.llm/)
  assert.doesNotMatch(host, /req\.method === ['"]POST['"]|readBody|writeFile/)
  assert.match(host, /applyRoutingToAssembly/)
  assert.match(host, /GET.*status/s)
  assert.match(host, /selectedPreset\(session\) !== routingPreset/)
})

test('localized Client is read-only and follows the primary machine locale', () => {
  assert.match(client, /navigator\.languages\?\.\[0\]/)
  assert.match(client, /primary === 'zh-cn' \|\| primary\.startsWith\('zh-hans'\)/)
  assert.match(client, /fetch\('\/routing-suite\/api\/status'/)
  assert.doesNotMatch(client, /method:\s*['"]POST|createElement\(['"](?:button|input)['"]\)|setInterval/)
  assert.match(client, /不读取文件、不执行命令、不裁剪工具/)
  assert.match(client, /does not read files, run commands, remove tools or context/)
  assert.match(client, /from 'react'/)
  assert.match(client, /}, RoutingSuiteSection\)\)/)
  assert.doesNotMatch(client, /\bcomponent\s*:/)
  assert.match(client, /useEffect\(\(\) =>/)
})

test('publish allowlist contains the preset and notices but excludes legacy product surfaces', () => {
  const files = manifest.files.join('\n')
  assert.match(files, /preset/)
  assert.match(files, /LICENSES/)
  assert.match(files, /THIRD_PARTY_NOTICES/)
  assert.doesNotMatch(files, /bin/)
  assert.doesNotMatch(JSON.stringify(manifest), /dsh-tools|cordis-plugin-loader/)
})
