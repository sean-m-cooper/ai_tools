# Agentic Coding Standards

## Purpose

This document defines the **company-wide standards for AI-assisted (agentic) software development**. These standards apply **regardless of tooling** (GitHub Copilot, Claude Code, future agents) and are mandatory for all repositories, contributors, and contractors.

Any AI system used to generate, modify, or review code **must comply with this document**. Human developers remain fully accountable for all output.

---

## Scope & Applicability

These standards apply to:

* Application repositories (.NET services, APIs, web apps)
* Data Access Layer (DAL) repositories
* AWS Lambda functions/Azure functions
* CI/CD and DevOps automation

They unify and supersede prior tool-specific instruction files.

---

## Core Principles (Non‑Negotiable)

1. **Developer Neutrality** – Standards apply equally to all developers, human & AI.
2. **Human Accountability** – AI output is treated as first‑class code, not drafts.
3. **Single Source of Truth** – This document is canonical; local copies may not diverge.
4. **Security & Correctness First** – Performance and elegance never justify unsafe code.
5. **Explain WHY, Not WHAT** – Code and comments must capture intent.
6. **Simplicity First** – Make every change as simple as possible. Impact minimal code.
7. **No Laziness** – Find root causes. No temporary fixes. Senior developer standards.
8. **Clean Architecture** – Dependencies point inward only (Presentation → Application → Domain). See [Architecture](standards/architecture.md).

---

## Standards Modules

Detailed standards are organized into focused modules. **Always load this root document.** Load additional modules based on what you are working on — multiple modules may be loaded simultaneously when work spans areas (e.g., C# Conventions + API Controllers when building a new endpoint).

| Module | Load when |
|---|---|
| [Golden Rules](standards/golden-rules.md) | **Always loaded** |
| [Agentic Workflow](standards/agentic-workflow.md) | **Always loaded** |
| [Architecture](standards/architecture.md) | Tech stack, design principles, deviations |
| [C# Conventions](standards/csharp-conventions.md) | Any C# code changes |
| [API Controllers](standards/api-controllers.md) | Controller or endpoint work |
| [EF Core & Data Access](standards/efcore-data-access.md) | Entity, repository, or query work |
| [Testing](standards/testing-standards.md) | Writing or modifying tests |
| [Performance](standards/performance.md) | Optimizing performance-critical code |
| [Commenting & Documentation](standards/commenting-documentation.md) | Adding docs or inline comments |
| [CI/CD & DevOps](standards/CICD%20&%20DevOps.md) | Build pipelines or deployment scripts |
| [Git & Commits](standards/git-commits.md) | Branching, committing, Git workflow |
| [Reference Implementation](standards/reference-implementation.md) | Building a new feature end-to-end |
| [Error Handling & Logging](standards/error-logging-handling.md) | Error handling, catch blocks, logging |
| [Database Conventions](standards/database-conventions.md) | Schema, naming, audit columns, soft-delete |
| [DTO & Mapping](standards/dto-mapping.md) | DTOs, requests, responses, mapping |
| [Security](standards/security-standards.md) | Auth, secrets, input validation, CORS |
| [PR Checklist](standards/pr-checklist.md) | Preparing or reviewing pull requests |

---

## AI Usage Rules (Critical)

### AI Session Acknowledgement (Required)

At the **start of every agentic coding session**, the AI system **must load** this document and the Golden Rules module.

**Contextual callouts (required when making standards-relevant decisions):**

Throughout the session, the AI **must cite the specific standard** it is applying when the decision is non-obvious. This proves the standards were *applied*, not just *read*.

Examples:

```
Per coding standards: using controller-based API with [ApiController], not Minimal API.
Per coding standards: parallelizing independent repo calls with Task.WhenAll.
Per coding standards: using primary constructor for service DI.
```

If an AI tool cannot load this document or produce contextual callouts, it **must not be used** for code generation in this repository.

---

## Versioning

* Canonical location: `.github-private/ai/agentic-coding-standards.md`
* Modules location: `.github-private/ai/standards/`
* Versioned via Git history
* Changes communicated org‑wide

---

**End of Agentic Coding Standards**