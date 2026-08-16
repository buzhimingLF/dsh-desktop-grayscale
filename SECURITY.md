# Security Policy

## 报告漏洞

我们非常重视安全问题。如果你在本项目中发现安全漏洞，请**不要**公开 issue 讨论，而是私下联系我们。

- 通过 GitHub 的「Report a vulnerability」（Security 标签页 → Report）提交；
- 或通过 issue 联系维护者，注明「SECURITY」，我们会尽快私下跟进。

请尽量包含：

- 受影响版本 / 组件；
- 复现步骤；
- 影响评估；
- 建议的修复方案（如有）。

## 我们的承诺

- 收到报告后 3 个工作日内确认；
- 保持修复前的信息保密；
- 修复发布后在 CHANGELOG 中致谢（除非你要求匿名）。

## 安全相关注意事项（本项目的设计约束）

- 桌面端只加载官方 `dsh web` 的本地 loopback origin；外部链接一律交给系统浏览器。
- 渲染进程开启 `contextIsolation` + `sandbox`，禁用 `nodeIntegration`。
- 凭据由 DSH 官方机制管理，本项目不接触、不存储任何 API key。
- 若发现「密钥/凭据被误提交」的情况，请立即报告，我们会第一时间处理。
