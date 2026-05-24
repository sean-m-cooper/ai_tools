---
name: expressjs-code-map
description: >-
  Generate an AI-optimized YAML code map (.codemap.yaml) at the repository root
  for any Express.js project. Detects the actual stack (TypeScript/JS, entry point,
  database: MongoDB/Mongoose/PostgreSQL/Supabase/Prisma/Sequelize/Knex/raw pg/SQLite,
  auth: Passport/JWT/Clerk/Auth0/session, validation: express-validator/Joi/Zod/Yup,
  file uploads: Multer/Busboy, scheduling: node-cron/bull/agenda,
  email: Nodemailer/Resend/SendGrid, testing: Jest/Mocha/Supertest) and generates
  a map with only sections relevant to what's actually present.
  Invoke to create or regenerate the map after major structural changes: new routes,
  new services, new middleware, new integrations.
  Use when asked to "map the codebase", "generate a codemap", "create a codemap",
  "expressjs-code-map", or "help an AI understand this Express project".
---

# Express.js Code Map Generator

**Output**: `.codemap.yaml` at repository root
**Format**: YAML — optimized for AI token efficiency
**Version**: 1.0

> **Philosophy**: Detect what's actually in this project, then produce a compact, accurate,
> machine-readable map that lets an AI agent skip cold-start exploration and jump straight
> to productive work. Never assume a library is present — verify first.

---

## When to Use This Skill

✅ Initial onboarding — no `.codemap.yaml` exists yet
✅ After major structural changes — new routes, services, or integrations added/removed
✅ After significant middleware or auth refactors
❌ Minor changes within existing route handlers (the map is structural, not line-level)

---

## Generation Procedure

Follow these steps **in order**. Do not skip steps. Do not guess — verify by reading actual files.

### Step 1: Detect Stack

Read `package.json` (dependencies + devDependencies + scripts). Check for config files at root.
Record exactly what is present — do not infer from partial signals.

**Language:**
- TypeScript: `tsconfig.json` exists AND `typescript` in devDependencies
- JavaScript: otherwise

**Entry point** (check `package.json` `main` field and scripts in priority order):
- `bin/www` or `bin/www.ts` referenced in start script
- `server.ts` / `server.js`
- `index.ts` / `index.js`
- `app.ts` / `app.js`
Read the actual entry file and any secondary app configuration file it imports.

**Database** (check dependencies):
- MongoDB + Mongoose: `mongoose` in dependencies
- PostgreSQL + Supabase: `@supabase/supabase-js` in dependencies
- PostgreSQL raw: `pg` in dependencies (without ORM)
- Prisma: `@prisma/client` in dependencies
- Sequelize: `sequelize` in dependencies
- Knex: `knex` in dependencies
- SQLite: `better-sqlite3` or `sqlite3` in dependencies
- MySQL: `mysql2` or `mysql` in dependencies
- None: no database client detected

**Auth** (check dependencies):
- Passport: `passport` + check which strategies (`passport-local`, `passport-google-oauth20`, `passport-jwt`, `passport-facebook`)
- JWT: `jsonwebtoken` without passport
- Clerk: `@clerk/express` or `@clerk/clerk-sdk-node`
- Auth0: `express-openid-connect` or `auth0`
- Session: `express-session`
- None: no auth library detected

**Validation** (check dependencies):
- express-validator: `express-validator`
- Joi: `joi`
- Zod: `zod`
- Yup: `yup`
- None: no validation library

**File uploads** (check dependencies):
- Multer: `multer`
- Busboy: `busboy`
- None: no upload library

**Scheduling** (check dependencies):
- node-cron: `node-cron`
- Bull: `bull` or `bullmq`
- Agenda: `agenda`
- None: no scheduler

**Email** (check dependencies):
- Nodemailer: `nodemailer`
- Resend: `resend`
- SendGrid: `@sendgrid/mail`
- Postmark: `postmark`
- None: no email library

**Testing** (check devDependencies):
- Jest: `jest`
- Mocha: `mocha`
- Supertest: `supertest`
- Vitest: `vitest`
- None: no testing library

### Step 2: Read Entry Point & App Structure

Read the entry file (from Step 1). Then read the app configuration file it imports (if separate).

Document:
- Server port (env var name or literal value)
- HTTP server creation pattern (raw `http.createServer(app)` vs `app.listen()`)
- Error handler placement (before or after routes)

Then read the app configuration file and extract every `app.use()` call in registration order.
Each one is a middleware or route mount — record the path prefix (if any) and what it mounts.

### Step 3: Catalog Middleware

**Global middleware** (app-level `app.use()` without route prefix):
List in registration order with purpose. Common examples: `cors`, `express.json`, `express.urlencoded`,
`cookieParser`, `morgan`, `helmet`, `compression`, custom request loggers.

**Route-level middleware** (applied per-router or per-route):
For each custom middleware file found in `src/middleware/` or `middleware/`:
Record: file path, exported function names, one-line purpose each.

**Error middleware** (4-argument handlers `(err, req, res, next)`):
Note whether a global error handler exists and where it's registered.

### Step 4: Catalog Routes

Locate all route files. Common locations: `src/routes/`, `routes/`, `src/api/`.
For each route file:
1. Note the file path
2. Identify the base path prefix it's mounted at (from the app configuration in Step 2)
3. List every endpoint:
   - HTTP verb (GET, POST, PUT, PATCH, DELETE)
   - Path pattern (including params like `:id`)
   - Middleware applied inline (auth guard, validation, upload)
   - One-line purpose

Use compact format: `"VERB /path [middleware] → purpose"`

If route files are large (> 100 lines each), read them fully — do not skip.

### Step 5: Catalog Controllers

If controller files exist separately from route files (common in `src/controllers/`):
For each controller file:
- Record: name, file path, one-line purpose
- List key exported functions with their purpose

If controllers are co-located with routes (handlers inline in route files), skip this step.

### Step 6: Catalog Services

Find service files in `src/services/`, `services/`, or `src/lib/`.
Also check for utility helpers in `src/helpers/`, `src/utils/`.

For each service/utility file:
- Record: name, file path, one-line purpose
- List key exported functions (up to 5 per file)

### Step 7: Catalog Database Layer

**If Mongoose detected:**
Find model files in `src/models/`, `models/`. For each:
- Record: model name, file path, key schema fields (up to 6), any virtual fields or indexes noted

**If Prisma detected:**
Read `prisma/schema.prisma`. List each model with its key fields.

**If Sequelize detected:**
Find model files. List each model with key fields and associations.

**If Supabase detected:**
Note the client factory pattern (user client with RLS vs admin/service role client).
List the key tables referenced in route/service files (grep for `.from('table_name')`).

**If raw `pg` or `mysql2` detected:**
Note the connection pool setup file. List key SQL query patterns if they're in dedicated query files.

**If no database detected:**
Omit the `database:` section.

### Step 8: Trace Auth Flow

If auth is detected (Step 1), trace the full pipeline from incoming request to protected resource:

1. How the token/session arrives (header, cookie, query param)
2. What validates it (JWKS fetch, secret, session store)
3. What gets attached to `req` (user object, decoded claims)
4. Which routes are protected (which use the auth middleware)
5. Any role/permission checks applied after auth

Document as a sequential list of steps.

### Step 9: Catalog Scheduled Jobs

If a scheduler is detected (Step 1):
Find all job registrations (grep for `cron.schedule(`, `new CronJob(`, `agenda.define(`).
For each job:
- Schedule expression (cron string or interval)
- One-line purpose
- What it reads/writes (tables, external APIs)

### Step 10: List Environment Variables

Read `.env.example` if present. Also grep for `process.env.` across `src/` (or project root for JS).
For each unique variable: record key and infer purpose from context.

Group by category if many variables exist:
- Server config (PORT, NODE_ENV)
- Database credentials
- Auth secrets (JWT_SECRET, Clerk keys, OAuth client IDs)
- External service keys (email, SMS, payments)
- Feature flags

### Step 11: Extract Conventions

Review 3–5 route files and 2–3 service files. Note repeating patterns:

- Error handling: try/catch with specific status codes / centralized error classes / error middleware only
- Response shape: `{ data: ... }` wrapper / flat object / REST standard
- Async pattern: async/await / promise chains / callbacks
- JSDoc usage: `@route`, `@description`, `@access` annotations or absent
- Validation placement: inline in route / separate middleware / service layer
- Request logging: morgan / custom / none

List at least 5 observable conventions.

### Step 12: Assemble and Write

Combine all collected data into the output schema below. Write to `.codemap.yaml` at the
repository root. If the file already exists, overwrite it completely.

**Omit any top-level key whose section has no content.** A missing key is cleaner than an empty one.

---

## Output Schema

```yaml
# .codemap.yaml — AI-optimized Express.js codebase map
# Generated by the expressjs-code-map skill. Do not edit manually.
# Regenerate: invoke the expressjs-code-map skill.

version: 1
generated: "YYYY-MM-DDTHH:MM:SSZ"

overview:
  name: "project-name"
  purpose: "one-line description of what this API does"
  tech:
    - "Express 4|5"
    - "TypeScript|JavaScript"
    - "Node.js"
  architecture: "request flow summary (1-2 sentences)"

stack:
  language: TypeScript | JavaScript
  database: MongoDB/Mongoose | Supabase | Prisma | Sequelize | raw pg | none
  auth: JWT | Passport (strategies) | Clerk | Auth0 | session | none
  validation: express-validator | Joi | Zod | Yup | none
  file_uploads: Multer | Busboy | none     # omit if none
  scheduling: node-cron | bull | agenda    # omit if none
  email: Nodemailer | Resend | SendGrid    # omit if none
  testing: Jest | Mocha | Supertest | none

entry:
  file: "bin/www.ts"
  port: "process.env.PORT || 3000"

middleware:
  - "cors — cross-origin requests from frontend"
  - "express.json() — JSON body parsing"
  - "cookieParser() — cookie support"
  - "morgan('dev') — HTTP request logging"
  - "/routes/user → user routes"
  - "error handler — global 500 fallback"

routes:
  - file: "src/routes/user.ts"
    base: "/user"
    endpoints:
      - "GET / [auth] → get current user"
      - "GET /:id [auth] → get user by ID"
      - "POST / → create user"
      - "PATCH /:id [auth] → update user"

controllers:                              # omit if co-located with routes
  - name: AuthController
    path: "src/controllers/authController.ts"
    purpose: "JWT validation middleware"

services:
  - name: EmailService
    path: "src/services/emailService.ts"
    purpose: "transactional email via Nodemailer"
    exports: ["sendWelcomeEmail", "sendPasswordReset"]

database:                                 # omit if no DB detected
  client: "Mongoose | Supabase | Prisma | pg"
  models:                                 # omit for raw clients
    - name: User
      path: "src/models/User.ts"
      key_fields: ["email", "passwordHash", "role", "createdAt"]

auth_flow:                               # omit if no auth
  - "Client sends Bearer token in Authorization header"
  - "authenticateToken middleware validates JWT via JWKS"
  - "Decoded claims attached to req.user"
  - "Protected routes call authenticateToken before handler"
  - "Admin routes additionally check req.user.role === 'admin'"

scheduled_jobs:                          # omit if no scheduler
  - schedule: "0 6,18 * * *"
    purpose: "sync reviews from Google My Business API"
    reads: ["google_oauth_tokens"]
    writes: ["reviews"]

env_vars:
  - key: PORT
    purpose: "server port"
  - key: DATABASE_URL
    purpose: "database connection string"
  - key: JWT_SECRET
    purpose: "JWT signing secret"

conventions:
  - "All routes use async/await with try/catch"
  - "Errors returned as { error: string, details?: string }"
  - "Protected routes explicitly apply auth middleware per-handler"
  - "JSDoc @route and @access annotations on every endpoint"
  - "Service layer handles external API calls, routes handle HTTP only"
```

---

## Quality Criteria

Before writing the file, verify:

- [ ] **Stack detection is complete** — language, DB, auth, validation, scheduling, email all recorded
- [ ] **Entry file is correct** — port source and middleware order verified by reading the file
- [ ] **Every route file** has its endpoints listed with HTTP verbs and paths verified by reading
- [ ] **All custom middleware files** are listed with their purpose
- [ ] **Auth flow** is traced step-by-step, not summarized vaguely
- [ ] **Scheduled jobs** include the cron expression and what they touch
- [ ] **Environment variables** are sourced from `.env.example` or actual `process.env.` grep
- [ ] **Conventions** lists at least 5 observable patterns from real files
- [ ] **No section is empty** — missing sections are omitted entirely
- [ ] **No paths are guessed** — every path verified by reading the file system
- [ ] **YAML is valid** — proper indentation, special characters quoted, no tabs

---

## Token Budget Guidelines

Aim for **5,000–10,000 tokens** in the output file. To stay within budget:

- Use the compact endpoint format (`"VERB /path [middleware] → purpose"`)
- List only **key fields** on models (up to 6 per model)
- List only **key exports** on services (up to 5 per service)
- Keep `purpose` fields to one short phrase
- Omit test files and generated files from all sections
- Omit `node_modules/`, `dist/`, `build/`

---

**END OF SKILL**
