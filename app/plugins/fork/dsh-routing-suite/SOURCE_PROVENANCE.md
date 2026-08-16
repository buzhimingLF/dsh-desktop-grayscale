# Source provenance

`dsh-routing-suite` is an independent MIT task-routing implementation. Its Host and Client runtime source does not contain copied Injector code or copied Router implementation. To provide a real selectable mode with Standard capability, the package includes the official DeepSeek Harness Standard Agent preset composition under its MIT license.

## Projects reviewed during product research

| Project | Repository | Reviewed revision | Use in the current package |
| --- | --- | --- | --- |
| dsh-routing-suite | https://github.com/yjh051108/dsh-routing-suite | `063d76c3d722c1d9ab0c8d612a524354403597f6` | Product research and source attribution only |
| dsh-super-injector | https://github.com/yjh051108/dsh-super-injector | `6485544083b152374ed3624ec557b27edb99d8e4` | Its runtime injection/management implementation was removed; no source is distributed |
| dsh-router-standard | https://github.com/yjh051108/dsh-router-standard | `43c08eaef075ed2fe120f0d9bff011e962196cb9` | Inspired the high-level distinction between inspect-first and direct work; its Router implementation and preset composition are not distributed |
| DeepSeek Harness | https://github.com/deepseek-ai/DeepSeek-Harness | `47f943859bef60e4160492346772ded9b24f765a` | Public plugin APIs plus the MIT-licensed Standard Agent preset composition used by `preset/routing-suite` |

## Independent implementation boundary

The shipped implementation is limited to:

- a dependency-free first-task text classifier;
- a non-destructive `system-prompt/assemble` hook active only for the `routing-suite` preset;
- a read-only status endpoint;
- a localized read-only settings section;
- a Standard-capability Agent preset composition and localized metadata;
- standard npm/DSH build metadata and tests.

It contains no injector registry, junction handling, hot reload, self-healing, scaffolding, release automation, dynamic code execution, lifecycle installer, tool filtering, direct LLM calls, or filesystem/process APIs. Preset materialization is performed explicitly by a compatible desktop installer, not by npm lifecycle code.

Published artifacts must be generated from this repository and pass the exact tarball allowlist in `scripts/verify-package.mjs`.
