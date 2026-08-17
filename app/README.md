# DSH Desktop Workbench / DSH Harness 工作台

DSH Harness 工作台发行版：内置锁定版本的 `dsh web` 运行时、官方 Web UI、极简灰度 + 玻璃工作台、智能路由 preset、Skills 查看器和精选插件。安装包不要求用户预装 Node.js、pnpm 或 `dsh` CLI。

## 开发运行

```powershell
cd app
pnpm install
pnpm prepare:runtime
pnpm dev
```

`pnpm prepare:runtime` 使用 `pnpm deploy --prod --node-linker=hoisted` 物化离线运行时闭包。首次启动会在 `~/.dsh` 创建/更新 web profile，并在必要时自动重启一次以载入预装插件。

## 预装插件

运行时包含 modlens、better-sidebar、task-board、git-graph、aionui-panel、web-ui-settings、describe-image、skin-center、灰度皮肤、技能查看、玻璃拟态皮肤和 `dsh-routing-suite` 智能路由模式。聚合包及不稳定的额外插件未被打入安装包。

「智能路由模式」只在该模式下生效：它读取会话中的第一条真实用户任务，自动选择检查优先或直接执行，并通过公开的 `system-prompt/assemble` 边界追加一段短提示。它不读取文件、不执行命令、不裁剪工具，也不产生额外模型请求。

Skills 查看器会把 `~/.dsh/skills`、`~/.agents/skills`、`~/.codex/skills`、`DSH_BUNDLED_SKILL_DIR` 和内置 modlens 技能统一整理为结构化清单，并同时提供 `list_skills`、`GET /see-skills/skills` 与侧边栏「技能」tab。技能目录契约和安全要求见 [../docs/SKILLS.md](../docs/SKILLS.md)。

## 本地打包

在对应操作系统上运行以下命令，electron-builder 会选择当前平台的安装目标：

```powershell
cd app
pnpm dist
```

输出位于 `app/release/`：

| 平台 | 安装包 |
|---|---|
| Windows x64 | NSIS `.exe` |
| macOS x64/arm64 | `.dmg` 与 `.zip` |
| Linux x64 | `.AppImage` 与 `.deb` |

打包流程会先物化并验证所有运行时包；验证失败时不会生成可发布安装包。公开构建暂未配置代码签名，因此 macOS 可能需要在系统设置中允许打开，Windows 可能显示 SmartScreen 提示。

## 验证脚本

```powershell
pnpm typecheck
pnpm verify:runtime
pnpm build
pnpm pack:dir
```

`pack:dir` 会生成未安装的目录包，适合在发布前做启动冒烟测试。

## GitHub Release

推送与 `app/package.json` 版本一致的标签（例如 `v0.1.1`）后，GitHub Actions
会在 Windows、macOS Intel/Apple Silicon、Linux 原生 runner 上分别构建，并自动将
安装包上传到 [Releases](https://github.com/buzhimingLF/dsh-desktop-grayscale/releases)。
发布前请阅读仓库根目录的[安装器发布检查表](../docs/RELEASE-CHECKLIST.md)。

安装包的开箱即用边界：内置 Electron、锁定的 DSH rc.6 运行时和全部精选插件，
因此不需要 Node.js、pnpm 或 `dsh` CLI；但模型 Provider、模型名、API 凭据和私有
Skills 必须由用户在自己的 DSH 配置中提供，不能由公开仓库代为携带。
