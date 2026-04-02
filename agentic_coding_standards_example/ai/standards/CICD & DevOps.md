# CI/CD & DevOps Standards

> **Load when:** Modifying build pipelines, Dockerfiles, or deployment scripts

---

## Pipeline Stage Order

Always run stages in this sequence — never skip or reorder:

`restore` → `build -warnaserror` → `test` → `publish` → `docker build` → `push`

Fail fast: if any stage fails, abort the pipeline immediately.

## Build

- `dotnet build -warnaserror` — warnings are errors; zero tolerance
- Minimal verbosity (`-v minimal`) to keep logs readable
- Structured build output — capture test results and coverage as pipeline artifacts

## Docker

- Multi-stage builds only: `build` stage compiles; `runtime` stage ships — never include the SDK in the final image
- Always tag with both `latest` and a specific version (`v1.2.3` or commit SHA)
- Always target an explicit platform (`--platform linux/amd64`) — never rely on the runner default

## Secrets

- Never put secrets in pipeline YAML — inject from AWS Secrets Manager or Azure Key Vault at runtime
- Use masked environment variables in CI only for non-sensitive config (URLs, feature flags)

## Environment Progression

- `main` → staging: automatic on merge
- Staging → production: manual approval gate required
- Run a smoke test (health check endpoint) after each deploy before marking it successful
