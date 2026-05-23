---
name: code-scorecard
description: "Use when asked for a codebase scorecard, quality audit, 9-dimension assessment, post-merge/refactor/release health review, or due-diligence review."
---

# Code Scorecard Skill

## Overview

Audit a codebase across nine dimensions on a 0–10 scale. Use scorecard-native JSON evidence as authoritative for every deterministic dimension it contains. Fall back only for dimensions whose probes are missing, skipped, failed, or not yet implemented.

**Announce at start:** "I'm using the code-scorecard skill to perform a 9-dimension audit."

The deterministic pass starts from scorecard-native JSON evidence at `<solution-root>\.scorecard\evidence.json`, produced by the `CodeMetrics.AI` global tool via the bundled `Scorecard` MSBuild target. Before generating or trusting evidence, update the tool so the latest deterministic rules are used. Do not silently substitute qualitative scoring when JSON evidence includes a deterministic dimension score.

---

## When to Use This Skill

✅ Manual request for a codebase audit, scorecard, or quality review
✅ After a major code update, refactor, large feature merge, or release
✅ Pre-handover or pre-acquisition due-diligence reviews
✅ Periodic health checks on a long-lived codebase
❌ Narrowly scoped reviews (use security-audit, root-cause, or code-map instead)
❌ Implementation work — this skill produces a scorecard, not fixes

---

## Required Inputs

- **Preferred deterministic evidence:** `<solution-root>\.scorecard\evidence.json`
- **Compatibility fallback for dimensions 2 and 9 only:** `<solution-root>\.scorecard\metrics.csv`

**First-time setup, missing evidence, or regenerating after a tool update:** see `bootstrap.md` for the full Step 0–5 procedure (resolve solution → check prerequisites → install/update tool → drop `Directory.Build.targets` → generate → validate).

**Solution scope:** if the repo contains multiple `.sln` or `.slnx` files, specify which one to use at invocation time — e.g. "run the scorecard against eContract.API.slnx". If none is specified, the skill will detect and prompt.

**For dimensions without usable JSON evidence**, source code access is required. The skill will read targeted files as needed during fallback qualitative scoring — it does not need to read every file.

---

## Invocation Args

Inspect the invocation args string for these flags before scoring:

- **Solution path** (`.sln` or `.slnx`): scope the scorecard to that solution (see Solution scope above).
- **`--verbose`**: also emit Sections 4 (Score Lift Summary), 5 (Top Offenders by Metric), and 6 (Deterministic Detail). Use when the user wants the extra prose backing the scores.
- **`--explain`**: also emit Section 7 (Score Derivation Detail) — filter counts, per-signal scores, threshold lookups, offender attribution. Load `metrics-glossary.md` for the formulas and threshold rationale. Section 7 is written to stand on its own; it does not require `--verbose`.

The flags are additive — pass both for the full breakdown. If args are absent, run the default scorecard (Sections 1, 2, 3).

---

## Dimensions

### 1. Architecture & SOLID *(JSON deterministic when available; otherwise qualitative)*
Layering, boundaries, interface use, dependency inversion, single responsibility. God classes and direct static dependencies are penalized.

### 2. Code Quality *(JSON deterministic when available; CSV deterministic fallback)*
Decomposition ratio, single-method complexity, and offender concentration, computed from the metrics export.

### 3. Testing *(JSON deterministic when available; otherwise qualitative)*
Test coverage and quality. Empty stub files, brittle tests, and zero-test projects are penalized. Integration coverage counts.

### 4. Security *(JSON deterministic when available; otherwise qualitative)*
Secret management, authentication, authorization, input validation, CSRF protection, dependency CVEs, error message leakage.

### 5. Error Handling *(JSON deterministic when available; otherwise qualitative)*
Exception strategy, logging, observability. Empty catches, swallowed exceptions, and stack-trace destruction (e.g. `throw ex`) are penalized.

### 6. Documentation *(JSON deterministic when available; otherwise qualitative)*
README, inline docs where they add value, architecture docs, AI/onboarding instructions, intent in code reviews. TODO/TBD markers and missing expected docs are penalized; do not infer staleness from filesystem mtimes.

### 7. Dependency Management *(JSON deterministic when available; otherwise qualitative)*
Currency of packages, central management, version consistency, transitive risk. Outdated or mixed framework targets are penalized.

### 8. Performance & Async *(JSON deterministic when available; otherwise qualitative)*
Async usage where I/O is involved, query efficiency, caching, pagination, N+1 awareness. Synchronous I/O on hot paths is penalized.

### 9. Maintainability *(JSON deterministic when available; CSV deterministic fallback)*
Maintainability index distribution and bottom-tail health, computed from the metrics export.

---

## Scoring Anchors

Apply to every qualitative dimension:

| Score | Meaning |
|-------|---------|
| 10 | Best-in-class. Industry exemplar. No meaningful gaps. |
| 8  | Strong. Minor gaps, no systemic issues. |
| 6  | Adequate. Inconsistent in places but functional. |
| 4  | Weak. Real problems that will compound under change. |
| 2  | Poor. Will block scaling, onboarding, or safe modification. |
| 0  | Absent or actively harmful. |

When JSON evidence contains a dimension score, use it as authoritative and cite its basis/status. Qualitative anchors apply only to dimensions without usable JSON evidence. CSV deterministic fallback applies only to Code Quality and Maintainability.

---

## Deterministic Evidence Pass

Start with `.scorecard\evidence.json` whenever present and valid for the requested run:

1. Parse JSON and require `schemaVersion == 1`. If schema is missing or unsupported, report that explicitly and regenerate with the latest `code-metrics` (see `bootstrap.md`).
2. Confirm `solution.path` matches the resolved solution, `solution.configuration` matches the requested configuration, and `tool.version` matches the updated `CodeMetrics.AI` tool. If any value is missing or mismatched, regenerate evidence.
3. Never decide freshness by comparing `generatedAtUtc` or filesystem LastWriteTime values to source-file mtimes. Those values vary across clones and CI checkouts.
4. For each dimension under `dimensions`, use the JSON `score` when present.
5. Include the dimension `status`, `basis`, and top finding counts in the evidence summary.
6. If a dimension is `skipped` or `failed`, report the status and reason. Fall back only for that dimension:
   - **Code Quality (dim 2) or Maintainability (dim 9):** use the CSV deterministic procedure in `csv-fallback.md`
   - **Any of the other seven dimensions:** use qualitative scoring against the Scoring Anchors above, citing concrete artifacts
7. Do not hide probe limitations. State that deterministic probes are conservative static evidence, not a substitute for human review.

If evidence is missing entirely or doesn't match the requested run, jump to `bootstrap.md` before scoring.

---

## Output Format

Return exactly this, in this order. Which sections render depends on invocation args:

| Mode | Sections emitted |
|---|---|
| Default | 1, 2, 3 |
| **`--verbose`** | 1, 2, 3, 4, 5, 6 |
| **`--explain`** | 1, 2, 3, 7 |
| **`--verbose --explain`** | 1, 2, 3, 4, 5, 6, 7 |

Sections 1–3 are always shown (summary layer). Sections 4–6 are verbose justification, ordered from highest-leverage to most analytical. Section 7 is the math, gated on `--explain`.

### 1. Scorecard Table

Markdown table with columns: **Dimension**, **Score**, **Evidence**.

For deterministic dimensions, evidence is a one-sentence summary of the three signal scores plus the primary offender. For qualitative dimensions, evidence is one sentence with a concrete artifact (file, pattern, count).

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Architecture & SOLID | | |
| Code Quality | *X.X* | *Decomp X / MaxCC X / extreme rate Y%; worst: ClassName (ratio Z)* |
| Testing | | |
| Security | | |
| Error Handling | | |
| Documentation | | |
| Dependency Management | | |
| Performance & Async | | |
| Maintainability | *X.X* | *%MI<60: Y%, p10 MI: Z, N classes with MI<40* |
| **Overall** | | Unweighted mean of applicable scores, one decimal |

### 2. Deterministic Evidence Summary

Below the main scorecard, include a compact table of JSON evidence status:

| Dimension | Source | Status | Basis / probe summary |
|---|---|---|---|
| Code Quality | JSON or CSV fallback | completed/skipped/failed/fallback | Key thresholds or fallback reason |

For skipped/failed dimensions, show the explicit reason and what fallback was used. If JSON was unavailable and CSV fallback was used, say so in the Source column.

### 3. Top 3 Issues

Highest-impact problems to fix first. For each:

- What it is
- Where (file/pattern/count)
- Why it matters
- For deterministic-dimension issues: estimated score lift if fixed (from CSV fallback Step 9, when applicable)

### 4. Score Lift Summary (`--verbose`, when applicable)

If Top 3 Issues touch deterministic dimensions, restate the projected score after addressing them.

### 5. Top Offenders by Metric (`--verbose`)

For each of the three primary metrics, list the top 5 (not 10) worst classes with their metric value, archetype, and a one-sentence reason. Surface God/Legacy reclassifications even if they rank below 5.

### 6. Deterministic Detail (`--verbose`, Dimensions 2 and 9)

Three-signal breakdown for the deterministic dimensions:

```
Code Quality detail
  Decomposition ratio:    P=X T=X E=X  → score X.X
  Max member CC:          P=X T=X E=X  → score X.X
  Composite:                            → score X.X

Maintainability detail
  Maintainability index:  P=X T=X E=X  → score X.X
```

### 7. Score Derivation Detail (`--explain` only)

Emit this section **only** when `--explain` appeared in the invocation args. Otherwise skip entirely. Section 7 is self-contained — it does not assume Section 6 was shown, so it must restate the three-signal breakdown for any deterministic dimension it covers.

For each deterministic dimension (Code Quality, Maintainability), show:

- **Filter summary:** total CSV type rows, counts excluded by each rule, surviving N
- **Per metric** (decomposition ratio, max member CC, MI):
  - One-line definition of what the metric means
  - Each of the three signals (population / tail / extreme): actual value, threshold-table row matched, signal score
  - Per-metric score = mean of three signal scores
- **Composite dimension score:** the arithmetic that combined the per-metric scores
- **Top contributors:** 3–5 offenders driving the score down, with their values

For qualitative dimensions when `--explain` is set, briefly state what evidence was inspected (files read, patterns counted, scope of search) so the user can audit the call.

Load `metrics-glossary.md` for formulas, threshold rationale, and the canonical layout of this section. Keep prose minimal — the user asked for the math, not narrative.

---

## Rules

- **Be strict.** Use the anchors literally for qualitative dimensions. A 6 means "adequate but inconsistent," not "pretty good." Use the threshold tables literally for deterministic dimensions.
- **Cite evidence.** Every score must reference a concrete artifact. Prefer JSON dimension evidence; for CSV fallback, cite offender names from the metrics export.
- **Do not estimate deterministic dimensions.** If JSON evidence is available, use it. If neither JSON nor CSV fallback is available for Code Quality or Maintainability, ask for evidence instead of guessing from reading code.
- **Do not pad.** Do not soften. If the codebase is bad, say so with evidence. If it's good, say so with evidence.
- **N/A is a real option** for dimensions where the codebase genuinely has no applicable surface. Not for Code Quality and Maintainability — every codebase has those scores when evidence can be generated.
- **One decimal on the overall.** Unweighted mean of applicable dimensions only.
- **After presenting the scorecard, ask what to investigate or fix next.** Do NOT begin implementing fixes unless asked.

---

## Supporting References

- **`bootstrap.md`** — first-time setup, tool install/update, evidence regeneration (Steps 0–5), Path A/B input details
- **`csv-fallback.md`** — CSV deterministic procedure for Code Quality (dim 2) and Maintainability (dim 9), including the 9-step pass, archetype tagging, per-archetype scoring reference, and calibration notes
- **`troubleshooting.md`** — common failures and fixes (tool not found, solution load errors, missing/unsupported evidence, skipped probes, empty CSV)
- **`metrics-glossary.md`** — *load only when `--explain` is set.* Formulas behind decomposition ratio, max member CC, and MI; threshold rationale; how a dimension score is derived from the three signals; canonical layout for the Section 7 output.
