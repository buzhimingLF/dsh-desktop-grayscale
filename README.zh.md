<p align="center">
  <h1 align="center">DSH Desktop</h1>
  <p align="center">
    一个<b>无边框、极简灰度的桌面客户端</b>，为
    <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness（DSH）</a> 而生 ——<br/>
    官方 <code>dsh web</code> UI + Electron 壳，预装一套精选、fork 后的插件栈。
  </p>
</p>

<p align="center">
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <a href="https://github.com/buzhimingLF/dsh-desktop-grayscale"><img alt="Electron" src="https://img.shields.io/badge/Electron-39-47848f?logo=electron&logoColor=white"></a>
  <a href="https://github.com/buzhimingLF/dsh-desktop-grayscale"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white"></a>
  <a href="https://github.com/buzhimingLF/dsh-desktop-grayscale"><img alt="platform" src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey"></a>
</p>

> 中文 · [English](./README.md)

## 这是什么

**DSH Desktop** 把 DeepSeek Harness 的 Web GUI 变成一个独立的桌面应用：干净、Codex 风格的窗口（无菜单栏、无边框、自定义标题栏）+「极简灰度」视觉，外加一套精选社区插件——全部 fork 改造后**随应用离线预装**。

它只消费 DSH 的**公开边界**（官方 `dsh web` UI），从不改 DSH 源码。运行时内置，最终用户**无需安装 Node.js，也无需安装 `dsh` CLI**。

## 特性

- 🖥️ **无边框窗口 + 自定义标题栏** —— 没有默认的 File/Edit 菜单栏；拖拽区 + 最小化/最大化/关闭按钮。
- 📦 **内置 DSH 运行时** —— 用 Electron 的 Node 拉起 `dsh web --port 0`，加载官方 Web UI；与 CLI 共享 `~/.dsh` 的会话与凭据。
- 🔌 **插件离线预装** —— 通过 `pnpm deploy --node-linker=hoisted` 物化插件闭包，首次启动时 seat 进 `dsh.profile.bundles` + `profiles/node_modules` 符号链接。
- 🎨 **极简灰度皮肤**（`dsh-skin-grayscale`）—— 按感知亮度对全部 DSH 设计 token 去色，编辑器/终端深度灰度。
- 🧊 **玻璃拟态主题**（`dsh-client-ui-aqua`，fork 自 DSH-Transparent-UI-Plugin）—— 磨砂玻璃面板，可调模糊度/磨砂度/背景。
- 🛠️ **技能查看插件**（`dsh-see-skills`）—— `list_skills` 工具 + `/see-skills/skills` 路由 + 侧边栏「技能」tab，结构化输出沿用 modlens 的证据契约。
- 🧩 **精选插件栈** —— modlens（视觉）、better-sidebar（工作台）、task-board、git-graph、aionui 右面板、describe-image、skin-center。

## 预装插件

| 包 | 用途 | 来源 |
|---|---|---|
| `@liustack/modlens` | 视觉桥：`modlens_read_image` 工具 + `(modlens vision)` 模型变体 | fork |
| `dsh-better-sidebar` | 侧边栏工作台：文件 / 编辑器 / 终端 / Git / 后台任务 | fork |
| `@linxin666/dsh-client-ui-task-board` | 任务看板 | fork |
| `@linxin666/dsh-client-ui-git-graph` | Git 图 | fork |
| `@linxin666/dsh-client-ui-aionui-panel` | 右侧面板（预览 / 文件树 / SCM） | fork |
| `@linxin666/dsh-client-ui-web-ui-settings` | Web UI 设置 | fork |
| `@linxin666/dsh-tool-describe-image` | `describe_image` 看图工具 | fork |
| `@linxin666/dsh-client-ui-skin-center` | 皮肤中心 | fork |
| `@deepseek-ai/dsh-client-ui-aqua` | 玻璃拟态主题 | fork |
| `dsh-skin-grayscale` | 极简灰度皮肤 | **本仓库自研** |
| `dsh-see-skills` | 技能查看 | **本仓库自研** |

> 有意不用官方聚合包 `@linxin666/dsh-web-ui-all`：其内置的 `dsh-liangshen` 会在 DSH rc.6 上原生崩溃，且会拉入我们不需要的 pet/remote-web-ui/ssh。改为精选子包直挂。

## 快速开始（开发）

前置：Node.js ≥ 22.19，pnpm ≥ 11。

```bash
cd app
pnpm install          # 首次会下载 Electron + DSH 运行时闭包
pnpm prepare:runtime  # 物化离线运行时闭包（.runtime/）
pnpm dev              # 构建壳并启动 Electron
```

`pnpm dev` 会：
1. 用内置运行时拉起 `dsh web --port 0`（数据目录 `~/.dsh`，与 CLI 共享）；
2. 把插件 seat 进 `web` profile；
3. 打开无边框窗口加载官方 Web UI。

## 打包安装器

普通用户请前往 [GitHub Releases](https://github.com/buzhimingLF/dsh-desktop-grayscale/releases) 下载对应系统的安装包：

| 平台 | 安装包 |
|---|---|
| Windows x64 | NSIS `.exe` 安装器 |
| macOS x64 / arm64 | `.dmg` 安装器或 `.zip` 压缩包 |
| Linux x64 | `.AppImage` 或 `.deb` 安装包 |

每个安装包都内置 Electron、锁定版本的 DSH 运行时和精选插件，不需要另外安装 Node.js、pnpm 或 `dsh` CLI。当前公开包暂未签名，首次运行时 Windows SmartScreen 或 macOS Gatekeeper 可能需要手动确认。

维护者本地打包：

```bash
cd app
pnpm dist             # prepare-runtime → verify → build → electron-builder
```

在对应操作系统上运行会生成原生安装包到 `app/release/`：

- Windows：NSIS `.exe`
- macOS：`.dmg` 和 `.zip`
- Linux：`.AppImage` 和 `.deb`

说明：
- 打包前会验证运行时闭包，缺包时直接失败，不会静默生成不可用 Release。
- 原生模块随包附平台 prebuild；`node-pty` 使用 N-API（ABI 稳定），无需 Electron ABI 重建。
- 签名暂未启用，待 CI 配置各平台签名凭据后再开启。

推送形如 `v0.1.0` 的版本标签后，跨平台 Release 工作流会自动构建并上传 Windows、macOS、Linux 安装包。

## 目录结构

```
dsh-desktop/
├─ app/
│  ├─ src/main/            Electron 主进程（dsh web 壳 + 插件预装 + 无边框窗口）
│  ├─ plugins/
│  │  ├─ dsh-skin-grayscale/    极简灰度皮肤（本仓库自研）
│  │  ├─ see-skills/            技能查看插件（本仓库自研）
│  │  └─ fork/                  fork 的第三方插件（vendored，带 `forkedFrom` 标记）
│  ├─ runtime/             内置 DSH 运行时闭包（package.json 钉版本）
│  ├─ scripts/             构建 / 部署 / 原生重建 / 生成器工具
│  └─ electron-builder.yml
├─ docs/                  架构与设计文档
└─ .github/               CI 与 issue/PR 模板
```

## 工作原理

桌面端从不 import DSH 内部代码。它：

1. 解析 DSH CLI（优先内置闭包）；
2. 拉起 `dsh web --port 0` 并解析 readiness 行；
3. seat fork 插件：把部署闭包符号链接进 `profiles/node_modules`，并把包名追加进 `dsh.profile.bundles`；
4. 在无边框 `BrowserWindow` 中加载官方 Web UI。

详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 参与贡献

欢迎贡献！详见 [CONTRIBUTING.md](CONTRIBUTING.md)，并请遵守[行为准则](CODE_OF_CONDUCT.md)。

## 安全

发现漏洞？请参阅 [SECURITY.md](SECURITY.md)。

## 许可证

[MIT](LICENSE) © 2026 DSH Desktop contributors。

> `app/plugins/fork/` 下的 fork 插件保留各自上游许可证（MIT / Apache-2.0）；详见各包内文件。
