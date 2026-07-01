# Code Scorecard

The `code-scorecard` skill audits a codebase across nine quality dimensions on a 0-10 scale. It uses deterministic analyzer evidence when available and falls back only when a dimension lacks usable deterministic evidence.

## Output Flags

The skill accepts optional flags at invocation, for example: `"run the scorecard against eContract.API.slnx --verbose"`. Flags are additive.

| Flag | Output |
|------|--------|
| *(none)* | Scorecard table, deterministic evidence summary, and top 3 issues to fix. |
| `--verbose` | Adds projected score lift, top offenders per metric, and the three-signal breakdown behind deterministic dimensions. |
| `--stats` | Adds populated formula blocks with actual counts, rates, threshold-derived signal scores, metric scores, dimension scores, and overall-score arithmetic. |
| `--explain` | Adds a self-contained score-derivation section with filter counts, threshold rows, score arithmetic, metric definitions, and top contributors. |

You can also pass a specific `.sln`/`.slnx` path to scope the audit when a repo contains multiple solutions.

## Evidence Paths

Each individual score is produced from one of three evidence paths, and the output should say which path was used.

| Evidence path | When it is used | How the score is produced |
|---------------|-----------------|---------------------------|
| **JSON deterministic evidence** | Preferred path for any ecosystem with `.scorecard/<ecosystem>/evidence.json` | The CodeMetrics.AI analyzer runs static probes, writes schema-v2 evidence, and the skill uses each scored dimension directly from that file after validating schema, ecosystem, entry point, variant, and tool version. |
| **CSV deterministic fallback** | `.NET` only, for Code Quality and Maintainability when JSON evidence is unavailable or unusable | The skill filters non-production/generated rows from `.scorecard/dotnet/metrics.csv`, derives per-class metrics, scores population/tail/extreme signals against fixed threshold tables, then averages the signal scores. |
| **Qualitative review** | Dimensions without usable deterministic evidence | The agent inspects targeted files, configs, tests, and docs, then applies the documented scoring anchors literally: 10 = exemplar, 8 = strong, 6 = adequate, 4 = weak, 2 = poor, 0 = absent or harmful. |

## Deterministic Metrics

For the `.NET` CSV fallback, Code Quality combines two metric families:

- **Decomposition ratio**: class cyclomatic complexity divided by member count; high values mean logic is concentrated in large methods.
- **Max member cyclomatic complexity**: the most complex method in each class; high values identify methods that are hard to test and change safely.

Maintainability uses **Maintainability Index (MI)**, recalibrated around production maintainability rather than Visual Studio's very forgiving default color bands.

Each metric is scored with three signals:

- **Population**: how widespread the smell is across classes.
- **Tail**: how bad the typical worst slice is (`p90` for complexity metrics, `p10` for MI).
- **Extreme**: how many catastrophic outliers exist.

## Formulas

The deterministic fallback formulas are:

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

`threshold_lookup` means finding the first threshold row the actual signal value satisfies, then using that row's 0/2/4/6/8/10 score. Metric, dimension, and overall scores are rounded to one decimal.

## `--stats` Example

When the skill is run with `--stats`, the formulas are emitted with the run's actual numbers filled in, for example:

```text
decomposition_ratio:
  population_rate = 28 / 412 = 6.8% -> threshold_lookup(6.8%) = 4
  tail_value = p90(decomposition_ratio) = 3.1 -> threshold_lookup(3.1) = 6
  extreme_rate = 1 / 412 = 0.2% -> threshold_lookup(0.2%) = 8
  decomposition_metric_score = mean(4, 6, 8) = 6.0

code_quality_score = mean(6.0, 4.7) = 5.4
overall_score = mean([7.0, 5.4, 6.0, 8.0, 6.0, 7.0, 8.0, 6.0, 4.7]) = 6.5
```

The numbers above are illustrative. Real `--stats` output uses the counts and signal scores from the current scorecard run.

## Overall Scores

The overall score is the unweighted mean of applicable dimension scores for one ecosystem, rounded to one decimal.

Polyglot repositories get separate ecosystem scorecards. Scores are not averaged across ecosystems.

Use `--stats` when you want compact score arithmetic. Use `--explain` when you need fuller auditability, including filter counts, threshold rows, and top contributors behind the deterministic scores.
