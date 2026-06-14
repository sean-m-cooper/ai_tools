# Bootstrap — Setup & Evidence Generation

Use this file when any detected ecosystem lacks `.scorecard\<ecosystem>\evidence.json`, the evidence doesn't match the requested run, or this is the first scorecard on a repo. Once evidence exists and matches the requested entry point / variant / tool version for every detected ecosystem, skip ahead and score directly from `SKILL.md`.

## Step 0 — Detect ecosystems and resolve entry points

Check the repo root (non-recursive) and apply any invocation-arg scoping:

| Marker | Ecosystem id | Entry point to resolve |
|---|---|---|
| `*.sln` / `*.slnx` / `*.csproj` | `dotnet` | Prefer a solution file when one exists. If no solution exists, use a single project file. If multiple candidates exist at the same priority, ask which. |
| `package.json` | `javascript-typescript` | The root `package.json` (workspace root in a monorepo). |

- Both markers → bootstrap **both** ecosystems unless the invocation scoped to one.
- Neither marker → no deterministic analyzer applies. Return to `SKILL.md` and produce a fully qualitative scorecard, saying so explicitly.

Record each resolved entry point — evidence validation in `SKILL.md` compares `subject.entryPoint` against it.

## Step 1 — Check prerequisites (all detected ecosystems, one pass)

| # | Check | What to look for |
|---|-------|-----------------|
| 1 | Latest analyzer for each ecosystem | Run the matching install/update block below before generating or accepting evidence. Do not skip the update just because a tool is already installed. |
| 2 | (`dotnet` only) `Directory.Build.targets` at solution/project root defines a `Scorecard` target | If absent, the MSBuild target won't be injected. |
| 3 | `.scorecard\<ecosystem>\evidence.json` exists and matches the requested run | Require `schemaVersion == 2`, `tool.ecosystem` equal to the folder name, matching `subject.entryPoint`, matching `subject.variant` (dotnet), and current tool version. Do **not** use filesystem mtimes to decide freshness. |
| 4 | (`dotnet` only) `.scorecard\dotnet\metrics.csv` for compatibility fallback | Required only if JSON is missing/unsupported and dimensions 2/9 must be scored from CSV. |

Present any gaps to the user as one consolidated list, then ask once whether to set everything up automatically:

> **Scorecard prerequisites missing:**
> - [ ] latest `code-metrics` global tool (dotnet)
> - [ ] `Directory.Build.targets` (MSBuild Scorecard target)
> - [ ] `.scorecard\dotnet\evidence.json` (missing, unsupported, or mismatched)
> - [ ] latest `codemetrics-ai` NPM CLI (javascript-typescript)
> - [ ] `.scorecard\javascript-typescript\evidence.json` (missing, unsupported, or mismatched)
>
> **Set up everything automatically?** (yes / no / I'll export from VS instead)

List only the rows for detected ecosystems. "I'll export from VS instead" applies to `dotnet` only — see Path B at the bottom.

---

## dotnet ecosystem

### D1 — Install or update the tool

```pwsh
if (dotnet tool list -g | Select-String "codemetrics.ai") {
    dotnet tool update -g CodeMetrics.AI
} else {
    dotnet tool install -g CodeMetrics.AI
}
```

Safe to run every time — fast, and guarantees the latest deterministic rules.

### D2 — Drop the Directory.Build.targets

Copy `scorecard-tooling/Directory.Build.targets` (in this skill's directory) to the solution or project root. It defines the `Scorecard` MSBuild target that shells out to `code-metrics` and writes under `.scorecard\dotnet\`. One-time setup per entry point root.

### D3 — Generate evidence

Default configuration is `Debug`; pass `/p:ScorecardConfiguration=Release` for a release-build audit.

```pwsh
# With explicit entry point (resolved in Step 0):
dotnet build "<path-to-sln-slnx-or-csproj>" /t:Scorecard /p:ScorecardEntryPointPath="<path-to-sln-slnx-or-csproj>"

# Without explicit entry point (auto-discovery):
dotnet build /t:Scorecard
```

### D4 — Validate

```pwsh
$rows = Import-Csv .scorecard\dotnet\metrics.csv
$typeCount = ($rows | Where-Object Scope -eq 'Type').Count
$memberCount = ($rows | Where-Object Scope -eq 'Member').Count
$evidence = Get-Content .scorecard\dotnet\evidence.json -Raw | ConvertFrom-Json
Write-Host "Schema: $($evidence.schemaVersion)   Ecosystem: $($evidence.tool.ecosystem)   Types: $typeCount   Members: $memberCount"
```

Expected: `Schema: 2`, `Ecosystem: dotnet`, non-zero counts. **If both counts are 0:** re-run with explicit args:

```pwsh
code-metrics --solution <path-to-sln-slnx-or-csproj> --output .scorecard\dotnet\metrics.csv --scorecard-output .scorecard\dotnet\evidence.json
```

If still zero rows, fall back to the Visual Studio export (Path B) for dimensions 2 and 9 only.

---

## javascript-typescript ecosystem

### J1 — Check Node

```pwsh
node --version
```

Expected: v20 or later. If Node is missing, report it and score this ecosystem qualitatively.

### J2 — Run the analyzer

```pwsh
npx --yes codemetrics-ai@latest
```

Defaults write `.scorecard/javascript-typescript/metrics.csv` and `.scorecard/javascript-typescript/evidence.json`. Pass `--project <path-to-package.json>` or `--tsconfig <path>` when Step 0 resolved a non-root entry point.

**If the package is not yet published or the command produces no evidence file:** say so explicitly, score all nine dimensions for this ecosystem qualitatively against the Scoring Anchors, and never substitute the dotnet CSV fallback — its archetypes and thresholds are C#-calibrated.

### J3 — Validate

```pwsh
$evidence = Get-Content .scorecard\javascript-typescript\evidence.json -Raw | ConvertFrom-Json
Write-Host "Schema: $($evidence.schemaVersion)   Ecosystem: $($evidence.tool.ecosystem)   Types: $($evidence.population.types)   Members: $($evidence.population.members)"
```

Expected: `Schema: 2`, `Ecosystem: javascript-typescript`, non-zero counts.

---

## Path B — Visual Studio GUI export (dotnet only, reliable fallback)

If `dotnet build /t:Scorecard` produces empty metrics for a solution entry point (see `troubleshooting.md`):

1. Open the solution in Visual Studio 2022
2. **Analyze → Calculate Code Metrics → For Solution**
3. Wait for the Code Metrics Results window to populate
4. Click the **Export list** icon (floppy disk) → save as `.scorecard\dotnet\metrics.csv` at the solution root

The VS export produces only the CSV columns. It can replace JSON evidence for dimensions 2 and 9 only; dimensions 1, 3, 4, 5, 6, 7, and 8 require qualitative scoring with source access. For project-only entry points, prefer the CLI/MSBuild path; Visual Studio's solution-level export is not an equivalent project-scoped fallback.
