import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ROUTING_SECTION,
  applyRoutingToAssembly,
  classifyTask,
  extractText,
  firstUserText,
  resolveMode,
} from '../src/router.mjs'

test('classifies Chinese and English maintenance tasks as inspect-first', () => {
  for (const text of ['修复登录报错并排查根因', '审查新增功能的实现', 'debug the failing login flow', 'review the new implementation']) {
    assert.equal(classifyTask(text), 'inspect-first', text)
  }
})

test('classifies Chinese and English creation tasks as direct', () => {
  for (const text of ['从零开发一个网页小游戏', '帮我写一个错误处理模块', 'build a small web application', 'implement error handling']) {
    assert.equal(classifyTask(text), 'direct', text)
  }
})

test('ambiguous and empty tasks remain neutral while explicit repair intent is conservative', () => {
  assert.equal(classifyTask('今天天气怎么样'), 'neutral')
  assert.equal(classifyTask('修复并创建'), 'inspect-first')
  assert.equal(classifyTask(''), 'neutral')
  assert.equal(classifyTask(undefined), 'neutral')
})

test('extracts flat and nested user message text safely', () => {
  const flat = { content: [{ type: 'text', text: 'hello' }, { type: 'image', url: 'x' }] }
  const nested = { message: { content: [{ type: 'text', text: 'nested' }] } }
  assert.equal(extractText(flat), 'hello')
  assert.equal(extractText(nested), 'nested')
  assert.equal(extractText(null), '')
})

test('routing remains stable on the first real durable user task', () => {
  const session = { events: [
    { type: 'user/message', data: { source: { kind: 'plugin' }, message: { content: [{ type: 'text', text: 'build ignored' }] } } },
    { type: 'assistant/message', data: {} },
    { type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '修复这个问题' }] } },
    { type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text: '从零创建应用' }] } },
  ] }
  assert.equal(firstUserText(session), '修复这个问题')
  assert.equal(resolveMode('auto', session), 'inspect-first')
  assert.equal(resolveMode('direct', session), 'direct')
})

test('assembly routing preserves existing persona, contexts, tools, and other fields', () => {
  const contexts = [{ id: 'context' }]
  const tools = [{ name: 'custom-shell' }]
  const sections = [{ name: 'persona', text: 'original', order: 0 }]
  const assembled = { sections, contexts, tools, marker: 42 }
  const result = applyRoutingToAssembly(assembled, 'direct')
  assert.equal(result.contexts, contexts)
  assert.equal(result.tools, tools)
  assert.equal(result.marker, 42)
  assert.deepEqual(result.sections[0], sections[0])
  assert.equal(result.sections.at(-1).name, ROUTING_SECTION)
  assert.match(result.sections.at(-1).text, /usable result/)
})

test('neutral mode and missing sections are non-destructive no-ops', () => {
  const assembled = { contexts: [], tools: [] }
  assert.equal(applyRoutingToAssembly(assembled, 'neutral'), assembled)
  assert.equal(applyRoutingToAssembly(assembled, 'direct'), assembled)
})

test('reapplying routing replaces only its own section', () => {
  const first = applyRoutingToAssembly({ sections: [{ name: 'persona', text: 'p' }] }, 'direct')
  const second = applyRoutingToAssembly(first, 'inspect-first')
  assert.equal(second.sections.filter((section) => section.name === ROUTING_SECTION).length, 1)
  assert.match(second.sections.at(-1).text, /root cause/)
})
