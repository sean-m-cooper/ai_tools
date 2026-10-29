# Behavioral report evaluations

The [Python preview release verification](validation/2026-10-28-python-preview.json) records the published `codemetrics-ai@0.6.0-preview.1` artifact (Python adapter 0.15.0), passing Windows/Linux CI, an empty-cache registry install through the skill, and a [generated report](validation/2026-10-28-python-preview.report.md) passing all seven unchanged async-scoring rubric criteria. The report shows two scored dimensions, unresolved async paths, and unscored Error Handling. The new `python-preview-release` case includes current synthetic source and explicitly asks about 0.14.0 migration. Stable npm `latest` remains 0.5.0. This is one live reporting case, not a rerun of every historical case.

The [Python callback-adapter validation record](validation/2026-10-24-python-async-adapters.json) covers development adapter 0.14.0 and a fresh installed-helper reporting fixture. The `python-async-adapters` case separates partial construction/reference counts, decorator source links, unresolved rebinding, deferred work, and documented handler intent. Seven criteria protect the unscored boundaries. Validation is offline only; no live-model report or judgment was generated.

The [Python async-context validation record](validation/2026-10-19-python-async-context.json) covers adapter 0.13.0 packaging and skill integration: 36 integration/supporting checks, structural validation, and a fresh final-archive helper fixture. The `python-async-context` case exercises stored-wrapper links, repeated callback references, unresolved shapes, deferred work, shadowing, and documented intent. Seven criteria preserve the distinction between source links and runtime behavior. Validation is offline only; no live-model report or judgment was generated.

The [Python coverage validation](validation/2026-10-12-python-coverage.json) records 28 installed-package/runtime/catalog/offline-harness checks and structural validation for adapter `0.5.0-experimental`. Coverage remains unscored, collection is explicit, and source-bound versus conditional evidence stays distinct from analysis freshness. This record does not claim a live-model report evaluation.

The [pnpm development validation](validation/2026-10-09-pnpm.json) extends the
[earlier npm dependency validation](validation/2026-10-09-dependencies.json).
It records 16 offline checks and 15 packaged integration checks, including the
required pnpm project-document/catalog case. The default compatibility pin still
targets released 0.5.0; CI against that older package skips the two new
capability-dependent cases. Set `SCORECARD_REQUIRE_DEPENDENCY_EVIDENCE=1` when
validating the local development tarball so that missing dependency/pnpm support
fails. No live-model report evaluation is claimed for these updates.

These tests exercise the agent's report, separately from the packaged runner integration tests. Eight synthetic fixtures cover selected versus nonbinding score conditions, repeated dependency occurrences, partial assessment scope, prior conclusions, absent attribution in older evidence, failed runs, conclusions rechecked against supplied current source, separate complexity/decomposition component reporting without changing overall weighting, unavailable dependency metadata with independently verified vulnerabilities, and JS/TS scored populations versus unscored contextual evidence. They contain no private repository artifacts.

Each case runs two fresh Codex processes: a generator receives the actual skill, user request and evidence; a judge receives the evidence, generated report and a private factual rubric. The generator never receives the rubric or control reports. The judge evaluates meaning and omissions, accepting paraphrases and different layouts. Quotes are checked against the actual report. Missing criteria, invented quotes and process errors fail closed.

Requires Node 20+ and an authenticated Codex CLI supporting `exec`, `--ignore-user-config`, `--ephemeral`, `--sandbox`, `--output-schema` and `--output-last-message`. Uses the CLI's default model with read-only permissions. This is a live model evaluation and consumes account usage. All child processes have five-minute timeouts; generated reports and judgments are saved to the requested output directory. Run only with synthetic, shareable inputs.

```sh
# Offline harness invariants; also run by CI. This alone does not validate reports.
node --test skills/code-scorecard/evals/run.test.mjs

# Calibrate the judge against an accurate report and a report with known factual errors.
node skills/code-scorecard/evals/run.mjs --controls --output /tmp/scorecard-controls

# Generate and independently judge real reports using the current skill.
node skills/code-scorecard/evals/run.mjs --output /tmp/scorecard-reports

# Narrow a case; set CODEX_BIN or --codex to an executable path if needed.
node skills/code-scorecard/evals/run.mjs --case prior-context --output /tmp/scorecard-prior
```

Exit codes: 0 all cases pass, 1 a factual criterion or control expectation fails, 2 an execution/protocol error occurs. Review the actual report and judgment before changing the skill or rubric. A passing stochastic judge is evidence, not proof; rerun after material skill or model changes. Do not change a criterion merely to make a failing report pass. Keep rubric expectations independent of the desired prose.

`summary.json` records skill/input/rubric/report hashes, timings, and CLI/model metadata when available. Each case preserves the raw report and structured judgment for inspection. User configuration is ignored to isolate the evaluation from custom integrations and prompts. Outputs belong outside the repository. Live evaluations are deliberately separate from credential-free CI, which checks harness integrity and packaged integration.

The [2026-09-11 validation record](validation/2026-09-11.json) records five passing generated-report cases and two successful judge controls. The first pass caught an unqualified repetition of the overall calculation; after a narrow skill correction, all five cases were generated and judged again. This is a recorded run, not a guarantee about future model behavior.

The later `complexity-components` case is not covered by that historical live-validation record. Its fixture and rubric are checked by the offline harness; use `--case complexity-components` for a live report evaluation.

The [2026-09-14 validation record](validation/2026-09-14.json) covers the new dependency-unavailable generated report and its independent judgment, the offline harness, and packaged .NET 2.3.0 integration using the published npm 0.3.0 inspector. It does not claim a new live-model run of the five earlier cases.

The [2026-09-15 validation record](validation/2026-09-15.json) covers the reconciled skill with .NET 2.3.1: 16 runtime/catalog/offline-harness checks and 12 packaged integration checks passed. It records package provenance, 1,151 analyzer tests and six unchanged calibration fixtures. No live-model evaluations were repeated, and the experimental async population ladder is not included.

The [2026-10-05 validation record](validation/2026-10-05.json) covers npm 0.4.0 with the unchanged .NET 2.3.1 pin: 16 offline checks, 13 packaged integration tests, and one generated `js-context` report passing five factual criteria. The fixture was generated by the analyzer from the included synthetic source. It exercises a 1/4 affected async population, statement-based unscored decomposition, one shared documented handler with two uses, and callback/dependency resolution gaps. The older live-model cases were not repeated; this record does not expand their validation claims.

The [2026-10-09 validation record](validation/2026-10-09.json) covers npm 0.5.0 and contextual Error Handling scoring with the unchanged .NET 2.3.1 pin. It records 16 offline checks, 13 packaged integration checks covering scored and unavailable handler populations, and a fresh Express run through the installed release-candidate package. The analyzer's six pinned source selections retain all other dimension results and raw metrics. No live-model reports or judgments were generated for this update; deterministic contract validation does not extend the earlier behavioral-evaluation claims.

The [2026-10-13 Python decomposition validation record](validation/2026-10-13-python-decomposition.json) covers the installed local adapter 0.6.0-experimental: 29 integration and supporting checks, including 12 Python subtests, plus structural skill validation. Owned statements and block nesting remain separate unscored evidence; stale identities and altered summaries are rejected. The four pinned installed corpus runs match standalone measurements. No live-model report evaluation was run; the local archive requirement and released ecosystem pins remain unchanged.

The `python-method-complexity` case uses analyzer-generated 0.7.0 evidence and authored source: one score of 7.6, four production functions, one excluded test function, exact-body duplicates, and unavailable coverage/lambda decomposition. Its rubric protects the 1/9 scope, aggregate attribution, and separation of review evidence. It has offline fixture/harness validation only; no live-model reporting claim is made.

The [2026-10-13 Method Complexity validation record](validation/2026-10-13-python-method-complexity.json) records 30 installed-package and supporting checks, including 13 Python integration subtests, plus structural validation for adapter 0.7.0. It verifies one scored production-function dimension, compatible score gates, historical imports, and unscored review evidence. The new reporting case has only offline validation; no live-model report was generated or judged.

The [2026-10-15 exception-handler validation record](validation/2026-10-15-python-error-handling.json) records 31 integration/supporting/harness checks, including 14 Python integration subtests, and structural validation for adapter 0.8.0. Handler observations remain unscored; the helper rejects stale or altered reports. The new `python-error-handling` case contains analyzer-generated evidence and current source for deliberate import probing, documented shutdown, fallbacks, rethrows, and dispatch. Its seven criteria protect scope and interpretation. Fixture/harness validation was offline only; no live-model report was generated or judged.

The [2026-10-15 exception-context validation record](validation/2026-10-15-python-error-context.json) records 32 integration/supporting/harness checks, including 15 Python integration subtests, plus structural validation for adapter 0.9.0. Context evidence remains unscored and bound to its original handler report; stale or altered imports fail validation. The installed four-project corpus exactly matches standalone context and preserves prior measurements. The new `python-error-context` fixture and seven rubric criteria distinguish recognized local shapes, unresolved behavior, surrounding prose, and runtime claims. This is offline fixture/harness validation only; no live-model report was generated or judged.

The [2026-10-15 raise/chaining validation record](validation/2026-10-15-python-error-transfers.json) records 33 integration/supporting/harness checks, including 16 Python integration subtests, plus structural validation for adapter 0.10.0. Raise observations remain unscored and preserve the embedded context and original classifications. The four installed corpus runs match standalone reports and retain prior measurements. The new `python-error-transfers` fixture and seven rubric criteria distinguish raise forms, causes, documented suppression, unresolved paths, and additional syntax recognition without double counting. This is offline fixture/harness validation only; no live-model report was generated or judged.

The [2026-10-15 call/return validation record](validation/2026-10-15-python-error-operations.json) records 34 distinct integration/supporting/harness checks across the initial run and a coverage-environment retry, including 17 Python integration subtests, plus structural validation for adapter 0.11.0. Call/return evidence and input unresolved inventory remain unscored. Operation identities include full source extents, distinguishing nested calls with the same start. The four installed corpus runs match corrected standalone reports and preserve prior measurements. The new `python-error-operations` fixture and seven criteria protect counts, inventory meaning, call-name limits, documented intent, and unresolved behavior. This is offline fixture/harness validation only; no live-model report was generated or judged.

The [2026-10-16 async-usage validation record](validation/2026-10-16-python-async-usage.json) records 35 integration/supporting/harness checks, including 18 Python integration subtests plus the parent, and structural validation for adapter 0.12.0. The helper validates async provenance, ownership, catalogue accounting, and unscored disposition, rejecting stale or altered imports. The `python-async-usage` fixture contains freshly generated evidence and source for deliberate probing, callback references, eager arguments, wrappers, deferred generators, and unresolved receivers. Seven criteria preserve scope and intent without turning syntax into runtime claims. Validation was offline only; no live-model report was generated or judged.
