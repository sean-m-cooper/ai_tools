# Generate and validate scorecard evidence

Requires Node.js 20+ with npm for the shared evidence tooling. .NET analysis additionally requires the .NET 10 SDK plus SDKs/workloads required by the target project. Restore the selected .NET entry point before analysis using its repository's normal restore procedure. JavaScript analysis does not run the target package's scripts.

Resolve `<skill>` to this skill directory and `<repo>` to the audited repository. Use argument arrays or normal shell quoting for paths with spaces.

```sh
node <skill>/scripts/run-scorecard.mjs --repo <repo> --discover
node <skill>/scripts/run-scorecard.mjs --repo <repo> --entry-point App.sln
node <skill>/scripts/run-scorecard.mjs --repo <repo> --entry-point App.slnx
node <skill>/scripts/run-scorecard.mjs --repo <repo> --entry-point src/App/App.csproj --configuration Release
node <skill>/scripts/run-scorecard.mjs --repo <repo> --entry-point packages/ui/package.json
```

With no entry point, the helper runs each unambiguous detected ecosystem. `--ecosystem dotnet` or `--ecosystem javascript-typescript` restricts detection. Discovery searches nested layouts, skips build/dependency outputs and other Git repositories, and stops below a containing entry point for that ecosystem. A root `package.json` is a package/workspace boundary; independently nested packages outside its workspace need an explicit run. Pass an explicit entry point for layouts discovery cannot distinguish.

A `.csproj` run scores that project only, with project references loaded for semantic resolution. A solution run scores its production projects. The .NET analyzer excludes source outside the entry point's directory. Findings use `subject.root` as their path base, which may differ from the audited subdirectory.

## Tool versions and output

`compatibility.json` is the single skill-owned compatibility manifest. The helper prefers an exact compatible `CodeMetrics.AI` pin in the nearest `.config/dotnet-tools.json` or `codemetrics-ai` dependency/devDependency in an ancestor package manifest. It uses that version in an isolated cache without editing the manifest or a global installation. Untested versions and ranges stop with a concrete error; test and deliberately update compatibility before upgrading.

Absent a repository pin, use the tested preferred versions. The shared evidence CLI has its own tested npm version. Tools are cached under `~/.cache/code-scorecard`; `--cache <directory>` isolates a test or CI run. No `Directory.Build.targets` is copied or overwritten.

Each attempt writes `<repo>/.scorecard/<ecosystem>/runs/<run-id>/run.json` and updates `latest.json`. On success the run records CSV, evidence, validated inspection and optional comparison paths. Stdout is one JSON result; command logs go to stderr. Consume only that invocation's result and artifact paths. Every ordinary invocation analyzes source anew; matching version, entry point or timestamps does not establish freshness.

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

## Coordinated development before publication

```sh
node <skill>/scripts/run-scorecard.mjs --repo <repo> --entry-point App.csproj --skip-dependency-probe --npm-package /path/codemetrics-ai-0.2.0.tgz --dotnet-package /path/CodeMetrics.AI.2.1.0.nupkg --cache /path/test-cache
```

Local packages must report the manifest's tested versions. Their content hashes isolate caches from published packages and earlier local builds. The local NuGet override uses only that package source. Never fall back to a published package with the same version when testing a local build.

The integration CI checks out the exact CodeMetrics.AI revision in `compatibility.json`, builds and packs both analyzers, and runs `node --test skills/code-scorecard/scripts/tests/integration.test.mjs` with `SCORECARD_NPM_PACKAGE` and `SCORECARD_DOTNET_PACKAGE` pointing to those packages. Canonical schemas and v2 examples come from the npm package, not copies in this skill. Update the source revision and version pins together after the tests pass; release packages before enabling the default pinned install for users.

## Run identity

The helper creates an `auditId` before analysis and a unique `runId` for each ecosystem invocation. These IDs are explicit in stdout, `run.json` and `latest.json`, and are passed to each analyzer. Before using fresh findings or comparing them, the shared validator requires `analysis.runId` and `analysis.auditId` to match the current invocation. Renaming or copying an old findings file into a new run directory cannot satisfy that check. Missing IDs also fail; never backfill an old document with the new IDs.

Keep IDs when saving reports or extracted findings. Comparison artifacts identify current and baseline runs; SARIF preserves the analyzed run IDs. IDs are excluded from finding fingerprints and comparison compatibility. Raw CSV is not sufficient to validate fresh findings.

For an explicit historical `--existing` import, the helper's `runId` identifies the inspection attempt, while `evidenceRunId` and `evidenceAuditId` retain the source document's IDs (null when absent). Such imports always have `fresh: false`; the attempt ID never relabels old evidence as newly analyzed.
