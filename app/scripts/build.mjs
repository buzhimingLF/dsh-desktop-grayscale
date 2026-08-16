import { build } from 'esbuild'

const shared = {
  bundle: true,
  external: ['electron'],
  sourcemap: false,
  logLevel: 'info',
}

await Promise.all([
  build({
    ...shared,
    entryPoints: ['src/main/index.ts'],
    outfile: '.build/main.mjs',
    platform: 'node',
    format: 'esm',
  }),
  build({
    ...shared,
    entryPoints: ['src/main/preload.ts'],
    outfile: '.build/preload.cjs',
    platform: 'node',
    format: 'cjs',
  }),
])

console.log('build: shell bundles written to .build/')
