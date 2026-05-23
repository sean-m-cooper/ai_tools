# Metrics Glossary (verbose mode)

Loaded only when the user invokes the scorecard with `--explain`. Defines every deterministic metric, the formulas behind it, the threshold rationale, and how a score is derived from the raw numbers.

Use this file to enrich the verbose output section. Do not load it for normal runs.

---

## Decomposition Ratio

**Definition:** `class_cc / member_count` — the class-level cyclomatic complexity divided by the number of methods/properties in the class.

**What it measures:** average per-method complexity. A class with one giant 40-CC method and 4 trivial accessors scores ratio ~8. The same logic split across 10 focused methods scores ratio ~4. The metric captures *how decomposed* the class is, independent of total size.

**Why the name:** classes that decompose work into many small, focused methods produce low ratios. Classes that cram logic into a few fat methods produce high ratios. It's the inverse of how well the author broke the problem apart.

**Threshold interpretation:**
- **ratio ≤ 2.0** — methods are averaging CC of 2 or less. Excellent decomposition.
- **ratio ~ 4** — average method has 4 branches. Borderline for readability and testability.
- **ratio > 4** — methods are getting fat. This is the "is anything wrong" line.
- **ratio > 15** — one or more methods are doing far too much. Definitely needs splitting.

**Three signals scored (Step 6, csv-fallback.md):**
- **Population:** what % of surviving classes have ratio > 4? Captures *breadth* of the problem.
- **Tail (p90):** what's the 90th-percentile ratio? Captures *how bad the typical bad class is*.
- **Extreme:** what % of classes have ratio > 15? Captures *catastrophic outliers*.

A codebase scoring poorly only on the extreme signal has a few terrible classes (fixable in place). Scoring poorly across all three signals is broad rot (often needs replacement).

---

## Max Member Cyclomatic Complexity

**Definition:** the maximum cyclomatic complexity across all methods in a type. Cyclomatic complexity counts the number of linearly independent paths through a method: `1 + (branching constructs)`. A straight-line method scores 1. Each `if`, `else if`, `case`, `&&`, `||`, `?:`, `catch`, and loop adds 1.

**Why max instead of average:** the hottest single method is what drives bug rates, review time, and test difficulty. A class with one 30-CC method and nine trivial methods has a low *average* but is dominated by the one method nobody can safely change. Refactoring that single method gives the biggest lift.

**Source:** Roslyn computes CC per method during analysis. The tool then aggregates the max across each type's members.

**Threshold interpretation (industry consensus):**
- **CC ≤ 5** — easy to understand, fully testable with a handful of cases.
- **CC 6–10** — moderate; still manageable but starting to demand attention.
- **CC > 15** — hard to test exhaustively, error-prone, candidate for extraction.
- **CC > 30** — unmaintainable; almost guaranteed to be a bug source.

**Three signals scored:**
- **Population:** % of classes with max member CC > 15. Breadth.
- **Tail (p90):** 90th-percentile of max member CC. Typical bad case.
- **Extreme:** % of classes with max member CC > 30. Catastrophic methods.

---

## Maintainability Index (MI)

**Definition:** Microsoft's composite metric combining Halstead Volume (operator/operand complexity), Cyclomatic Complexity, and Lines of Code, normalized to a 0–100 scale where higher is better. Roslyn produces MI per type and per member.

**Formula (Microsoft's adapted version):**

```
MI = max(0, (171 - 5.2*ln(HalsteadVolume) - 0.23*CC - 16.2*ln(LOC)) * 100/171)
```

You don't compute this yourself — Roslyn does. But knowing the inputs explains why MI moves: more operators, more branches, or more lines all drive it down.

**Microsoft's default thresholds vs. ours:**
- **Microsoft (very forgiving):** green ≥ 20, yellow 10–19, red < 10. Calibrated so almost everything passes.
- **This scorecard:** 60 = noticeable smell line, 40 = active hazard line. Empirically separates clean code from messy code in production .NET solutions.

**Why we recalibrate:** Microsoft's defaults were set so legacy codebases wouldn't all turn red. For a forward-looking quality scorecard, those thresholds are useless — every codebase scores 10/10. Recalibrating to 60/40 puts the bar where it actually predicts maintenance pain.

**Three signals scored:**
- **Population:** % of classes with MI < 60. Breadth of degradation.
- **Tail (p10):** 10th-percentile MI (note: inverted — *lower* p10 is worse). Typical bad case.
- **Extreme:** % of classes with MI < 40. Catastrophic offenders.

---

## How a Dimension Score is Derived

For Code Quality (dim 2) and Maintainability (dim 9), each metric produces three signal scores; those average into a per-metric score; per-metric scores combine into the dimension score.

**Example walkthrough — Code Quality on a hypothetical codebase:**

1. **Filter:** start with N = 1,247 type rows from the CSV. Apply Step 1 exclusions (test projects, Aspire, generated, etc.). Surviving N = 412.
2. **Per-class values:** compute decomposition, max member CC, MI for each surviving class.
3. **Decomposition ratio signals:**
   - Population: 28 of 412 classes (6.8%) have ratio > 4 → looks up at row "≤ 10%" → **signal score 4**
   - Tail: p90 = 3.1 → "≤ 3.5" → **signal score 6**
   - Extreme: 1 class with ratio > 15 = 0.24% → "≤ 0.5%" → **signal score 8**
   - Decomposition per-metric score = mean(4, 6, 8) = **6.0**
4. **Max member CC signals:**
   - Population: 22 / 412 (5.3%) > 15 → "≤ 7%" → **signal score 4**
   - Tail: p90 = 11 → "≤ 12" → **signal score 4**
   - Extreme: 3 / 412 (0.73%) > 30 → "≤ 1.2%" → **signal score 6**
   - Max member CC per-metric score = mean(4, 4, 6) = **4.7**
5. **Code Quality dimension score** = mean(6.0, 4.7) = **5.4**

**Why mean instead of min/max:** averaging across signals prevents one bad number from torpedoing the whole score while still letting consistent badness compound. A codebase that's bad on one signal and good on two ends up around 5–6, which matches qualitative intuition.

---

## What Verbose Output Should Look Like

When `--explain` is set, add a **Section 7 — Score Derivation Detail** with this format per deterministic dimension:

```
=== Code Quality (Dimension 2) ===

Filter summary:
  Total type rows in CSV:         1,247
  Excluded — test projects:         412
  Excluded — Aspire orchestration:   38
  Excluded — generated/composition:  385
  Surviving classes scored:         412

Decomposition ratio (class_cc / member_count)
  What it means: average per-method complexity. Higher = fatter methods.
  Population signal:  28 / 412 classes have ratio > 4  (6.8%)  → score 4
  Tail signal:        p90 ratio = 3.1                          → score 6
  Extreme signal:     1 / 412 classes have ratio > 15  (0.24%) → score 8
  Per-metric score:   mean(4, 6, 8) = 6.0

Max member cyclomatic complexity (highest CC across each type's methods)
  What it means: the worst single method per class. Drives bug rate and test difficulty.
  Population signal:  22 / 412 (5.3%) have max member CC > 15  → score 4
  Tail signal:        p90 max member CC = 11                   → score 4
  Extreme signal:     3 / 412 (0.73%) have max member CC > 30  → score 6
  Per-metric score:   mean(4, 4, 6) = 4.7

Composite dimension score: mean(6.0, 4.7) = 5.4

Top contributors to the score (offenders driving it down):
  1. Project.Foo.BarService — decomposition 18.2, max member CC 42
  2. ...
```

For Maintainability (dim 9), use the same structure but with the MI signals only. For qualitative dimensions when `--explain` is set, briefly state what evidence was inspected (files read, patterns counted) so the user can audit the qualitative call.

Keep prose minimal in this section — the user asked for the math, not narrative.
