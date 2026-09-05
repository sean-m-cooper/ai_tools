# Code Scorecard

The `code-scorecard` skill audits nine quality dimensions using CodeMetrics.AI's deterministic evidence and targeted qualitative review. It supports .NET solutions (`.sln` and `.slnx`), individual C# projects (`.csproj`), and JavaScript/TypeScript packages or workspaces (`package.json`).

## Run an audit

Ask the agent to use the skill with a specific entry point:

```text
Use code-scorecard against MyApplication.sln --explain
Use code-scorecard against MyApplication.slnx --stats
Use code-scorecard against src/MyApi/MyApi.csproj --verbose
```

Relative entry points are resolved against the audited repository. Quote paths containing spaces. When no entry point is supplied, the skill discovers nested solutions and packages, preferring a containing solution over individual projects. It asks you to select when several candidates remain.

A solution run scores its production projects. A `.csproj` run scores only the selected project while loading referenced projects for semantic analysis. The .NET analyzer excludes source outside the entry point's directory. Findings are relative to the repository root recorded in the evidence.

Install Node.js 20+ with npm for the shared evidence validator. .NET analysis also needs the .NET 10 SDK and any SDKs/workloads required by the target repository. Restore the chosen solution or project using the repository's normal procedure before the audit. The default configuration is `Release`; request another configuration explicitly when needed.

The skill installs tested tool versions in an isolated cache and honors compatible exact repository pins. It does not modify global installations, dependency manifests or build targets. See the [bootstrap guide](../skills/code-scorecard/bootstrap.md) for direct runner commands, tool versions, coverage input, optional dependency-probe skipping and troubleshooting.

## Output flags

These presentation flags are additive and interpreted by the agent:

| Flag | Output |
|---|---|
| *(none)* | Scorecard table, evidence summary and top three issues. |
| `--verbose` | Adds top offenders and available deterministic detail. Projected scores require a measured rerun or supported calculation. |
| `--stats` | Shows recorded counts, thresholds and score arithmetic; identifies unavailable intermediate values. |
| `--explain` | Explains the scoring basis, filters, scope, observations, confidence and contributors. |

## Fresh findings and artifacts

Every ordinary invocation analyzes source afresh. It creates one `auditId` for the invocation and a separate `runId` for each ecosystem. Fresh schema-v3 evidence must contain those exact IDs; copied or renamed stale findings are rejected even if the analyzer exits successfully.

Artifacts are written beneath:

```text
.scorecard/<ecosystem>/runs/<run-id>/
  metrics.csv
  evidence.json
  inspection.json
  run.json
```

An optional baseline comparison adds `comparison.json`. The runner returns the exact artifact paths. `.scorecard/<ecosystem>/latest.json` records the latest attempt, including failure; it is not a promise that usable evidence exists. Saved scorecards and extracted findings retain their audit and run IDs.

Failed or incomplete runs cannot recover scores from an earlier run or leftover CSV. Historical evidence requires an explicit `--existing` import and is labeled historical, never fresh. Schema-v2 imports preserve unknown completeness and provenance fields; they cannot be used for baseline gates through this integration.

## Reading scores

Deterministic dimension scores come directly from validated analyzer evidence. Each score is authoritative within its declared scope: for example, a React-hook check covers that subset of Performance & Async. The report identifies skipped dimensions, failed analysis, heuristic findings and coverage limitations.

Qualitative review may fill dimensions without implemented or intentionally enabled deterministic coverage when inspected source supports a score. It uses these anchors: 10 exemplary, 8 strong, 6 adequate, 4 weak, 2 poor, 0 absent or harmful. Unsupported judgments are N/A. Qualitative commentary does not replace a supplied deterministic score or erase an analysis failure.

The overall is the unweighted mean of available dimension scores within one ecosystem, rounded to one decimal. Reports show the denominator and excluded dimensions and label partial coverage. Failed runs have no overall score. Polyglot repositories receive separate ecosystem scorecards; their scores are not averaged or ranked across ecosystems.

Analyzer thresholds and formulas are versioned policies, not universal quality standards. The report includes ruleset, configuration and calibration metadata when available. Baseline fixture calibration verifies regressions; real-project results are needed to assess how useful the thresholds are in practice. Legacy CSV formulas apply only to an explicitly requested, known-complete historical .NET export with verified provenance and no usable JSON; see the [legacy reference](../skills/code-scorecard/csv-fallback.md).

## Compare runs

The runner delegates baseline comparisons and quality gates to CodeMetrics.AI. Use `--baseline <evidence.json>`, optionally with `--fail-on-new warning` or `--max-score-drop 0`. Both evidence files must be complete and compatible in versions, entry point, configuration, ruleset and scope. Run IDs differ by design and do not change stable finding fingerprints.

Runner exit 0 means completed execution, exit 1 means a quality gate failed, and exit 2 means setup failure, invalid/incomplete analysis or incompatible evidence. Read the returned status and validated inspection as well as the process exit code.
