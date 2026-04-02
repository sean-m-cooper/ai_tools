# Agentic Workflow

This module defines **how AI agents operate** during a coding session — planning, task tracking, subagent usage, self-improvement, verification, and bug fixing.

This module is **always loaded** — it does not require manual activation.

---

## Plan Mode

Enter plan mode for **any non-trivial task** — defined as one requiring 3+ steps or an architectural decision.

* Write a detailed spec upfront in the session `tasks/todo.md` to reduce ambiguity before touching code.
* If implementation goes sideways at any point: **stop and re-plan** — do not push through.
* Use plan mode for verification steps, not just the build phase.

## Task Management

Tasks are tracked in the AI tool's **session state directory** — never in the repository itself.

| File | Purpose | Format |
|---|---|---|
| `tasks/todo.md` | Active plan with checkable items | Markdown with `- [ ]` / `- [x]` checkboxes |
| `tasks/lessons.md` | Accumulated corrections and patterns | Append-only log with date, context, and rule |

These files live in the session workspace (e.g., `~/.copilot/session-state/<session>/` for Copilot CLI, or the equivalent for other tools). They are **not committed to the repository**. Link to Jira issues where applicable (e.g., `PROJ-1234`).

Workflow:

1. **Plan First** — Write a plan to `tasks/todo.md` with checkable items before starting.
2. **Verify Plan** — Check in with the user before beginning implementation.
3. **Track Progress** — Mark items complete as you go.
4. **Explain Changes** — Provide a high-level summary at each significant step.
5. **Document Results** — Add a review section to `tasks/todo.md` when done.
6. **Capture Lessons** — Update `tasks/lessons.md` after any correction or misstep.

## Subagent Strategy

* Use subagents liberally to keep the main context window clean and focused.
* Offload research, exploration, and parallel analysis to subagents.
* For complex problems, apply more compute via subagents rather than forcing solutions in the main thread.
* Assign **one task per subagent** for focused, predictable execution.

## Self-Improvement Loop

* After **any** correction from the user: update `tasks/lessons.md` with the pattern observed.
* Write explicit rules that prevent the same mistake from recurring.
* Review `tasks/lessons.md` at the start of each session for the relevant project.
* Treat repeated corrections as a signal to rethink the approach entirely.

## Verification Before Completion

* Never mark a task complete without demonstrating it works.
* Diff behavior between `main` and your changes when the impact is non-obvious.
* Ask yourself: *"Would a staff engineer approve this without hesitation?"*
* Run tests, check logs, and demonstrate correctness — don't just assert it.

## Elegance Standard

Elegance means the **simplest correct solution** — not the cleverest one. Simplicity First (Core Principle #6) always takes precedence.

* Before presenting work, ask: *"Is there a simpler, cleaner way to do this?"*
* If a solution feels hacky, step back: *"Knowing everything I know now, what is the simplest correct approach?"*
* Challenge your own work before presenting it — but do not refactor working code in pursuit of aesthetics.

## Autonomous Bug Fixing

When given a bug report: **diagnose and fix it** without requiring step-by-step guidance from the user.

* Always explain your diagnosis and plan before making changes — autonomy means not asking permission, not skipping the explanation.
* Point investigation at logs, errors, and failing tests — then resolve them.
* Fix failing CI tests without being told how; the output is the spec.
* The expectation is zero context-switching required from the user — they should not need to tell you *how* to fix it, but they should always see *what* you're doing and *why*.