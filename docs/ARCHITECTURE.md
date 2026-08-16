# Architecture

## Overview

DSH Desktop is an **Electron shell** around the **official DeepSeek Harness web UI**. It never imports DSH internals — the only coupling is the public `dsh web` HTTP origin.

Three runtime layers:

```
┌─────────────────────────────────────────────┐
│ Electron main (src/main/)                    │
│  • frameless BrowserWindow                   │
│  • dsh web child manager (spawn / readiness) │
│  • plugin pre-seating                        │
└──────────────────┬──────────────────────────┘
                   │ spawns `dsh web --port 0`
┌──────────────────▼──────────────────────────┐
│ Bundled DSH runtime (.runtime/ or resources/ │
│ dsh-runtime/) — pnpm deploy hoisted closure  │
│  @deepseek-ai/dsh + forked plugins + skin    │
└──────────────────┬──────────────────────────┘
                   │ serves official Web UI
┌──────────────────▼──────────────────────────┐
│ Official dsh web UI (loaded as-is)           │
│  + client plugins (skin / aqua / see-skills) │
└─────────────────────────────────────────────┘
```

## Runtime resolution

`resolveDshCommand()` prefers the bundled closure:

- packaged: `<resources>/dsh-runtime/node_modules/@deepseek-ai/dsh/lib/bin.js`, run via `process.execPath` with `ELECTRON_RUN_AS_NODE=1` and `--expose-internals`;
- development: `.runtime/node_modules/@deepseek-ai/dsh/lib/bin.js`, run via system Node.

## Plugin pre-seating

DSH mounts plugins through two facts the official `dsh plugin add` writes:

1. the package name in `<DSH_HOME>/profiles/web/package.json` → `dsh.profile.bundles`;
2. a resolvable copy under `<DSH_HOME>/profiles/node_modules/`.

The desktop replicates both offline (`src/main/bundled-plugins.ts`):

1. materialize the whole closure with `pnpm deploy --prod --node-linker=hoisted` (flat layout, correct peer resolution — a hand-rolled `.pnpm` walk picks the wrong peer variant);
2. on launch, symlink every top-level closure package into `profiles/node_modules` and append the plugin names to `dsh.profile.bundles`.

First boot creates the profile, so the app seats plugins **after** readiness and restarts once.

### Why not the `dsh-web-ui-all` aggregate

`@linxin666/dsh-web-ui-all` inserts 12 sub-packages via its bundle patch, and one of them — `dsh-liangshen` — crashes DSH `0.1.0-rc.6` (native exit `0xC0000409`). We seat the curated sub-packages directly and drop pet / remote-web-ui / ssh / liangshen.

## Frameless window & custom title bar

- `frame: false`, `Menu.setApplicationMenu(null)` (no default File/Edit menu).
- The preload injects a 34px title bar: `-webkit-app-region: drag` region + minimize / maximize / close buttons (`no-drag`), driven by `ipcMain` handlers; `#root` gets `padding-top: 34px`.

## The grayscale skin

`plugins/dsh-skin-grayscale` is generated from a reference dsh-web-ui skin: every `--dsw-*` token (and the alias/specific layers) is desaturated by Rec.709 perceptual luminance, preserving the light/dark contrast hierarchy. A `DEEP_CSS` layer additionally grayscales the CodeMirror editor and the xterm terminal. Generation: `pnpm generate:skin`.

## The see-skills plugin

`plugins/see-skills`:

- host: registers a model-facing `list_skills` tool and a `GET /see-skills/skills` route; both return structured JSON (name / description / sections / references / scripts / preview) by scanning `~/.dsh/skills`, `~/.agents/skills` and the bundled modlens skill dir;
- client: registers a "技能" tab in better-sidebar (`ctx.betterSidebar.registerTab`) rendering that inventory.

## Security boundary

- Renderer: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
- External links open in the system browser; navigation is locked to the web UI origin.
- Credentials stay in DSH's own store (`~/.dsh`); this project reads/writes none.
