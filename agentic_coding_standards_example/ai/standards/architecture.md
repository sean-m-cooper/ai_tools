# Architecture & Technology Stack

This module defines the supported technology stack, architectural style, and foundational design principles.

---

## Supported Technology Stack

### Primary Platforms

.NET 10 (primary) · .NET 6 / .NET Framework 4.8 (legacy) · C# 14/10 · EF Core 10/6 · AWS Lambda (.NET) · Azure Functions (.NET isolated worker)

### Architectural Style

* Clean / Onion Architecture
* Dependency flow: Presentation → Application → Domain
* Infrastructure registered via DI only

---

## Foundational Design Principles

All code — whether human‑written or AI‑generated — **must** adhere to the following foundational design principles. These are non‑negotiable and apply across every layer of the architecture.

### Clean Architecture

* Dependency Rule: source‑code dependencies point **inward only** (Presentation → Application → Domain).
* Domain layer has **zero** external dependencies.
* Infrastructure concerns (databases, APIs, file systems) are isolated behind abstractions and injected via DI.
* Reference: Robert C. Martin's *Clean Architecture*.

### SOLID Principles

| Principle | Guideline |
|---|---|
| **S** – Single Responsibility | Every class and method has one reason to change. |
| **O** – Open/Closed | Extend behavior through abstraction, not modification of existing code. |
| **L** – Liskov Substitution | Subtypes must be substitutable for their base types without altering correctness. |
| **I** – Interface Segregation | Prefer small, focused interfaces over large, general‑purpose ones. |
| **D** – Dependency Inversion | Depend on abstractions, not concretions; inject dependencies via constructor. |

### DRY (Don't Repeat Yourself)

* Extract shared logic into reusable methods, base classes, or shared libraries.
* Avoid duplicating business rules, validation logic, or configuration across services.
* When the same concept appears in more than one place, consolidate it behind a single abstraction.

> **AI agents must actively apply these principles** when generating, modifying, or reviewing code. Violations of SOLID, DRY, or Clean Architecture boundaries are treated the same as any other standards violation and will result in rework or PR rejection.

### When to Deviate

Standards exist to produce consistent, high-quality code — not to override engineering judgment. If a standard conflicts with correctness, security, or produces a measurably worse outcome, **deviate and document it**.

When deviating:

1. Add an inline comment citing the standard and explaining the rationale
2. Keep the deviation as narrow as possible

```csharp
// Deviation from csharp-conventions: sequential calls required here because
// both queries use the same DbContext, which is not thread-safe.
var customer = await _repo.GetByIdAsync(id, ct);
var orders = await _repo.GetOrdersAsync(id, ct);
```

Undocumented deviations will be treated as standards violations during code review.