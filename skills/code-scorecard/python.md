# Python workflow

Python support measures selected implementation bodies using Python 3.12's native AST. It measures source-only complexity, owned statements, block nesting, exact-body duplication, and optional imported coverage/CRAP evidence, not a nine-dimension scoring implementation. Node.js 20+ and Python 3.12 are required. Normal scorecard analysis never installs, imports, or executes target code. The separate coverage collector explicitly runs tests.

## Local package and scope

This integration is not published yet. Supply a freshly built `codemetrics-ai` npm archive containing `codemetrics-python` via `--npm-package`. The preferred Python adapter identifies itself as `0.7.0`; its source-facts producer remains `0.4.0-experimental`, and the enclosing development npm package retains the manifest's evidence-tool version. The helper deliberately refuses to download a published package as a substitute. Do not remove this restriction until a coordinated release has been tested and the compatibility manifest updated.

```sh
node <skill>/scripts/run-scorecard.mjs --repo <repo> --ecosystem python --npm-package <archive.tgz> --cache <cache>
node <skill>/scripts/run-scorecard.mjs --repo <repo> --entry-point src/app.py --npm-package <archive.tgz>
node <skill>/scripts/run-scorecard.mjs --repo <repo> --ecosystem python --entry-point . --python-include 'src/**' --npm-package <archive.tgz>
```

Discovery selects `pyproject.toml` and stops below a containing manifest. It does not resolve workspace membership, installed-package boundaries, or runtime reachability. A nested manifest outside the requested selection needs a separate run. For repositories without a manifest, explicitly choose a source directory or file. A manifest selects its containing directory; it is not executed or interpreted as analyzer configuration. Python finding paths are relative to that selected directory (or a selected file's parent), recorded as `subject.root`.

Windows defaults to `py -3.12`; other platforms use `python3` and require it to be version 3.12. `--python <interpreter-path>` selects an interpreter explicitly; a relative helper path is resolved against `--repo`. An unsupported interpreter produces an incomplete run, never an empty success. Do not silently switch parsers or install SDKs to make evidence appear complete.

Selection options use a `python-` prefix in the helper:

- Repeatable `--python-include`, `--python-exclude`, `--python-test-path`, and `--python-production-path` select or classify root-relative POSIX paths.
- `--python-include-tests`, `--python-include-generated`, and `--python-include-support` add those otherwise excluded populations.
- Exclusions win. Production overrides win over test/support path conventions, but generated code still requires explicit inclusion. `.pyi` files and recognized declaration-only bodies remain excluded.

These are case-sensitive fnmatch patterns, not Git-ignore patterns: `*` can cross `/`; a leading `**/` also matches zero directories. Absolute paths, backslashes, and `..` are rejected. Inspect `codeQuality.sourceFacts.selection` for the effective options, file classifications, content digests, pruned directories, and excluded declaration identities. Public testing utilities may be production code: Django's `django/test/**` is one example requiring an explicit production override. Do not infer that every path containing `test` is expendable.

## Evidence and presentation

The helper writes evidence v3 and a validated inspection under a unique run directory, with the standard run/audit ID checks. There is no metrics CSV. Full source-facts v2 are embedded at `dimensions.codeQuality.sourceFacts`; this smaller contract's version is separate from evidence schema v3. Keep the enclosing evidence IDs with extracted measurements and findings.

## Optional coverage and CRAP evidence

Pass supplied artifacts with `--python-coverage-json <file>` and optional `--python-collection-manifest <receipt>`. Paths resolve against `--repo`; file keys inside the coverage report resolve against the selected Python `subject.root`. Use the same source-selection flags used during collection. Do not substitute `.NET --coverage`, guess a report by basename, or rebind `--existing` historical evidence to new coverage inputs.

```sh
node <skill>/scripts/run-scorecard.mjs --repo <repo> --ecosystem python --python-include 'src/**' --python-coverage-json <coverage.json> --python-collection-manifest <provenance.json> --npm-package <archive.tgz>
```

Read `dimensions.codeQuality.coverageReview` and retain its review IDs, input report hash, original collection UUID/timestamps, source binding, selection, and limitations. Coverage/CRAP remains unscored. Testing and seven other unsupported dimensions remain unavailable; only Method Complexity is scored.

- `coverage-not-supplied`, missing files, and ambiguous attribution are **unavailable**, not 0% or 100%. A body explicitly reported entirely missing is 0% for that report's test selection.
- `reported-unverified` rows and `conditional-review-only` CRAP estimates have no source binding. A fresh scorecard run does not refresh old coverage.
- `reported-source-matched` rows have a locally validated pre/post collection receipt. Show the collection date and test command/scope. This is an unsigned source-consistency check, not proof of assertion quality, dependency/environment identity, or an immutable filesystem. Reverted edits during execution and subprocess coverage are outside the first collector's guarantee.
- Report `sourceBoundEstimates`, `conditionalEstimates`, and unavailable counts separately. Use supplied covered/executable body-line counts and `crapEstimate.value`; do not substitute branch-inclusive summary percentages or invent a CRAP grading ladder. Full coverage leaves CC intact. Line-based CRAP is review evidence, not a defect prediction, Testing score, or Code Quality deduction.
- One-line definitions, lambdas, and parents with nested definitions may be unavailable. Do not turn attribution exclusions into criticism. Read source and the actual test selection before interpreting a high estimate; a selected subset of tests is not the project's full coverage.
- A supplied receipt mismatch, malformed report, or failed collection makes the combined run incomplete and withholds the score and findings. Never retry by dropping provenance to obtain a successful scorecard. Historical evidence remains historical; its recorded source binding was checked when generated, not against today's checkout during import.

To create coverage, use the package's **separate** `codemetrics-python-collect` command only when test execution is within the user's authorized scope. Do not launch it merely because coverage is absent. Reuse existing authorization rather than requesting it again. The caller chooses an installed Python 3.12 environment containing coverage.py and the project's test dependencies; collection does not install them.

```sh
codemetrics-python-collect <project-directory> --python <absolute-interpreter> --include 'src/**' --output-directory <new-directory-outside-project> -- -q tests
```

The installed executable is also available as `node <installed-package>/dist/python-collect-cli.js`. Use a new output directory and an existing parent. Collection records `coverage.json`, `provenance.json`, and `tests.log`; failed tests or source drift leave an incomplete receipt. Pytest is the default module; `--module` and arguments after `--` select the actual test command. The collector uses controlled single-process coverage, disables project coverage configuration and automatic pytest plugin loading, and accepts explicit required plugins via `-p`. Its packaged `dist/python/COVERAGE.md` documents configuration and timeout boundaries.

## Presenting complete source measurements

For a complete run:

- For adapter 0.7.0, label `codeQuality` **Method Complexity** and use its recorded `score` when `status: scored`. Show the other eight dimensions as **unavailable**. An empty eligible population is skipped, never scored 10.
- Read `codeQuality.methodComplexity` for selected and eligible counts, excluded populations, policy, and per-function contributions. Only selected production implementations enter the score, once per source-facts function ID. Included test/support/generated functions remain review evidence. Lambdas remain eligible for complexity even when their decomposition or coverage is unavailable. Use supplied scores and weights; do not reproduce the scoring formula in this skill.
- Report the selection, Python/parser version, measurement policy, ruleset, calibration, configuration fingerprint, exclusions, and current run/audit IDs. `population.types: 0` is a schema placeholder for an unmeasured quantity, not proof that the project contains no classes.
- CC ≥ 10 findings are informational control-flow review leads. They do not assert defects, poor performance, inappropriate error handling, or that a safe decomposition exists. Read source before recommending changes. `except` branches contribute to CC but do not establish bad exception handling.
- Measurement policy `python/owned-function-complexity-v2` treats whole-case simple OR-pattern lists as one membership decision, retaining guards, body decisions, and structural alternatives. Version 0.2.0 used v1, which counted every OR alternative. A policy-driven reduction is not a code improvement; preserve the recorded policy and do not reinterpret historical findings.
- Recognized overload/protocol/abstract placeholders receive no implementation credit; concrete bodies and ordinary no-op functions remain measured. Honor recorded declaration exclusions without inventing additional exemptions or Python CMAI annotations.
- Lead with Method Complexity and its limited scope. If an aggregate is requested or required by the scorecard table, it equals this single score and must read **partial assessment, 1/9 dimensions scored**; it is not a full-codebase health grade. With no eligible population, no aggregate is available. Do not compare Python scores as equivalent to JS/TS or .NET scores or fill the other dimensions with qualitative grades.

For incomplete runs, use diagnostics only: no score, overall, or recovery from old files. The shared validator recomputes the Method Complexity score and its contributions and checks all embedded review evidence; stale IDs are rejected even if another process reports exit zero. Explicit `--existing` imports remain historical, never fresh. The shared CLI can export informational findings to SARIF.

The supported policy is `python/method-complexity-worst-40-remainder-60/v1`, ruleset `python-2026-10-13-method-complexity-v1`, with `calibration: baseline`. This records an accepted product policy, not defect-prediction or cross-language validation. `scoringDecision.findingEffects` ties production complexity findings to the aggregate policy; findings are not independent deductions. Duplication findings and nonproduction complexity findings do not lower the score.

For comparisons, supply `--baseline` and optionally `--max-score-drop`. The inspector requires compatible supported analyzer versions, rulesets, configurations, selections, scopes, and available scores. Historical preview policies, incomplete runs, and empty eligible populations cannot gate. `--fail-on-new info` explicitly gates informational review findings as findings; it does not turn them into score deductions. Do not describe a gate failure as proof of a defect.

For historical adapters through 0.6.0-experimental, retain all nine dimensions as unavailable and show an existing `experimentalPreview` separately with its recorded population. Historical previews could include explicitly selected nonproduction bodies. Do not relabel, recompute, or promote those values into current scores; their policy and version remain unchanged.

## Exact-body duplication (0.4.0-experimental+)

Read `dimensions.codeQuality.duplication` from the validated evidence. Its run/audit IDs must match the enclosing analysis, and it uses the same selected source population. It is review evidence, not a score or an additional dimension. Older evidence without this extension has no duplication assessment; do not report zero matches for it.

- Report the supplied group count, matched-function count, eligible-body count, and five-statement minimum. A group with three occurrences is one group involving three bodies. Do not sum pairwise matches, infer duplicated-line percentages, or turn the count into a deduction or grade. No eligible bodies means this search is unmeasured; zero groups among eligible bodies means no matches under this policy, not "duplication-free."
- For useful groups, show the member/file/line occurrences, statement count, and recorded policy `python/exact-function-body-v1`. `exactBodyDuplicationReview` findings are informational; high confidence applies to structural equality, not to a refactoring recommendation. The full occurrences are available in each group's evidence and finding observations.
- Explain the boundary when it affects interpretation: whole AST bodies only; names and literal values retained; comments, leading docstrings, function signatures, decorators, and surrounding class context excluded. Renamed or partial-block copies are not detected. Lambdas and parents containing nested definitions are excluded, while independently eligible nested functions remain measured. Populations and async/synchronous bodies are compared separately.
- Read the source before recommending extraction. Matching bodies may intentionally implement the same protocol in separate backends, preserve class boundaries, use different bindings or closures, or protect permissions. Honor documented reasons and do not infer semantic equivalence or safe interchangeability from a match.
- An incomplete duplication assessment makes the combined analysis incomplete and withholds groups, summary, Method Complexity score, and all findings. Report the diagnostic; never restore an older duplication report or describe missing results as zero. Historical imports remain historical even if their embedded IDs match their own evidence.


## Owned statements and block nesting (0.6.0-experimental+)

Read `dimensions.codeQuality.decomposition` from validated evidence. Preserve its matching run/audit IDs, source selection, function IDs/digests, and `python/owned-statements-block-nesting-v1` policy. The packaged `dist/python/DECOMPOSITION.md` ships the counting contract. Older evidence without this extension has no decomposition assessment; absence is not zero statements or nesting.

- Report selected, measured, and unavailable function counts. Use the supplied nearest-rank p50/p90/p95/max for **owned statements** and **maximum block nesting** separately, keeping production, test, support, and generated populations distinct. Do not pool projects or populations. An empty measured population has null distributions; lambdas are unavailable, not zero-sized bodies.
- For useful review candidates, show file/member/line, both measurements, and existing CC. Rank size and nesting separately rather than inventing a blended score. Neither is another dimension or a second complexity deduction. Experimental corpus sampling thresholds are not product thresholds; do not turn them into findings, grades, gates, or an overall.
- Statements, not lines, measure size. Multiline calls count once; semicolon-separated statements count separately. Nested definitions belong to their own owners. Leading docstrings, declaration syntax, and placeholders are excluded. Expressions and comprehensions do not add block nesting; this does not measure expression size or cognitive complexity. Honor the recorded exclusions without manufacturing additional exemptions.
- Read source before recommending extraction. Large low-CC initialization/registration routines and deliberate resource/cleanup scopes may be reasonable. Names alone do not establish an exemption or defect. Preserve documented intent and do not infer that a safe decomposition exists from size or nesting.
- Missing, malformed, stale, or incomplete decomposition evidence cannot restore a score from otherwise complete complexity data. Report diagnostics for an incomplete combined run. Explicit historical imports remain `fresh: false`; valid coverage-era reports retain their original contract without fabricated decomposition observations.
