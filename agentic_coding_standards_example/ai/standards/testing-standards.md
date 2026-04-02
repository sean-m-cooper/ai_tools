# Testing Standards

> **Load when:** Writing or modifying tests

---

## Naming & Structure

- Naming: `Method_ShouldOutcome_WhenCondition`
- `[Fact]` for single cases; `[Theory]` + `[InlineData]` for data-driven
- One behavioural focus per test — a test can have multiple `Assert` calls if they all verify the same outcome
- No logic (`if`, loops) inside test bodies
- Arrange / Act / Assert structure; blank line between each section

## Unit Tests (Moq, no real dependencies)

- Mock all external dependencies — repositories, HTTP clients, cache, logger
- Constructor setup: create all mocks and the SUT in the test class constructor
- `Times.Once` / `Times.Never` only on interactions that matter — not every mock call
- Always pass `CancellationToken.None` in tests

**Don't test:**
- EF Core scaffolded entities
- DI registration (`Program.cs`)
- Auto-generated or framework code

## Integration Tests (Testcontainers, real DB)

- Scope: repository methods and query correctness only — not controller or service logic
- Use Testcontainers with a real SQL Server instance; never `UseInMemoryDatabase` for integration tests (it does not enforce constraints or support raw SQL)
- Seed test data in test setup, not in migrations

## General

- Framework: MSTest v2 or xUnit
- No `Thread.Sleep` — use fake clocks or `ITimeProvider` abstractions for time-dependent logic
- Avoid timing-based flakiness; all async tests use `async Task`
