---
name: code-scorecard
description: "Use when asked for a codebase scorecard, quality audit, 9-dimension assessment, post-merge/refactor/release health review, or due-diligence review."
---

# Code Scorecard Skill

## Overview

Audit a codebase across nine dimensions on a 0–10 scale. Use scorecard-native JSON evidence as authoritative for every deterministic dimension it contains. Fall back only for dimensions whose probes are missing, skipped, failed, or not yet implemented.

**Announce at start:** "I'm using the code-scorecard skill to perform a 9-dimension audit."

The deterministic pass starts from scorecard-native JSON evidence at `<repo-root>\.scorecard\<ecosystem>\evidence.json` (schema v2), produced by the CodeMetrics.AI analyzer for each detected ecosystem — the `code-metrics` dotnet global tool for `dotnet`, the `codemetrics-ai` NPM CLI for `javascript-typescript`. Before generating or trusting evidence, update the analyzer so the latest deterministic rules are used. Do not silently substitute qualitative scoring when JSON evidence includes a deterministic dimension score.

---

## How Scores Are Determined

Every dimension score must be traceable to one of three scoring paths. State the path in the scorecard output so the reader can tell how the number was obtained:

1. **JSON deterministic score** — preferred path. Read `.scorecard\<ecosystem>\evidence.json`, validate schema/provenance, and use each dimension's `score` when its `status` is `scored`. The analyzer has already applied that ecosystem's probes and thresholds. Cite the JSON `basis`, signal summary, and top findings.
2. **CSV deterministic fallback** — `dotnet` only, dimensions 2 and 9 only. Use `.scorecard\dotnet\metrics.csv` only when JSON is unavailable, unsupported, skipped, or failed for those dimensions. Apply `csv-fallback.md` mechanically: filter non-production/generated rows, derive per-class values, score population/tail/extreme signals against threshold tables, average signals into metric scores, and average metric scores into the dimension score.
3. **Qualitative score** — only for dimensions without usable deterministic evidence. Inspect targeted source/docs/config artifacts, apply the Scoring Anchors literally, and cite the concrete evidence inspected. Do not use qualitative judgment to override a valid deterministic JSON score.

Overall scores are the unweighted mean of applicable dimension scores for a single ecosystem, rounded to one decimal. Never combine ecosystem scores into one blended number.

For the `dotnet` CSV deterministic fallback, use these formulas. When `--stats` is set, emit the same formulas with the actual values substituted:

```text
member_count = count(Member rows belonging to the type)
decomposition_ratio = class_cyclomatic_complexity / member_count
max_member_cc = max(member_cyclomatic_complexity for the type)

population_rate = count(classes crossing the smell threshold) / scored_class_count
extreme_rate = count(classes crossing the catastrophic threshold) / scored_class_count
tail_value = p90 for decomposition_ratio and max_member_cc; p10 for maintainability_index

signal_score = threshold_lookup(actual signal value)

decomposition_metric_score = mean(population_signal_score, tail_signal_score, extreme_signal_score)
max_member_cc_metric_score = mean(population_signal_score, tail_signal_score, extreme_signal_score)
maintainability_metric_score = mean(population_signal_score, tail_signal_score, extreme_signal_score)

code_quality_score = mean(decomposition_metric_score, max_member_cc_metric_score)
maintainability_score = maintainability_metric_score
overall_score = mean(applicable_dimension_scores)
```

`threshold_lookup` means selecting the first threshold-table row in `csv-fallback.md` that the actual signal value satisfies, then using that row's 0/2/4/6/8/10 score. Round metric, dimension, and overall scores to one decimal.

When a user asks how scores were generated, or when the result might be reviewed by someone who was not present for the run, include the deterministic evidence summary and recommend `--stats` for populated formula blocks or `--explain` for the full derivation math.

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

- **Preferred deterministic evidence, one file per detected ecosystem:** `<repo-root>\.scorecard\<ecosystem>\evidence.json` (ecosystem ids: `dotnet`, `javascript-typescript`)
- **Compatibility fallback for dimensions 2 and 9, `dotnet` ecosystem only:** `<repo-root>\.scorecard\dotnet\metrics.csv`

**First-time setup, missing evidence, or regenerating after a tool update:** see `bootstrap.md` for ecosystem detection and the per-ecosystem generation procedure.

**Scope:** if the repo contains multiple `.sln`/`.slnx`/`.csproj` files or multiple package workspaces, specify which entry point to use at invocation time — e.g. "run the scorecard against eContract.API.slnx" or "run the scorecard against Worker.csproj". To restrict a polyglot repo to one ecosystem, say so — e.g. "scorecard the dotnet side only". If nothing is specified, the skill detects and prompts.

**For dimensions without usable JSON evidence**, source code access is required. The skill will read targeted files as needed during fallback qualitative scoring — it does not need to read every file.

---

## Ecosystem Detection

Detect which analyzers apply before touching evidence. Check the repo root (non-recursive):

| Marker | Ecosystem id | Analyzer |
|---|---|---|
| `*.sln` / `*.slnx` / `*.csproj` | `dotnet` | `code-metrics` dotnet global tool |
| `package.json` | `javascript-typescript` | `codemetrics-ai` NPM CLI |

- Both markers present → polyglot repo: score **each** detected ecosystem (unless the invocation scoped to one).
- Evidence for each detected ecosystem lives at `.scorecard\<ecosystem>\evidence.json`. Missing, invalid, or mismatched evidence → run the bootstrap for that ecosystem (`bootstrap.md`).
- An evidence directory with no matching marker (e.g. `.scorecard\dotnet\` in a repo with no `.sln`, `.slnx`, or `.csproj`) → stale evidence; report it and do not score from it.
- No marker at all → no deterministic analyzer applies. Produce a fully qualitative scorecard and say so explicitly in the output.

---

## Invocation Args

Inspect the invocation args string for these flags before scoring:

- **Entry-point path** (`.sln`, `.slnx`, `.csproj`, or a `package.json`): scope the scorecard to that entry point's ecosystem (see Scope above).
- **Ecosystem name** (`dotnet`, `javascript-typescript`): scope a polyglot repo to one ecosystem.
- **`--verbose`**: also emit Sections 4 (Score Lift Summary), 5 (Top Offenders by Metric), and 6 (Deterministic Detail). Use when the user wants the extra prose backing the scores.
- **`--stats`**: also emit Section 7 (Score Formula Stats) — populated formula blocks with actual counts, rates, threshold-derived signal scores, metric scores, dimension scores, and overall arithmetic. Use when the user wants the numbers behind the summary without the longer explanation narrative.
- **`--explain`**: also emit Section 8 (Score Derivation Detail) — filter counts, per-signal scores, threshold lookups, offender attribution. Load `metrics-glossary.md` for the formulas and threshold rationale. Section 8 is written to stand on its own; it does not require `--verbose` or `--stats`.

The flags are additive — pass both for the full breakdown. If args are absent, run the default scorecard (Sections 1, 2, 3).

---

## Dimensions

### 1. Architecture & SOLID *(JSON deterministic when available; otherwise qualitative)*
Layering, boundaries, interface use, dependency inversion, single responsibility. God classes and direct static dependencies are penalized.

### 2. Code Quality *(JSON deterministic when available; CSV deterministic fallback, dotnet only)*
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

### 9. Maintainability *(JSON deterministic when available; CSV deterministic fallback, dotnet only)*
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

When JSON evidence contains a dimension score, use it as authoritative and cite its basis/status. Qualitative anchors apply only to dimensions without usable JSON evidence. CSV deterministic fallback applies only to Code Quality and Maintainability, and only for the `dotnet` ecosystem — its thresholds and archetypes are Roslyn-calibrated.

---

## Deterministic Evidence Pass

Run this pass once per detected ecosystem, starting from `.scorecard\<ecosystem>\evidence.json`:

1. Parse JSON and require `schemaVersion == 2`. If the schema is missing or unsupported, report that explicitly and regenerate with the latest analyzer for that ecosystem (see `bootstrap.md`).
2. Validate provenance: `tool.ecosystem` must equal the directory name the evidence was found under; `subject.entryPoint` must match the resolved entry point; for `dotnet`, `subject.variant` must match the requested configuration; `tool.version` must match the analyzer version just installed/updated. If any value is missing or mismatched, regenerate evidence.
3. Never decide freshness by comparing `generatedAtUtc` or filesystem LastWriteTime values to source-file mtimes. Those values vary across clones and CI checkouts.
4. For each dimension under `dimensions`, use the JSON `score` when `status` is `scored`.
5. Include the dimension `status`, `basis`, and top finding counts in the evidence summary.
6. If a dimension is `skipped` or `failed`, report the status and reason. Fall back only for that dimension:
   - **Code Quality (dim 2) or Maintainability (dim 9), `dotnet` ecosystem only:** use the CSV deterministic procedure in `csv-fallback.md` against `.scorecard\dotnet\metrics.csv`
   - **Any other dimension, or any non-dotnet ecosystem:** use qualitative scoring against the Scoring Anchors above, citing concrete artifacts
7. Do not hide probe limitations. State that deterministic probes are conservative static evidence, not a substitute for human review. For ecosystems marked uncalibrated in the shared contract (`shared/scorecard-schema/dimensions.md` in the CodeMetrics.AI repo), add one line noting that scores are not calibrated against other ecosystems.

If evidence is missing entirely for a detected ecosystem, jump to `bootstrap.md` before scoring that ecosystem.

---

## Output Format

Return exactly this, in this order. Which sections render depends on invocation args:

| Mode | Sections emitted |
|---|---|
| Default | 1, 2, 3 |
| **`--verbose`** | 1, 2, 3, 4, 5, 6 |
| **`--stats`** | 1, 2, 3, 7 |
| **`--explain`** | 1, 2, 3, 8 |
| **`--verbose --stats`** | 1, 2, 3, 4, 5, 6, 7 |
| **`--verbose --explain`** | 1, 2, 3, 4, 5, 6, 8 |
| **`--stats --explain`** | 1, 2, 3, 7, 8 |
| **`--verbose --stats --explain`** | 1, 2, 3, 4, 5, 6, 7, 8 |

Sections 1–3 are always shown (summary layer). Sections 4–6 are verbose justification, ordered from highest-leverage to most analytical. Section 7 is formula statistics, gated on `--stats`. Section 8 is the deeper derivation narrative, gated on `--explain`.

**Polyglot repos:** when more than one ecosystem was scored, render the selected sections once **per ecosystem**, each under an `## <ecosystem>` heading, then close with a single **Suite Summary** table:

| Dimension | dotnet | javascript-typescript |
|-----------|--------|------------------------|
| ... one row per dimension, then a per-ecosystem **Overall** row ... | | |

Never average, combine, or rank scores **across** ecosystems — cross-ecosystem comparability requires the calibration procedure in the shared contract, and uncalibrated ecosystems must carry a one-line caveat under the table.

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

Below the main scorecard, include a compact provenance table showing where each score came from and how it was obtained:

| Dimension | Source | Status | Basis / probe summary |
|---|---|---|---|
| Code Quality | JSON or CSV fallback | scored/skipped/failed/fallback | Key thresholds or fallback reason |

For JSON-scored dimensions, the Basis column must cite the analyzer basis plus the signals/findings that drove the score. For CSV fallback dimensions, cite the threshold families used (population, tail, extreme) and the main offender metric. For qualitative dimensions, cite the inspected artifacts and the anchor band applied (for example, "qualitative anchor 6: adequate but inconsistent"). For skipped/failed dimensions, show the explicit reason and what fallback was used. If JSON was unavailable and CSV fallback was used, say so in the Source column.

### 3. Top 3 Issues

Highest-impact problems to fix first. For each:

- **Basis:** `Metrics` or `Current context`
- What it is
- Where (file/pattern/count)
- Why it matters
- For deterministic-dimension issues: estimated score lift if fixed (from CSV fallback Step 9, when applicable)

Use `Metrics` when the recommendation is driven primarily by deterministic JSON findings, CSV fallback threshold misses, signal scores, top offenders, or score-lift calculations. Use `Current context` when the recommendation is driven primarily by qualitative review of files, docs, configs, tests, architecture, user-provided context, or dimensions without deterministic evidence. If both apply, choose the primary driver for **Basis** and mention the secondary evidence in the issue text.

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

### 7. Score Formula Stats (`--stats` only)

Emit this section **only** when `--stats` appeared in the invocation args. The section must contain populated formula blocks, not symbolic formulas. Replace every count, rate, score, and mean with the actual values from the current run. If a deterministic score came from JSON evidence and the JSON contains enough signal detail to populate the formulas, use the JSON values. If the JSON score lacks the needed signal detail, state that the analyzer supplied the final score but not the intermediate formula stats, then show any available counts/signals. If CSV fallback was used, compute every value from `csv-fallback.md`.

For each deterministic dimension with available stats, use this shape:

```text
Code Quality stats
  scored_class_count = 412

  decomposition_ratio:
    population_rate = 28 / 412 = 6.8% -> threshold_lookup(6.8%) = 4
    tail_value = p90(decomposition_ratio) = 3.1 -> threshold_lookup(3.1) = 6
    extreme_rate = 1 / 412 = 0.2% -> threshold_lookup(0.2%) = 8
    decomposition_metric_score = mean(4, 6, 8) = 6.0

  max_member_cc:
    population_rate = 22 / 412 = 5.3% -> threshold_lookup(5.3%) = 4
    tail_value = p90(max_member_cc) = 11 -> threshold_lookup(11) = 4
    extreme_rate = 3 / 412 = 0.7% -> threshold_lookup(0.7%) = 6
    max_member_cc_metric_score = mean(4, 4, 6) = 4.7

  code_quality_score = mean(6.0, 4.7) = 5.4

Maintainability stats
  scored_class_count = 412

  maintainability_index:
    population_rate = 37 / 412 = 9.0% -> threshold_lookup(9.0%) = 4
    tail_value = p10(maintainability_index) = 58 -> threshold_lookup(58) = 4
    extreme_rate = 4 / 412 = 1.0% -> threshold_lookup(1.0%) = 6
    maintainability_metric_score = mean(4, 4, 6) = 4.7

  maintainability_score = 4.7

Overall stats
  applicable_dimension_scores = [7.0, 5.4, 6.0, 8.0, 6.0, 7.0, 8.0, 6.0, 4.7]
  overall_score = mean(applicable_dimension_scores) = 6.5
```

The example above shows format only. Do not copy those values into a real scorecard unless they are the current run's values.

For qualitative dimensions, do not invent numeric formula stats. Include them only in `applicable_dimension_scores` for the overall calculation, and rely on Sections 1, 2, and optionally 8 for qualitative evidence.

### 8. Score Derivation Detail (`--explain` only)

Emit this section **only** when `--explain` appeared in the invocation args. Otherwise skip entirely. Section 8 is self-contained — it does not assume Section 6 or Section 7 was shown, so it must restate the three-signal breakdown for any deterministic dimension it covers.

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
- **Show provenance.** Every score must make clear whether it came from JSON evidence, dotnet CSV fallback, or qualitative review. If a reader cannot tell how a score was produced from the output alone, the output is incomplete.
- **Label recommendations.** Every Top 3 issue must include `Basis: Metrics` or `Basis: Current context` so the reader can tell whether the recommendation came from computed score evidence or the qualitative/current-code review.
- **Cite evidence.** Every score must reference a concrete artifact. Prefer JSON dimension evidence; for CSV fallback, cite offender names from the metrics export.
- **Do not estimate deterministic dimensions.** If JSON evidence is available, use it. For `dotnet`, if neither JSON nor CSV fallback is available for Code Quality or Maintainability, ask for evidence instead of guessing from reading code. For non-dotnet ecosystems without usable JSON, score qualitatively and state that deterministic evidence was unavailable.
- **Do not pad.** Do not soften. If the codebase is bad, say so with evidence. If it's good, say so with evidence.
- **N/A is a real option** for dimensions where the codebase genuinely has no applicable surface. Not for Code Quality and Maintainability — every codebase has those scores when evidence can be generated.
- **One decimal on the overall.** Unweighted mean of applicable dimensions only, computed per ecosystem.
- **Never average across ecosystems.** Polyglot repos get one overall per ecosystem and a side-by-side Suite Summary, nothing blended.
- **After presenting the scorecard, ask what to investigate or fix next.** Do NOT begin implementing fixes unless asked.

---

## Supporting References

- **`bootstrap.md`** — first-time setup, tool install/update, evidence regeneration (Steps 0–5), Path A/B input details
- **`csv-fallback.md`** — CSV deterministic procedure for Code Quality (dim 2) and Maintainability (dim 9), **dotnet ecosystem only**, including the 9-step pass, archetype tagging, per-archetype scoring reference, and calibration notes
- **`troubleshooting.md`** — common failures and fixes (tool not found, entry-point load errors, missing/unsupported evidence, skipped probes, empty CSV)
- **`metrics-glossary.md`** — *load only when `--explain` is set.* Formulas behind decomposition ratio, max member CC, and MI; threshold rationale; how a dimension score is derived from the three signals; canonical layout for the Section 8 output.
- **Shared contract** — schema v2, ecosystem registry, dimension keys, and the cross-ecosystem calibration procedure live in the CodeMetrics.AI repo under `shared/scorecard-schema/`
