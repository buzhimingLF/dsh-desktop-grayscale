<p align="center">
  <h1 align="center">DSH Desktop</h1>
  <p align="center">
    一套<b>完整的 DSH Harness 工作台发行版</b>，为
    <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness（DSH）</a> 而生 ——<br/>
    内置运行时、极简灰度工作台、智能路由、Skills 发现和精选插件栈。
  </p>
</p>

MIT License · Electron 39 · TypeScript 5 · Windows / macOS / Linux

> 中文 · [English](./README.md)

## 这是什么

**DSH Desktop** 是一套有明确工作约定的 **DSH Harness 工作台发行版**。它把锁定版本的 DSH 运行时、官方 `dsh web` UI、极简灰度工作台、可选的智能路由 preset、Skills 发现契约和精选插件栈组合成一个可离线运行的应用。

Electron 窗口只是交付载体，真正的产品能力由以下几层组成：

| 层 | 内置内容 |
|---|---|
| DSH 运行时 | `@deepseek-ai/dsh@0.1.0-rc.6`，从内置闭包启动 |
| 默认工作台 | 极简灰度 token、背景/编辑器/终端灰度处理和玻璃面板 |
| Agent 行为 | DSH 标准能力 + 可选的 `routing-suite` 智能路由 preset |
| Skills | `list_skills`、`/see-skills/skills`、侧边栏「技能」tab 和用户技能发现 |
| 扩展 | 带许可证与来源说明的精选 fork 插件 |

因此它不是一个通用 Electron 壳，也不会替换 DSH 的模型或 Provider 层。用户
仍在 DSH 中配置 Provider、模型、凭据和本地技能目录；应用保留标准工具与上下文
面，便于通过真实 DSH 工作流评估 DeepSeek V4 Pro 等模型，而不是运行被裁剪的演示 harness。

它只消费 DSH 的**公开边界**（官方 `dsh web` UI），从不改 DSH 源码。运行时内置，最终用户**无需安装 Node.js，也无需安装 `dsh` CLI**。

## 相对上游的二次开发成果

本仓库不是简单的一行 Fork，也不是把若干插件未经整理地拼在一起。下面列出本仓库在 DSH 官方 Web UI、上游插件仓库和通用 Electron 壳之上实际维护的产品化、功能新增、逻辑调整、问题修复和体验改良。

| 方向 | 我们完成的优化、迭代、功能或修复 | 用户得到的结果 |
|---|---|---|
| 桌面产品化 | 基于 DSH 公开 `dsh web` 边界构建 Electron 39 桌面应用；加入无边框窗口、自定义标题栏、去默认菜单、单实例锁、安全外链处理、工作区解析和子进程回收。 | Windows/macOS/Linux 原生桌面体验，同时保留官方 Web UI 和 DSH 会话。 |
| 运行时交付 | 锁定 `@deepseek-ai/dsh@0.1.0-rc.6`；打包生产依赖闭包；使用随机可用端口启动本地运行时；先探测 `host.describe` 再显示窗口；首启建 profile 后做一次受控重启。 | Release 不需要另外安装 Node.js、pnpm 或 `dsh` CLI，启动失败不会只显示空白窗口。 |
| 依赖与插件挂载 | 用 `pnpm deploy --node-linker=hoisted` 替代容易出错的手写 `.pnpm` 拍平；幂等写入 profile bundle 和 `profiles/node_modules` 链接；保留用户自有同名包。 | 精选插件可离线装载，不依赖用户本机的包管理器布局。 |
| 插件精简 | 不使用上游聚合包，改为精选子包直挂；主动排除在 rc.6 上不兼容的 `dsh-liangshen`，以及不需要的 pet/remote-web-ui/ssh/liangshen 包；保存 Fork 来源和许可证信息。 | 更小、更稳定、更少无关 UI 的插件面，避免已知启动崩溃。 |
| 极简灰度工作台 | 自研 `dsh-skin-grayscale`；按 Rec.709 感知亮度处理设计 token，同时覆盖深层背景、编辑器和终端，并保留层级、对比度和可读性。 | 真正一致的极简灰度 DSH，而不是只给页面套一层灰度滤镜。 |
| 玻璃拟态工作台 | 集成并调整 Aqua 玻璃表面，使其与灰度皮肤和无边框标题栏协同；支持透明面板、模糊/磨砂控制和背景层。 | 类 Codex 的玻璃拟态界面，同时保持灰度信息层级。 |
| 智能路由 | 集成 `dsh-routing-suite` 为可选择的 `routing-suite` preset；根据首条持久任务判定 `inspect-first`、`direct` 或 `neutral`；只通过 `system-prompt/assemble` 追加受控提示。 | 具备任务感知能力，同时保留 DSH 的 persona、工具、上下文、模型设置和请求次数。 |
| 路由安全边界 | 明确禁止读写文件、执行进程、裁剪工具、隐藏模型请求、修改 DSH 源码和静默改变模型/Provider；增加路由契约测试。 | 智能路由可检查、可解释，不会悄悄削弱 Harness 能力。 |
| Skills 宿主契约 | 自研 `dsh-see-skills`，提供 `list_skills` 工具、`GET /see-skills/skills` 路由、结构化记录、安全路径归一化，并发现 `$DSH_HOME/skills`、`.agents`、`.codex`、环境变量和内置目录。 | 用户已有的 Skills 可以被发现，私有 Skill 正文不会复制进公开仓库。 |
| Skills 客户端体验 | 增加 better-sidebar「技能」tab，和宿主使用同一份清单；补充 `SKILL.md` frontmatter、references/scripts/assets 结构、安全规则和贡献契约。 | Skills 是真正的一等工作台能力，而不是 README 里的宣传语。 |
| 视觉与工作台集成 | 将 modlens 视觉桥、`describe_image`、better-sidebar、任务看板、Git 图、AionUI 右面板、Web UI 设置和皮肤中心整理为经过验证的精选栈。 | 视觉、文件、编辑器、终端、Git、任务、预览和设置集中在一个 DSH 工作台中。 |
| 发布工程 | 增加 Windows x64、macOS Intel/Apple Silicon、Linux x64 安装包；提供未签名提示；维护中英文文档、发布检查表、Tag/版本 CI 校验、密钥扫描、runtime/routing/Skills/安装器烟测。 | Release 文件和 README 声明会在发布前对照真实产品检查。 |
| 下载优化 | `v0.1.4` 排除运行时不需要的 source map 与 PDB 调试符号，保持标准安装包压缩；CI 缓存 Electron 下载并在全平台自动重试瞬时失败。 | 下载包更小，跨平台发布更可靠，首次启动也不会退化成依赖后台下载的半成品空壳。 |

### 上游关系与责任边界

DSH 运行时和第三方项目仍在包元数据、许可证文件和来源说明中保留归属。第三方插件集中放在 `app/plugins/fork/`，适用时通过 `forkedFrom` 标记来源。本项目实际负责 Electron 交付层、插件筛选与挂载、灰度/玻璃整合、智能路由整合、Skills 宿主/客户端契约、Release 流程和产品文档。项目只消费 DSH 官方 Web 公开边界，不修改 DSH 源码。

## 特性

- **无边框窗口 + 自定义标题栏** —— 没有默认的 File/Edit 菜单栏；拖拽区 + 最小化/最大化/关闭按钮。
- **内置 DSH 运行时** —— 用 Electron 的 Node 拉起 `dsh web --port 0`，加载官方 Web UI；与 CLI 共享 `~/.dsh` 的会话与凭据。
- **插件离线预装** —— 通过 `pnpm deploy --node-linker=hoisted` 物化插件闭包，首次启动时 seat 进 `dsh.profile.bundles` + `profiles/node_modules` 符号链接。
- **极简灰度皮肤**（`dsh-skin-grayscale`）—— 按感知亮度对全部 DSH 设计 token 去色，编辑器/终端深度灰度。
- **灰度优先工作台** —— 默认表面同时覆盖 token 驱动的 UI 和皮肤提供的背景层，保留玻璃透明层次。
- **玻璃拟态主题**（`dsh-client-ui-aqua`，fork 自 DSH-Transparent-UI-Plugin）—— 磨砂玻璃面板，可调模糊度/磨砂度/背景。
- **技能查看插件**（`dsh-see-skills`）—— `list_skills` 工具 + `/see-skills/skills` 路由 + 侧边栏「技能」tab，结构化输出沿用 modlens 的证据契约。
- **用户 Skills 兼容** —— 自动发现 DSH、`.agents`、`.codex`、环境变量指定以及内置的技能目录；私有技能正文留在用户机器，不复制进公开仓库。
- **任务感知路由**（`dsh-routing-suite`）——可选的「智能路由模式」，根据首条真实任务自动选择“检查优先”或“直接执行”，不增加模型请求，也不裁剪工具。
- **精选插件栈** —— modlens（视觉）、better-sidebar（工作台）、task-board、git-graph、aionui 右面板、describe-image、skin-center 和智能路由。

## 内置模式与运行契约

### 极简灰度模式

默认视觉是**极简灰度工作台**。内置皮肤按感知亮度对 DSH 设计 token 去色，
并对编辑器、终端以及官方 UI 根节点之外的背景层做深度灰度处理。玻璃层仍然
开启，因此保留面板层级、透明、模糊和对比度，只去掉品牌蓝等彩色强调。

### 智能路由模式

`dsh-routing-suite` 提供可选择的 `routing-suite` Agent preset。选择后，它读取
首条真实用户任务并在三种模式中选择：

- `inspect-first`：维护、调试、审计、排查类任务；
- `direct`：创建和实现类任务；
- `neutral`：任务为空或无法可靠判断时。

它只通过公开的 `system-prompt/assemble` 边界追加自己的
`routing-suite-guidance` 段落，保留 persona、上下文、工具和其它 DSH 字段。
它不读写文件、不执行进程、不裁剪工具、不增加额外模型请求，也不修改 DeepSeek
模型配置。

### Skills 要求

Skills 是工作台的一等能力，不是 README 里的一句宣传语。每个技能目录必须包含
`SKILL.md`，可选 `references/`、`scripts/` 和 `assets/`。宿主通过模型可见的
`list_skills` 工具和 `GET /see-skills/skills` 返回结构化清单，better-sidebar
则在「技能」tab 中展示同一份数据。

运行时会发现 `$DSH_HOME/skills`、`~/.agents/skills`、`~/.codex/skills`、可选的
`DSH_BUNDLED_SKILL_DIR` 以及内置 modlens 技能。完整的 frontmatter、目录、安全和
贡献要求见 [Skills 技能契约](docs/SKILLS.md)。私有技能正文与凭据留在本机，绝不提交。

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
| `dsh-routing-suite` | 智能路由模式：检查优先 / 直接执行 / 自动判断 | fork 自 [dragonbaba/dsh-routing-suite](https://github.com/dragonbaba/dsh-routing-suite) |

> 有意不用官方聚合包 `@linxin666/dsh-web-ui-all`：其内置的 `dsh-liangshen` 会在 DSH rc.6 上原生崩溃，且会拉入我们不需要的 pet/remote-web-ui/ssh。改为精选子包直挂。

## 选择交付方式

### 下载速度与安装包策略

`v0.1.4` 是第一版瘦身 Release：排除运行时不读取的 source map 和 PDB 调试符号，同时保持标准安装包压缩。DSH 运行时、官方 Web UI、智能路由、极简灰度/玻璃工作台、Skills 查看器和精选插件仍然完整放在安装包中，因此首次启动不依赖后台下载完成，也可以在离线环境启动。

我们暂时不会把稳定版简单拆成“先启动，再慢慢复制插件文件”。DSH 插件通过 profile manifest 和依赖闭包加载，半途复制可能造成运行时能启动但 Web UI 插件失败。未来可以设计在线轻量引导器：将可选插件包以带校验、断点续传、回滚能力的原子包下载到用户数据目录，同时保留完整离线包作为兜底。在协议完成并经过跨平台验证之前，完整压缩包是更可靠的开箱即用路径。

### 下载 Release（推荐）

打开 [GitHub Releases](https://github.com/buzhimingLF/dsh-desktop-grayscale/releases)，
下载对应系统的安装包。安装包就是完整产品：Electron、
`@deepseek-ai/dsh@0.1.0-rc.6`、极简灰度/玻璃工作台、智能路由、精选插件和
Skills 查看器都会随包提供；不需要另外安装 Node.js、pnpm 或 `dsh` CLI。

首次启动时，应用会拉起内置的本地 DSH Web 运行时，创建或更新 `web` profile，
预装内置插件，必要时自动重启运行时一次。这是正常流程。发送任务前仍需在 DSH
中配置 Provider、模型和凭据，应用不会替用户提供 API Key。桌面包本身自包含，
但模型请求仍需要 Provider 网络和有效凭据。

首次启动检查清单：

1. 安装对应系统的包并启动 **DSH Desktop**；
2. 完成 DSH 的 Provider/模型设置，或复用已有的 `~/.dsh` profile；
3. 保持默认的**极简灰度**工作台，或在 Agent preset/模式选择器中选择**智能路由**
   （`routing-suite`）；
4. 打开**技能** tab，确认 `$DSH_HOME/skills`、`~/.agents/skills`、
   `~/.codex/skills` 和内置技能都能被发现。

公开包暂未签名：Windows SmartScreen、macOS Gatekeeper 首次运行可能需要手动确认。
Linux AppImage 可能需要执行权限（`chmod +x dsh-desktop-*.AppImage`）。

### 从源码构建

#### 快速开始（开发）

前置：Node.js ≥ 22.19，pnpm ≥ 11。

```bash
cd app
pnpm install          # 首次会下载 Electron + DSH 运行时闭包
pnpm prepare:runtime  # 物化离线运行时闭包（.runtime/）
pnpm dev              # 构建壳并启动 Electron
```

`pnpm dev` 会：
1. 用内置运行时拉起 `dsh web --port 0`（数据目录 `~/.dsh`，与 CLI 共享）；
2. 物化 `routing-suite` Agent preset，并把精选插件 seat 进 `web` profile；
3. 激活极简灰度 + 玻璃工作台表面；
4. 打开无边框窗口加载官方 Web UI，并从用户技能目录发现已配置 Skills。

#### 构建并验证安装器

维护者在 `app/` 目录执行：

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm verify:runtime
pnpm build
pnpm dist
```

`pnpm dist` 是正式打包流程：先物化并验证运行时闭包，再调用 electron-builder。
运行时不完整时会直接失败，不会生成看似成功但无法启动的安装包。请在目标系统
上打包；electron-builder 不会把 Windows 构建变成有效的 macOS/Linux 包。

原生目标如下：

| 平台 | 安装包 |
|---|---|
| Windows x64 | NSIS `.exe` 安装器 |
| macOS x64 / arm64 | `.dmg` 安装器或 `.zip` 压缩包 |
| Linux x64 | `.AppImage` 或 `.deb` 安装包 |

说明：
- 每个 Release 都必须包含 Electron、锁定版本的 DSH 运行时、精选插件、默认极简灰度/玻璃工作台、智能路由和 Skills 查看器。发布前请执行[安装器发布检查表](docs/RELEASE-CHECKLIST.md)。
- 原生模块随包附平台 prebuild；`node-pty` 使用 N-API（ABI 稳定），无需 Electron ABI 重建。
- 签名暂未启用，待 CI 配置各平台签名凭据后再开启。

推送与 `app/package.json` 版本一致的语义化标签（例如版本为 `0.1.4` 时使用
`v0.1.4`），跨平台 Release 工作流会自动构建并上传 Windows、macOS Intel/Apple
Silicon、Linux x64 安装包。不要创建与 `app/package.json` 不一致的标签。

## 故障排查

- **窗口启动但模型没有响应：** 在 DSH 中配置 Provider、模型和凭据；本仓库绝不携带用户凭据。
- **升级后看不到新插件或 preset：** 退出所有 DSH Desktop/DSH web 进程后重新启动；首次启动可能自动重启运行时一次以载入 profile bundles。
- **Skills 缺失：** 确认每个技能目录都有 `SKILL.md`，且位于契约中列出的目录；私有技能正文必须留在本机。
- **源码无法构建：** 使用 Node.js ≥ 22.19、pnpm ≥ 11，从 `app/` 执行命令；复现 CI 时使用 `pnpm install --frozen-lockfile`。

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
├─ docs/                  架构、设计与 Skills 契约文档
└─ .github/               CI 与 issue/PR 模板
```

## 工作原理

桌面端从不 import DSH 内部代码。它：

1. 解析 DSH CLI（优先内置闭包）；
2. 拉起 `dsh web --port 0` 并解析 readiness 行；
3. 物化可选择的 `routing-suite` preset，seat fork 插件并把包名追加进 `dsh.profile.bundles`；
4. 在无边框 `BrowserWindow` 中加载官方 Web UI，由客户端插件提供灰度/玻璃表面和 Skills 查看器。

详见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 参与贡献

欢迎贡献！详见 [CONTRIBUTING.md](CONTRIBUTING.md)，并请遵守[行为准则](CODE_OF_CONDUCT.md)。

## 安全

发现漏洞？请参阅 [SECURITY.md](SECURITY.md)。

## 许可证

[MIT](LICENSE) © 2026 DSH Desktop contributors。

> `app/plugins/fork/` 下的 fork 插件保留各自上游许可证（MIT / Apache-2.0）；详见各包内文件。
