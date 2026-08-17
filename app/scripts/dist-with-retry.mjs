import { spawn } from 'node:child_process'

const maxAttempts = 3
const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

function runOnce() {
  return new Promise((resolve, reject) => {
    const child = spawn(command, ['dist'], { stdio: 'inherit', env: process.env })
    child.once('error', reject)
    child.once('exit', (code, signal) => resolve({ code: code ?? 1, signal }))
  })
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.log(`[release] installer build attempt ${attempt}/${maxAttempts}`)
  try {
    const result = await runOnce()
    if (result.code === 0) process.exit(0)
    console.warn(`[release] installer build failed with code ${String(result.code)}${result.signal ? ` (signal ${result.signal})` : ''}`)
  } catch (error) {
    console.warn('[release] installer build process failed: ' + (error instanceof Error ? error.message : String(error)))
  }
  if (attempt < maxAttempts) {
    const delayMs = attempt * 10_000
    console.log(`[release] retrying in ${String(delayMs / 1000)} seconds`)
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }
}

process.exit(1)
