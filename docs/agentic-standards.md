# Agentic Coding Standards

The `agentic_coding_standards_example/` directory contains a framework for maintaining quality and consistency when working with AI-assisted development.

## Key Modules

- **Golden Rules**: non-negotiable principles that apply to all code changes.
- **Agentic Workflow**: best practices for AI-human collaboration in development.
- **Architecture**: design principles and dependency management (`Presentation -> Application -> Domain`).
- **C# Conventions**: naming, formatting, and idiom standards for C# code.
- **API Controllers**: REST endpoint design and documentation.
- **EF Core & Data Access**: entity modeling, repositories, and query optimization.
- **Testing**: unit, integration, and end-to-end testing standards.
- **Performance**: optimization techniques and profiling guidelines.
- **Error Handling & Logging**: exception management and observability.
- **Database Conventions**: schema design, audit columns, and soft-delete patterns.
- **Security**: authentication, authorization, secrets, and input validation.
- **CI/CD & DevOps**: build pipelines and deployment automation.
- **Git & Commits**: branching strategies and commit message standards.
- **PR Checklist**: code review preparation and validation.

## Using the Standards

1. Load `agentic_coding_standards_example/ai/agentic_standards.md` first.
2. Load additional modules based on your work, such as `csharp-conventions.md` and `api-controllers.md` when building an API endpoint.
3. Apply the standards throughout development.
4. Cite specific standards when making non-obvious architecture, testing, or implementation decisions.

## Developer Neutrality

These standards apply equally to all developers, human or AI. AI-generated code is treated as first-class code, not drafts.
