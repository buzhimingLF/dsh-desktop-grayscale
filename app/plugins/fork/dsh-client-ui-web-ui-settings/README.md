# @linxin666/dsh-client-ui-web-ui-settings

English | [中文](README.zh.md)

The dsh web UI plugin group for the DSH settings page: it adds a single card that groups the dsh web UI family settings, hosting the enable switches and configuration forms of the family plugins.

## What it is

- **One card for the family**: on the DSH settings page it registers a card that hosts the enable switches and configuration forms of the dsh web UI family plugins.
- **Community plugin index**: a card inside the group lists community-contributed plugins and links to each contributor's own repository (registry in `community.json`, regenerated with `scripts/community-index`).

## Install

### From npm (recommended)

```sh
dsh plugin --profile web add @linxin666/dsh-client-ui-web-ui-settings
```

### From the repository (development)

```sh
git clone https://github.com/zhu1090093659/dsh-web-ui.git
cd dsh-web-ui
pnpm install && pnpm -r build
dsh plugin --profile web add link:$(pwd)/packages/dsh-web-ui-settings
```

Restart `dsh web` for the card to appear in the settings page.

## Known limitations

- The card shows on the dsh settings page only when its prerequisite (`@deepseek-ai/dsh-client-ui-settings`) is present.
