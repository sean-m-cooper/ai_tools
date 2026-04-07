# AI Tools

A comprehensive collection of AI-powered development skills, commands, and standards for building high-quality software with AI assistance.

## Overview

This repository contains:

- **Skills** – Reusable AI prompts and workflows for common development tasks
- **Commands** – Specialized procedures for specific problem domains
- **Agentic Coding Standards** – A complete framework for maintaining quality and consistency when working with AI-assisted development

## Skills

Each skill is a focused, well-structured prompt designed to guide AI agents (like GitHub Copilot CLI or Claude) through a specific development task.

### Available Skills

| Skill | Purpose |
|-------|---------|
| **[code-map](skills/code-map/)** | Generate AI-optimized YAML code maps (`.codemap.yaml`) that help AI agents quickly understand repository structure and navigate codebases efficiently |
| **[feature-writer](skills/feature-writer/)** | Write comprehensive feature implementations with proper architecture, testing, and documentation |
| **[root-cause](skills/root-cause/)** | Systematically analyze bugs, failures, and unexpected behavior to identify root causes through structured investigation of code, data, dependencies, and logs |
| **[story-writer](skills/story-writer/)** | Create well-structured user stories and tasks with clear acceptance criteria and technical requirements |
| **[story-splitter](skills/story-splitter/)** | Break down complex stories and epics into smaller, manageable tasks |
| **[story-prefinement](skills/story-prefinement/)** | Review and score stories for quality and readiness before sprint planning |

Each skill directory contains a `SKILL.md` file with:
- Purpose and use cases
- Detailed workflows
- Examples and best practices
- Integration guidance

## Commands

Specialized procedures for solving specific problem domains or handling complex scenarios.

| Command | Purpose |
|---------|---------|
| **[root-cause](commands/root-cause.md)** | Systematic approach to identifying and analyzing root causes of defects and system failures |

## Agentic Coding Standards

The `agentic_coding_standards_example/` directory contains a comprehensive framework for maintaining code quality and consistency when working with AI-assisted development.

### Key Modules

- **Golden Rules** – Non-negotiable principles that apply to all code changes
- **Agentic Workflow** – Best practices for AI-human collaboration in development
- **Architecture** – Design principles and dependency management (Presentation → Application → Domain)
- **C# Conventions** – Naming, formatting, and idiom standards for C# code
- **API Controllers** – REST endpoint design and documentation
- **EF Core & Data Access** – Entity modeling, repositories, and query optimization
- **Testing** – Unit, integration, and end-to-end testing standards
- **Performance** – Optimization techniques and profiling guidelines
- **Error Handling & Logging** – Exception management and observability
- **Database Conventions** – Schema design, audit columns, soft-delete patterns
- **Security** – Authentication, authorization, secrets, input validation
- **CI/CD & DevOps** – Build pipelines and deployment automation
- **Git & Commits** – Branching strategies and commit message standards
- **PR Checklist** – Code review preparation and validation

### Using the Standards

1. Load `agentic_standards.md` – the root document
2. Load additional modules based on your work (e.g., `csharp-conventions.md` + `api-controllers.md` for building an API endpoint)
3. Apply the standards throughout development
4. Cite specific standards when making non-obvious decisions

**Developer Neutrality** – These standards apply equally to all developers, human or AI. AI-generated code is treated as first-class code, not drafts.

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
│   ├── code-map/                        # AI-optimized codebase mapping
│   ├── feature-writer/                  # Feature implementation guidance
│   ├── root-cause/                      # Root cause analysis
│   ├── story-prefinement/               # Story quality review
│   ├── story-splitter/                  # Task breakdown
│   └── story-writer/                    # Story creation
├── commands/                            # Specialized procedures
│   └── root-cause.md                    # Root cause analysis workflow
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

**Last Updated:** April 2026  
**Maintained by:** Sean Cooper
