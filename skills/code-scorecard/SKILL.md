---
name: code-scorecard
description: "Use this skill to perform a strict, evidence-based audit of a codebase across nine quality dimensions (architecture, code quality, testing, security, error handling, documentation, dependencies, performance, maintainability). Triggers include manual requests for a code scorecard or audit, and reviews after a major code update, refactor, or release."
---

# Code Scorecard Skill

## Overview

You are auditing a codebase. Score it against the following 9 dimensions on a 0-10 scale. Use the anchors below for every dimension. Be strict. This is a real audit, not a pep talk.

**Announce at start:** "I'm using the code-scorecard skill to perform a strict 9-dimension audit."

---

## When to Use This Skill

✅ Manual request for a codebase audit, scorecard, or quality review
✅ After a major code update, refactor, large feature merge, or release
✅ Pre-handover or pre-acquisition due-diligence reviews
✅ Periodic health checks on a long-lived codebase
❌ Narrowly scoped reviews (use security-audit, root-cause, or code-map instead)
❌ Implementation work — this skill produces a scorecard, not fixes

---

## Dimensions

### 1. Architecture & SOLID
Layering, boundaries, interface use, dependency inversion, single responsibility. God classes and direct static dependencies are penalized.

### 2. Code Quality
Method length, magic values, dead code, duplication, naming, nullability discipline, anti-patterns.

### 3. Testing
Test coverage and quality. Empty stub files, brittle tests, and zero-test projects are penalized. Integration coverage counts.

### 4. Security
Secret management, authentication, authorization, input validation, CSRF protection, dependency CVEs, error message leakage.

### 5. Error Handling
Exception strategy, logging, observability. Empty catches, swallowed exceptions, and stack-trace destruction (e.g. `throw ex`) are penalized.

### 6. Documentation
README, inline docs where they add value, architecture docs, AI/onboarding instructions, intent in code reviews. Stale docs are penalized.

### 7. Dependency Management
Currency of packages, central management, version consistency, transitive risk. Outdated or mixed framework targets are penalized.

### 8. Performance & Async
Async usage where I/O is involved, query efficiency, caching, pagination, N+1 awareness. Synchronous I/O on hot paths is penalized.

### 9. Maintainability
Consistency of patterns, predictability, readability for someone joining the codebase cold, ease of safely changing things.

---

## Scoring Anchors

Apply to every dimension:

| Score | Meaning |
|-------|---------|
| 10 | Best-in-class. Industry exemplar. No meaningful gaps. |
| 8  | Strong. Minor gaps, no systemic issues. |
| 6  | Adequate. Inconsistent in places but functional. |
| 4  | Weak. Real problems that will compound under change. |
| 2  | Poor. Will block scaling, onboarding, or safe modification. |
| 0  | Absent or actively harmful. |

---

## Not-Applicable Handling

If a dimension genuinely does not apply (e.g. frontend concerns on a backend library), score it **N/A** and exclude from the overall. Do not score generously to compensate for missing concerns.

---

## Output Format

Return exactly this, in this order:

### 1. Scorecard Table

Markdown table with columns: **Dimension**, **Score**, **Evidence**.
Evidence is one sentence with a concrete artifact (file, pattern, count).

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Architecture & SOLID | | |
| Code Quality | | |
| Testing | | |
| Security | | |
| Error Handling | | |
| Documentation | | |
| Dependency Management | | |
| Performance & Async | | |
| Maintainability | | |
| **Overall** | | Unweighted mean of applicable scores, one decimal |

### 2. Top 3 Issues

Highest-impact problems to fix first. For each:
- What it is
- Where (file/pattern/count)
- Why it matters

---

## Rules

- **Be strict.** Use the anchors literally. A 6 means "adequate but inconsistent," not "pretty good."
- **Cite evidence.** Every score must reference a concrete artifact — a file path, a pattern, a count, a specific anti-pattern observed.
- **Do not pad.** Do not soften. If the codebase is bad, say so with evidence. If it's good, say so with evidence.
- **N/A is a real option.** Do not invent applicability. Do not raise other scores to compensate.
- **One decimal on the overall.** Unweighted mean of applicable dimensions only.
- **After presenting the scorecard, ask what to investigate or fix next.** Do NOT begin implementing fixes unless asked.
