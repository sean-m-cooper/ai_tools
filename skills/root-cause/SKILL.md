---
name: root-cause
description: Systematically analyze bugs, failures, or unexpected behavior to identify root causes. Examines code, data, dependencies, and logs without proposing fixes, producing a structured analysis that surfaces assumptions, evidence, gaps, and the simplest path forward.
---

# Root Cause Analysis Skill

## Overview

Structured investigation workflow for understanding problems completely before proposing fixes. This skill produces a detailed analysis document that:

- Maps the problem systematically across code, data, and dependencies
- Identifies and challenges assumptions
- Documents evidence and gaps
- Ranks candidate root causes by probability
- Suggests the simplest possible solutions (without writing code)

**Announce at start:** "I'm using the root-cause-analysis skill to investigate this problem systematically."

**Critical Rule:** Do NOT write, edit, or suggest any code changes. This is a thinking-only skill that surfaces what to fix, not how to fix it.

---

## When to Use This Skill

✅ Investigating unexpected behavior or errors in production or development  
✅ Understanding why a test is failing repeatedly  
✅ Diagnosing performance degradation or system failures  
✅ Analyzing data corruption or inconsistent state  
✅ Understanding third-party library issues or integration failures  
✅ Tracing complex issues that span multiple services or layers  
❌ Code review or style improvements (use relevant code standards)  
❌ Feature development without a specific problem (use feature-writer)

---

## Execution Steps

### Step 1 — Gather the Problem Statement

Ask the user to describe:

1. **What is happening?** The specific observed behavior or error
2. **When did it start?** (If known: recent changes, deployment, environment shift)
3. **How often?** (Always fails, intermittent, under specific conditions)
4. **What should happen?** The expected behavior
5. **What environment?** (Dev, staging, production; OS; version; config)

Synthesize into a **one-sentence problem statement**: name the behavior, context, and expected vs actual outcome.

State this back to the user for confirmation.

---

### Step 2 — Read the Conversation

Review the entire conversation history for:

- Every symptom and error reported
- Stack traces or error messages
- Observed behaviors or data values
- Prior investigations or attempted fixes
- Context about when it started
- Any environment or config changes

Create a summary of what's been reported and flag anything unclear or contradictory.

---

### Step 3 — Examine the Code

Read **every relevant file**, not just the ones mentioned:

- Follow the data flow **upstream** (what calls this code?) and **downstream** (what does it call?)
- Check for obvious issues: typos, wrong variables, stale logic, missing imports
- Look at recent changes (use `git log --oneline -20` and `git diff` for affected files)
- Identify all function/method signatures, parameters, and return types in the call path
- Check error handling and fallback paths
- Note any unusual patterns or assumptions embedded in the code

Document file paths and line numbers specifically — vague analysis is useless analysis.

---

### Step 4 — Inspect the Data

Examine actual runtime values, not just the code:

- **Request runtime data** from the user: logs, database rows, config files, environment variables, API responses, event payloads
- If data is unavailable, say so explicitly — missing data is a finding, not a skip
- Trace the data through each transformation step
- Compare observed values against expected format/range/values
- Check for NULL values, type mismatches, encoding issues
- Look for off-by-one errors, precision loss, or unexpected mutations

For each data point, document:
- **What the value is** (literal observation, if available)
- **Where it comes from** (user input, DB, config, API, cache, etc.)
- **What shape it's in** (type, size, structure)
- **Where it diverges from expectations** (if at all)
- **Availability** (observed directly, inferred from code, or not available)

---

### Step 5 — Map Dependencies

Identify every external and internal dependency involved:

1. **Third-party packages/crates** (with versions)
2. **Workspace packages/crates**
3. **System-level tools**
4. **Services** (APIs, databases, etc.)
5. **Environment** (OS, runtime, platform)

Document each as a table:

| Dependency | Type | Version | Role in Problem | Status |
|-----------|------|---------|----------------|--------|
| _name_ | _package / crate / tool / service_ | _version_ | _what it does_ | _OK / Suspect / Unverified_ |

---

### Step 6 — Check Git History

For files involved in the problem:

1. Run `git log --oneline -20 -- <filename>` for recent changes
2. For relevant commits, run `git show <sha>` to examine what changed
3. Look for logic changes, dependency updates, config changes, removed error handling

---

### Step 7 — Check Logs

Request relevant logs from the user and examine for error messages, timeouts, and unexpected state transitions.

---

### Step 8 — Check Prior Context

Ask:
1. "Has this issue appeared before in a different form?"
2. "Are there known issues or TODOs related to this area?"
3. "Has this code been problematic in the past?"

---

## Sections to Produce

### 1. Problem Statement
State the problem in **one sentence** — name the behavior, context, and expected vs actual outcome.

### 2. Assumptions
List every assumption with confidence level and basis.

### 3. Current Approaches
List every approach or fix that has been tried, with results.

### 4. Data State
Describe actual data at each stage of the problem.

### 5. Dependency Map
Table of all external and internal dependencies.

### 6. Supporting Evidence
List concrete evidence with interpretations and certainty levels.

### 7. Missing Information
List what you don't know but need to know, how to get it, and why it matters.

### 8. Root Cause Analysis
Rank candidate root causes by probability with key evidence.

### 9. Simplest Solutions
For each candidate root cause, describe the simplest possible fix.

---

## Rules

- **No code.** Describe fixes in plain language only.
- **Challenge every assumption.** Verify things actually work.
- **Follow the data.** Trace actual runtime values — don't guess.
- **Account for what you can't see.** Missing data is a finding, not a skip.
- **Check dependencies early.** Version mismatches and missing features are common causes.
- **Prefer the boring explanation.** Check typos, wrong variables, stale caches first.
- **Name specific files and lines.** Vague analysis is useless analysis.
- **If you're uncertain, say so.** Scale confidence to evidence you actually have.
- **After presenting the analysis, ask what to investigate next.** Do NOT proceed to implementation.

---

## Post-Analysis

After completing the analysis:

1. **Summarize findings** — brief recap of the most likely root cause(s)
2. **Highlight critical gaps** — what data or verification is most urgent
3. **Ask what's next** — do NOT propose implementation

The user decides what to do with your analysis.
