# API & Application Layer Rules

> **Load when:** Working on controllers, endpoints, or application-layer services

---

* Use **API Controllers** with `[ApiController]`
* Use request DTOs when >3 non‑path parameters
* Always return response DTOs/records
* Map exceptions to `ProblemDetails`
* No EF Core types in Application layer