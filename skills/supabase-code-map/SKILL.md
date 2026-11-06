---
name: supabase-code-map
description: >-
  Generate an AI-optimized YAML code map (.codemap.yaml) at the repository root
  for any Supabase project. Detects the actual setup: migrations, edge functions,
  RLS policies, auth provider (native Supabase Auth / Clerk / Auth0 / custom),
  JSONB column schemas, storage buckets, database functions and triggers, views,
  and generated TypeScript types. Adapts the output — only sections relevant to
  what's actually present are written.
  Invoke to create or regenerate the map after schema migrations, new edge functions,
  new RLS policies, or major structural changes.
  Use when asked to "map the database", "generate a codemap", "create a codemap",
  "supabase-code-map", or "help an AI understand this Supabase project".
---

# Supabase Code Map Generator

**Output**: `.codemap.yaml` at repository root
**Format**: YAML — optimized for AI token efficiency
**Version**: 1.0

> **Philosophy**: Detect what's actually in this project, then produce a compact, accurate,
> machine-readable map that lets an AI agent understand the full schema, RLS approach,
> and function surface without reading every migration file from scratch.
> Never assume a feature is configured — verify first.

---

## When to Use This Skill

✅ Initial onboarding — no `.codemap.yaml` exists yet
✅ After new migrations — schema changes, new tables, updated RLS policies
✅ After new edge functions are added or removed
✅ After significant RLS policy changes
❌ Minor data changes within existing tables (the map is structural, not row-level)

---

## Generation Procedure

Follow these steps **in order**. Do not skip steps. Do not guess — verify by reading actual files.

### Step 1: Detect What's Present

Check for the existence of these items before attempting to read them:

**Config:**
- `supabase/config.toml` — primary Supabase project configuration

**Migrations:**
- `supabase/migrations/*.sql` — chronological schema migrations

**Edge functions:**
- `supabase/functions/*/index.ts` — Deno-based edge functions
- `supabase/functions/_shared/` — shared utilities used by functions

**Seed & type files:**
- `supabase/seed.sql` — seed data
- `types/supabase.ts`, `src/types/supabase.ts`, or similar — generated TypeScript types
  (look for a file containing `export type Database = {`)

**Auth provider:**
- Check `supabase/config.toml` for `[auth.third_party.clerk]`, `[auth.third_party.auth0]`
- If no third-party section: native Supabase Auth

**Storage:**
- Check `supabase/config.toml` for `[storage]` section with `enabled = true`
- Check migrations for `storage.buckets` insert statements

**Realtime:**
- Grep migrations and function files for `supabase_realtime` or `REPLICA IDENTITY FULL`

Record what exists. Only process sections that are present.

### Step 2: Read Configuration

If `supabase/config.toml` exists, read it and extract:

**Project identity:**
- `project_id`
- `[api]` → `port`, `schemas`

**Auth settings** (`[auth]` section):
- `site_url`
- `jwt_expiry`
- `enable_signup`
- `[auth.email]` → `enable_confirmations`, `double_confirm_changes`
- `[auth.sms]` → if present, note SMS auth is enabled
- `[auth.external.*]` → list any OAuth providers configured (Google, GitHub, Apple, etc.)
- `[auth.third_party.*]` → Clerk, Auth0, or other third-party auth

**Storage** (`[storage]` section):
- `enabled`
- `file_size_limit`

**Edge functions** (`[functions.*]` sections):
- `verify_jwt` setting per function (true = requires Supabase auth, false = open/webhook)

### Step 3: Build Schema from Migrations

Read **all** migration files in `supabase/migrations/` in **chronological order** (by filename prefix).

As you read each file, build a cumulative picture of the schema:
- Tables created (`CREATE TABLE`)
- Tables altered (`ALTER TABLE` — column additions, renames, type changes)
- Tables dropped (`DROP TABLE`)
- Indexes created (`CREATE INDEX`)
- Constraints added (`ADD CONSTRAINT`)
- Policies created (`CREATE POLICY`)
- Views created (`CREATE VIEW`)
- Functions created (`CREATE FUNCTION`)
- Triggers created (`CREATE TRIGGER`)
- RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)

The final state after all migrations is your authoritative schema. Do not represent intermediate states.

### Step 4: Catalog Tables

For the final schema state (after Step 3), for each table document:

1. **Table name**
2. **RLS enabled**: yes or no
3. **Columns**: for each column record `"column_name type [NOT NULL] [DEFAULT value]"`
   - Abbreviate common types: `text`, `uuid`, `bool`, `int4`, `int8`, `timestamptz`, `jsonb`
   - Note `PRIMARY KEY` inline if single-column PK
4. **Primary key**: list the column(s) if composite
5. **Unique constraints**: list unique column combinations
6. **Indexes**: list non-PK, non-unique indexes with their purpose

Skip internal Supabase tables (`auth.*`, `storage.*`, `realtime.*`, `supabase_migrations`).
Skip `pg_*` system tables.

### Step 5: Map Foreign Keys

For every foreign key constraint found in migrations:
Record: `child_table.column → parent_table.column (ON DELETE behavior)`

Group by child table. This gives the AI agent the full relationship graph at a glance.

### Step 6: Document RLS Policies

If any table has RLS enabled:

**Helper functions first** — if migrations define functions used inside policies
(e.g., `requesting_user_id()`, `user_has_role()`, `user_org_ids()`):
List each with: name, one-line description of what it returns/checks.

**Per-table policies** — for each RLS-enabled table, list every policy:
Format: `"COMMAND [TO role] — expression summary"`
where:
- COMMAND = SELECT | INSERT | UPDATE | DELETE | ALL
- role = authenticated | anon | service_role | specific_role (omit if not restricted to a role)
- expression summary = terse description of the USING or WITH CHECK clause (not the raw SQL)

Example: `"SELECT TO authenticated — user matches requesting_user_id() OR is org member"`

Keep expressions terse — the AI needs to understand access control intent, not re-read the SQL.

### Step 7: Document Views

For each view found in migrations:
- Name
- One-line purpose
- Security model: `SECURITY INVOKER` (uses caller's permissions, default) or `SECURITY DEFINER` (runs as owner)
- Key columns or filter logic (1 sentence)

### Step 8: Document Database Functions & Triggers

If migrations define PostgreSQL functions or triggers (beyond RLS helper functions):

**Functions** (`CREATE FUNCTION`):
- Name and signature
- Language (plpgsql, sql, etc.)
- One-line purpose

**Triggers** (`CREATE TRIGGER`):
- Table it fires on
- Event (BEFORE/AFTER INSERT/UPDATE/DELETE)
- Function it calls
- One-line purpose

Omit RLS helper functions here (already documented in Step 6).

### Step 9: Catalog Edge Functions

If `supabase/functions/` exists:

For each function directory (each subdirectory is one function):
1. Read `index.ts` (the main function file)
2. Read any imports from `_shared/` to understand utilities used
3. Determine:
   - **Trigger type**: HTTP endpoint or webhook (check `verify_jwt` in config.toml and whether it parses a webhook payload)
   - **Webhook event**: if webhook, what event does it handle (e.g., `user.created`, `organization.membership.created`)
   - **Purpose**: one-line description of what it does
   - **Tables read**: which Supabase tables it queries
   - **Tables written**: which Supabase tables it inserts/updates/deletes
   - **Client type**: admin (service role) or anon (respects RLS)
   - **External calls**: any external HTTP requests it makes

For `_shared/` utilities: list each file with one-line purpose.

### Step 10: Document JSONB Column Schemas

Find all `jsonb` or `json` columns identified in Step 4.

For each JSONB column, search for its known shape:
- Check migration comments near the column definition
- Check `INSERT INTO` statements in migrations or seed files that populate sample data
- Check edge function code that reads or writes the column
- Check TypeScript type definitions if available

Document: table name, column name, and the known field structure as a concise description.
If the shape is fully dynamic/unknown, note "schema varies — application-defined".

### Step 11: Document Storage

If `[storage] enabled = true` in config.toml:

Find bucket definitions in migrations (INSERT INTO `storage.buckets`) or config:
For each bucket:
- Name
- Public or private (`public = true/false`)
- Purpose (infer from name and any RLS policies on `storage.objects`)
- File size limit (from config.toml)
- URI patterns used in application code (grep JSONB columns or edge functions for path patterns)

If no buckets are explicitly configured, note "storage enabled, no buckets configured in migrations".

### Step 12: Note TypeScript Types

If a generated types file is found (from Step 1):
- Record its file path
- Note the regeneration command (usually `supabase gen types typescript --local > path/to/types.ts`
  or project-specific npm script — check `package.json` scripts)
- Note what it exports: Row, Insert, Update types per table, plus any view/function types

Do NOT read the full generated file — it is machine-generated and very long.
Just document its location and how to regenerate it.

### Step 13: Extract Conventions

Review 3–5 migration files and edge function files. Note repeating patterns:

- Migration naming format (timestamp prefix, description style)
- RLS policy naming convention (e.g., `"table_name_policy_description"`)
- When service role vs anon key is used (which operations bypass RLS)
- Edge function response format (`{ success: bool, data/error }` or raw Response objects)
- How Clerk/Auth0 user IDs map to database user records
- JSONB usage patterns (where structured data is stored vs normalized columns)

List at least 5 observable conventions.

### Step 14: Assemble and Write

Combine all collected data into the output schema below. Write to `.codemap.yaml` at the
repository root. If the file already exists, overwrite it completely.

**Omit any top-level key whose section has no content.** A missing key is cleaner than an empty one.

---

## Output Schema

```yaml
# .codemap.yaml — AI-optimized Supabase codebase map
# Generated by the supabase-code-map skill. Do not edit manually.
# Regenerate: invoke the supabase-code-map skill.

version: 1
generated: "YYYY-MM-DDTHH:MM:SSZ"

overview:
  name: "project-name"
  purpose: "one-line description of what this database supports"
  tech:
    - "Supabase"
    - "PostgreSQL 15|16"
  architecture: "auth strategy + RLS approach + edge function role (1-2 sentences)"

stack:
  auth_provider: Native Supabase Auth | Clerk | Auth0 | custom
  edge_runtime: "Deno v2"                        # omit if no functions
  typescript_types: "types/supabase.ts"          # omit if no generated types file
  typescript_regen: "npm run typescript:update"  # omit if no regen script found

auth_config:                                     # from config.toml [auth]
  jwt_expiry: 3600
  enable_signup: true
  email_confirmations: false
  oauth_providers: ["google", "github"]          # omit if none
  third_party: "clerk: prime-pika-52.clerk.accounts.dev"  # omit if native auth

tables:
  - name: users
    rls: true
    columns:
      - "id uuid PRIMARY KEY DEFAULT gen_random_uuid()"
      - "email text NOT NULL"
      - "created_at timestamptz DEFAULT now()"
    unique: [["email"]]
    indexes:
      - "idx_users_email ON email"

  - name: posts
    rls: true
    columns:
      - "id uuid PRIMARY KEY DEFAULT gen_random_uuid()"
      - "user_id uuid NOT NULL"
      - "title text NOT NULL"
      - "body text"
      - "metadata jsonb"
      - "published_at timestamptz"

foreign_keys:
  - from: "posts.user_id"
    to: "users.id"
    on_delete: CASCADE

rls:                                             # omit if no RLS policies found
  helper_functions:
    - name: "requesting_user_id()"
      purpose: "extracts user UUID from JWT claims"
    - name: "user_has_role(role_key text)"
      purpose: "checks if current user has a specific role"
  policies:
    users:
      - "SELECT TO authenticated — own record only (id = requesting_user_id())"
      - "UPDATE TO authenticated — own record only"
    posts:
      - "SELECT TO authenticated — user's posts or published posts"
      - "INSERT TO authenticated — own posts only"

views:                                           # omit if no views
  - name: active_posts
    purpose: "posts that are published and not deleted"
    security: INVOKER

db_functions:                                    # omit if no custom functions/triggers
  - name: "handle_new_user()"
    language: plpgsql
    purpose: "copies auth.users record to public.users on signup"
  - trigger:
      table: users
      event: "AFTER INSERT"
      function: "handle_new_user()"
      purpose: "auto-create public profile on auth signup"

edge_functions:                                  # omit if no functions/ directory
  - name: clerk-user-sync
    trigger: "webhook:user.created"
    purpose: "create Supabase Auth user from Clerk webhook"
    reads: []
    writes: ["users"]
    client: admin
  - name: process-payment
    trigger: "HTTP POST /process-payment"
    purpose: "validate and record payment via Stripe"
    reads: ["orders"]
    writes: ["payments", "orders"]
    client: admin
    external: ["api.stripe.com"]

shared_functions:                                # omit if no _shared/ directory
  - name: "_shared/verifyWebhook.ts"
    purpose: "Svix signature verification for webhook events"
  - name: "_shared/supabaseClients.ts"
    purpose: "admin and anon Supabase client factories"

jsonb_schemas:                                   # omit if no JSONB columns
  - table: posts
    column: metadata
    shape: "{ tags: string[], seo: { title, description }, custom_fields: Record<string, unknown> }"
  - table: forms
    column: field_schema
    shape: "FormFieldSchema[] — { name, type, label, required, options?, validation? }"

storage:                                         # omit if storage not configured
  file_size_limit: "50MiB"
  buckets:
    - name: avatars
      access: public
      purpose: "user profile images"
    - name: documents
      access: private
      purpose: "case-related file uploads"
      uri_pattern: "/{org_id}/{case_id}/{filename}"

conventions:
  - "Migration filenames: YYYYMMDDHHMMSS_kebab-description.sql"
  - "RLS policies named: table_action_description (e.g., users_select_own)"
  - "Service role client used for webhook handlers; anon client for user-scoped ops"
  - "Edge functions return JSON with { success: boolean, data?: T, error?: string }"
  - "JSONB used for flexible/schemaless fields; normalized columns for queryable data"
  - "All tables have id uuid PRIMARY KEY DEFAULT gen_random_uuid() and created_at timestamptz"
```

---

## Quality Criteria

Before writing the file, verify:

- [ ] **All detected features** are represented — auth config, tables, RLS, functions, storage each checked
- [ ] **Every table** from the final migration state is listed (not intermediate states)
- [ ] **Foreign keys** cover all FK constraints found in migrations
- [ ] **Every RLS-enabled table** has its policies listed
- [ ] **Helper functions** are listed before the per-table policies that use them
- [ ] **Every edge function** has its trigger type, purpose, reads/writes, and client type
- [ ] **JSONB columns** have their shape documented (not just named)
- [ ] **Auth config** reflects actual `config.toml` values (not defaults)
- [ ] **Conventions** lists at least 5 observable patterns from real files
- [ ] **No section is empty** — missing sections are omitted entirely
- [ ] **No schema is guessed** — every table and column verified from migration files
- [ ] **YAML is valid** — proper indentation, special characters quoted, no tabs

---

## Token Budget Guidelines

Aim for **5,000–10,000 tokens** in the output file. To stay within budget:

- List only **key columns** per table (up to 8 per table — omit obvious audit cols if many tables)
- Keep RLS policy expressions terse (intent, not the raw SQL expression)
- Keep JSONB shapes concise (field names + types, not full interface definitions)
- Use one-line descriptions throughout
- Omit `auth.*`, `storage.*`, `realtime.*` internal Supabase tables
- Omit `pg_*` system tables

---

**END OF SKILL**
