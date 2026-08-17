# Skills contract / 技能契约

DSH Desktop is not only a desktop window. It is a DSH Harness workbench that
discovers, presents, and makes configured agent skills available to the
official `dsh web` runtime. This document defines the public skill contract
used by the bundled `dsh-see-skills` plugin.

DSH Desktop 不只是一个桌面窗口，而是一套 DSH Harness 工作台：它发现、展示
并把用户配置的 Agent Skills 提供给官方 `dsh web` 运行时。本文件定义内置
`dsh-see-skills` 插件使用的公开技能契约。

## Discovery roots / 技能目录

At runtime, the host scans these directories when they exist:

运行时会按以下顺序扫描存在的目录：

| Root | Purpose |
|---|---|
| `$DSH_HOME/skills` | Skills owned by the DSH profile |
| `~/.agents/skills` | User-level agent skills |
| `~/.codex/skills` | Codex-compatible user-level skills |
| `DSH_BUNDLED_SKILL_DIR` | An optional deployment-specific skill root |
| bundled `modlens/skills` | The vendored modlens skill shipped with the app |

The host also accepts a `skillsDirs` array from the plugin configuration. This
allows an organization or a local workspace to add a controlled skill root
without changing the application or DSH source.

宿主也接受插件配置中的 `skillsDirs` 数组，因此组织或本地工作区可以添加受控
技能目录，而无需修改应用或 DSH 源码。

## File contract / 文件契约

Each skill is a directory containing a `SKILL.md` file:

每个技能是一个包含 `SKILL.md` 的目录：

```text
my-skill/
├─ SKILL.md                 # required / 必需
├─ references/              # optional reference material / 可选参考资料
├─ scripts/                 # optional executable helpers / 可选脚本
└─ assets/                  # optional local assets / 可选资源
```

The Markdown file may use YAML frontmatter. `name` and `description` are the
important fields because they drive discovery and activation:

Markdown 文件可以使用 YAML frontmatter。`name` 和 `description` 是最重要的
字段，它们用于发现和激活技能：

```markdown
---
name: repository-audit
description: Audit a repository for correctness, tests, and secrets before release.
---

## When to use

Use this skill before publishing a release or making a broad repository change.

## Procedure

1. Inspect the current worktree.
2. Run the project verification commands.
3. Scan for credentials and report remaining risks.
```

The viewer records the skill name, description, Markdown headings, available
references, available scripts, body length, and a bounded preview. It does not
execute scripts while building the inventory.

查看器会记录技能名称、描述、Markdown 标题、参考文件、脚本文件、正文长度和
有上限的预览；建立技能清单时不会执行脚本。

## Public surfaces / 公开入口

The bundled plugin exposes three compatible surfaces:

内置插件提供三个兼容入口：

| Surface | Contract |
|---|---|
| Model tool | `list_skills` returns structured skill evidence |
| HTTP route | `GET /see-skills/skills` returns the same inventory as JSON |
| Web UI | Better Sidebar `技能` tab renders the inventory |

The structured response follows the evidence-oriented shape used by modlens:
skills are represented as inspectable records instead of an opaque Markdown
blob. This keeps skill discovery useful to both the model and the user.

结构化响应沿用 modlens 的证据导向形式：技能被表示为可检查的记录，而不是一
整段无法检索的 Markdown，从而同时服务于模型和用户。

## Operating requirements / 运行要求

- A skill must be self-contained and explain its trigger conditions and limits.
- Scripts must be safe to run from the documented workspace and must not assume
  a secret is present in the repository.
- Skills should consume DSH's public plugin/tool boundary. They must not patch
  DSH source or silently remove tools and contexts.
- User-level skill directories are intentionally discovered at runtime; private
  skill files, API keys, credentials, and machine-specific settings do not
  belong in this public repository.
- Project-specific behavior belongs in versioned Markdown documentation and
  tests, not in hidden runtime mutations.

- 技能必须自包含，并明确触发条件和限制。
- 脚本必须能在文档规定的工作区内安全运行，不能假设仓库中存在密钥。
- 技能应消费 DSH 的公开插件/工具边界，不能修改 DSH 源码，也不能静默删除
  工具和上下文。
- 用户级技能目录在运行时发现；私有技能正文、API Key、凭据和机器专属设置
  不应提交到公开仓库。
- 项目特定行为应落在版本化 Markdown 文档和测试中，而不是隐藏的运行时修改。

## Relationship with the built-in modes / 与内置模式的关系

Skills are available to the selected DSH Agent preset. The default visual
experience is the minimal grayscale surface; the optional `routing-suite`
preset keeps the standard DSH tool and context set, then adds a small
inspect-first/direct-execution hint based on the first durable user task. The
routing plugin does not make an extra model request and does not replace the
Skills inventory.

Skills 会提供给当前选择的 DSH Agent preset。默认视觉体验是极简灰度工作台；
可选的 `routing-suite` preset 保留 DSH 标准工具和上下文，只根据首条真实任务
追加简短的“检查优先/直接执行”提示。路由插件不会增加额外模型请求，也不会
替代 Skills 清单。

