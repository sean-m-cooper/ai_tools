# CSV Deterministic Fallback (Dimensions 2 and 9)

Use this file **only** when JSON evidence is missing or unsupported for Code Quality (Dimension 2) or Maintainability (Dimension 9) and a `.scorecard\metrics.csv` export is available. For all other cases, score from `.scorecard\evidence.json` per `SKILL.md`.

Steps are mechanical — no judgment until the offender narrative.

## Step 1 — Load and filter

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

## Step 2 — Derive per-class values

For every surviving type row:

- `member_count` = count of Member-scope rows for the type
- `class_cc`, `class_mi`, `coupling`, `loc` = values from the type-scope row
- `max_member_cc` = max Cyclomatic Complexity across the type's member rows
- `avg_member_cc` = mean Cyclomatic Complexity across the type's member rows
- `decomposition` = `class_cc / member_count`

Drop classes with `member_count == 0` (their ratios are undefined).

## Step 3 — Tag archetypes (heuristic pass)

Apply this name-and-namespace heuristic to every class, **in order**. The first matching rule wins; later rules don't apply once a tag is set. The tag drives offender ranking and prose interpretation; per-archetype scoring is documented separately at the bottom of this file.

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

## Step 4 — Verify archetypes for outliers

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

## Step 5 — Compute inheritance leverage

For classes with `Depth of Inheritance ≥ 2` AND `member_count ≥ 5`, read the source file and count members declared in that file (vs. inherited from base classes). Compute:

`inheritance_leverage = declared_members_at_leaf / depth_of_inheritance`

Low ratios indicate polymorphism (good — leaf overrides a few methods). High ratios indicate inheritance used for code reuse (bad — leaf adds many new members on top of inherited ones).

This metric is reported but not yet folded into the composite score in this version. Surface it in the offender list when a class scores poorly on it.

## Step 6 — Score the three primary metrics

For each metric, compute three signals and look up each on its threshold table.

### Decomposition ratio

| Score | % classes with ratio > 4 (population) | p90 ratio (tail) | count of ratio > 15, as % of n (extreme) |
|---|---|---|---|
| 10 | ≤ 1% | ≤ 2.0 | ≤ 0.1% |
| 8 | ≤ 3% | ≤ 2.5 | ≤ 0.5% |
| 6 | ≤ 6% | ≤ 3.5 | ≤ 1.0% |
| 4 | ≤ 10% | ≤ 5.0 | ≤ 2.0% |
| 2 | ≤ 15% | ≤ 7.0 | ≤ 4.0% |
| 0 | > 15% | > 7.0 | > 4.0% |

### Max member cyclomatic complexity

| Score | % classes with max member CC > 15 | p90 max member CC | count of max member CC > 30, as % of n |
|---|---|---|---|
| 10 | ≤ 0.5% | ≤ 4 | ≤ 0.2% |
| 8 | ≤ 2% | ≤ 6 | ≤ 0.6% |
| 6 | ≤ 4% | ≤ 9 | ≤ 1.2% |
| 4 | ≤ 7% | ≤ 12 | ≤ 2.5% |
| 2 | ≤ 10% | ≤ 16 | ≤ 4.0% |
| 0 | > 10% | > 16 | > 4.0% |

### Maintainability index

| Score | % classes with MI < 60 | p10 MI (tail; higher is better) | count of MI < 40, as % of n |
|---|---|---|---|
| 10 | ≤ 1% | ≥ 75 | ≤ 0.2% |
| 8 | ≤ 3% | ≥ 70 | ≤ 0.5% |
| 6 | ≤ 6% | ≥ 65 | ≤ 1.2% |
| 4 | ≤ 10% | ≥ 58 | ≤ 2.5% |
| 2 | ≤ 15% | ≥ 52 | ≤ 4.0% |
| 0 | > 15% | < 52 | > 4.0% |

## Step 7 — Aggregate

Per-metric score = mean of its three signal scores, to one decimal.

Code Quality (Dimension 2) score = mean of decomposition and max member CC per-metric scores.
Maintainability (Dimension 9) score = MI per-metric score directly.

Round both to one decimal.

## Step 8 — Identify offenders

For each of the three primary metrics, list the top 10 worst classes by that metric's primary ratio. Tie-break by class CC descending.

For each offender, record: project, namespace, type, archetype, metric value, class_cc, member_count, max_member_cc, class_mi, coupling, loc.

## Step 9 — Estimate score lift (optional but valuable)

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

## Notes on Calibration

Thresholds in the deterministic tables were calibrated against four AMP codebases scored qualitatively at 9, 8, 2, and 2. The deterministic version preserves that ranking but produces a tighter spread (roughly 9.8 → 6.2 → 4.0 → 1.8). This is expected and informative:

- A wide gap between deterministic and qualitative scores on the same codebase tells you something. A codebase with high deterministic and low qualitative scores has clean metrics but fails on dimensions the metrics don't capture (security, architecture, testing). The reverse — low deterministic, high qualitative — is rare and worth investigating; usually means the qualitative reviewer was hedging.
- Codebases that score poorly only on the extreme signal (few but catastrophic classes) are different from codebases scoring poorly across population/tail/extreme (broadly degraded). The first is fixable in place; the second often warrants replacement. Surface this distinction in the Top 3 Issues prose.
