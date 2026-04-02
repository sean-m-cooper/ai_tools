# Agentic Coding Standards — Sample

This directory contains a **sample agentic coding standards system** designed for AI-assisted development with tools like Claude Code, GitHub Copilot, and similar agents.

**These files are not ready to use as-is.** They are a starting point — every organisation has a different tech stack, naming conventions, and workflow. The value is in the structure: a root document that is always loaded, modular standards files that are loaded contextually, and a separation between rules (cheap to load) and code examples (loaded on demand).

Fork this, replace the example content with your actual standards, and commit it to your repo's equivalent of `.github/` or a dedicated standards directory.

---

## Structure

```
agentic_coding_standards_example/
├── README.md
└── ai/
    ├── agentic_standards.md          ← Root document (always loaded)
    ├── claude/
    │   └── claude.md                 ← Claude Code agent instructions
    ├── copilot/
    │   └── copilot-instructions.md   ← GitHub Copilot instructions
    └── standards/
        ├── golden-rules.md           ← Always loaded
        ├── agentic-workflow.md       ← Always loaded
        ├── architecture.md
        ├── api-controllers.md
        ├── CICD & DevOps.md
        ├── commenting-documentation.md
        ├── csharp-conventions.md
        ├── database-conventions.md
        ├── dto-mapping.md
        ├── efcore-data-access.md
        ├── error-logging-handling.md
        ├── git-commits.md
        ├── performance.md
        ├── pr-checklist.md
        ├── reference-implementation.md
        ├── security-standards.md
        ├── testing-standards.md
        └── examples/
            └── orders-reference.cs   ← Code examples (loaded on demand)
```

---

## How It Works

Agents always load the root document (`agentic_standards.md`) plus the two always-loaded modules. Additional modules are loaded only when relevant to the current task — an agent working on a database query loads `efcore-data-access.md`; one building a new endpoint loads `reference-implementation.md`.

Code examples are kept in `standards/examples/` and are only fetched when an agent needs to see concrete code, not rules. This keeps the per-session token cost low.

---

## Context Window Impact

Token estimates use the `chars / 4` approximation. Actual counts vary slightly by tokenizer.

### Always loaded (every session)

| File | ~Tokens | Purpose |
|---|---|---|
| `agentic_standards.md` | 1,147 | Root index — module table, core principles, AI usage rules |
| `standards/golden-rules.md` | 1,221 | Non-negotiable behaviours for every AI session |
| `standards/agentic-workflow.md` | 981 | Planning, task management, and verification workflow |
| **Baseline total** | **3,349** | |

### Loaded contextually (by task type)

| File | ~Tokens | Load when |
|---|---|---|
| `standards/error-logging-handling.md` | 1,223 | Writing error handling, catch blocks, or logging |
| `standards/dto-mapping.md` | 1,211 | Creating DTOs, request/response objects, or mapping logic |
| `standards/security-standards.md` | 1,136 | Auth, secrets, input validation, CORS |
| `standards/database-conventions.md` | 868 | Schema, naming, audit columns, soft-delete |
| `standards/reference-implementation.md` | 828 | Building a new feature end-to-end |
| `standards/architecture.md` | 757 | Tech stack decisions, design principles, deviations |
| `standards/git-commits.md` | 707 | Branching, committing, Git workflow |
| `standards/pr-checklist.md` | 637 | Preparing or reviewing a pull request |
| `standards/efcore-data-access.md` | 251 | Entity, repository, or query work |
| `standards/csharp-conventions.md` | 206 | Any C# code changes |
| `standards/commenting-documentation.md` | 90 | Adding docs or inline comments |
| `standards/api-controllers.md` | 85 | Controller or endpoint work |
| `standards/CICD & DevOps.md` | 328 | Build pipelines or deployment scripts |
| `standards/performance.md` | 330 | Performance-critical code |
| `standards/testing-standards.md` | 361 | Writing or modifying tests |

### On demand (fetched only when building a new feature)

| File | ~Tokens | Purpose |
|---|---|---|
| `standards/examples/orders-reference.cs` | 3,408 | Canonical vertical slice code — all 7 layers |

### Typical session budgets

| Session type | Files loaded | ~Total tokens |
|---|---|---|
| Quick bug fix | Baseline + error-handling + csharp | ~4,778 |
| New API endpoint | Baseline + reference-impl + api-controllers + dto-mapping | ~5,620 |
| New endpoint (with code examples) | Above + orders-reference.cs | ~9,028 |
| Full feature (all relevant modules) | Baseline + 5–6 modules | ~8,000–10,000 |

---

## Adapting to Your Repo

1. **Replace the tech stack** — `architecture.md` lists .NET, EF Core, AWS Lambda. Update this to match your actual stack.
2. **Replace the example domain** — all code samples use an `Order`/`Account` domain. Swap in your own domain types when you rewrite the examples.
3. **Update the module table** — `agentic_standards.md` lists every module with its load condition. Add, remove, or rename modules to match what you actually have.
4. **Add an approved packages list** — `standards/approved-packages.md` is referenced in the PR checklist but not included here. Create one listing your approved NuGet packages, linters, and test frameworks.
5. **Keep rules cheap, code expensive** — the pattern that makes this work is storing all rules as prose/tables (low token cost) and moving code examples to `.cs` files in `standards/examples/` that are only fetched when needed. Maintain that separation as you add new modules.
6. **Version it with your codebase** — these files should live in the same repo as your code so that standards and implementation stay in sync. Changes to standards go through the same PR review as code changes.
