# Root Cause Analysis

Analyze the current problem systematically before any code is written. The goal is to understand the problem completely — not to fix it yet. This command produces a structured analysis that surfaces assumptions, evidence, gaps, and the simplest possible path forward.

**Do NOT write, edit, or suggest any code changes.** This is a thinking-only command.

## Process

1. **Read the conversation** — identify every symptom, error, and observation reported so far
2. **Read the code** — examine the relevant files, not just the ones mentioned. Follow the data flow upstream and downstream.
3. **Inspect the data** — look at the actual runtime values, not just the code that produces them. Read database rows, config files, environment variables, API responses, event payloads, and log output that are relevant to the problem. If data is not available (no logs, no DB access, can't reproduce), say so explicitly — missing data is a finding, not a skip.
4. **Map dependencies** — identify every external dependency involved in the problem area: third-party crates/packages (with versions), peer workspace crates and packages, system-level tools, APIs, services. Version mismatches, missing features, and undocumented behavior in dependencies are common root causes.
5. **Check git history** — run `git log` and `git diff` for recent changes in the affected area. Look for what changed and when.
6. **Check logs** — if runtime output or error logs are available, read them carefully. If logs are unavailable or incomplete, note what logging is missing and where it would help.
7. **Check memory** — look for prior sessions or known issues in the same area

---

## Sections to Produce

### 1. Problem Statement

State the problem in one sentence. Be precise — name the behavior, the context, and the expected vs actual outcome.

### 2. Assumptions

List every assumption currently being made — both explicit and implicit. For each:

| # | Assumption | Confidence | Basis |
|---|-----------|------------|-------|
| _n_ | _what we're assuming_ | _High / Medium / Low_ | _evidence or "unverified"_ |

Flag any assumption with Low confidence or "unverified" basis — these are the most likely sources of error.

### 3. Current Approaches

List every approach or fix that has been tried or proposed so far:

| # | Approach | Result | Still viable? |
|---|---------|--------|---------------|
| _n_ | _what was tried_ | _outcome or "untested"_ | _Yes / No / Unknown_ |

### 4. Data State

Describe the actual data at each stage of the problem. What values are present, what shape are they in, and where does the data diverge from expectations? Include:

- **Inputs** — what data enters the system (user input, config, DB rows, API responses)
- **Transformations** — how data changes as it flows through the code path
- **Outputs** — what the system produces vs what it should produce
- **Availability** — for each data point, note whether you observed it directly, inferred it from code, or couldn't access it at all

If data is only partially available (e.g., you can read the code but not the runtime values, or logs exist but don't cover the relevant path), state what you have and what you're missing. Partial data should lower your confidence in any conclusions that depend on it.

### 5. Dependency Map

List every external and internal dependency involved in the problem area:

| Dependency | Type | Version | Role in Problem | Status |
|-----------|------|---------|----------------|--------|
| _name_ | _third-party crate / npm package / workspace crate / workspace package / system tool / service_ | _version or "unknown"_ | _what it does in this context_ | _OK / Suspect / Unverified_ |

Check for:
- Version mismatches between what's declared and what's resolved
- Features flags that may or may not be enabled
- Peer workspace crates/packages that recently changed
- System-level dependencies and whether they're bundled or expected externally
- Services that must be running

Mark anything you can't verify as "Unverified" — an unverified dependency is a potential root cause.

### 6. Supporting Evidence

List every piece of concrete evidence gathered so far — error messages, log output, git blame results, code behavior, observed data values. For each:

- **What it says** — the literal observation
- **What it implies** — your interpretation
- **How certain** — could there be another explanation?

### 7. Missing Information

List what you don't know yet but need to know. For each gap:

- **What's missing** — the specific question
- **How to get it** — the command, file, or check that would answer it
- **Why it matters** — what it would confirm or rule out

This is the most important section. Problems stay unsolved because of what we haven't looked at, not what we have.

### 8. Root Cause Analysis

If enough evidence exists, state the most likely root cause(s). Rank by probability:

| # | Candidate Root Cause | Probability | Key Evidence |
|---|---------------------|------------|--------------|
| _n_ | _specific cause_ | _High / Medium / Low_ | _what points to this_ |

If there isn't enough evidence for a root cause, say so explicitly and point to the Missing Information section. State your overall confidence level and what's limiting it (missing data, unverified dependencies, inability to reproduce, etc.).

### 9. Simplest Solutions

For each candidate root cause, describe the **simplest possible fix** — the smallest change that would resolve the problem. Do not propose refactors, improvements, or preventive measures. Just the fix.

| Root Cause | Simplest Fix | Risk |
|-----------|-------------|------|
| _cause_ | _minimal change described in words, not code_ | _what could go wrong_ |

---

## Rules

- **No code.** Do not write, edit, or propose code. Describe fixes in plain language.
- **Challenge every assumption.** If something "should work," verify it actually does.
- **Follow the data.** Trace the actual runtime values — don't guess from function names or documentation. If you can't observe the data, say "inferred from code" or "not available" — never present inferred values as observed facts.
- **Account for what you can't see.** If data is unavailable (no logs, can't reproduce, no DB access), that's a finding. State it, explain what it prevents you from concluding, and suggest how to get it.
- **Check dependencies early.** Many bugs live in version mismatches, missing feature flags, changed peer crate APIs, or services that aren't running. Don't assume dependencies are correct — verify them.
- **Prefer the boring explanation.** Typos, wrong variable, stale cache, missing import, wrong dependency version — check these before architectural theories.
- **Name specific files and lines.** Vague analysis is useless analysis.
- **If you're uncertain, say so.** A confident wrong diagnosis is worse than an honest "I don't know yet." Scale your confidence to the evidence you actually have, not the evidence you wish you had.
- After presenting the analysis, ask what to investigate next — do not proceed to implementation.
