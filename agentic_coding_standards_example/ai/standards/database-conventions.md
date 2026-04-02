# Database Conventions

> **Load when:** Creating or modifying database schema, entities, or writing queries

---

## Databases

| Database | Engine | DbContext | Schema(s) |
|---|---|---|---|
| `appdb` | SQL Server | `AppDbContext` | `app`, `legacy` |
| `crmdb` | SQL Server | `CrmDbContext` | `crm` |
| `externalcrm` | MySQL | via `Pomelo.EntityFrameworkCore.MySql` | — |

---

## Naming Conventions

### Tables

- **snake_case**, lowercase: `order`, `document`, `data_export`
- Always specify schema explicitly: `[Table("order", Schema = "app")]`

### Columns

- **snake_case**, lowercase: `account_number`, `account_name`, `contract_link_key`
- Primary key: `id` (lowercase)
- Foreign keys: `{referenced_table}_id` — e.g., `document_id`, `product_id`

### Indexes

- Prefix with `ix_`: `ix_order`, `ix_account`, `ix_empid`
- Composite indexes name the key columns: `ix_employee_id_deleted`, `ix_start_end`
- Unique indexes include `IsUnique = true` in the attribute

```csharp
[Index("OrderNumber", Name = "ix_order_number")]
[Index("Empid", "Deleted", Name = "ix_empid", IsUnique = true)]
```

### Databases

- **snake_case**, lowercase: `product_info`, `employee_data`

---

## Audit Columns

### Standard Pattern

| Column | Type | Purpose |
|---|---|---|
| `created` | `datetime` | Row creation timestamp |
| `created_by` | `varchar(100)` | User who created the row |
| `created_note` | `varchar(500)` | Optional creation context |
| `modified` | `datetime` | Last modification timestamp |
| `modified_by` | `varchar(100)` | User who last modified the row |

### Alternate Pattern

| Column | Type | Purpose |
|---|---|---|
| `date_entered` | `datetime` | Row creation timestamp |
| `date_modified` | `datetime` | Last modification timestamp |
| `created_by` | `varchar(36)` | User ID who created |
| `modified_user_id` | `varchar(36)` | User ID who last modified |

---

## Soft-Delete Pattern

Soft-delete is implemented via the `ISoftDeletable` interface in the DAL:

```csharp
public interface ISoftDeletable
{
    DateTime? Deleted { get; }
}
```

- Column: `deleted_date_time` (nullable `datetime` or `int`)
- `BaseDbContext` automatically filters soft-deleted rows unless `BypassDeletedFilter = true`
- Include `Deleted` in composite indexes where appropriate: `ix_employee_id_deleted`

**Rules:**
- Never use hard deletes on entities that implement `ISoftDeletable`
- Set the `deleted` column to the current timestamp to soft-delete
- Use `BypassDeletedFilter = true` only when you explicitly need to include deleted records

---

## Schema Changes

- **No EF Core migrations** — schema changes are managed via manual SQL scripts
- Document ALTER TABLE scripts in the relevant ticket's Technical Details field
- Test schema changes against a copy of the target database before applying to shared environments

```sql
-- Example: Adding columns to an existing table
ALTER TABLE [app].[order] ADD
    contact_name NVARCHAR(100) NULL,
    mobile_phone NVARCHAR(20) NULL;
```

---

## Data Access Rules

See [EF Core & Data Access](efcore-data-access.md) for query rules. Two additions specific to this project:

- `AsSplitQuery()` with multiple includes: use `AsNoTrackingWithIdentityResolution()` instead of `AsNoTracking()` to avoid duplicate object instances across split result sets
- Register DbContexts with connection pooling (`AddDbContextPool<T>`) and resilience (`EnableRetryOnFailure` via `UseSqlServer` options or a Polly-based retry policy)
