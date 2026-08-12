# AI Tools

A comprehensive collection of AI-powered development and content-writing skills, commands, and standards.

## Overview

This repository contains:

- **Skills** – Reusable AI prompts and workflows for development and content-writing tasks
- **Commands** – Specialized procedures for specific problem domains
- **Agentic Coding Standards** – A complete framework for maintaining quality and consistency when working with AI-assisted development

## Installation

This repo is a [Claude Code plugin marketplace](https://docs.claude.com/en/docs/claude-code/plugins). Install everything as a single bundled plugin:

```bash
/plugin marketplace add sean-m-cooper/ai_tools
/plugin install ai-tools@ai-tools
/reload-plugins
```

The first command registers the marketplace; the second installs the `ai-tools` plugin (all skills and commands); `/reload-plugins` applies it to the current session. Once installed, skills are invoked with the plugin namespace, e.g. `/ai-tools:code-scorecard`. Run `/plugin update ai-tools` to pull the latest version.

## Skills

Each skill is a focused, well-structured prompt designed to guide AI agents (like GitHub Copilot CLI or Claude) through a specific development or writing task.

### Available Skills

| Skill | Purpose |
|-------|---------|
| **[audit-writing-architecture](skills/audit-writing-architecture/)** | Diagnose technical and professional nonfiction using SOLID, DRY, YAGNI, paragraph contracts, and refactoring practices |
| **[author-style-guide](skills/author-style-guide/)** | Analyze writing samples, interview the author, and create a reusable guide covering core voice rules, audience and channel registers, and positioning |
| **[code-map](skills/code-map/)** | Generate AI-optimized YAML code maps (`.codemap.yaml`) that help AI agents quickly understand repository structure and navigate codebases efficiently |
| **[code-scorecard](skills/code-scorecard/)** | Audit a codebase across nine quality dimensions on a 0–10 scale, using deterministic metrics from the `CodeMetrics.AI` tool as evidence; supports `--verbose`, `--stats`, and `--explain` output modes |
| **[content-voice-audit](skills/content-voice-audit/)** | Run a read-only editorial audit for AI-sounding cadence, weak evidence, formulaic phrasing, and thin structure |
| **[content-voice-revision](skills/content-voice-revision/)** | Revise selected long-form content from audit findings while preserving the author's voice and requiring real evidence |
| **[feature-writer](skills/feature-writer/)** | Write comprehensive feature implementations with proper architecture, testing, and documentation |
| **[root-cause](skills/root-cause/)** | Systematically analyze bugs, failures, and unexpected behavior to identify root causes through structured investigation of code, data, dependencies, and logs |
| **[story-writer](skills/story-writer/)** | Create well-structured user stories and tasks with clear acceptance criteria and technical requirements |
| **[story-splitter](skills/story-splitter/)** | Break down complex stories and epics into smaller, manageable tasks |
| **[security-audit](skills/security-audit/)** | Perform an adversarial security audit covering frontend, backend, auth, database, infrastructure, and third-party integrations with threat modeling and structured findings |
| **[story-prefinement](skills/story-prefinement/)** | Review and score stories for quality and readiness before sprint planning |

Each skill directory contains a `SKILL.md` file with:

- Purpose and use cases
- Detailed workflows
- Examples and best practices
- Integration guidance

For scorecard output flags, scoring paths, formulas, and `--stats` examples, see [Code Scorecard](docs/code-scorecard.md).

## Content Writing Workflow

The four content-writing skills work as a sequence, but each can also be used independently.

### 1. Build The Author Guide

Use [`author-style-guide`](skills/author-style-guide/) to analyze real writing samples and interview the author about core voice rules, audience registers, channel behavior, positioning, anti-patterns, and editing preferences.

```text
/ai-tools:author-style-guide Analyze the writing in ./samples, interview me about the patterns you find, and create author-style-guide.md.
```

Provide several representative samples when possible, including different audiences or channels the guide must support. The skill distinguishes observed patterns from author-confirmed rules and creates `author-style-guide.md` in the repository root by default. It does not revise the source samples.

### 2. Audit Existing Content

Use [`content-voice-audit`](skills/content-voice-audit/) for a read-only editorial assessment of Markdown content.

```text
/ai-tools:content-voice-audit Audit the posts in ./content and ./drafts using author-style-guide.md.
```

The audit checks cadence, evidence, specificity, structure, and formula-pattern signals. It writes:

- `content-voice-audit.html` – interactive report.
- `content-voice-audit-data.js` – structured report data and previous-score history.

The bundled generator discovers common content directories automatically. For explicit inputs or a separate report location, run:

```text
node "<skill-directory>/scripts/generate-content-audit.js" --content content --content drafts --output-dir reports
```

Repeat `--content` for additional Markdown files or directories. The generator searches directories recursively for `.md` and `.mdx` files.

### 3. Audit The Writing Architecture

Use [`audit-writing-architecture`](skills/audit-writing-architecture/) for a read-only structural review of a complete article, essay, white paper, newsletter, or documentation set.

```text
/ai-tools:audit-writing-architecture Review ./content/architecture-lessons.md and identify its highest-impact structural improvements.
```

The audit maps component responsibilities and reader contracts, then applies SOLID, DRY, YAGNI, and refactoring diagnostics. It prioritizes reader consequences and recommends the smallest useful refactor without forcing one finding per principle or treating shorter as automatically better.

### 4. Revise Selected Pieces

Use [`content-voice-revision`](skills/content-voice-revision/) with a named scope and the latest audit findings.

```text
/ai-tools:content-voice-revision Revise ./content/deployment-lessons.md using author-style-guide.md and the latest content voice audit.
```

The skill preserves the author's confirmed voice and positioning. It can directly fix expression problems such as repetition, cadence, and structure. When an argument needs an anecdote, measurement, source, or business claim, it asks the author instead of inventing evidence.

### 5. Re-run The Audits

Run `content-voice-audit` and `audit-writing-architecture` again after revision. Treat the voice-audit score as a diagnostic signal, not proof of writing quality, and verify that the architectural findings were resolved without breaking neighboring reader contracts. Review the revised piece against the author guide and the human argument before accepting it.

### Boundaries

- `author-style-guide` creates or updates the guide; it does not rewrite source content.
- `audit-writing-architecture` remains read-only unless revision is explicitly requested.
- `content-voice-audit` does not edit source content, but it does create report files.
- `content-voice-revision` changes only the pieces explicitly placed in scope.
- None of the skills may invent anecdotes, measurements, sources, customer claims, product positioning, or outcomes.

## Commands

Specialized procedures for solving specific problem domains or handling complex scenarios.

| Command | Purpose |
|---------|---------|
| **[root-cause](commands/root-cause.md)** | Systematic approach to identifying and analyzing root causes of defects and system failures |

## Agentic Coding Standards

The `agentic_coding_standards_example/` directory contains a comprehensive framework for maintaining code quality and consistency when working with AI-assisted development.

Start with `agentic_coding_standards_example/ai/agentic_standards.md`, then load the modules that match the work being done. See [Agentic Coding Standards](docs/agentic-standards.md) for the module index and usage guidance.

## Getting Started

### For AI Agents

1. **Review the Standards** – Load the root `agentic_standards.md` and relevant module files
2. **Select a Skill** – Choose the appropriate skill for your task
3. **Follow the Workflow** – Execute the skill's step-by-step process
4. **Cite Standards** – Reference specific standards when making architecture or design decisions
5. **Apply Quality Gates** – Use the PR Checklist before considering work complete

### For Teams

1. **Onboard with Standards** – Ensure all contributors (human and AI) understand the core principles
2. **Customize as Needed** – Adapt modules to your team's specific requirements
3. **Maintain Living Documentation** – Keep standards synchronized with evolving practices
4. **Review with Standards in Mind** – Use standards modules as a code review checklist

## Repository Structure

```
ai_tools/
├── skills/                              # Reusable AI development workflows
│   ├── audit-writing-architecture/       # SOLID-based nonfiction architecture audit
│   ├── author-style-guide/              # Personalized author voice guidance
│   ├── code-map/                        # AI-optimized codebase mapping
│   ├── code-scorecard/                  # 9-dimension codebase quality audit
│   ├── content-voice-audit/             # Read-only editorial quality audit
│   ├── content-voice-revision/          # Evidence-backed content revision
│   ├── feature-writer/                  # Feature implementation guidance
│   ├── root-cause/                      # Root cause analysis
│   ├── security-audit/                  # Adversarial security audit workflow
│   ├── story-prefinement/               # Story quality review
│   ├── story-splitter/                  # Task breakdown
│   └── story-writer/                    # Story creation
├── commands/                            # Specialized procedures
│   └── root-cause.md                    # Root cause analysis workflow
├── docs/                                # Human-facing documentation
│   ├── agentic-standards.md             # Standards module guide
│   └── code-scorecard.md                # Scorecard scoring and output guide
├── agentic_coding_standards_example/    # Complete standards framework
│   └── ai/                              # Detailed standard modules
│       ├── agentic_standards.md         # Root document (start here)
│       ├── golden-rules.md              # Non-negotiable principles
│       ├── agentic-workflow.md          # AI-human collaboration patterns
│       ├── architecture.md              # System design principles
│       ├── csharp-conventions.md        # C# idioms and naming
│       ├── api-controllers.md           # REST endpoint design
│       ├── efcore-data-access.md        # Data layer patterns
│       ├── testing-standards.md         # Testing approach
│       ├── security-standards.md        # Security practices
│       ├── error-logging-handling.md    # Exception and logging patterns
│       ├── database-conventions.md      # Schema design
│       ├── git-commits.md               # Git workflow
│       ├── pr-checklist.md              # Code review validation
│       └── [other modules...]           # Additional standards
├── LICENSE                              # CC BY 4.0
└── README.md                            # This file
```

## License

This repository is licensed under the **Creative Commons Attribution 4.0 International (CC BY 4.0)** license.

You are free to:
- ✅ Share, copy, and redistribute the material
- ✅ Adapt, remix, transform, and build upon the material
- ✅ Use commercially

**Under the condition of:**
- 📝 Attribution – Provide appropriate credit and link to the license

See [LICENSE](LICENSE) for full details.

## Contributing

Contributions that improve skills, commands, and standards are welcome. When contributing:

1. Follow the existing structure and format
2. Include clear examples and use cases
3. Test with real AI agents if modifying skills or commands
4. Update this README if adding new skills or commands
5. Ensure all standards modules maintain consistency with the core principles

## Support

For questions or issues:
- Review the relevant skill's `SKILL.md` file
- Check the applicable standards module(s)
- Refer to the example implementations in `agentic_coding_standards_example/`

---

**Last Updated:** July 2026

**Maintained by:** Sean Cooper
