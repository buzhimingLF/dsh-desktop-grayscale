<p align="center">
  <h1 align="center">DSH Desktop</h1>
  <p align="center">
    A <b>frameless, minimal-grayscale desktop client</b> for
    <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness (DSH)</a> —<br/>
    official <code>dsh web</code> UI in an Electron shell, with a curated, forked plugin stack pre-installed.
  </p>
</p>

<p align="center">
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <a href="https://github.com/buzhimingLF/dsh-desktop-grayscale"><img alt="Electron" src="https://img.shields.io/badge/Electron-39-47848f?logo=electron&logoColor=white"></a>
  <a href="https://github.com/buzhimingLF/dsh-desktop-grayscale"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white"></a>
  <a href="https://github.com/buzhimingLF/dsh-desktop-grayscale"><img alt="platform" src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey"></a>
</p>

> English · [中文](./README.zh.md)

## What is it

**DSH Desktop** turns the DeepSeek Harness web GUI into a standalone desktop app with a clean, Codex-like window (no menu bar, frameless, custom title bar) and a "minimal grayscale" look, plus a curated set of community plugins, forked and adapted to ship **offline** with the app.

It consumes only DSH's **public boundary** — the official `dsh web` UI — and never patches DSH source. The runtime is bundled, so end users need **no Node.js and no `dsh` CLI** installed.

## Features

- 🖥️ **Frameless window + custom title bar** — no default File/Edit menu; drag region, minimize/maximize/close controls.
- 📦 **Bundled DSH runtime** — spawns `dsh web --port 0` on Electron's Node, loads the official Web UI; shares `~/.dsh` sessions & credentials with the CLI.
- 🔌 **Offline plugin pre-seating** — the plugin closure is materialized via `pnpm deploy --node-linker=hoisted` and seated into `dsh.profile.bundles` + `profiles/node_modules` symlinks on first launch.
- 🎨 **Minimal grayscale skin** (`dsh-skin-grayscale`) — every DSH design token desaturated by perceptual luminance; editor & terminal deep-grayscaled.
- 🧊 **Glassmorphism theme** (`dsh-client-ui-aqua`, forked from DSH-Transparent-UI-Plugin) — frosted glass panes, adjustable blur/frost/backdrop.
- 🛠️ **Skills viewer** (`dsh-see-skills`) — `list_skills` tool + `/see-skills/skills` route + a sidebar "Skills" tab, structured output following modlens' evidence contract.
- 🧭 **Task-aware routing** (`dsh-routing-suite`) — a selectable Smart routing mode that chooses inspect-first or direct execution from the first durable user task, without extra model calls or tool restrictions.
- 🧩 **Curated plugin stack** — modlens (vision), better-sidebar (workbench), task-board, git-graph, aionui right-panel, describe-image, skin-center, and Smart routing.

## Bundled plugins

| Package | Purpose | Origin |
|---|---|---|
| `@liustack/modlens` | vision bridge: `modlens_read_image` tool + `(modlens vision)` variants | forked |
| `dsh-better-sidebar` | sidebar workbench: files / editor / terminal / git / jobs | forked |
| `@linxin666/dsh-client-ui-task-board` | task board | forked |
| `@linxin666/dsh-client-ui-git-graph` | git graph | forked |
| `@linxin666/dsh-client-ui-aionui-panel` | right panel (preview / file tree / SCM) | forked |
| `@linxin666/dsh-client-ui-web-ui-settings` | web UI settings | forked |
| `@linxin666/dsh-tool-describe-image` | `describe_image` vision tool | forked |
| `@linxin666/dsh-client-ui-skin-center` | skin center | forked |
| `@deepseek-ai/dsh-client-ui-aqua` | glassmorphism theme | forked |
| `dsh-skin-grayscale` | minimal grayscale skin | **built in this repo** |
| `dsh-see-skills` | skills viewer | **built in this repo** |
| `dsh-routing-suite` | Smart routing mode: inspect-first / direct execution / automatic classification | forked from [dragonbaba/dsh-routing-suite](https://github.com/dragonbaba/dsh-routing-suite) |

> The official `@linxin666/dsh-web-ui-all` aggregate is intentionally avoided: its bundled `dsh-liangshen` crashes DSH rc.6, and it pulls pet/remote-web-ui/ssh that we don't need. We seat the curated sub-packages directly.

## Quick start (development)

Requirements: Node.js ≥ 22.19, pnpm ≥ 11.

```bash
cd app
pnpm install          # first run downloads Electron + the DSH runtime closure
pnpm prepare:runtime  # materialize the offline runtime closure (.runtime/)
pnpm dev              # build the shell and launch Electron
```

`pnpm dev` will:
1. spawn the bundled `dsh web --port 0` (data dir `~/.dsh`, shared with the CLI);
2. seat the plugins and the Smart routing mode into the `web` profile;
3. open a frameless window loading the official Web UI.

## Build the installer

For end users, download the latest platform package from the
[GitHub Releases](https://github.com/buzhimingLF/dsh-desktop-grayscale/releases) page:

| Platform | Package |
|---|---|
| Windows x64 | NSIS `.exe` installer |
| macOS x64 / arm64 | `.dmg` installer or `.zip` archive |
| Linux x64 | `.AppImage` or `.deb` package |

Each package contains Electron, the locked DSH runtime, and the curated plugins. Node.js, pnpm, and the `dsh` CLI are not required. Public packages are currently unsigned, so Windows SmartScreen or macOS Gatekeeper may require an explicit confirmation on first launch.

For maintainers building locally:

```bash
cd app
pnpm dist             # prepare-runtime → verify → build → electron-builder
```

The current operating system produces its native targets in `app/release/`:

- Windows: NSIS `.exe`
- macOS: `.dmg` and `.zip`
- Linux: `.AppImage` and `.deb`

Notes:
- The build verifies the runtime closure before invoking electron-builder, so a partial runtime cannot silently become a release asset.
- Native modules ship with platform prebuilds; `node-pty` uses N-API (ABI-stable), no Electron ABI rebuild is required.
- Signing is intentionally disabled until platform-specific signing credentials are configured in CI.

Pushing a tag such as `v0.1.0` runs the cross-platform release workflow and uploads all three platform packages to GitHub Releases.

## Project structure

```
dsh-desktop/
├─ app/
│  ├─ src/main/            Electron main process (dsh web shell + plugin pre-seating + frameless window)
│  ├─ plugins/
│  │  ├─ dsh-skin-grayscale/    minimal grayscale skin (built here)
│  │  ├─ see-skills/            skills viewer plugin (built here)
│  │  └─ fork/                  forked third-party plugins (vendored, marked `forkedFrom`)
│  ├─ runtime/             bundled DSH runtime closure (package.json pins deps)
│  ├─ scripts/             build / deploy / rebuild-native / generator tooling
│  └─ electron-builder.yml
├─ docs/                  architecture & design docs
└─ .github/               CI & issue/PR templates
```

## How it works

The desktop never imports DSH internals. It:

1. resolves the DSH CLI (bundled closure first);
2. spawns `dsh web --port 0` and parses the readiness line;
3. seats the forked plugins: symlinks the deployed closure into `profiles/node_modules` and appends package names to `dsh.profile.bundles`;
4. loads the official Web UI in a frameless `BrowserWindow`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md). Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Found a vulnerability? See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © 2026 DSH Desktop contributors.

> The forked plugins in `app/plugins/fork/` retain their respective upstream licenses (MIT / Apache-2.0); see each package for details.
