---
name: code-scorecard
description: "Use when asked for a codebase scorecard, quality audit, 9-dimension assessment, post-merge/refactor/release health review, or due-diligence review."
---

# Code Scorecard Skill

## Overview

Audit a codebase across nine dimensions on a 0–10 scale. Use scorecard-native JSON evidence as authoritative for every deterministic dimension it contains. Fall back only for dimensions whose probes are missing, skipped, failed, or not yet implemented.

**Announce at start:** "I'm using the code-scorecard skill to perform a 9-dimension audit."

The deterministic pass starts from scorecard-native JSON evidence at `<solution-root>\.scorecard\evidence.json`, produced by the bundled `Scorecard` MSBuild target. `.scorecard\metrics.csv` remains a compatibility fallback for Code Quality and Maintainability only. Before generating or trusting evidence, update the `CodeMetrics.AI` global tool so the latest deterministic rules are used. Do not silently substitute qualitative scoring when JSON evidence includes a deterministic dimension score.

---

## When to Use This Skill

✅ Manual request for a codebase audit, scorecard, or quality review
✅ After a major code update, refactor, large feature merge, or release
✅ Pre-handover or pre-acquisition due-diligence reviews
✅ Periodic health checks on a long-lived codebase
❌ Narrowly scoped reviews (use security-audit, root-cause, or code-map instead)
❌ Implementation work — this skill produces a scorecard, not fixes

---

## Required Inputs

**Preferred deterministic evidence** is:

`<solution-root>\.scorecard\evidence.json`

**Compatibility fallback for dimensions 2 and 9 only** is the normalized metrics CSV at:

`<solution-root>\.scorecard\metrics.csv`

There are two ways to produce these files:

### Path A — MSBuild target (preferred, automated)

The `Scorecard` MSBuild target is installed by the Bootstrap step below. Once in place, regenerating JSON evidence and the compatibility CSV is a one-liner:

```pwsh
dotnet build /t:Scorecard
```

### Path B — Visual Studio GUI export (reliable fallback)

If `dotnet build /t:Scorecard` produces empty metrics (see Troubleshooting), use VS directly:

1. Open the solution in Visual Studio 2022
2. **Analyze → Calculate Code Metrics → For Solution**
3. Wait for the Code Metrics Results window to populate
4. Click the **Export list** icon (floppy disk) → save as `.scorecard\metrics.csv` at the solution root

The Visual Studio fallback produces only the CSV columns: `Scope`, `Project`, `Namespace`, `Type`, `Member`, `Maintainability Index`, `Cyclomatic Complexity`, `Depth of Inheritance`, `Class Coupling`, `Lines of Source code`, `Lines of Executable code`. It cannot replace JSON probe evidence for dimensions 1, 3, 4, 5, 6, 7, or 8.

**For dimensions without usable JSON evidence**, source code access is required. The skill will read targeted files as needed during fallback qualitative scoring — it does not need to read every file.

**Solution scope**: if the repo contains multiple `.sln` or `.slnx` files, specify which one to use at invocation time — e.g. "run the scorecard against eContract.API.slnx". If none is specified, the skill will detect and prompt.

---

## Bootstrap (first-time setup per solution)

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

If the user says **yes**, proceed to Step 2. If they say **I'll export from VS instead**, skip to the Path B instructions in Required Inputs and wait for the CSV to be placed.

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

If that still produces zero rows, fall back to the Visual Studio GUI export (Path B) for dimensions 2 and 9 only. Otherwise the evidence is ready to score.

Step 3 (Directory.Build.targets) is a one-time setup per solution and can be skipped once in place. Step 2 (tool install/update) should always run before generating or accepting evidence — it is fast and ensures the latest tool version is used. Step 4 is skipped only when `.scorecard\evidence.json` already matches the resolved solution, requested configuration, supported schema, and current tool version. Do not compare evidence timestamps to source-file mtimes.

---

## Dimensions

### 1. Architecture & SOLID *(JSON deterministic when available; otherwise qualitative)*
Layering, boundaries, interface use, dependency inversion, single responsibility. God classes and direct static dependencies are penalized.

### 2. Code Quality *(JSON deterministic when available; CSV deterministic fallback)*
Decomposition ratio, single-method complexity, and offender concentration, computed from the metrics export.

### 3. Testing *(JSON deterministic when available; otherwise qualitative)*
Test coverage and quality. Empty stub files, brittle tests, and zero-test projects are penalized. Integration coverage counts.

### 4. Security *(JSON deterministic when available; otherwise qualitative)*
Secret management, authentication, authorization, input validation, CSRF protection, dependency CVEs, error message leakage.

### 5. Error Handling *(JSON deterministic when available; otherwise qualitative)*
Exception strategy, logging, observability. Empty catches, swallowed exceptions, and stack-trace destruction (e.g. `throw ex`) are penalized.

### 6. Documentation *(JSON deterministic when available; otherwise qualitative)*
README, inline docs where they add value, architecture docs, AI/onboarding instructions, intent in code reviews. TODO/TBD markers and missing expected docs are penalized; do not infer staleness from filesystem mtimes.

### 7. Dependency Management *(JSON deterministic when available; otherwise qualitative)*
Currency of packages, central management, version consistency, transitive risk. Outdated or mixed framework targets are penalized.

### 8. Performance & Async *(JSON deterministic when available; otherwise qualitative)*
Async usage where I/O is involved, query efficiency, caching, pagination, N+1 awareness. Synchronous I/O on hot paths is penalized.

### 9. Maintainability *(JSON deterministic when available; CSV deterministic fallback)*
Maintainability index distribution and bottom-tail health, computed from the metrics export.

---

## Scoring Anchors

Apply to every qualitative dimension:

| Score | Meaning |
|-------|---------|
| 10 | Best-in-class. Industry exemplar. No meaningful gaps. |
| 8  | Strong. Minor gaps, no systemic issues. |
| 6  | Adequate. Inconsistent in places but functional. |
| 4  | Weak. Real problems that will compound under change. |
| 2  | Poor. Will block scaling, onboarding, or safe modification. |
| 0  | Absent or actively harmful. |

When JSON evidence contains a dimension score, use it as authoritative and cite its basis/status. Qualitative anchors apply only to dimensions without usable JSON evidence. CSV deterministic fallback applies only to Code Quality and Maintainability.

---

## Deterministic Evidence Pass

Start with `.scorecard\evidence.json` whenever present and valid for the requested run:

1. Parse JSON and require `schemaVersion == 1`. If schema is missing or unsupported, report that explicitly and regenerate with the latest `code-metrics`.
2. Confirm `solution.path` matches the resolved solution, `solution.configuration` matches the requested configuration, and `tool.version` matches the updated `CodeMetrics.AI` tool. If any value is missing or mismatched, regenerate evidence.
3. Never decide freshness by comparing `generatedAtUtc` or filesystem LastWriteTime values to source-file mtimes. Those values vary across clones and CI checkouts.
4. For each dimension under `dimensions`, use the JSON `score` when present.
5. Include the dimension `status`, `basis`, and top finding counts in the evidence summary.
6. If a dimension is `skipped` or `failed`, report the status and reason. Fall back only for that dimension: CSV deterministic scoring is allowed for Code Quality and Maintainability; qualitative scoring is allowed for the other seven dimensions.
7. Do not hide probe limitations. State that deterministic probes are conservative static evidence, not a substitute for human review.

## CSV Deterministic Pass (Dimensions 2 and 9 fallback)

Run this only when JSON evidence is missing/unsupported for Code Quality or Maintainability and a metrics export is provided. Steps are mechanical — no judgment until the offender narrative.

### Step 1 — Load and filter

Load the CSV/XLSX. Strip whitespace from string columns. Apply these filters before any computation:

- **Test projects**: exclude rows where Project name contains "Tests" (case-insensitive)
- **Aspire orchestration**: exclude rows where Project name ends with `.AppHost`, `.ServiceDefaults`, or `.Hosting` — these are deployment/orchestration code, not production logic
- **Benchmarks and samples**: exclude rows where Project name ends with `.Benchmarks`, `.Samples`, `.Demo`, or `.Playground`
- **Generated namespaces**: exclude type rows whose Namespace contains `AspNetCoreGenerated`, `Microsoft.AspNetCore.OpenApi.Generated`, or `Migrations`. Also exclude any namespace ending with `.Generated` that originates from a Microsoft or third-party source-generator package (not user code). If more than 3% of surviving types are in namespaces ending with `.Generated`, investigate for additional framework artifacts.
- **Generated/composition types**: exclude type rows whose Type name matches `Views_*`, contains `__`, contains `<>`, contains `AnonymousType`, equals `Program`, or equals `Startup`
- **Generated regex runner types**: exclude type rows whose Type name contains `+RunnerFactory` (CLR nested-type notation produced by `[GeneratedRegex]` compilation). These types have CC values of 30–100+ and MI values of 39–47, which will catastrophically distort every metric without representing hand-written logic. If more than 5% of surviving types have `+` in their name, investigate for other source-generator artifacts using the same filter pattern.
- Drop the member rows belonging to any filtered type

The Aspire filter exists because AppHost projects are pure orchestration (resource definitions, container wiring) and ServiceDefaults projects are extension-method shims that wire up telemetry, health checks, and service discovery. Both have legitimately weird shapes that would distort population statistics if included with production code. The same applies to Benchmarks/Samples — code with different quality expectations than production.

Report the count of excluded projects in the output's filter summary so the user can verify nothing important got swept up.

### Step 2 — Derive per-class values

For every surviving type row:

- `member_count` = count of Member-scope rows for the type
- `class_cc`, `class_mi`, `coupling`, `loc` = values from the type-scope row
- `max_member_cc` = max Cyclomatic Complexity across the type's member rows
- `avg_member_cc` = mean Cyclomatic Complexity across the type's member rows
- `decomposition` = `class_cc / member_count`

Drop classes with `member_count == 0` (their ratios are undefined).

### Step 3 — Tag archetypes (heuristic pass)

Apply this name-and-namespace heuristic to every class, **in order**. The first matching rule wins; later rules don't apply once a tag is set. The tag drives offender ranking and prose interpretation; per-archetype scoring is documented separately at the bottom of this section.

| If type name or namespace matches | Archetype |
|---|---|
| Type ends with `Context` and namespace contains DAL | `DbContext` |
| Type contains `Repository` | `Repository` |
| Type contains `Parser` | `Service` |
| Type ends with `Mapper`, `Mapping`, `Converter`, or `Transformer` | `Mapper` |
| Type ends with `Validator` | `Validator` |
| Type ends with `Service`, `Manager`, `Job`, `Worker`, `BackgroundService`, `HostedService` | `Service` |
| Type ends with `Strategy`, `Policy`, `Rule` | `Service` |
| Type ends with `Stage`, `Processor`, `Calculator`, `Generator`, `Assembler`, `Sender`, `Engine`, `Orchestrator`, `Dispatcher`, `Fetcher`, `Loader`, `Matcher`, `Aggregator` | `Service` |
| Type ends with `Controller` or `Hub` | `Controller` |
| Type ends with `Request`, `Response`, `Dto`, `DTO`, `Model`, `ViewModel`, `Result` | `DTO/Model` |
| Type ends with `Configuration` and namespace contains DAL | `EFConfig` |
| Type ends with `Options`, `Settings`, `Config` (not in DAL) | `Config` |
| Type ends with `Extensions` or `Helper` | `Helper/Extension` |
| Type ends with `Filter`, `Handler`, `Middleware`, `Attribute`, `Provider`, `Resolver`, `Decorator`, `Interceptor` | `Infrastructure` |
| Type ends with `Client`, `Connector`, `Gateway` | `Infrastructure` |
| Type ends with `Builder` or `Factory` | `Builder/Factory` |
| Project namespace contains DAL and none above match | `Entity/Model` |
| None of the above | `Other` |

Notes on the heuristic:

- **Order matters.** `Repository` is checked before generic `Service` so that `IUserRepositoryService` (rare) tags as Repository. The DAL-context check comes first so `MyDbContext` doesn't get caught by a future `*Context` Infrastructure rule.
- **`contains 'Parser'`** is a contains-check (like Repository), not a suffix-check, because parser types commonly appear as `*Parser`, `*ParserStage`, `*ParserBase`, etc. The contains rule catches all variants.
- **`Decorator`** is tagged Infrastructure here, but Step 4 should reclassify decorators to inherit the archetype of what they wrap (e.g. `CachedContractRepository` is a Repository, not Infrastructure). The metrics treat it as the underlying archetype for threshold purposes.
- **`Validator`** is its own archetype because validators split into two very different shapes — declarative (FluentValidation `AbstractValidator<T>`) and imperative (custom domain validators like a `PhotoValidator`). Step 4 disambiguates.
- **`Hub`** (SignalR) tags as Controller because the metric expectations are the same: thin entry points dispatching to services.
- **`Job`/`Worker`/`BackgroundService`/`HostedService`** tag as Service because they orchestrate work the same way services do; the timer/loop wrapper is incidental.
- **`Stage`** covers pipeline stage classes (parse, score, cache, AI report, etc.). These are domain service classes operating inside a pipeline abstraction — Service thresholds apply.
- **`Calculator`/`Processor`/`Engine`/`Orchestrator`** are domain services by a different name. They perform multi-step computation or coordination, not infrastructure concerns. Service thresholds apply.
- **`Assembler`/`Generator`/`Sender`/`Dispatcher`/`Fetcher`/`Loader`** are output-production or coordination types. Service thresholds apply.
- **`Matcher`/`Aggregator`** are domain logic types. Service thresholds apply.
- **`Converter`/`Transformer`** are mapping types under a different name. Mapper thresholds apply.
- **`Client`/`Connector`/`Gateway`** are integration adapters (HTTP clients, gRPC connectors, API gateways). Infrastructure thresholds apply. `Client` checks after `Parser` and `Repository` to avoid false matches on names like `RepositoryClient`.

### Step 4 — Verify archetypes for outliers

The naming heuristic gets ~90% of classes right but breaks on legacy code that doesn't follow conventions, and on archetypes (like Validator) that share a name but have different shapes. After Step 3, identify classes whose ratios are anomalous for their tagged archetype:

- An `Entity/Model` with `max_member_cc ≥ 15` (entities should have no logic)
- A `DTO/Model` with `class_cc ≥ 20` (DTOs should have no logic)
- A `Config` with `class_cc ≥ 10` (config classes should have no logic)
- A `Repository` with `max_member_cc ≥ 20` (queries get gnarly but rarely that gnarly)
- A `Validator` with `max_member_cc ≥ 8` or `decomposition ≥ 4` (declarative validators are tiny; anything else is doing imperative work)
- An `Infrastructure` class with `max_member_cc ≥ 15` or `decomposition ≥ 6` (filters, handlers, providers should be thin)
- Any class tagged `Other` that ranks in the top 20 by any offender ratio

For each anomaly (typically 5–30 classes per codebase), read the source file and reclassify if the tag is wrong. Common reclassifications:

- "Entity" with logic → `God/Legacy` (separate archetype, indicates active-record or generated artifacts)
- "Other" that's actually a fat orchestrator → `Service`
- "Other" that's a partial class fragment of a controller → `Controller`
- "Validator" that's an `AbstractValidator<T>` with `RuleFor` chains → keep as `Validator` (declarative)
- "Validator" that's doing imperative validation (parsing, format checks, content sniffing, SSRF checks) → reclassify as `Infrastructure` if it's a security guard, or `Service` if it's a domain rule
- "Infrastructure" tagged via `Provider`/`Resolver`/`Decorator` but actually carrying domain logic → reclassify as `Service`
- "Infrastructure" tagged via `Decorator` and wrapping a `Repository` → reclassify as `Repository`
- "Infrastructure" tagged via `Client` but exposing a domain API rather than a raw HTTP wrapper → reclassify as `Service`

Do not read source files for clearly-correct tags. The heuristic is reliable on healthy code; verification only matters where the metrics suggest a mismatch or the naming is genuinely ambiguous.

### Step 5 — Compute inheritance leverage

For classes with `Depth of Inheritance ≥ 2` AND `member_count ≥ 5`, read the source file and count members declared in that file (vs. inherited from base classes). Compute:

`inheritance_leverage = declared_members_at_leaf / depth_of_inheritance`

Low ratios indicate polymorphism (good — leaf overrides a few methods). High ratios indicate inheritance used for code reuse (bad — leaf adds many new members on top of inherited ones).

This metric is reported but not yet folded into the composite score in this version. Surface it in the offender list when a class scores poorly on it.

### Step 6 — Score the three primary metrics

For each metric, compute three signals and look up each on its threshold table.

#### Decomposition ratio

| Score | % classes with ratio > 4 (population) | p90 ratio (tail) | count of ratio > 15, as % of n (extreme) |
|---|---|---|---|
| 10 | ≤ 1% | ≤ 2.0 | ≤ 0.1% |
| 8 | ≤ 3% | ≤ 2.5 | ≤ 0.5% |
| 6 | ≤ 6% | ≤ 3.5 | ≤ 1.0% |
| 4 | ≤ 10% | ≤ 5.0 | ≤ 2.0% |
| 2 | ≤ 15% | ≤ 7.0 | ≤ 4.0% |
| 0 | > 15% | > 7.0 | > 4.0% |

#### Max member cyclomatic complexity

| Score | % classes with max member CC > 15 | p90 max member CC | count of max member CC > 30, as % of n |
|---|---|---|---|
| 10 | ≤ 0.5% | ≤ 4 | ≤ 0.2% |
| 8 | ≤ 2% | ≤ 6 | ≤ 0.6% |
| 6 | ≤ 4% | ≤ 9 | ≤ 1.2% |
| 4 | ≤ 7% | ≤ 12 | ≤ 2.5% |
| 2 | ≤ 10% | ≤ 16 | ≤ 4.0% |
| 0 | > 10% | > 16 | > 4.0% |

#### Maintainability index

| Score | % classes with MI < 60 | p10 MI (tail; higher is better) | count of MI < 40, as % of n |
|---|---|---|---|
| 10 | ≤ 1% | ≥ 75 | ≤ 0.2% |
| 8 | ≤ 3% | ≥ 70 | ≤ 0.5% |
| 6 | ≤ 6% | ≥ 65 | ≤ 1.2% |
| 4 | ≤ 10% | ≥ 58 | ≤ 2.5% |
| 2 | ≤ 15% | ≥ 52 | ≤ 4.0% |
| 0 | > 15% | < 52 | > 4.0% |

### Step 7 — Aggregate

Per-metric score = mean of its three signal scores, to one decimal.

Code Quality (Dimension 2) score = mean of decomposition and max member CC per-metric scores.
Maintainability (Dimension 9) score = MI per-metric score directly.

Round both to one decimal.

### Step 8 — Identify offenders

For each of the three primary metrics, list the top 10 worst classes by that metric's primary ratio. Tie-break by class CC descending.

For each offender, record: project, namespace, type, archetype, metric value, class_cc, member_count, max_member_cc, class_mi, coupling, loc.

### Step 9 — Estimate score lift (optional but valuable)

For the top 3 offenders by composite badness, compute what the metric scores would be if those classes were excluded. Quote the lift as part of the Top 3 Issues. Example: "Refactoring CustomersController and ContractCreationService would lift Code Quality from 6.0 to an estimated 6.7."

---

## Per-Archetype Scoring Reference

The thresholds in Step 6 apply to the codebase as a whole. They are deliberately archetype-agnostic for the v1 composite score — apps and libraries can be compared directly because the population statistics absorb archetype mix.

When ranking offenders within the prose narrative, use these archetype-specific notes to calibrate severity:

- **Entity/Model, DTO/Model, EFConfig, Config**: any single-method CC over 10 is severe. These should be near-zero logic.
- **Repository**: max member CC up to 15 is normal (complex queries). Above 20 indicates a query that should be split or moved to a service. Coupling is naturally elevated (touches entity, context, parameters) — don't penalize.
- **Mapper**: inherently branchy. Max member CC up to 20 is acceptable but anything over 25 should be decomposed.
- **Validator** (declarative — `AbstractValidator<T>` style): max member CC up to 6, decomposition up to 5 is fine. Lots of small `RuleFor` methods is the expected shape. Anything with a single-method CC over 8 has imperative logic embedded and should have been reclassified to Service in Step 4.
- **Service**: max member CC over 10 starts indicating insufficient decomposition. Decomposition ratio over 4 indicates fat methods. This category includes Manager, Job, Worker, BackgroundService, Strategy, Policy, Rule, Stage, Processor, Calculator, Generator, Assembler, Sender, Engine, Orchestrator, Dispatcher, Fetcher, Loader, Matcher, Aggregator, and any `contains 'Parser'` type.
- **Controller**: should be thin. Max member CC over 8 is concerning, decomposition ratio over 3 is concerning. Includes Hub.
- **Infrastructure** (Filter, Handler, Middleware, Attribute, Provider, Resolver, Decorator, Interceptor, Client, Connector, Gateway): should be thin. Max member CC up to 12 is acceptable, decomposition up to 6. Anything beyond is doing real work and likely belongs in a Service. Decorators that wrap a Repository inherit Repository thresholds (see Step 4). HTTP Clients with CC over 15 in a single method are doing domain work that should live in a Service.
- **Helper/Extension**: variable. Static method bags that grow large enough to score badly are a smell — split into focused extension classes per concern.
- **Builder/Factory**: max member CC up to 10. Builders that exceed this are usually doing construction logic that belongs in the constructed type or a service.
- **Mapper** (including Converter and Transformer): inherently branchy. Max member CC up to 20 is acceptable but anything over 25 should be decomposed.
- **DbContext**: coupling is meaningless (it touches every entity by design). Skip coupling-based criticism. CC over 50 in a DbContext usually means it has fluent configuration logic that should be in EFConfig classes.
- **God/Legacy**: any class reclassified into this archetype during Step 4 is automatically a top-3 issue regardless of where it ranks numerically.

---

## Output Format

Return exactly this, in this order:

### 1. Scorecard Table

Markdown table with columns: **Dimension**, **Score**, **Evidence**.

For deterministic dimensions, evidence is a one-sentence summary of the three signal scores plus the primary offender. For qualitative dimensions, evidence is one sentence with a concrete artifact (file, pattern, count).

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Architecture & SOLID | | |
| Code Quality | *X.X* | *Decomp X / MaxCC X / extreme rate Y%; worst: ClassName (ratio Z)* |
| Testing | | |
| Security | | |
| Error Handling | | |
| Documentation | | |
| Dependency Management | | |
| Performance & Async | | |
| Maintainability | *X.X* | *%MI<60: Y%, p10 MI: Z, N classes with MI<40* |
| **Overall** | | Unweighted mean of applicable scores, one decimal |

### 2. Deterministic Evidence Summary

Below the main scorecard, include a compact table of JSON evidence status:

| Dimension | Source | Status | Basis / probe summary |
|---|---|---|---|
| Code Quality | JSON or CSV fallback | completed/skipped/failed/fallback | Key thresholds or fallback reason |

For skipped/failed dimensions, show the explicit reason and what fallback was used. If JSON was unavailable and CSV fallback was used, say so in the Source column.

### 3. Deterministic Detail (Dimensions 2 and 9)

Below the main scorecard, include a section showing the three-signal breakdown:

```
Code Quality detail
  Decomposition ratio:    P=X T=X E=X  → score X.X
  Max member CC:          P=X T=X E=X  → score X.X
  Composite:                            → score X.X

Maintainability detail
  Maintainability index:  P=X T=X E=X  → score X.X
```

### 4. Top Offenders by Metric

For each of the three primary metrics, list the top 5 (not 10) worst classes with their metric value, archetype, and a one-sentence reason. Surface God/Legacy reclassifications even if they rank below 5.

### 5. Top 3 Issues

Highest-impact problems to fix first. For each:

- What it is
- Where (file/pattern/count)
- Why it matters
- For deterministic-dimension issues: estimated score lift if fixed (from Step 9)

### 6. Score Lift Summary (when applicable)

If Top 3 Issues touch deterministic dimensions, restate the projected score after addressing them.

---

## Rules

- **Be strict.** Use the anchors literally for qualitative dimensions. A 6 means "adequate but inconsistent," not "pretty good." Use the threshold tables literally for deterministic dimensions.
- **Cite evidence.** Every score must reference a concrete artifact. Prefer JSON dimension evidence; for CSV fallback, cite offender names from the metrics export.
- **Do not estimate deterministic dimensions.** If JSON evidence is available, use it. If neither JSON nor CSV fallback is available for Code Quality or Maintainability, ask for evidence instead of guessing from reading code.
- **Do not pad.** Do not soften. If the codebase is bad, say so with evidence. If it's good, say so with evidence.
- **N/A is a real option** for dimensions where the codebase genuinely has no applicable surface. Not for Code Quality and Maintainability — every codebase has those scores when evidence can be generated.
- **One decimal on the overall.** Unweighted mean of applicable dimensions only.
- **After presenting the scorecard, ask what to investigate or fix next.** Do NOT begin implementing fixes unless asked.

---

## Troubleshooting

### `code-metrics: command not found` or `is not recognized`

The tool isn't installed. Run the install step from Bootstrap:

```pwsh
dotnet tool install -g CodeMetrics.AI
```

Make sure `%USERPROFILE%\.dotnet\tools` is on `PATH` (usually added automatically by the .NET SDK installer).

### Solution failed to load

**Symptom:** `code-metrics` exits with `No file format header found` or similar.

**Cause:** The solution path is wrong, or you're pointing at a `.sln` file but it's actually `.slnx` (or vice versa).

**Fix:** Pass the explicit path:

```pwsh
code-metrics --solution <path-to-.sln-or-.slnx> --output .scorecard\metrics.csv --scorecard-output .scorecard\evidence.json
```

If a project inside the solution fails to load, the tool logs a warning and continues — the CSV will still be produced for the projects that loaded successfully. Look at stderr for the failing project name to investigate.

### Missing or unsupported evidence.json

**Symptom:** `.scorecard\evidence.json` is absent, invalid JSON, or has an unsupported `schemaVersion`.

**Cause:** The scorecard was generated by an older `code-metrics` version, the command omitted `--scorecard-output`, or the skill schema is older/newer than the tool output.

**Fix:** Update `CodeMetrics.AI`, regenerate with the `Scorecard` target, and confirm the JSON validation command prints `Schema: 1`. If JSON remains unavailable but `.scorecard\metrics.csv` matches the requested solution/configuration, use CSV fallback only for Code Quality and Maintainability.

### Skipped or failed probes

**Symptom:** A JSON dimension has status `skipped` or `failed`.

**Cause:** The user intentionally skipped a probe (for example dependency checks), or the probe command failed while the rest of evidence generation succeeded.

**Fix:** Report the skipped/failed status and reason in the evidence summary. Regenerate without the skip flag or fix the underlying command when deterministic evidence is required. Do not silently replace failed JSON evidence with old qualitative scoring.

### Empty CSV (no Type/Member rows)

**Symptom:** `metrics.csv` contains only the header row.

**Cause:** Every project in the solution matched a skip rule (test, Aspire, benchmark, etc.) or the solution had no C# projects.

**Fix:** Verify project names against the skip patterns in `scorecard-tooling/README.md`. If a legitimate production project is being filtered, rename it or open an issue against `CodeMetrics.AI` to add an exception.

---

## Notes on Calibration

Thresholds in the deterministic tables were calibrated against four AMP codebases scored qualitatively at 9, 8, 2, and 2. The deterministic version preserves that ranking but produces a tighter spread (roughly 9.8 → 6.2 → 4.0 → 1.8). This is expected and informative:

- A wide gap between deterministic and qualitative scores on the same codebase tells you something. A codebase with high deterministic and low qualitative scores has clean metrics but fails on dimensions the metrics don't capture (security, architecture, testing). The reverse — low deterministic, high qualitative — is rare and worth investigating; usually means the qualitative reviewer was hedging.
- Codebases that score poorly only on the extreme signal (few but catastrophic classes) are different from codebases scoring poorly across population/tail/extreme (broadly degraded). The first is fixable in place; the second often warrants replacement. Surface this distinction in the Top 3 Issues prose.
