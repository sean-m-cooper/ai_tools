# Generate and validate scorecard evidence

Requires Node.js 20+ with npm for the shared evidence tooling. .NET analysis additionally requires the .NET 10 SDK plus SDKs/workloads required by the target project. Restore the selected .NET entry point before analysis using its repository's normal restore procedure. JavaScript analysis does not run the target package's scripts. Python preview additionally requires Python 3.12; read [python.md](python.md).

Resolve `<skill>` to this skill directory and `<repo>` to the audited repository. Use argument arrays or normal shell quoting for paths with spaces.

```sh
node <skill>/scripts/run-scorecard.mjs --repo <repo> --discover
node <skill>/scripts/run-scorecard.mjs --repo <repo> --entry-point App.sln
node <skill>/scripts/run-scorecard.mjs --repo <repo> --entry-point App.slnx
node <skill>/scripts/run-scorecard.mjs --repo <repo> --entry-point src/App/App.csproj --configuration Release
node <skill>/scripts/run-scorecard.mjs --repo <repo> --entry-point packages/ui/package.json
```

With no entry point, the helper runs each unambiguous detected ecosystem. `--ecosystem dotnet`, `--ecosystem javascript-typescript`, or `--ecosystem python` restricts detection. Discovery searches nested layouts, skips build/dependency outputs and other Git repositories, and stops below a containing entry point for that ecosystem. A root `package.json` is a package/workspace boundary; independently nested packages outside its workspace need an explicit run. Pass an explicit entry point for layouts discovery cannot distinguish.

A `.csproj` run scores that project only, with project references loaded for semantic resolution. A solution run scores its production projects. The .NET analyzer excludes source outside the entry point's directory. Findings use `subject.root` as their path base, which may differ from the audited subdirectory.

From CodeMetrics.AI 2.3.0, solution scope honors projects excluded from the selected build configuration (Any CPU). Those exclusions also apply to package checks. Tests, test support, samples and benchmarks are excluded from production metrics; test signals count unique source sites across target frameworks. Review the recorded skip reasons and population rather than assuming every loaded project was scored. Repository documentation may live above a nested solution; its presence does not imply documentation coverage for every selected API.

## Tool versions and output

`compatibility.json` is the single skill-owned compatibility manifest. Its `installations` records bind package name, distribution version, command and emitted tool identity/version; `defaults` selects the published defaults. The `analyzers` section retains legacy version metadata. The helper honors an exact compatible `CodeMetrics.AI` or `CodeTestament.Scorecard` pin in the nearest `.config/dotnet-tools.json`, or `codemetrics-ai`/`codetestament` dependency/devDependency in an ancestor package manifest. Python also uses these npm distribution pins, without executing pyproject build backends. Untested versions, ranges, conflicting dependency/devDependency versions, or both package names in one manifest stop before installation. A nearer manifest overrides an ancestor; .NET `isRoot` stops traversal. No target manifest or global installation is edited.

Absent a repository pin or explicit selection, use the published defaults. A pinned older JS analyzer runs from its own package; the canonical evidence reader is installed separately at the tested reader version. Tools are cached under `~/.cache/code-scorecard`; `--cache <directory>` isolates a test or CI run. New cache entries include package identity, version, and either registry origin or the full local archive SHA-256. Old cache layouts remain untouched. Installed package metadata and commands are verified before reuse, with a success receipt written only after verification. Concurrent installers serialize per cache entry. If an installer is forcibly terminated, a later attempt reports the abandoned empty `.install-lock` directory after a bounded wait; confirm no installer is active before removing that directory. No `Directory.Build.targets` is copied or overwritten.

Each attempt writes `<repo>/.scorecard/<ecosystem>/runs/<run-id>/run.json` and updates `latest.json`. On success the run records evidence and validated inspection paths, plus CSV and optional comparison paths when supported. Python emits no CSV. Its supported scored dimensions can compare and gate only under compatible versions, rulesets, scopes and selections. Stdout is one JSON result; command logs go to stderr. Consume only that invocation's result and artifact paths. Every ordinary invocation analyzes source anew; matching version, entry point or timestamps does not establish freshness.

Command progress streams to stderr while analysis runs. Analysis has a 30-minute default timeout; use `--timeout-seconds 3600` for a larger solution. The limit must be a whole number from 1 through 86400 and is recorded in the run result. A timeout terminates the command's process tree and leaves the attempt failed. Tool setup and evidence validation retain separate 10-minute limits. Increase the option for a justified retry instead of copying or patching the runner.

Exit 0 means completed execution, exit 1 means a quality gate failed, and exit 2 means invalid/incomplete analysis, incompatible evidence or setup failure. Read the run status as well. A failed attempt never permits CSV fallback or reuse of prior evidence. Add `.scorecard/` to the repository's ignore policy if desired; the helper does not edit it.

## Probe configuration

- `--configuration <name>` selects .NET configuration; default `Release`.
- `--skip-dependency-probe` intentionally skips feed checks; report this gap.
- `--coverage <path>` supplies a Cobertura report for .NET.
- `--tsconfig <path>` selects JS/TS configuration.

Paths for entry points, coverage, tsconfig, baseline and imports are relative to `--repo`. Cache and local-package override paths are relative to the invoking shell.

## Historical imports and baselines

```sh
node <skill>/scripts/run-scorecard.mjs --repo <repo> --entry-point App.slnx --existing archive/evidence.json --configuration Debug
node <skill>/scripts/run-scorecard.mjs --repo <repo> --entry-point package.json --baseline archive/evidence-v3.json --fail-on-new warning --max-score-drop 0
```

`--existing` explicitly reads historical v2/v3. It validates schema and requested provenance, but does not claim source freshness. V2 retains unknown completeness/scope and cannot be compared or gated. Fix provenance mismatches or generate fresh evidence; do not relabel an unrelated export.

Comparison/gates run in CodeMetrics.AI's shared evidence CLI. Preserve the original baseline file outside new run outputs. Versions, rulesets, configurations, dimension availability and scope must match, and both runs must be complete. Incompatible evidence yields exit 2; a compatible policy violation yields exit 1. SARIF export is available directly through the cached `codemetrics-evidence` CLI; see CodeMetrics.AI's evidence workflow documentation.

## Preview packages and coordinated development

The 0.6.0-preview.2 dependency-evidence analyzer adds local npm v2/v3 and pnpm v9 lockfile inventory by default. On a supporting local build, `--dependency-metadata` opts the JS/TS run into bounded public npm registry and advisory queries. It does not install target dependencies or run their scripts. pnpm v9 support includes catalogs, aliases, workspace links, peer snapshots, and selection of the project graph from a two-document lockfile. Environment/config tooling is explicitly excluded. Integrity-only pnpm records do not establish registry provenance. Non-public/unknown sources are not queried; credentials and repository npm configuration are not loaded. Missing metadata stays unavailable, and Dependency Management remains unscored. Stable 0.5.0 does not support this flag; the exact pinned preview does. Offline and metadata-enabled configurations require separate compatible baselines.

```sh
node <skill>/scripts/run-scorecard.mjs --repo <repo> --entry-point App.csproj --skip-dependency-probe --npm-package /path/codemetrics-ai-0.6.0-preview.2.tgz --dotnet-package /path/CodeMetrics.AI.2.3.1.nupkg --cache /path/test-cache
```

Local packages must match the selected name, version and commands. A local archive overrides the artifact source, not the selected package identity. The local NuGet override uses only that archive's isolated package source and caches. Never fall back to a published package with the same version when testing a local build.

## Package selection and CodeTestament migration

Use `--npm-tool <package@exact-version>` and `--dotnet-tool <package@exact-version>` to select a tested installation explicitly. A conflicting repository pin still stops the run; the helper never overrides it silently. New CodeTestament records require matching local archives until publication is verified. The existing `source` revision and defaults remain on the published legacy release; `localMigration` records the separately tested producer commit.

```sh
node <skill>/scripts/run-scorecard.mjs --repo <repo> --ecosystem python --npm-tool codetestament@0.6.0-preview.3 --npm-package /path/codetestament-0.6.0-preview.3.tgz
node <skill>/scripts/run-scorecard.mjs --repo <repo> --npm-tool codetestament@0.6.0-preview.3 --npm-package /path/codetestament-0.6.0-preview.3.tgz --dotnet-tool CodeTestament.Scorecard@2.4.0 --dotnet-package /path/CodeTestament.Scorecard.2.4.0.nupkg
```

The second command covers every unambiguous discovered ecosystem. A new-package repository pin can also select its record without a selector flag. Supply the appropriate reader package for .NET-only runs; a CodeTestament .NET producer can be validated by the existing legacy canonical reader, with exact tool-name enforcement in the helper. The new npm reader additionally accepts `--expected-name` directly.

`--npm-package` supplies the selected npm distribution. For an older JS pin that needs a separate current reader, `--evidence-package` optionally supplies that reader's matching local archive. Otherwise its exact published version is installed. The run records both installations under `tooling`, including package names, versions, archive hashes and cache locations; `recordedTool` identifies the actual evidence producer. Python's `version` remains adapter `0.15.0`, while `packageVersion` is the npm distribution version.

For `--existing`, the npm selection chooses the reader, not a replacement producer. Historical evidence retains its recorded name/version, unless a repository pin explicitly requires an exact match. Use the CodeTestament npm selection and local archive to import new-brand Python evidence. The helper still rejects stale invocation IDs on fresh runs, unsupported producer identities, incomplete analysis and mismatched provenance. Historical imports never become fresh evidence.

Keep the old pin and baseline for rollback. Changing brand or tool version remains incompatible for ordinary baseline gates. Run old and new packages on the same source, review parity, and adopt a fresh new-brand baseline; do not edit old JSON or bypass gates. Python remains a partial preview with at most two scored dimensions; Error Handling is unscored. The skill name, `.scorecard` paths and CMAI codes remain unchanged.

The optional integration workflow `migration_ref` input must match `localMigration.revision` and be remotely accessible. It builds both producer revisions and runs `scripts/tests/brand-migration.test.mjs` with `SCORECARD_NPM_PACKAGE`, `SCORECARD_DOTNET_PACKAGE`, `SCORECARD_NEW_NPM_PACKAGE`, `SCORECARD_NEW_DOTNET_PACKAGE`, and `SCORECARD_OLD_JS_PACKAGE` (legacy 0.2.0). Ordinary CI continues to exercise the published defaults. A successful local run does not establish Linux or published-package compatibility.

The integration CI checks out the exact CodeMetrics.AI revision in `compatibility.json`, builds and packs both analyzers, and runs `node --test skills/code-scorecard/scripts/tests/integration.test.mjs` with `SCORECARD_NPM_PACKAGE` and `SCORECARD_DOTNET_PACKAGE` pointing to those packages. Canonical schemas and v2 examples come from the npm package, not copies in this skill. Update the source revision and version pins together after the tests pass; release packages before enabling the default pinned install for users.

## Run identity

For fresh .NET runs whose evidence advertises a packaged rule catalog, the helper runs `code-metrics rules --format json` using the same isolated executable and saves validated definitions as `artifacts.ruleCatalog`. It matches package version, catalog version and rule references before exposing annotation guidance. If catalog retrieval fails, `ruleCatalog.status` is `unavailable` with a reason; validated analysis scores remain available. Older packages and historical imports do not use another version's catalog. Read supported scopes and examples from that artifact instead of maintaining a skill-local list of CMAI codes.

The helper creates an `auditId` before analysis and a unique `runId` for each ecosystem invocation. These IDs are explicit in stdout, `run.json` and `latest.json`, and are passed to each analyzer. Before using fresh findings or comparing them, the shared validator requires `analysis.runId` and `analysis.auditId` to match the current invocation. Renaming or copying an old findings file into a new run directory cannot satisfy that check. Missing IDs also fail; never backfill an old document with the new IDs.

Keep IDs when saving reports or extracted findings. Comparison artifacts identify current and baseline runs; SARIF preserves the analyzed run IDs. IDs are excluded from finding fingerprints and comparison compatibility. Raw CSV is not sufficient to validate fresh findings.

For an explicit historical `--existing` import, the helper's `runId` identifies the inspection attempt, while `evidenceRunId` and `evidenceAuditId` retain the source document's IDs (null when absent). Such imports always have `fresh: false`; the attempt ID never relabels old evidence as newly analyzed.

## Python development verification

Build the local CodeMetrics.AI npm archive and set `SCORECARD_NPM_PACKAGE` to its absolute path, then run `node --test skills/code-scorecard/scripts/tests/python.test.mjs` with Python 3.12 installed. Collection integration tests need coverage.py 7.6.1; set `CODEMETRICS_COVERAGE_PYTHON` to an isolated interpreter containing it when the default interpreter lacks coverage. Tests cover packaged execution, selection, parse failure, historical imports, stale IDs, coverage forwarding, explicit collection, source drift, polyglot identity, and local-package provenance. The coordinated source revision must contain the exact preview implementation. Published-package verification additionally runs from a fresh cache without a local-package override.
