# C# Conventions

> **Load when:** Making any C# code changes

---

## Constructors & DI

* **Primary constructors** required for services, repositories, controllers
* **No primary constructors** for:
  * DbContext classes
  * EF Core entities
* Constructor injection only

## Async & Concurrency

* Async/await end‑to‑end
* Never block on `.Result` or `.Wait()`
* Always accept and propagate `CancellationToken`
* Parallelize independent I/O using `Task.WhenAll`
* Continuations allowed **only** for:
  * Fault-only handling
  * Background side‑effects
  * Scheduler control

## Collections & Language Features

* Prefer **collection expressions** (`[]`)
* Use spread operator (`..`) when merging
* Use `required` for mandatory DTO properties
* Nullable reference types enabled by default