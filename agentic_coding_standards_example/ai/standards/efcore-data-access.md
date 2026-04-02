# Data Access Layer (DAL) Standards

> **Load when:** Working on entities, repositories, DbContext, or database queries

---

## Entities

* Database‑first scaffolding only
* `#nullable disable` at file level
* Partial classes only
* No logic, validation, or constructors

## Repositories

* One repository per entity
* Inherit from `BaseRepository<TEntity>`
* Use primary constructors (see [C# Conventions](csharp-conventions.md))
* Store typed DbContext in private readonly field
* All methods async with `CancellationToken cancellationToken = default`

## DbContext

* One DbContext per data source
* Regular constructor only
* Inherit from `BaseDbContext`

## Queries

* `AsNoTracking()` for reads
* Projection‑first queries (`Select`)
* Sanitize user input with `SanitizeTextFilter`
* Never build SQL strings manually
* `AsSplitQuery()` for queries with multiple includes

## Caching

* **No caching at DAL layer**
* Caching belongs in consuming applications