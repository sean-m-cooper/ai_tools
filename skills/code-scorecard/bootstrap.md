# Bootstrap — Setup & Evidence Generation

Use this file when `.scorecard\evidence.json` is missing, doesn't match the requested run, or this is the first scorecard on a solution. Once evidence exists and matches the requested solution/configuration/tool-version, skip ahead and score directly from `SKILL.md`.

## Required Inputs (detail)

**Preferred deterministic evidence:** `<solution-root>\.scorecard\evidence.json`

**Compatibility fallback for dimensions 2 and 9 only:** `<solution-root>\.scorecard\metrics.csv`

There are two ways to produce these files:

### Path A — MSBuild target (preferred, automated)

The `Scorecard` MSBuild target is installed by Step 3 below. Once in place, regenerating JSON evidence and the compatibility CSV is a one-liner:

```pwsh
dotnet build /t:Scorecard
```

### Path B — Visual Studio GUI export (reliable fallback)

If `dotnet build /t:Scorecard` produces empty metrics (see `troubleshooting.md`), use VS directly:

1. Open the solution in Visual Studio 2022
2. **Analyze → Calculate Code Metrics → For Solution**
3. Wait for the Code Metrics Results window to populate
4. Click the **Export list** icon (floppy disk) → save as `.scorecard\metrics.csv` at the solution root

The Visual Studio fallback produces only the CSV columns: `Scope`, `Project`, `Namespace`, `Type`, `Member`, `Maintainability Index`, `Cyclomatic Complexity`, `Depth of Inheritance`, `Class Coupling`, `Lines of Source code`, `Lines of Executable code`. It cannot replace JSON probe evidence for dimensions 1, 3, 4, 5, 6, 7, or 8.

**For dimensions without usable JSON evidence**, source code access is required. The skill will read targeted files as needed during fallback qualitative scoring — it does not need to read every file.

---

## Bootstrap Steps

Before running the deterministic pass, check ALL of the following prerequisites in one pass. Present any gaps to the user as a consolidated list, then ask once whether to add everything automatically.

### Step 0 — Resolve the solution

Before checking any other prerequisite, determine which solution file to use. This drives where the `.scorecard\` output directory lives and what gets passed to `code-metrics`.

1. If the user specified a solution path in their invocation (e.g. "scorecard against eContract.slnx"), use that path. Verify it exists; if not, tell the user and stop.
2. If no path was specified, scan the working directory for `*.sln` and `*.slnx` files (non-recursive).
   - **Exactly one found**: use it silently.
   - **Multiple found**: list them and ask the user which to use before proceeding.
   - **None found**: proceed without an explicit path — `code-metrics` will auto-discover from the working directory. Note this in the output.

Record the resolved solution path (or "auto-discover") for use in Steps 4 and 5.

### Step 1 — Check prerequisites

Inspect the environment and solution root and report which items are missing or mismatched:

| # | Check | What to look for |
|---|-------|-----------------|
| 1 | Latest `code-metrics` global tool available | Run Step 2 before generating or accepting metrics. Do not skip the update just because the tool is already installed. |
| 2 | `Directory.Build.targets` exists at solution root AND defines a `Scorecard` target | If absent, the `Scorecard` MSBuild target won't be injected. |
| 3 | `.scorecard\evidence.json` exists and matches the requested run | Require supported `schemaVersion`, resolved solution path, requested configuration, and current `CodeMetrics.AI` tool version. Do **not** use filesystem mtimes to decide freshness. |
| 4 | `.scorecard\metrics.csv` exists for compatibility fallback | Required only if JSON is missing/unsupported and dimensions 2/9 must be scored from CSV |

If one or more items are missing, present the full list to the user before doing anything:

> **Scorecard prerequisites missing:**
> - [ ] latest `code-metrics` global tool (CodeMetrics.AI)
> - [ ] `Directory.Build.targets` (MSBuild Scorecard target)
> - [ ] `.scorecard\evidence.json` (missing, unsupported, or mismatched)
> - [ ] `.scorecard\metrics.csv` (compatibility fallback)
>
> **Set up everything automatically?** (yes / no / I'll export from VS instead)

If the user says **yes**, proceed to Step 2. If they say **I'll export from VS instead**, skip to the Path B instructions above and wait for the CSV to be placed.

### Step 2 — Install or update the code-metrics tool

The tool is published to nuget.org. No authentication is required — install or update directly:

```pwsh
if (dotnet tool list -g | Select-String "codemetrics.ai") {
    dotnet tool update -g CodeMetrics.AI
} else {
    dotnet tool install -g CodeMetrics.AI
}
```

This block is safe to run on every scorecard generation — it updates the tool if already installed, installs it if not. Always run it before generating or accepting a CSV so the scorecard uses the latest deterministic rules.

### Step 3 — Drop the Directory.Build.targets

Copy `scorecard-tooling/Directory.Build.targets` (in this skill's directory) to the solution root. It defines the `Scorecard` MSBuild target that shells out to `code-metrics`.

### Step 4 — Generate scorecard evidence

By default the tool runs against `Debug`. To run against `Release` (e.g. for a release-build audit), pass `/p:ScorecardConfiguration=Release`.

If a specific solution was resolved in Step 0, build that solution path directly and also pass it via `ScorecardSolutionPath`:

```pwsh
# With explicit solution (resolved in Step 0):
dotnet build "<path-to-sln-or-slnx>" /t:Scorecard /p:ScorecardSolutionPath="<path-to-sln-or-slnx>"
dotnet build "<path-to-sln-or-slnx>" /t:Scorecard /p:ScorecardSolutionPath="<path-to-sln-or-slnx>" /p:ScorecardConfiguration=Release

# Without explicit solution (auto-discovery):
dotnet build /t:Scorecard
dotnet build /t:Scorecard /p:ScorecardConfiguration=Release
```

### Step 5 — Validate the output

After generation, sanity-check `.scorecard\evidence.json` and `.scorecard\metrics.csv`:

```pwsh
$rows = Import-Csv .scorecard\metrics.csv
$typeCount = ($rows | Where-Object Scope -eq 'Type').Count
$memberCount = ($rows | Where-Object Scope -eq 'Member').Count
$evidence = Get-Content .scorecard\evidence.json -Raw | ConvertFrom-Json
Write-Host "Schema: $($evidence.schemaVersion)   Types: $typeCount   Members: $memberCount"
```

**If both counts are 0:** the tool ran but found nothing — most likely the solution path resolved to an empty file or every project was filter-skipped. Re-run with explicit args:

```pwsh
code-metrics --solution <path-to-sln-or-slnx> --output .scorecard\metrics.csv --scorecard-output .scorecard\evidence.json
```

If that still produces zero rows, fall back to the Visual Studio GUI export (Path B) for dimensions 2 and 9 only. Otherwise the evidence is ready to score — return to `SKILL.md`.

Step 3 (Directory.Build.targets) is a one-time setup per solution and can be skipped once in place. Step 2 (tool install/update) should always run before generating or accepting evidence — it is fast and ensures the latest tool version is used. Step 4 is skipped only when `.scorecard\evidence.json` already matches the resolved solution, requested configuration, supported schema, and current tool version. Do not compare evidence timestamps to source-file mtimes.
