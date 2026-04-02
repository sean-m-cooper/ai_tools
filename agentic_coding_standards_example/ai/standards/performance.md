# Performance Guidelines

> **Load when:** Optimising performance-critical code paths

---

## Measure First

Profile with `dotnet-trace` or Application Insights before making any change in the name of performance. A change without a measured baseline is speculation, not optimisation.

## EF Core (highest impact, most common regression source)

- `AsNoTracking()` on all read queries
- Prefer `Select` projections over loading full entities when only a subset of columns is needed
- Avoid N+1: use `Include` / `ThenInclude` or split into two queries — never query inside a loop
- `AsSplitQuery()` for queries with multiple collection includes; pair with `AsNoTrackingWithIdentityResolution()` instead of `AsNoTracking()`

## Hot Paths

- `ValueTask` instead of `Task` for frequently-called async methods that often complete synchronously (e.g. cache hits)
- `Span<T>` / `ReadOnlySpan<T>` for string parsing and slicing — avoids heap allocations
- `SearchValues<T>` for repeated set-membership checks on fixed character sets
- `CompositeFormat` for message templates called in tight loops (pre-compiles the format string)

## When NOT to Optimise

Don't use `Span<T>`, `CollectionsMarshal`, or `unsafe` outside of genuinely hot paths — the readability cost is high and the gain is zero on infrequently-called code.
