# Error Handling & Logging Patterns

> **Load when:** Writing error handling, catch blocks, logging statements, or exception classes

---

## Error Handling

### Controller-Level Pattern

Controllers catch exceptions and return consistent error responses. Do not let unhandled exceptions leak to the client.

```csharp
[HttpPost]
public async Task<IActionResult> CreateOrder(
    [FromBody] CreateOrderRequest request,
    CancellationToken ct)
{
    try
    {
        var orderId = await cachedOrderRepository
            .CreateOrderAsync(request, ct);

        return CreatedAtAction(nameof(GetOrder), new { orderId },
            new CreateOrderResponse { OrderId = orderId });
    }
    catch (OperationCanceledException)
    {
        logger.LogInformation("Request cancelled for order creation");
        return StatusCode(StatusCodes.Status408RequestTimeout,
            "The request was cancelled.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex,
            "Error creating order for account {AccountNumber}",
            request.AccountNumber);
        return StatusCode(StatusCodes.Status500InternalServerError,
            "An error occurred while creating the order.");
    }
}
```

### Error Response Format

API projects: `sealed record ErrorResponse { bool Success; string Message; }` — `Success` is always `false` for errors.

MVC (Web) projects: `return Json(new { success = false, message = "..." });`

### Exception Handling Rules

| Rule | Details |
|---|---|
| **Catch at boundaries** | Controllers, middleware, background service loops |
| **Don't catch to ignore** | Every catch block must log or return a meaningful response |
| **Catch specific first** | `OperationCanceledException` before `Exception` |
| **Re-throw in services** | Services should not swallow exceptions — let them bubble to the controller |
| **No custom exception classes** | Use standard .NET exceptions (`ArgumentNullException`, `InvalidOperationException`, `KeyNotFoundException`) |
| **Never expose internals** | Return generic messages to clients; log the full exception server-side |

### Status Code Usage

| Code | When to Use |
|---|---|
| `200 OK` | Successful GET, PUT |
| `201 Created` | Successful POST that creates a resource (use `CreatedAtAction`) |
| `204 No Content` | Successful DELETE |
| `400 Bad Request` | Invalid input, validation failure |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | Authenticated but not authorized |
| `404 Not Found` | Resource does not exist |
| `408 Request Timeout` | `OperationCanceledException` caught |
| `500 Internal Server Error` | Unexpected exception (always log full exception) |

---

## Logging

### ILogger&lt;T&gt; Injection

Inject `ILogger<T>` via primary constructor in every class that needs logging (see [C# Conventions](csharp-conventions.md)).

### Log Levels

| Level | Use For | Example |
|---|---|---|
| `LogDebug` | Detailed diagnostics, cache hits/misses, internal state | `"Starting cache refresh for key: {CacheKey}"` |
| `LogInformation` | Successful operations, business events, auth events | `"Successfully retrieved user for username: {Username}"` |
| `LogWarning` | Recoverable issues, unexpected HTTP responses, validation gaps | `"External API returned {StatusCode} for account: {AccountNumber}"` |
| `LogError` | Exceptions, operation failures — always include the exception object | `LogError(ex, "Error creating order for account {AccountNumber}", ...)` |

### Structured Logging (Message Templates)

Always use message templates with named parameters — never string interpolation. Always pass the exception object as the first argument to `LogError` to capture the full stack trace.

```csharp
// ✅ Correct
logger.LogInformation("Retrieved user {Username}. External found: {ExternalUserFound}", username, externalUser != null);
logger.LogError(ex, "Error creating order for account {AccountNumber}", request.AccountNumber);

// ❌ Wrong — interpolation destroys structured logging; omitting ex loses the stack trace
logger.LogInformation($"Retrieved user {username}");
logger.LogError("Error: {Message}", ex.Message);
```

### OperationCanceledException

Cancellation is expected, not an error. Log at `Information` and don't re-throw from controller or service boundaries.

```csharp
catch (OperationCanceledException)
{
    logger.LogInformation("Request cancelled for operation: {Operation}", nameof(GetOrders));
    return StatusCode(StatusCodes.Status408RequestTimeout, "The request was cancelled.");
    // In background service loops: use `break` instead of returning.
}
```

### Logging Configuration

Standard `appsettings.json` log levels: `Default` → `Information` · `Microsoft.AspNetCore` → `Warning` · App namespace → `Debug` when needed.

> For what not to log, see [Security](security-standards.md) — Logging Security.
