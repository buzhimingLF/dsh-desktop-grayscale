# dsh-routing-suite

A lightweight, selectable smart-routing mode for DeepSeek Harness (DSH).

一个轻量、可在模式菜单中选择的 DeepSeek Harness 智能路由模式。

> Community project; not an official DeepSeek product and not endorsed by DeepSeek.
>
> 社区项目，并非 DeepSeek 官方产品，也不代表 DeepSeek 官方背书。

## Features / 功能

- Adds a real **智能路由模式 / Smart routing mode** beside Standard, Code, Minimal, and Cordis modes when installed by a compatible desktop installer.
- Keeps the official Standard preset's persona, contexts, and complete tool catalog.
- Uses the first durable user task to select a stable working style:
  - **Automatic / 自动判断（推荐）**
  - **Inspect first / 检查优先** for fixes, diagnosis, reviews, and migrations
  - **Direct execution / 直接执行** for creation and implementation
- Applies routing guidance only while the `routing-suite` mode is selected.
- Simplified Chinese UI for a primary `zh-CN`/`zh-Hans` machine locale; English otherwise.
- Makes no extra model request and performs no filesystem, process, package, or network management.

## Install / 安装

### Recommended desktop installation

Install `dsh-routing-suite@0.1.2` from the DeepSeek Harness Desktop plugin manager. It first uses the official fixed plugin command and then safely materializes the package-declared Agent preset in DSH's official user preset root.

Restart Harness after installation, then select **智能路由模式** from the mode menu.

### DSH CLI

The official command installs the profile bundle:

```sh
dsh plugin --profile web add dsh-routing-suite
```

DSH's plugin command does not currently materialize package-declared user presets. CLI-only users must additionally copy this package's `preset/routing-suite` directory to `${DSH_HOME:-$HOME/.dsh}/.agent-presets/routing-suite`, then restart Harness. No npm lifecycle script performs this copy.

## Configuration / 配置

The bundle configuration accepts:

```yaml
enabled: true
strategy: auto # auto | inspect-first | direct
```

- `auto`: classify the first user task; ambiguous tasks remain neutral.
- `inspect-first`: always encourage fact and root-cause inspection before changes.
- `direct`: always encourage direct implementation followed by verification.

The localized settings page is a read-only React view showing runtime availability, scope, and the active strategy. Configuration remains under DSH's normal bundle/profile management.

## Safety / 安全

The Host only participates in `system-prompt/assemble` for sessions using the `routing-suite` preset and exposes one read-only status endpoint. It does not:

- remove or restrict tools;
- clear contexts or replace the selected persona;
- read or write files;
- execute commands or manage packages;
- create subagents or make additional LLM calls.

The preset composition is derived from DSH's official Standard preset under MIT. It grants the same normal coding capabilities as Standard mode; the routing plugin itself does not exercise those capabilities.

## Development

```sh
npm install
npm run verify
npm pack --json --dry-run --ignore-scripts
```

See [`SOURCE_PROVENANCE.md`](./SOURCE_PROVENANCE.md), [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md), and [`ACKNOWLEDGEMENTS.md`](./ACKNOWLEDGEMENTS.md). No upstream Injector or Router implementation is distributed; the official Standard composition is included under MIT.

## License

MIT © 2026 rpg_zaun and dsh-routing-suite contributors.
