# PR Checklist

> **Load when:** Preparing a pull request or reviewing one

This checklist applies to both human and AI-authored pull requests. Complete all items before requesting review.

---

## Before Opening the PR

### Build & Tests

- [ ] `dotnet build -warnaserror` passes with zero warnings
- [ ] `dotnet test` passes — all existing tests green
- [ ] New or modified behavior has corresponding unit tests
- [ ] Locally launched all affected services via `scripts/run-all.ps1` for manual validation

### Code Quality

- [ ] Run the code-review agent on your changes before requesting human review
- [ ] No `TODO` or `HACK` comments left without a linked ticket
- [ ] No commented-out code committed
- [ ] No secrets, tokens, or credentials in code or config files

### Standards Compliance

- [ ] Loaded and applied relevant [standards modules](../agentic-coding-standards.md#standards-modules)
- [ ] DTOs are `sealed record` with `required` where appropriate
- [ ] Async/await end-to-end with `CancellationToken` propagated
- [ ] Primary constructors used for services, repositories, controllers
- [ ] `AsNoTracking()` on read queries
- [ ] Structured logging with message templates (no string interpolation)
- [ ] Error handling follows [error-handling-logging](error-handling-logging.md) patterns

### Git Hygiene

- [ ] Branch name matches ruleset pattern: `(epic|feature|story|release|task|bug|poc)/<alphanumeric-with-hyphens>` — see [Git & Commits](git-commits.md#branch-naming)
- [ ] Commits use Conventional Commits format: `type(scope): description [TICKET#]`
- [ ] No merge commits — rebase onto target branch if needed
- [ ] PR opened as **draft** until this checklist is complete
- [ ] Mark PR as **ready** only after all checks pass — this triggers the GitHub Copilot PR review

---

## PR Description

Every PR description should include:

1. **What** — Brief summary of the change
2. **Why** — Link to Jira ticket or explain the motivation
3. **How** — Key implementation decisions (especially non-obvious ones)
4. **Testing** — How the change was verified (unit tests, manual testing, both)

---

## Reviewer Checklist

When reviewing a PR, verify:

- [ ] Change matches the linked ticket's acceptance criteria
- [ ] No standards violations — cite the specific standard when flagging
- [ ] No N+1 query patterns, unhandled error paths, or missing `AsNoTracking()`
- [ ] New dependencies are on the [approved packages](approved-packages.md) list