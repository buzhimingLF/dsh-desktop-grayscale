# DSH Desktop（极简灰度）

DeepSeek Harness 的 Electron 桌面版：官方 `dsh web` UI + 预装 3 个插件
（modlens / dsh-web-ui / dsh-better-sidebar），延续「极简灰度」视觉。

## 目录

```
app/
├─ src/main/           Electron 主进程（dsh web 壳 + 预装插件）
├─ runtime/            内置 dsh 运行时闭包 + 3 插件（package.json 声明依赖）
├─ scripts/build.mjs   esbuild 构建主进程/preload
├─ electron-builder.yml
└─ PLAN.md（在上一级 dsh-desktop/）
```

## 开发运行

```powershell
cd app
pnpm install           # 首次较慢：Electron + dsh 运行时 + 精选插件
pnpm prepare:runtime   # 用 pnpm deploy 物化运行时闭包到 .runtime/（hoisted 平铺）
pnpm dev               # 构建 shell 并启动 Electron
```

> 依赖安装的 pnpm 11 兼容项已写在 `pnpm-workspace.yaml`（`overrides` 解 git 子依赖、
> `allowBuilds` 放行 postinstall、`minimumReleaseAgeExclude` 放行 rc/新发包），无需额外操作。

## 预装插件（精选集，均已实测可启动）

| 包 | 用途 |
|---|---|
| `@liustack/modlens` | 视觉插件：`modlens_read_image` 工具 + `(modlens vision)` 模型变体 |
| `dsh-better-sidebar` | 侧边栏工作台（文件/编辑器/终端/Git/后台任务） |
| `@linxin666/dsh-client-ui-task-board` | 任务看板 |
| `@linxin666/dsh-client-ui-git-graph` | Git 图 |
| `@linxin666/dsh-client-ui-aionui-panel` | 右侧面板（预览/文件树/SCM） |
| `@linxin666/dsh-client-ui-web-ui-settings` | Web UI 设置 |
| `@linxin666/dsh-tool-describe-image` | 看图工具 `describe_image` |
| `@linxin666/dsh-client-ui-skin-center` | 皮肤中心 |
| `dsh-skin-grayscale` | ★ 极简灰度皮肤（自研，默认启用） |
| `dsh-see-skills` | ★ 技能查看插件（自研）：`list_skills` 工具 + `/see-skills/skills` 路由 + 技能面板，结构化输出沿用 modlens 契约 |

> 注：dsh-web-ui 聚合包 `@linxin666/dsh-web-ui-all` 内置的 `dsh-liangshen` 会在 DSH rc.6 上原生崩溃，
> 故改用精选子包直挂，并去掉 pet / remote-web-ui / ssh 等非必要包。

## 打包（Windows NSIS）

```powershell
cd app
pnpm dist             # prepare-runtime → rebuild-native → build → electron-builder
```

- `scripts/rebuild-native.mjs` 会把 `.runtime` 闭包里的原生模块（node-pty/ssh2/cpu-features/koffi）
  按 Electron ABI 重建（打包版用 Electron 内置 Node 跑 dsh，原生模块必须对 Electron ABI 编译）。
- 产出 `release/dsh-desktop-<ver>-win-x64.exe`（NSIS 安装器）。
- 快速解包验证：`pnpm pack`（electron-builder --dir，不产出安装器）。

## 验证脚本

| 脚本 | 用途 |
|---|---|
| `scripts/bisect-plugins.mjs` | 逐个/累计 seat 插件并 boot，定位崩溃插件 |
| `scripts/verify-see-skills.mjs` | 验证 `/see-skills/skills` 路由返回结构化 JSON |
| `scripts/integration-seat-test.mjs` | 全量 seat + boot 冒烟 |

`pnpm dev` 会：
1. 用系统 `node` 启动内置 `dsh web --port 0`（数据目录 `~/.dsh`，与 CLI 共享会话/凭据）；
2. 把 3 个插件 seat 进 web profile；
3. 打开窗口加载官方 Web UI。

## 打包（Windows NSIS）

```powershell
cd app
pnpm dist             # 产出 release/dsh-desktop-*.exe
```

> 注意：dsh-better-sidebar 依赖 node-pty（原生模块）。打包前需用 Electron ABI 重建：
> `pnpm rebuild node-pty --target=39.0.0 --runtime=electron --dist-url=https://electronjs.org/headers`

## 打包（Windows NSIS）

```powershell
cd app
pnpm dist             # prepare-runtime → rebuild-native → build → electron-builder
```

- `scripts/rebuild-native.mjs` 会把 `.runtime` 闭包里的原生模块（node-pty/ssh2/cpu-features/koffi）
  按 Electron ABI 重建（打包版用 Electron 内置 Node 跑 dsh，原生模块必须对 Electron ABI 编译）。
- 产出 `release/dsh-desktop-<ver>-win-x64.exe`（NSIS 安装器）。
- 快速解包验证：`pnpm pack`（electron-builder --dir，不产出安装器）。

## 后续阶段（见 ../PLAN.md）

- 阶段 B 收尾：better-sidebar / web-ui 子包的 UI 级深度灰度化（当前由皮肤覆盖，编辑器语法色保留）
- 阶段 C 收尾：see-skills 客户端接入 better-sidebar 侧边栏 tab（当前为自绘悬浮面板）
- 阶段 E：`pnpm dist` 实机产出安装包并冒烟
