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

## What we changed beyond upstream

This repository is a second-development distribution, not a one-line fork or a
collection of unmodified plugins. The following work is maintained in this
repository and is what makes the product different from the upstream DSH web
UI, upstream plugin repositories, and a generic Electron wrapper.

| Area | Our optimization, addition, or fix | Result for users |
|---|---|---|
| Desktop productization | Built an Electron 39 desktop application around the public `dsh web` boundary; added a frameless window, custom title bar, no default menu, single-instance locking, safe external-link handling, workspace resolution, and child-process cleanup. | A native-feeling Windows/macOS/Linux DSH application with the same official web UI and shared DSH sessions. |
| Runtime delivery | Locked `@deepseek-ai/dsh@0.1.0-rc.6`; bundled the production dependency closure; launch the local runtime with an ephemeral port; probe `host.describe` before showing the window; recover from first-profile creation with one controlled restart. | Release downloads work without a separately installed Node.js, pnpm, or `dsh` CLI, and startup failures are detected before a blank window is shown. |
| Dependency and plugin seating | Replaced fragile hand-written `.pnpm` flattening with `pnpm deploy --node-linker=hoisted`; materialize profile bundle entries and `profiles/node_modules` links idempotently; preserve user-owned packages. | Curated plugins load offline and do not depend on the user's package manager layout. |
| Plugin curation | Use direct selected subpackages instead of the upstream aggregate bundle; deliberately exclude the rc.6-incompatible `dsh-liangshen` and unnecessary pet/remote-web-ui/ssh/liangshen packages; vendor fork provenance and licenses. | Smaller, more predictable plugin surface with fewer startup crashes and less unrelated UI. |
| Grayscale workbench | Added `dsh-skin-grayscale`; desaturate design tokens with Rec.709 perceptual luminance, cover deep background/editor/terminal layers, and preserve contrast and hierarchy. | A consistent minimal-grayscale DSH experience instead of a shallow color filter. |
| Glass workbench | Integrated the forked Aqua surface and tuned it to coexist with the grayscale skin, including translucent panels, blur/frost controls, background layers, and the frameless title bar. | Codex-style glassmorphism without losing grayscale readability. |
| Smart routing | Integrated `dsh-routing-suite` as a selectable `routing-suite` preset; classify the first durable task as `inspect-first`, `direct`, or `neutral`; append only a bounded guidance section through `system-prompt/assemble`. | Task-aware behavior that preserves DSH persona, tools, context, model settings, and request count. |
| Routing safety | Added explicit boundaries: no file/process execution, no tool filtering, no hidden model call, no DSH source patch, and no silent model/provider changes; added contract tests for the routing decisions. | Smart routing remains inspectable and cannot silently reduce Harness capability. |
| Skills host contract | Built `dsh-see-skills` with the `list_skills` tool, `GET /see-skills/skills`, structured records, safe root normalization, and discovery of `$DSH_HOME/skills`, `.agents`, `.codex`, environment-provided, and bundled roots. | Existing user Skills are visible without copying private Skill bodies into this repository. |
| Skills client experience | Added a better-sidebar Skills tab backed by the same host inventory; documented `SKILL.md` frontmatter, references/scripts/assets layout, safety rules, and contribution contract. | Skills are a real workbench capability rather than a README-only promise. |
| Vision and workbench integration | Integrated the modlens vision bridge, `describe_image`, better-sidebar, task board, git graph, AionUI right panel, web UI settings, and skin center as a tested curated stack. | Vision, files, editor, terminal, Git, jobs, preview, and settings work together in one DSH workbench. |
| Release engineering | Added Windows x64, macOS Intel/ARM64, and Linux x64 installers; unsigned-package guidance; bilingual documentation; release checklist; tag-to-package-version CI validation; secret scans; runtime, routing, Skills, and installer smoke checks. | Release assets and README claims are checked against the actual product before publishing. |
| Download optimization | Release `v0.1.3` removes runtime-unused source maps and PDB debug symbols while keeping the complete offline runtime and standard installer compression; CI caches Electron downloads and retries transient failures. | Smaller downloads and more reliable cross-platform publishing without turning the first launch into a partially installed shell. |

### Upstream relationship and responsibility boundary

The DSH runtime and upstream projects remain credited in their package metadata
and license files. Third-party plugins are vendored under `app/plugins/fork/`
with `forkedFrom` metadata where applicable. This project owns the Electron
delivery layer, plugin selection and seating, grayscale/glass integration,
Smart routing integration, Skills host/client contract, release process, and
the product documentation. It consumes DSH through the public web boundary and
does not modify DSH source code.

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

## Choose your delivery path

### Download speed and package strategy

The `v0.1.3` package is the first lean Release: runtime-unused source maps and
PDB debug symbols are excluded while standard installer compression is kept. The
DSH runtime, official Web UI, Smart routing, grayscale/glass surface, Skills
viewer, and curated plugins remain inside the package, so the first launch is
offline-capable and does not depend on a background download completing.

We intentionally do not split the stable package into “start now, copy plugin
files later”. DSH plugin bundles are loaded through a profile manifest and a
dependency closure; a partial copy can leave a profile in a state where the
runtime starts but the UI fails. A future online bootstrap may download an
optional plugin pack atomically into the user data directory, with checksum,
resume, rollback, and an offline full package fallback. Until that protocol is
implemented and tested, the complete compressed package is the reliable
open-box path.

### Download a Release (recommended)

Open the [GitHub Releases](https://github.com/buzhimingLF/dsh-desktop-grayscale/releases)
page and download the asset for your operating system. The installer is the
complete product: Electron, `@deepseek-ai/dsh@0.1.0-rc.6`, the grayscale/glass
workbench, Smart routing, curated plugins, and the Skills viewer are included.
Node.js, pnpm, and a separate `dsh` installation are not required.

On first launch the app starts the bundled local DSH web runtime, creates or
updates the `web` profile, seats the built-in plugins, and may restart the
runtime once. This is expected. Configure a provider, model, and credentials
in DSH before sending a task; this repository cannot provide a user's API key.
The desktop package is self-contained, but model requests still require the
provider network and valid credentials.

First-run checklist:

1. Install the package for your platform and launch **DSH Desktop**.
2. Complete DSH provider/model setup, or reuse the existing `~/.dsh` profile.
3. Keep the default **minimal grayscale** workbench, or choose **Smart routing**
   (`routing-suite`) from the Agent preset/mode selector.
4. Open the **Skills** tab to confirm `$DSH_HOME/skills`, `~/.agents/skills`,
   `~/.codex/skills`, and bundled skills are discoverable.

Public packages are unsigned. Windows SmartScreen and macOS Gatekeeper may
require explicit confirmation on first launch. Linux AppImage may need execute
permission (`chmod +x dsh-desktop-*.AppImage`).

### Build from source

#### Quick start (development)

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

#### Build and verify an installer

For maintainers, run the following from `app/`:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm verify:runtime
pnpm build
pnpm dist
```

`pnpm dist` is the release build. It first materializes and verifies the
runtime closure, then invokes electron-builder. A partial runtime fails the
build instead of becoming a misleading installer. Build on the target OS;
electron-builder does not turn a Windows build into a valid macOS/Linux package.

The native targets are:

| Platform | Package |
|---|---|
| Windows x64 | NSIS `.exe` installer |
| macOS x64 / arm64 | `.dmg` installer or `.zip` archive |
| Linux x64 | `.AppImage` or `.deb` package |

Every release asset must contain Electron, the locked DSH runtime, the curated
plugins, the default grayscale/glass workbench, Smart routing, and the Skills
viewer. See [the release checklist](docs/RELEASE-CHECKLIST.md) before publishing.

Notes:
- Native modules ship with platform prebuilds; `node-pty` uses N-API (ABI-stable), no Electron ABI rebuild is required.
- Signing is intentionally disabled until platform-specific signing credentials are configured in CI.

Pushing a semantic-version tag matching `app/package.json` (for example,
`v0.1.3` for version `0.1.3`) runs the cross-platform release workflow and
uploads Windows, macOS Intel/Apple Silicon, and Linux x64 packages to GitHub
Releases. Do not create a tag whose version differs from `app/package.json`.

## Troubleshooting

- **The window starts but no model response arrives:** configure a provider,
  model, and credential in DSH; this repository never ships user credentials.
- **A new plugin or preset is not visible after an upgrade:** quit all DSH
  Desktop/DSH web processes and launch again. The first launch may perform one
  automatic runtime restart to load the profile bundles.
- **Skills are missing:** verify that each skill directory contains `SKILL.md`
  and that it is under one of the documented roots. Private skill files must
  remain on the local machine.
- **A source checkout cannot build:** use Node.js ≥ 22.19 and pnpm ≥ 11, run
  commands from `app/`, and use `pnpm install --frozen-lockfile` to reproduce CI.

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
