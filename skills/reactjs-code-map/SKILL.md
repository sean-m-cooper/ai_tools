---
name: reactjs-code-map
description: >-
  Generate an AI-optimized YAML code map (.codemap.yaml) at the repository root
  for any React project. Detects the actual stack (TypeScript/JS, Vite/Next.js/CRA/Remix/Astro,
  Tailwind/CSS Modules/Styled Components/Emotion/UI libraries, React Router/TanStack/App Router,
  Redux/Zustand/Jotai/Context, React Query/SWR/Axios/fetch, Vitest/Jest/Playwright) and adapts
  the map accordingly — only sections relevant to what's actually present are written.
  Invoke to create or regenerate the map after major structural changes: new pages, new routing,
  new state libraries, significant component reorganization.
  Use when asked to "map the codebase", "generate a codemap", "create a codemap", "reactjs-code-map",
  or "help an AI understand this React project".
---

# React Code Map Generator

**Output**: `.codemap.yaml` at repository root
**Format**: YAML — optimized for AI token efficiency
**Version**: 1.0

> **Philosophy**: Detect what's actually in this project, then produce a compact, accurate,
> machine-readable map that lets an AI agent skip cold-start exploration and jump straight
> to productive work. Never assume a library is present — verify first.

---

## When to Use This Skill

✅ Initial onboarding — no `.codemap.yaml` exists yet
✅ After major structural changes — new pages, routes, state libraries added/removed
✅ After a significant refactor of component organization
❌ Minor changes within existing component files (the map is structural, not line-level)

---

## Generation Procedure

Follow these steps **in order**. Do not skip steps. Do not guess — verify by reading actual files.

### Step 1: Detect Stack

Read `package.json` (dependencies + devDependencies + scripts) and check for config files.
Record exactly what is present — do not infer from partial signals.

**Language:**
- TypeScript: `tsconfig.json` exists AND `typescript` in devDependencies
- JavaScript: otherwise

**Build tool** (check scripts and config files at root):
- Vite: `vite.config.ts` / `vite.config.js` present, or `"vite"` in scripts
- Next.js: `next.config.js` / `next.config.ts` present, or `"next"` in dependencies
- Create React App: `react-scripts` in dependencies
- Remix: `remix.config.js` present, or `"@remix-run/react"` in dependencies
- Astro: `astro.config.mjs` present

**Styling** (can be multiple — list all detected):
- Tailwind: `tailwind.config.*` at root OR `tailwindcss` in dependencies
- CSS Modules: any `.module.css` / `.module.scss` file in `src/`
- Styled Components: `styled-components` in dependencies
- Emotion: `@emotion/react` or `@emotion/styled` in dependencies
- Plain CSS: `.css` files imported directly (without `.module`)
- UI libraries: check for `@mui/material`, `@shadcn/ui`, `@chakra-ui/react`, `antd`, `@radix-ui/react-*`, `@mantine/core`, `flowbite-react`, `daisyui`

**Router** (check dependencies):
- React Router v7: `react-router` ≥ 7 in dependencies
- React Router v6: `react-router-dom` 6.x
- React Router v5: `react-router-dom` 5.x
- TanStack Router: `@tanstack/react-router`
- Next.js App Router: Next.js project with `app/` directory
- Next.js Pages Router: Next.js project with `pages/` directory
- Remix: Remix project
- None: none of the above

**State management** (check dependencies):
- Redux Toolkit: `@reduxjs/toolkit`
- Zustand: `zustand`
- Jotai: `jotai`
- Recoil: `recoil`
- MobX: `mobx` + `mobx-react-lite`
- Context only: no external state library found
- None: no state management detected

**Data fetching** (check dependencies):
- React Query / TanStack Query: `@tanstack/react-query`
- SWR: `swr`
- Axios: `axios`
- tRPC: `@trpc/react-query`
- Apollo: `@apollo/client`
- URQL: `urql`
- fetch: plain fetch (default — always present)

**Testing** (check devDependencies):
- Vitest: `vitest`
- Jest: `jest`
- Testing Library: `@testing-library/react`
- Playwright: `@playwright/test`
- Cypress: `cypress`

### Step 2: Map Directory Purposes

Walk the top-level directories of `src/` (or project root for Next.js App Router).
For each directory, assign a one-line purpose. Focus on source directories — skip
`node_modules/`, `dist/`, `build/`, `.next/`, `public/` (document existence only).

Identify the component organization strategy:
- **Atomic Design**: directories named `atoms/`, `molecules/`, `organisms/`, `pages/`
- **Feature-based**: directories named by domain (e.g., `auth/`, `dashboard/`, `settings/`)
- **Flat**: all components in a single `components/` directory
- **Next.js App Router**: `app/` directory with nested route folders

### Step 3: Catalog Components

For the component organization strategy detected in Step 2:

For **Atomic Design**: Process each level (atoms → molecules → organisms → pages/templates).
For **Feature-based**: Process each feature directory.
For **Flat**: Process the single components directory.
For **App Router**: Process page and layout files per route segment.

For each component file:
1. Record: name, file path, one-line purpose
2. If TypeScript: read the Props interface/type and list key props (up to 6)
3. If PropTypes: read the propTypes object and list key props

Omit internal sub-components that are not exported (private implementation details).

### Step 4: Catalog Routing

**React Router / TanStack Router**: Find the router definition file (often `src/main.tsx`,
`src/App.tsx`, or `src/router.tsx`). Read it and extract every route:
- path string
- component/element rendered
- layout wrapper (if any)
- auth guard or loader (if any)

**Next.js Pages Router**: Walk `pages/` directory. Each file maps to a route.
List: file path → route path.

**Next.js App Router**: Walk `app/` directory. Note `page.tsx`, `layout.tsx`,
`loading.tsx`, `error.tsx` per segment. List route segments and their purpose.

**Remix**: Walk `app/routes/` directory. List route files and their paths.

If no router detected: omit the `routing:` section from output.

### Step 5: Catalog State & Data Fetching

**State library** (if detected):
- Redux: find slice files (`*Slice.ts`), read store configuration, list slice names and what they manage
- Zustand: find store files (grep for `create(`), list store name, file path, managed state
- Jotai: find atom files (grep for `atom(`), list atoms and their purpose
- Context: find Context files (grep for `createContext`), list context name, file, what it provides

**Custom hooks** (grep for files in `src/hooks/` or files matching `use*.ts(x)`):
List each hook with: name, file path, one-line purpose.

**Data fetching patterns** (if an API client is detected):
- Find where the base URL is configured (env var, constants file, API client setup)
- Document the auth header pattern (Bearer token, cookie, none)
- List 3–5 key queries or mutations by scanning hook files or component data-fetching calls

If no state or data fetching beyond plain fetch is detected: note "no state library; plain fetch"
and omit detailed subsections.

### Step 6: Document Shared Dependencies & Design Tokens

**Component/UI library** (if detected): list the library name and 3–5 most-used components
found via grep across `src/`.

**Design system package** (private or public package): if `package.json` references a workspace
package or private registry package that provides components, list it and what it provides.

**Design tokens**: if Tailwind, check `tailwind.config.*` for custom theme values (colors,
fonts, spacing). If CSS variables: grep for `var(--` patterns and document the variable
naming convention (e.g., `--color-*`, `--font-size-*`). If a theme object (MUI/Chakra):
note the theme file path.

### Step 7: Read Entry Point & Provider Order

Read `main.tsx` / `index.tsx` / `main.js` (Vite/CRA entry) or `app/layout.tsx` (Next.js).

Document the provider wrapping order from outermost to innermost:
- Auth providers (Clerk, Auth0, Firebase, Supabase)
- Theme providers
- Router provider
- Query/data providers (QueryClientProvider, ApolloProvider)
- Custom providers

This tells an AI agent which context is available at which level of the tree.

### Step 8: List Environment Variables

Grep for `process.env.` and `import.meta.env.` references across `src/`.
Also read `.env.example` or `.env.local.example` if present.

For each variable: record the key and infer its purpose from context.

### Step 9: Extract Conventions

Review 3–5 component files of each major type (organism/page or equivalent).
Note repeating patterns:

- Export style: `export default` only / named + default / index re-export
- Prop typing: TypeScript interface / type alias / PropTypes / none
- File naming: PascalCase / kebab-case / camelCase
- Style co-location: styles next to component / global stylesheet / CSS-in-JS
- Test co-location: `__tests__/` folder / `.test.tsx` next to component / none
- Component composition patterns (compound components, render props, HOC, hooks)
- Barrel `index.ts` exports: present or absent

List at least 5 observable conventions.

### Step 10: Assemble and Write

Combine all collected data into the output schema below. Write to `.codemap.yaml` at the
repository root. If the file already exists, overwrite it completely.

**Omit any top-level key whose section has no content.** Do not write empty arrays or
placeholder comments. A missing key is cleaner than an empty one.

---

## Output Schema

```yaml
# .codemap.yaml — AI-optimized React codebase map
# Generated by the reactjs-code-map skill. Do not edit manually.
# Regenerate: invoke the reactjs-code-map skill.

version: 1
generated: "YYYY-MM-DDTHH:MM:SSZ"

overview:
  name: "project-name"
  purpose: "one-line description of what this app does"
  tech:
    - "React 18|19"
    - "TypeScript|JavaScript"
    - "Vite|Next.js|CRA|Remix|Astro"
  architecture: "component organization + data flow summary (1-2 sentences)"

stack:
  language: TypeScript | JavaScript
  build_tool: Vite | Next.js | CRA | Remix | Astro
  styling: Tailwind | CSS Modules | Styled Components | Emotion | plain CSS
  ui_library: MUI | Shadcn | Chakra | Radix | Mantine | Flowbite   # omit if none
  router: React Router v6 | TanStack Router | Next.js App Router | none
  state: Zustand | Redux Toolkit | Jotai | Context | none
  data_fetching: React Query | SWR | Axios | fetch | tRPC | Apollo
  testing: Vitest | Jest | Playwright | Cypress | none

directories:
  "src/components/": "reusable UI components"
  "src/pages/": "route-level page components"
  "src/hooks/": "custom React hooks"
  "src/lib/": "utility functions and API clients"
  "src/store/": "state management"           # omit if no state library

components:
  atoms:                                     # adjust level names to match actual dirs
    - name: ComponentName
      path: "src/components/atoms/ComponentName.tsx"
      purpose: "one-line"
      key_props: ["prop1: type", "prop2?: type"]
  molecules:
    - name: ComponentName
      path: "src/components/molecules/ComponentName.tsx"
      purpose: "one-line"
      key_props: ["prop1: type"]
  organisms:
    - name: ComponentName
      path: "src/components/organisms/ComponentName.tsx"
      purpose: "one-line"
      key_props: ["prop1: type"]
  pages:
    - name: PageName
      path: "src/components/pages/PageName.tsx"
      purpose: "one-line"

routing:                                     # omit if no router detected
  - path: "/"
    component: HomePage
    layout: RootLayout         # omit if no layout
    guard: AuthGuard           # omit if no guard

state:                                       # omit if no state library
  - name: useAuthStore | AuthContext | authSlice
    path: "src/store/authStore.ts"
    manages: "authenticated user, session token"

hooks:                                       # omit if no custom hooks
  - name: useMyHook
    path: "src/hooks/useMyHook.ts"
    purpose: "one-line"

data_fetching:                               # omit if plain fetch only
  base_url: "import.meta.env.VITE_API_URL"
  auth_header: "Bearer token from store"
  queries:
    - "fetchUser(id) → GET /users/:id"
    - "updateProfile(data) → PATCH /users/:id"

providers:                                   # omit if no wrapping detected
  - "ClerkProvider (auth)"
  - "QueryClientProvider (React Query)"
  - "BrowserRouter (routing)"

shared_library:                              # omit if no shared lib/package
  package: "@org/design-system"
  provides: ["Button", "Input", "Modal", "design tokens via CSS variables"]

env_vars:
  - key: VITE_API_URL
    purpose: "backend API base URL"
  - key: VITE_CLERK_PUBLISHABLE_KEY
    purpose: "Clerk auth publishable key"

conventions:
  - "Components export default + named Props type"
  - "Barrel index.ts at each atomic level"
  - "Tailwind utility classes; CSS variables for design tokens"
  - "Custom hooks prefixed with use, co-located in src/hooks/"
  - "File naming: PascalCase for components, camelCase for hooks"
```

---

## Quality Criteria

Before writing the file, verify:

- [ ] **Stack detection is complete** — language, build tool, styling, router, state, data fetching all recorded
- [ ] **Every component directory** has its components listed with file paths verified by reading the file system
- [ ] **Every route** is listed with its component (no guessing paths)
- [ ] **State stores/contexts** are listed with what they manage
- [ ] **Providers** are listed in correct wrapping order
- [ ] **Environment variables** are sourced from actual code, not assumed
- [ ] **Conventions** lists at least 5 observable patterns from real files
- [ ] **No section is empty** — missing sections are omitted entirely
- [ ] **No paths are guessed** — every path verified by reading the file system
- [ ] **YAML is valid** — proper indentation, special characters quoted, no tabs

---

## Token Budget Guidelines

Aim for **5,000–10,000 tokens** in the output file. To stay within budget:

- Use terse descriptions (5–15 words per item)
- List only **key props** on components (up to 6 per component)
- List only **key queries/mutations** for data fetching (3–5 total)
- Keep `purpose` fields to one short phrase
- Omit test projects and generated files from `directories:`
- Omit `node_modules/`, `dist/`, `build/`, `.next/`

---

**END OF SKILL**
