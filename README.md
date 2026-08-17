<p align="center">
  <h1 align="center">DSH Desktop</h1>
  <p align="center">
    A <b>DSH Harness workbench distribution</b> for
    <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness (DSH)</a> —<br/>
    embedded runtime, minimal-grayscale workspace, Smart routing, Skills discovery, and a curated plugin stack.
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

**DSH Desktop** is the distributable, opinionated **DSH Harness workbench**. It packages the locked DSH runtime, the official `dsh web` UI, an opinionated minimal-grayscale surface, a selectable Smart routing preset, a Skills discovery contract, and a curated plugin stack into an offline-capable application.

The Electron window is only the delivery shell. The product experience is the combination of:

| Layer | What is included |
|---|---|
| DSH runtime | `@deepseek-ai/dsh@0.1.0-rc.6`, launched from the bundled closure |
| Default workbench | Minimal grayscale tokens, grayscale background/editor/terminal treatment, and glass panes |
| Agent behavior | Standard DSH capability plus the selectable `routing-suite` Smart routing preset |
| Skills | `list_skills`, `/see-skills/skills`, the Skills sidebar tab, and user skill discovery |
| Extensions | Curated forked plugins, vendored with license/provenance notices |

This is not a generic Electron wrapper and it does not replace DSH's model or
provider layer. Users configure their provider, model, credentials, and local
skill directories through DSH. The app preserves the standard tool/context
surface so a capable model such as DeepSeek V4 Pro can be evaluated through the
same public DSH workflow rather than through a reduced demo harness.

It consumes only DSH's **public boundary** — the official `dsh web` UI — and never patches DSH source. The runtime is bundled, so end users need **no Node.js and no `dsh` CLI** installed.

## Features

- 🖥️ **Frameless window + custom title bar** — no default File/Edit menu; drag region, minimize/maximize/close controls.
- 📦 **Bundled DSH runtime** — spawns `dsh web --port 0` on Electron's Node, loads the official Web UI; shares `~/.dsh` sessions & credentials with the CLI.
- 🔌 **Offline plugin pre-seating** — the plugin closure is materialized via `pnpm deploy --node-linker=hoisted` and seated into `dsh.profile.bundles` + `profiles/node_modules` symlinks on first launch.
- 🎨 **Minimal grayscale skin** (`dsh-skin-grayscale`) — every DSH design token desaturated by perceptual luminance; editor & terminal deep-grayscaled.
- 🖼️ **Grayscale-first workbench** — the default bundled surface activates the grayscale skin over both token-driven UI and skin-provided background layers while retaining translucent glass depth.
- 🧊 **Glassmorphism theme** (`dsh-client-ui-aqua`, forked from DSH-Transparent-UI-Plugin) — frosted glass panes, adjustable blur/frost/backdrop.
- 🛠️ **Skills viewer** (`dsh-see-skills`) — `list_skills` tool + `/see-skills/skills` route + a sidebar "Skills" tab, structured output following modlens' evidence contract.
- 🧠 **Configured Skills compatibility** — discovers DSH, `.agents`, `.codex`, environment-provided, and bundled skill roots; private skill files stay on the user's machine and are not copied into the public repository.
- 🧭 **Task-aware routing** (`dsh-routing-suite`) — a selectable Smart routing mode that chooses inspect-first or direct execution from the first durable user task, without extra model calls or tool restrictions.
- 🧩 **Curated plugin stack** — modlens (vision), better-sidebar (workbench), task-board, git-graph, aionui right-panel, describe-image, skin-center, and Smart routing.

## Built-in modes and operating contract

### Minimal grayscale mode

The default visual profile is the **minimal grayscale workbench**. The bundled
skin desaturates DSH design tokens using perceptual luminance, gives the editor
and terminal a deep grayscale treatment, and also covers background layers that
are outside the official UI root. The glass layer remains enabled, so hierarchy,
translucency, blur, and contrast are preserved without brand-blue accents.

### Smart routing mode

`dsh-routing-suite` contributes a selectable Agent preset named `routing-suite`.
When that preset is selected, it reads the first durable user task and chooses
one of three modes:

- `inspect-first` for maintenance, debugging, audit, and investigation work;
- `direct` for creation and implementation work;
- `neutral` when the task is ambiguous or empty.

It appends only its own short `routing-suite-guidance` section to the public
`system-prompt/assemble` boundary. It preserves the persona, contexts, tools,
and other DSH assembly fields. It does not execute files or processes, filter
tools, add another LLM request, or change the DeepSeek model configuration.

### Skills requirements

Skills are a first-class part of the workbench rather than a README-only claim.
Each skill is a directory containing `SKILL.md`, with optional `references/`,
`scripts/`, and `assets/`. The host exposes a structured inventory through the
`list_skills` model tool and `GET /see-skills/skills`; the better-sidebar plugin
renders the same inventory in the Skills tab.

The runtime discovers `$DSH_HOME/skills`, `~/.agents/skills`, `~/.codex/skills`,
the optional `DSH_BUNDLED_SKILL_DIR`, and the bundled modlens skill. See the
[Skills contract](docs/SKILLS.md) for the frontmatter, discovery, safety, and
contribution requirements. Private skill contents and credentials remain local
and must never be committed.

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
2. materialize the `routing-suite` Agent preset and seat the curated plugins into the `web` profile;
3. activate the minimal grayscale + glass workbench surface;
4. open a frameless window loading the official Web UI, with configured Skills discoverable from the user skill roots.

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

Pushing a semantic-version tag such as `v0.1.1` runs the cross-platform release workflow and uploads all three platform packages to GitHub Releases.

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
├─ docs/                  architecture, design, and Skills contract docs
└─ .github/               CI & issue/PR templates
```

## How it works

The desktop never imports DSH internals. It:

1. resolves the DSH CLI (bundled closure first);
2. spawns `dsh web --port 0` and parses the readiness line;
3. materializes the selectable `routing-suite` preset, seats the forked plugins, and appends package names to `dsh.profile.bundles`;
4. loads the official Web UI in a frameless `BrowserWindow`, where the grayscale/glass surface and Skills viewer are provided by client plugins.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md). Please follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Found a vulnerability? See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © 2026 DSH Desktop contributors.

> The forked plugins in `app/plugins/fork/` retain their respective upstream licenses (MIT / Apache-2.0); see each package for details.
