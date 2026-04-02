# DTO & Mapping Conventions

> **Load when:** Creating DTOs, request/response objects, view models, or mapping logic
>
> For a complete DTO example in context (request, response, controller, tests), see [`examples/orders-reference.cs`](examples/orders-reference.cs).

---

## DTO Types & When to Use Each

| Type | Use For | Example |
|---|---|---|
| **Response DTO** | Data returned from API endpoints | `OrderResponse` |
| **Request DTO** | Data received by API endpoints | `UpdateAccountInfoRequest` |
| **Dto** | Data transferred between Web app and API | `GroupedPendingOrderDto` |
| **ViewModel** | Data bound to MVC views/partials | `NewOrderViewModel` |
| **Model** | Internal API-layer models (not exposed) | `OrderModel` |

---

## DTO Structure

### API Response DTOs

`sealed record` with `init` properties. Use `required` for critical fields. No validation attributes. See [`examples/orders-reference.cs`](examples/orders-reference.cs) — `Layer 4: DTOs`.

### API Request DTOs

`sealed record` with `init` properties **and** validation attributes.

```csharp
namespace MyApp.API.Requests;

public sealed record UpdateAccountInfoRequest
{
    [Required]
    public int AccountNumber { get; init; }

    [Required]
    [StringLength(255)]
    public string AccountName { get; init; } = null!;

    [StringLength(20)]
    [Phone]
    public string? BusinessPhone { get; init; }

    [Url]
    public string? Website { get; init; }

    [EmailAddress]
    public string? Email { get; init; }
}
```

### Web DTOs (MVC ↔ API)

`sealed record` with `required` for critical fields. Mirror the API response shape.

```csharp
namespace MyApp.Web.Models.Api;

public sealed record GroupedPendingOrderDto
{
    public required Guid BundleLinkKey { get; init; }
    public required IReadOnlyList<string> ProductTitles { get; init; }
    public required int AccountNumber { get; init; }
    public required string AccountName { get; init; }
    public IReadOnlyList<ProductDocumentsDto> Documents { get; init; } = [];
}
```

### ViewModels (MVC Views)

Classes are acceptable for ViewModels that need two-way binding. Use `sealed class` when possible.

```csharp
namespace MyApp.Web.Models.NewOrder;

public sealed class NewOrderViewModel
{
    public int UserId { get; set; }
    public string AccountName { get; set; } = string.Empty;
    public List<ProductPartialViewModel> Products { get; set; } = [];
}
```

---

---

## Project Placement

```
MyApp.API/
├── Requests/         ← API request DTOs (with validation)
├── Responses/        ← API response DTOs (no validation)
└── Models/           ← Internal models (not exposed via endpoints)

MyApp.Web/
├── Models/Api/       ← DTOs for API communication
├── Models/{Feature}/ ← ViewModels grouped by feature
└── Models/Components/← Shared UI component ViewModels

MyApp.ExternalApi/
└── Models/           ← Integration DTOs
```

---

## Mapping

### Mapperly (Preferred)

Use Mapperly (`[Mapper]` attribute) for straightforward property-to-property mapping. It generates source code at compile time — no runtime reflection.

```csharp
using Riok.Mapperly.Abstractions;

namespace MyApp.API.Mapping;

[Mapper]
public partial class EmployeeMapper
{
    public partial EmployeeResponse MapToResponse(Employee entity);

    [MapperIgnoreSource(nameof(Employee.InternalField))]
    public partial EmployeeResponse MapFromFull(FullEmployee entity);
}
```

### Static Mapper Methods (Complex Scenarios)

Use static mapper classes when mapping requires custom logic, null handling, or data from multiple sources.

```csharp
namespace MyApp.API.Mapping;

public static class ProductMapper
{
    public static ProductResponse MapToResponse(
        ActiveProductResult source,
        IReadOnlyDictionary<string, string> regionCodeMap)
    {
        return new ProductResponse
        {
            ProductId = source.ProductId,
            DisplayText = $"{source.ZipCode} | {source.City} | {source.State}",
            IsAdmin = source.IsAdmin == 1
        };
    }

    public static List<ProductResponse> MapToResponseList(
        IEnumerable<ActiveProductResult> sources,
        IReadOnlyDictionary<string, string> regionCodeMap)
    {
        return sources
            .Select(s => MapToResponse(s, regionCodeMap))
            .ToList();
    }
}
```

### When to Use Each

Use Mapperly for simple 1:1 property mapping. Use a static method when you need custom logic, null coalescing, type conversion, or external lookup data (dictionaries, lookups).

### Rules

- **Never map in controllers** — mapping belongs in mapper classes or cached repositories
- **One mapper per domain area** — e.g., `EmployeeMapper`, `ProductMapper`
- **Mapper registration** — Mapperly mappers: `AddSingleton`; static mappers need no registration
