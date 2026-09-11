---
name: code-scorecard
description: "Use when asked for a codebase scorecard, quality audit, 9-dimension assessment, post-merge/refactor/release health review, or due-diligence review."
---

# Code Scorecard

Audit nine dimensions using CodeMetrics.AI evidence and targeted qualitative review. Announce: "I'm using the code-scorecard skill to perform a 9-dimension audit."

CodeMetrics.AI owns deterministic analysis, schemas, scores, comparison, gates and SARIF. This skill owns scope selection, interpretation, qualitative review and recommendations. Do not reproduce analyzer score policies in skill scripts.

## Generate evidence

Use [bootstrap.md](bootstrap.md) and `scripts/run-scorecard.mjs`. The helper discovers nested entry points, honors compatible exact repository pins, installs isolated tested tools, generates fresh evidence and validates it with CodeMetrics.AI's packaged schemas. The supported schemas and tested versions live in [compatibility.json](compatibility.json). Never automatically upgrade to `latest` or change a repository pin.

- Honor a requested `.sln`, `.slnx`, `.csproj`, `package.json`, ecosystem, configuration or tsconfig. Otherwise discover both `dotnet` and `javascript-typescript`. A containing solution/workspace takes precedence over its children. Resolve ambiguous candidates with the user before analysis.
- For large solutions, use the helper's `--timeout-seconds` option and streamed progress. Do not copy the runner or change the analyzer's working directory to bypass SDK selection. Report build-configuration exclusions and test/framework population policies from the current evidence.
- Produce separate scorecards for each selected ecosystem. No supported entry point means a qualitative-only audit; state the missing deterministic coverage.
- Read the current helper result and its `artifacts.inspection` path. Runs live under `<repo>/.scorecard/<ecosystem>/runs/<run-id>/`; `latest.json` records the latest attempt, including failure. Old root-level `evidence.json` and CSV files are not fresh evidence.
- Match `analysis.runId` and `analysis.auditId` to the IDs returned by the current invocation before using findings. Never learn the expected IDs from the findings file itself. The runner enforces this for fresh analysis, including files copied into a new output directory.
- Use both process status and validated evidence. Helper exit 2 or `status: failed` means deterministic results are unavailable for this audit. Retain partial findings as diagnostics; never recover a score from partial CSV, a previous successful run or a failed probe.
- `--existing` is an explicit historical import, never an automatic cache. Label it historical and unverified for current source. Version/entry-point matches and mtimes do not prove freshness.

For failures, read [troubleshooting.md](troubleshooting.md). Do not install build targets during the default workflow. Optional MSBuild integration is in [scorecard-tooling/README.md](scorecard-tooling/README.md).

## Interpret evidence

The inspection contains the original `evidence` plus compatibility information. It does not upgrade v2 or fabricate its missing metadata.

1. For a successful fresh run, use every dimension with `status: scored` as authoritative **within its declared scope**. Include `basis`, `scope.includes`, `scope.excludes` and relevant findings. A React-hook score is labeled "Performance & Async — React hooks only"; do not present it as a general performance assessment.
2. Show skipped dimensions and reasons. Qualitative scores may fill unimplemented or intentionally skipped dimensions when source evidence supports them. Keep qualitative commentary about an already-scored dimension separate from its deterministic score.
3. Show failed dimensions as unavailable. Qualitative observations may explain risks, but cannot erase the failed status or make the deterministic run complete. Do not calculate an overall score from a failed run.
4. For historical v2, explicitly state that completeness, rule provenance, scope, fingerprints and confidence are unknown. For older v3 without scope, say scope is unspecified. Do not infer these fields from prose or invent them. V2 cannot be used for baseline gates or SARIF through this integration.
5. Cite finding locations relative to `subject.root`, including member when supplied. Use `confidence` and `observations` to distinguish direct evidence from heuristic leads. Treat suppression `status: declared` as a declaration, not proof that a rule was suppressed.
6. Show tool version, schema, entry point, variant, source freshness, analysis status, ruleset, configuration fingerprint, calibration and population/filter counts when available. `baseline` calibration describes regression fixtures; it does not establish comparability across ecosystems.
7. Prefer `scoringDecision` when present: it records the executed policy, inputs, selected rules, component scores and caps. In a `firstMatch` ladder, `selected` chose the score and `shadowed` matched after that choice. In a `minimum`, every tied minimum is selected and higher components/caps are `notLimiting`. Follow nested decisions within their parent contribution. `findingEffects` links fingerprints to that decision: `policyInput` is a participating input, `excluded` is a policy exclusion, and `noAdditionalReduction` did not further reduce this run's final score. None is an independent point deduction or a judgment that the finding is harmless. For `deductions`, step scores are recorded deduction amounts; other operations record candidate/component scores. Do not project a score lift from these labels.
8. When `scoringDecision` is absent, attribute a score to specific triggering conditions only when another recorded explanation establishes them or you have verified the policy for the reported analyzer version. Finding counts and aggregate score loss alone do not establish which condition selected a score. Report the score and observations separately when attribution is unavailable. Keep policy calculations in the analyzer.

For .NET 2.0.1+, `analysis.diagnostics` may contain nonblocking `workspaceWarning` entries on a complete, usable run. Surface these warnings alongside findings. They do not by themselves invalidate scores; actual load/compiler failures still do. Preserve the shared validator's status decision.

For .NET 2.1.0+, use `architectureMetrics` to explain the recorded eligible populations, hotspot rates, severity penalties and graph/layering cap. A high-confidence coupling measurement is a design-review lead, not proof of a responsibility or boundary defect. Older runs may use a different policy; do not retrofit current arithmetic or infer a denominator from the sampled hotspots or coupling provenance.

For dependency findings, group the narrative by package and finding category, retaining affected projects/TFMs and differences in resolved versions, advisories and scoring disposition. Report distinct package and project counts separately from project/TFM occurrence counts when the evidence supports them; preserve the analyzer's counts and score. Include available latest versions, deprecation reasons and suggested alternatives from `observations`. A reported alternative is a migration candidate requiring compatibility review. Distinguish scored outdated candidates from exclusions and unknown framework compatibility; compatible framework assets do not prove an upgrade is safe. If older evidence supplies only aggregate counts, state that package detail is unavailable rather than inventing it.

Legacy .NET CSV scoring is available only when explicitly requested for a known complete, provenance-verified legacy export with no usable JSON, and only for Code Quality and Maintainability. Read [csv-fallback.md](csv-fallback.md) then. It is never a recovery path for a failed current run. [metrics-glossary.md](metrics-glossary.md) explains that legacy method; its formulas do not replace current analyzer policies.

## Ground recommendations in inspected context

Distinguish the analyzer's observation, your design hypothesis and a recommendation supported by inspected source. Finding confidence describes the observation; suggestions in a finding's `message` do not establish that a change is appropriate. Cite the current source or behavioral evidence that supports a proposed fix. For each earlier conclusion reused on a rerun, explicitly state whether it was rechecked this run and cite the current evidence, or label it "prior context; not reverified this run." A fresh metric finding does not revalidate an earlier explanation of intent or behavior. Unverified prior conclusions remain provisional, including claims that a pattern is intentional; they cannot justify dismissing a current finding or marking a priority context-verified. When context is unavailable or inconclusive, recommend a specific review step and name what remains unknown.

Coupling alone identifies a review candidate. Recommend splitting a type only after identifying responsibilities or dependency usage that would benefit from separation. An awaited call inside a loop identifies sequential I/O; before recommending batching or concurrency, inspect ordering requirements, dependent side effects and shared state. Where independence or safe resource use is unresolved, propose that investigation rather than prescribing `Task.WhenAll` or declaring a batching opportunity confirmed. An intentional pattern can be explained without changing the deterministic finding or score.

## Nine dimensions and qualitative anchors

| Dimension | Qualitative review focus |
|---|---|
| Architecture & SOLID | Boundaries, responsibilities, dependency direction, cohesion |
| Code Quality | Complexity, decomposition, readability, defect-prone patterns |
| Testing | Meaningful assertions, test strategy, integration coverage, brittleness |
| Security | Secrets, authorization, validation, dependency risks |
| Error Handling | Exception strategy, observability, recovery behavior |
| Documentation | Setup, architecture, intent, operational guidance; do not infer staleness from mtimes |
| Dependency Management | Version policy, compatibility, maintenance, transitive risks |
| Performance & Async | I/O, concurrency, queries, caching, pagination, runtime evidence |
| Maintainability | Change cost, coupling, clarity and consistency |

For qualitative dimensions, cite concrete inspected artifacts and apply: 10 exemplary with no meaningful observed gaps; 8 strong with minor gaps; 6 adequate but inconsistent; 4 weak with problems that compound; 2 poor and blocking change; 0 absent or actively harmful. Use N/A when evidence does not support a score. This skill reports findings; implementation requires the user's request.

## Output

Default output, once per ecosystem:

1. **Scorecard table:** dimension, score, scoring source, scope and concise evidence. Label deterministic, qualitative, historical or unavailable. A scoped deterministic score retains its supplied value. Keep the overall's scope qualification attached when repeating it in arithmetic or summary prose.
2. **Evidence summary:** current `auditId` and per-ecosystem `runId`, provenance, freshness, filters, skipped/failed status, calibration and limitations. Include these IDs in saved scorecards and extracted findings files, retaining the evidence IDs separately for historical imports. Link the exact run artifacts.
3. **Up to three priorities:** concrete location, observed evidence, why it matters, next action, and basis (`Metrics` or `Current context`). State whether an item is a review candidate or a context-verified issue, and cite the support for that distinction. Do not fill the list by promoting unverified findings into confirmed defects.

An overall score is the unweighted mean of available dimension scores within one ecosystem, rounded to one decimal. Show the denominator and excluded dimensions. Label the overall score "partial assessment" wherever it appears (headline or table row) when dimensions are omitted or any included dimension declares `scope.coverage: partial`, even when all nine dimensions are scored. For example: "7.1 — partial assessment, 9/9 dimensions scored." A complete analyzer run establishes successful execution, not comprehensive assessment coverage. If scope is unspecified, disclose that instead of implying full coverage. Do not produce an overall for a failed run. Never blend, average or rank scores across ecosystems. For polyglot audits, end with a side-by-side dimension table and separate per-ecosystem overall values.

Invocation flags add detail:

- `--verbose`: top offenders and available deterministic detail. Discuss likely benefits of fixes. Show a projected score only when a measured rerun or supported aggregate calculation establishes it.
- `--stats`: use the evidence's `scoring`, observations, counts, thresholds and final scores. Show actual arithmetic where supplied; explicitly identify unavailable intermediates.
- `--explain`: explain the recorded algorithm/basis, filters, scope, rule observations, confidence and suppression declarations. Separate observed facts from interpretation. Read the legacy glossary only for an explicit CSV audit.

These presentation flags are interpreted by the agent, not passed to the runner. They are additive. Do not force .NET's legacy three-signal formulas onto JS/TS or schema-v3 scoring. An aggregate score loss is not a sum of independent finding deductions: never invent a per-finding score lift.

For baseline comparisons and quality gates, use the helper's baseline options in [bootstrap.md](bootstrap.md), which delegate to `codemetrics-evidence`. Report incompatible scope, versions, rulesets, configurations or failed/incomplete evidence instead of manufacturing deltas. Use the versions recorded in evidence rather than shorthand in the request. When reporting before/after snapshots across a policy change, explain the documented scoring change and separate it from source changes; a higher score alone does not demonstrate code improvement. Unchanged finding counts do not prove unchanged source. Establish an improvement or regression with compatible evidence; incompatible snapshots cannot support a baseline gate.
