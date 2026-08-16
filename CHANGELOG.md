# Changelog

本项目的所有重要变更都会记录在此文件中。格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.0] - 2026-08-16

### 新增

- Electron 桌面壳：内置 DeepSeek Harness 运行时，加载官方 `dsh web` UI，无需系统安装 dsh。
- 多插件离线预装机制（`pnpm deploy` hoisted 闭包 + `dsh.profile.bundles` seat），首次启动自动装载。
- 极简灰度皮肤 `dsh-skin-grayscale`：按感知亮度对全部 DSH 设计 token 去色，黑白灰极简视觉，含编辑器/终端深度灰度。
- 玻璃拟态主题 `dsh-client-ui-aqua`（fork 自 DSH-Transparent-UI-Plugin）：顶栏/侧边栏/输入框磨砂玻璃化。
- 技能查看插件 `dsh-see-skills`：`list_skills` 工具 + `/see-skills/skills` 路由 + 侧边栏「技能」tab。
- 精选 DSH 插件：modlens（视觉）、dsh-better-sidebar（侧边栏工作台）、task-board、git-graph、aionui 右面板、describe-image、skin-center。
- 无边框窗口 + 自定义标题栏（拖拽区 + 最小化/最大化/关闭按钮）。
- 单实例锁、退出时回收 dsh 子进程、`~/.dsh` 会话/凭据与官方 CLI 共享。

### 修复

- 皮肤生成器提取 CSS 时对转义双引号（`\"`）的处理，修复 client.js 语法错误导致的「Failed to load plugins」。
- 主进程「首启建 profile 后重启装载插件」的竞态（`proc.kill()` 触发 exit 处理器提前 reject）。

### 已知限制

- 官方 dsh-web-ui 聚合包内置的 `dsh-liangshen` 在 DSH rc.6 上原生崩溃，故改用精选子包直挂，并去掉 pet/remote-web-ui/ssh 等非必要包。
- Windows 打包未配置代码签名（`signAndEditExecutable: false`）；正式发布时需开启。
