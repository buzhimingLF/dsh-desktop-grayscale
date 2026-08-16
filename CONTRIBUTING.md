# Contributing to DSH Desktop

感谢你的兴趣！欢迎通过 issue、PR、文档改进等任何形式参与贡献。

## 环境要求

- Node.js ≥ 22.19
- pnpm ≥ 11

## 本地开发

```bash
git clone <repo-url>
cd dsh-desktop/app
pnpm install
pnpm prepare:runtime   # 物化离线运行时闭包
pnpm dev               # 构建壳并启动
```

常用脚本：

| 命令 | 说明 |
|---|---|
| `pnpm build` | esbuild 构建主进程/preload 到 `.build/` |
| `pnpm typecheck` | `tsc --noEmit` 类型检查 |
| `pnpm verify:runtime` | 确认发布前运行时闭包完整 |
| `pnpm dev` | 构建并启动 Electron |
| `pnpm prepare:runtime` | `pnpm deploy` 物化运行时闭包到 `.runtime/` |
| `pnpm generate:skin` | 重新生成极简灰度皮肤 |
| `pnpm pack:dir` / `pnpm dist` | 打包（目录包 / 当前平台安装器） |

## 验证脚本

`app/scripts/` 下有几个集成验证脚本（都依赖已 `prepare:runtime` 的闭包）：

- `bisect-plugins.mjs` —— 逐个 seat 插件并 boot，定位崩溃插件；
- `verify-see-skills.mjs` —— 验证 `/see-skills/skills` 返回结构化 JSON；
- `integration-seat-test.mjs` —— 全量 seat + boot 冒烟。

## 发布

推送 `vX.Y.Z` 标签会触发 `.github/workflows/release.yml`，在 Windows、macOS、Linux 原生 runner 上构建并把安装包上传到 GitHub Release。公开构建暂未配置代码签名。

## 提交规范

- 一个 PR 只做一件事；标题简洁、描述清楚动机与改动。
- 遵循现有代码风格（2 空格缩进、单引号、分号）。
- 改动涉及运行时行为时，请附上验证结果（`pnpm typecheck`、`pnpm build`，以及相关脚本输出）。
- **不要提交任何密钥/凭据**：`.env`、`*.key`、`settings.yaml`、`.credentials*` 等已在 `.gitignore` 中排除；如发现泄漏请立即通过 [SECURITY.md](SECURITY.md) 报告。

## PR 流程

1. fork 本仓库并新建分支；
2. 开发 + 本地验证；
3. 提交 PR，填写模板，说明「做了什么 / 为什么 / 如何验证」；
4. 维护者 review 后合并。

再次感谢你的贡献！🎉
