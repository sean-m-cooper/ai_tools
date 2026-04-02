# Reference Implementation — Canonical Vertical Slice

> **Load when:** Building a new feature end-to-end, or needing a pattern reference for any layer

This document shows the **golden-path implementation** for a complete vertical slice. All code examples are in [`examples/orders-reference.cs`](examples/orders-reference.cs).

The slice flows: Controller → Cached Repository → DAL Repository → DbContext → Entity → Response DTO.

---

## Layer 1: Entity (DAL)

Entities are database-first, scaffold-generated partial classes. No logic, no constructors, no validation.

> → `Layer 1: Entity`

**Rules:**
- `#nullable disable` at file level
- `partial class` only
- Data annotations for schema mapping (`[Table]`, `[Column]`, `[Key]`)
- No business logic, no constructors, no methods

---

## Layer 2: Repository Interface (DAL)

Domain-specific interfaces extend the generic `IBaseRepository<TEntity>`.

> → `Layer 2: Repository Interface`

**Rules:**
- Inherit from `IBaseRepository<TEntity>` (provides CRUD for free)
- Add only domain-specific query methods
- All methods async with `CancellationToken cancellationToken = default`

---

## Layer 3: Repository Implementation (DAL)

> → `Layer 3: Repository Implementation`

**Rules:**
- Primary constructor, pass context to `BaseRepository<T>`
- Store typed DbContext in private readonly field
- `AsNoTracking()` for all read queries
- Always propagate `CancellationToken`
- Inherit base CRUD — only add domain-specific queries

---

## Layer 4: Request & Response DTOs (API)

> → `Layer 4: DTOs`

**Rules:**
- `sealed record` for immutability
- `required` for mandatory properties
- `IReadOnlyList<T>` for collections (not `List<T>`)
- No EF Core entity types — always map to DTOs

---

## Layer 5: Cached Repository (API)

The API layer wraps DAL repositories with caching and mapping.

> → `Layer 5: Cached Repository`

**Rules:**
- `sealed class` with primary constructor
- Inject DAL repositories, mapper, cache, logger
- Cache pattern: `cache.GetOrAddAsync(key, factory, ttl)`
- Map entities → DTOs before returning (never expose EF entities)
- No business logic — orchestration and caching only

---

## Layer 6: API Controller

> → `Layer 6: API Controller`

**Rules:**
- `[ApiController]` attribute on class
- Primary constructor with DI
- Inherit from `ControllerBase` (not `Controller`)
- `[ProducesResponseType]` on every action
- Accept `CancellationToken` on every async action
- Return `IActionResult` with appropriate status codes
- Use request DTOs for complex inputs
- Return response DTOs — never EF entities

---

## Layer 7: Unit Tests

> → `Layer 7: Unit Tests`

**Rules:**
- `sealed class`, no base class
- Naming: `Method_ShouldOutcome_WhenCondition`
- Moq for all dependencies
- Constructor setup — create all mocks and the SUT
- Arrange / Act / Assert structure
- `[Fact]` for single cases, `[Theory]` + `[InlineData]` for parameterized
- `#region` blocks to group tests by method under test
- Verify interactions with `Times.Once` where important
- Always pass `CancellationToken.None` in tests

---

## DI Registration (Program.cs)

> → `DI Registration`

**Rules:**
- DAL repositories: `AddScoped`
- Cached repositories: `AddScoped`
- Cache service: `AddSingleton`
- Mappers: `AddSingleton`

