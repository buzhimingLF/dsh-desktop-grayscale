# dsh-git-graph

English | [中文](README.zh.md)

External dsh Web GUI plugin: a **git branch selector** and **Git graph** panel, mounted in the context hole of the official input selector row (`conversation.input.selector.context`, a session-maybe list slot) next to the official workspace selector pill, just above the input card; if the running shell does not declare that slot (the npm SDK rc.6 removed it), it waits `CONTEXT_FALLBACK_MS` then falls back to `conversation.input.dock` (the 0.1.9 mount point). On the dock, the active phase measures the input card's left edge so the chip starts flush with the card, and the hero (blank-session) phase lifts the chip into the official hero row immediately after the agent-preset seat — right of the preset name, with the same transparent 28px pill recipe and the same `--dsw-*` theme tokens as the official workspace/preset chips. Git capabilities run for real in the host process (checkout-tree `git switch`), the UI is browser React; workspace selection is left entirely to the official entry (product decision: the in-house selector is retired, no dual entry is kept).

Behavior aligns with ZCode's `GitBranchSwitcher`: searchable popover, a checkmark on the current item, bottom actions "创建并检出新分支… / Git 图谱" (Create and check out new branch… / Git graph), a switch guard (unresolved conflicts / an operation in progress / the target branch checked out by another worktree) and readable errors.

## Repository layout and build

Kept as a sibling of the DeepSeek Harness main repo (sibling checkout, same turtle-ui layout; the path is arbitrary, below is only an example):

```text
~/code/deepseek-harness   # deepseek-harness checkout (sibling)
~/code/dsh-git-graph      # this repository
```

All peer APIs come from the sibling checkout's source (tsconfig resolves via the paths of `../deepseek-harness/tsconfig.base.json`; when the sibling directory has a different name, replace the `../deepseek-harness` relative path in the tsconfig files with the actual directory). The type gate is `pnpm run typecheck` (`tsc -b`, which also builds the sibling packages referenced by `references`, writing declaration artifacts into the sibling's `lib/` — the same design as turtle-ui).

```sh
pnpm install
pnpm run typecheck   # tsc -b (including sibling referenced projects)
pnpm test            # vitest (core pure functions / real git service / jsdom components)
pnpm run build       # tsc -b && tsdown (lib/index.js + lib/invariant.js + lib/client.js)
```

`lib/client.js` is the browser bundle (a closure-factory artifact, `window.__ModuleLoader__.load`), served by the host's client-modules at `/plugins/<id>/client.js`; the build presets `build/tsdown.client.ts` + `build/web/src/platform.ts` are copies taken from the main repo's `packages/client/tsdown.client.ts` / `packages/client/web/src/platform.ts`, and must be kept in sync when the main repo changes.

Git installs (consumer machines without a sibling checkout) go through the `prepare` script: `tsdown --config tsdown.prepare.config.ts` transpiles directly from src without type checking (`tsconfig.prepare.json` is self-contained).

## Activation

This package is a dsh profile bundle (`package.json` declares `"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }`). After activation, the next `dsh web` (or corresponding profile) startup has the bundle patch's insert line mount `ui-git-graph` (host half: git service + `/git/*` routes) together with the browser half (dsh.client declaration) into the Web composition; a page refresh shows the branch pill in the hero row after the agent-preset seat on a blank session, or on the dock band directly above the input card (left-aligned with the card) in an active session.

### Generic install (any machine)

This plugin is merged into the dsh-web-ui family monorepo (`github.com/zhu1090093659/dsh-web-ui`). The plugin is published to npm; one-line install recommended:

```sh
dsh plugin --profile web add @linxin666/dsh-client-ui-git-graph
```

Or install the family aggregate package `@linxin666/dsh-web-ui-all` all at once (same one-line `dsh plugin --profile web add @linxin666/dsh-web-ui-all`).

Install from the repository when you need to debug code:

```sh
git clone https://github.com/zhu1090093659/dsh-web-ui.git
cd dsh-web-ui
pnpm install && pnpm -r build
dsh plugin --profile web add link:$(pwd)/packages/dsh-git-graph
```

> The `github:` install form applies to a standalone repo whose package sits at the repository root (the `prepare` script builds self-contained; pnpm ≥10 rejects it the first time, add the package key to the profile's `pnpm-workspace.yaml` `allowBuilds` per the printed error and retry). For subpackages of a monorepo use the `link:` form above.

### Local development loop (this repo checkout)

```sh
dsh plugin --profile <name> add link:/absolute/path/to/dsh-git-graph
```

A `link:` install references the local directory directly; a rebuild takes effect immediately without reinstalling (after a code change, `pnpm run build` then refresh the page). Note that `link:` takes an absolute path (`~` is expanded by the shell, not by pnpm semantics).

## Uninstall

```sh
dsh plugin --profile web remove @linxin666/dsh-client-ui-git-graph
```

## Design notes

- Boundary and load-chain research and key decisions: see [docs/ADR-001-plugin-boundary.md](docs/ADR-001-plugin-boundary.md).
- The host half's `/git/*` only accepts paths of registered workspaces (realpath check) and loopback clients (loopback socket + loopback Host, the same fence as dsh-ssh); the browser cannot run git against arbitrary directories, and a LAN-exposed dsh web answers non-loopback clients with 403.
- The switch semantics are workspace-level: `git switch --no-guess <branch>` operates on the repoRoot checkout tree and affects all sessions of that workspace; project switch = activate the target workspace and open its (reused or newly created) blank session, without changing the cwd of existing sessions.
- Mount seam: `conversation.input.selector.context` (the officially declared session-maybe list slot) — the context hole of the input selector row, next to the official workspace pill; both the hero (blank session) and active-session phases show the branch pill; the branch chip hides itself when there is no session cwd or it is not a git workspace. Declaration-aware with fallback: it waits `CONTEXT_FALLBACK_MS` for the slot declaration (the npm SDK rc.6 shell removed this declaration); if no declaration arrives by the timeout it remounts on `conversation.input.dock`. On the dock the active phase is left-aligned with the input card via a live measurement of its left edge; the hero phase re-anchors the chip into the official hero row after the agent-preset seat (2px official row gap, vertically centered, matching the workspace/preset chip metrics and tokens) and opens the picker downward like the official workspace menu. Only one seat is mounted, and late context declarations after the fallback are ignored.
- Workspace selection is not inside this plugin: the official workspace pill (`conversation.input.selector.workspace`) is the only entry; this plugin only provides git branch context.
- Branch state refresh: fetch on mount / popover open / successful switch + host SSE (`/git/events`, polling workspace state every 30s while subscribed, each probe bounded by a 15s deadline so a hung git never stalls the stream) pushing external changes + refresh on window focus (throttled to once per 5s).

## Check chain

```sh
pnpm run typecheck
pnpm test
pnpm run build
```
