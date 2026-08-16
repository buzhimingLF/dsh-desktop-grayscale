# @linxin666/dsh-client-ui-web-ui-settings

[English](README.md) | 中文

面向 DSH 设置页的 dsh web UI 设置插件组：在 DSH 设置页加入一张卡片，归组 dsh web UI 全家桶设置，承载全家桶插件的启用开关与配置表单。

## 是什么

- **全家桶设置卡片**：在 DSH 设置页注册一张卡片，归组 dsh web UI 全家桶插件的启用开关与配置表单。
- **社区插件索引**：组内一张卡片列出社区贡献的插件，链接到作者自己的仓库（注册表在 `community.json`，由 `scripts/community-index` 重新生成）。

## 安装

### 从 npm 安装（推荐）

```sh
dsh plugin --profile web add @linxin666/dsh-client-ui-web-ui-settings
```

### 从仓库安装（开发调试）

```sh
git clone https://github.com/zhu1090093659/dsh-web-ui.git
cd dsh-web-ui
pnpm install && pnpm -r build
dsh plugin --profile web add link:$(pwd)/packages/dsh-web-ui-settings
```

安装后重启 `dsh web`，设置页出现该卡片。

## 已知限制

- 仅当依赖的 `@deepseek-ai/dsh-client-ui-settings` 存在时，该卡片才会出现在 dsh 设置页。
