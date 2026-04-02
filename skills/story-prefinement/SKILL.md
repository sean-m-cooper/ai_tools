---
name: prefinement
description: Use when asked to evaluate, review, or score a story or bug for quality, readiness, or completeness - especially when a product owner wants feedback before refinement or sprint planning. Supports Jira, Azure DevOps, or pasted content.
---

# Story Prefinement Reviewer

## Overview

Prefinement is the art of preparing a story so developers ask minimal questions and have maximal understanding. Use this skill to evaluate a story or bug against a proven framework and give product owners specific, actionable feedback.

**Refinement Standard (the North Star):** A fully refined story satisfies all three:
1. The **purpose** is clearly understood and documented
2. The **acceptance criteria** are clearly understood and documented
3. The story could be **parked for 6 months**, pulled during planning, and developers would still know exactly what to build

## How to Evaluate

### Step 1 — Get the Story

Check `$ARGUMENTS` for:
- Work item content passed inline (from `story-writer`)
- A **TRACKING SYSTEM** block — if present, use it to fetch the work item without re-asking for system details

```
TRACKING SYSTEM
System: [Jira / Azure DevOps / None]
Project Key: [Jira project key, if applicable]
Cloud ID: [Jira cloud ID, if applicable]
Organization: [Azure DevOps org, if applicable]
Project: [Azure DevOps project name, if applicable]
```

Determine the source of the work item:

- **Pasted content or inline from story-writer** — Use that content directly.
- **Jira** — If a Jira issue key is provided (e.g., `EC-123`), use the cloud ID from the `TRACKING SYSTEM` block if available, otherwise ask. Fetch with the appropriate Jira MCP tool. Request description, acceptance criteria, technical details, summary, issue type, status, priority, components, and attachments.
- **Azure DevOps** — If an Azure DevOps work item ID is provided, use the organization and project from the `TRACKING SYSTEM` block if available, otherwise ask. Fetch with the appropriate Azure DevOps MCP tool. Request title, description, acceptance criteria, state, priority, area path, and attachments.

If neither content nor an identifier is provided, ask: *"Would you like to paste the story content, or provide a work item key/ID so I can fetch it from **Jira** or **Azure DevOps**?"*

> **Note:** If Acceptance Criteria is null/empty, that is a **Section 10 Fail** — do not assume AC is absent just because it wasn't returned by a default field fetch.

### Step 2 — Detect Type and Scope

- **Bug** -> use the Bug Evaluation section
- **User Story / Feature** -> determine scope, then evaluate:
  - If the story describes UI interactions (screens, forms, navigation) -> **UI Story Evaluation**
  - If the story describes backend operations (API endpoints, events, jobs) with no UI -> **Backend Story Evaluation**
  - If the story covers both UI and backend as a vertical slice -> **UI Story Evaluation** (the UI sections apply, plus check that backend behavior is covered in AC)

---

## UI Story Evaluation

Score each section: Pass | Needs Work | Fail. End with a **Priority Fix List**.

### 1. Title
| Check | Criteria |
|-------|----------|
| Goal clarity | Clearly states what is being delivered |
| Deliverable | Speaks to the end output, not the task steps |
| Persona | Identifies who is affected (e.g., "admin user", "member") |
| Brevity | No extra info that introduces confusion |

**Pass examples:** "Revising the admin navigation experience", "Flagging a message for SMS responses when a user creates a new template"
**Fail examples:** "Change navigation order and rename My Business Rules to My BRs" (describes steps, not the goal)

---

### 2. Description
| Check | Criteria |
|-------|----------|
| User journey | Describes the user's experience, not database columns or code changes |
| End state | Describes what the feature looks like when done |
| Single CRUD verb | Only one of: Create, Read/Display, Update/Edit, Delete |
| Persona(s) | Clear who is performing the action |
| Click path | Sequence of user interactions is outlined |

**Pass:** "As a user setting up a new message template, I want to flag a template as able to have a calendar attachment..."
**Fail:** "The New Message section needs 2 new checkboxes to set `is_calendar_attachment_enabled` and `is_appt_conf_sms` in the database." (technical, no user journey)

**Multiple CRUD verbs?** Flag for story splitting.

---

### 3. CRUD Alignment
Each story should center on a **single CRUD verb**. Mixed verbs = stories that are too big.

| CRUD | Also Known As | Typical AC Types Needed |
|------|--------------|------------------------|
| Create | New, Add | Screen Event, UI Definition, User Action, User Feedback, Validation |
| Read | Display, List, View | Screen Event, UI Definition, User Action |
| Update | Edit, Modify | Screen Event, UI Definition, User Action, User Feedback, Validation |
| Delete | Remove, Archive | Screen Event, User Action |

**Recommended story order when building a feature:** Create -> Read -> Update -> Delete

If the story mixes CRUD verbs, recommend splitting and explain how.

---

### 4. INVEST Check
| Letter | Meaning | Red Flags |
|--------|---------|-----------|
| I | Independent | Blocked by or requires another unfinished story |
| N | Negotiable | Implementation is rigidly prescribed |
| V | Valuable | The user benefit is unclear |
| E | Estimable | Too vague to size relative to similar work |
| S | Small | Covers multiple screens or multiple CRUD verbs |
| T | Testable | No clear acceptance criteria or validation rules |

---

### 5. Elements & Inputs
| Check | Criteria |
|-------|----------|
| Form elements identified | All inputs listed (text, numeric, date, image, dropdown, checkbox, etc.) |
| Data types specified | Each input's data type is clear |
| Complex inputs flagged | Developer guidance sought where needed |

If wireframes/mockups are attached, confirm they are referenced in the story.

---

### 6. Validation
For **every input field**, verify the story defines:
- Validation rule(s)
- Validation / error message(s)
- Format masks (phone, zip, date, etc.) if applicable
- Whether failed validation **blocks** the action (prevents save/navigation)

---

### 7. Behaviors
| Behavior | Questions to Answer |
|----------|-------------------|
| Enable / Disable | What is the starting state? What conditions cause state change? |
| Refresh | What causes page data to change/reload? |
| Notifications & Alerts | What type (toast, modal, JS alert)? What triggers each? |
| Mobile / Responsive | How does the UI behave on resize, rotate, or zoom? |

---

### 8. Screen Flow
- Are **collections** (lists of items) and **single-item views** (detail pages) clearly separated?
- Does the story describe navigation between them?
- Flag if multiple pages are bundled into one story.

---

### 9. Multi-State
**Multi-state** = a user action causes the UI to switch between two or more distinct layouts.

Example: A filter control shows a date picker OR a location dropdown depending on selection.

If multi-state is present: recommend **one story per state** and show the split.

---

### 10. Acceptance Criteria
| Check | Criteria |
|-------|----------|
| Numbered | Each criterion has a number for easy reference |
| Grouped with sub-points | Sub-points reinforce the main point |
| No 2nd CRUD verb slipping in | Watch for hidden "and also..." scope |
| Validation rules covered | Every input has a rule and error message |
| Display rules covered | Defines what shows, when, and where |
| Feedback / messages covered | Error messages are specified (not left to developer) |

**AC Types to verify are present (based on CRUD verb):**

| AC Type | Description | Create | Read | Update | Delete |
|---------|-------------|--------|------|--------|--------|
| Screen Event | Full-screen or major UI events (refresh, nav, show/hide) | Yes | Yes | Yes | Yes |
| UI Definition | Appearance/layout of UI elements | Yes | Yes | Yes | |
| User Action | Actions the user can take (click, input, select) | Yes | Yes | Yes | Yes |
| User Feedback | Messages, popups, overlays | Yes | | Yes | |
| Validation | Input rules, error styles, required fields | Yes | | Yes | |

---

## Backend Story Evaluation

Use this evaluation for stories that are purely backend — API endpoints, event handlers, scheduled jobs, integrations, or data operations with no UI component.

Score each section: Pass | Needs Work | Fail. End with a **Priority Fix List**.

### 1. Title
| Check | Criteria |
|-------|----------|
| Operation clarity | Names the operation and the resource (e.g., "Create order endpoint") |
| Specificity | Not vague ("Backend work", "API changes") |
| Single operation | One operation per story, not a bundle |

**Pass:** "Create order via REST API", "Handle payment.failed webhook event"
**Fail:** "Order API", "Backend changes for payments"

---

### 2. Description
| Check | Criteria |
|-------|----------|
| Consumer perspective | Describes what the caller/consumer can do, not internal implementation |
| Operation type clear | API endpoint, event handler, job, or integration is explicit |
| Single responsibility | One operation, not multiple bundled together |
| Input/output described | What goes in and what comes back at a category level |

**Pass:** "This endpoint allows the order management UI to submit a new order with customer details and line items, returning the created order with a generated ID."
**Fail:** "Add CRUD endpoints for orders and update the database schema to support the new fields."

**Multiple operations?** Flag for splitting.

---

### 3. Operation Alignment
Each story should center on a **single operation type**. Mixed types = stories that are too big.

| Type | Examples | Typical AC Needed |
|------|----------|-------------------|
| API endpoint | REST/GraphQL operations | Request shape, response shape, status codes, auth, validation |
| Event handler | Consumes async events | Trigger event, processing behavior, success/failure outcomes |
| Event publisher | Emits async events | Trigger condition, event payload, delivery guarantees |
| Scheduled job | Cron/timer-based | Schedule, processing logic, failure handling, idempotency |
| Integration | External system connection | Auth, request/response mapping, error handling, retry policy |

---

### 4. INVEST Check
| Letter | Meaning | Red Flags |
|--------|---------|-----------|
| I | Independent | Requires another unfinished endpoint or service |
| N | Negotiable | Implementation is rigidly prescribed (specific SQL, framework code) |
| V | Valuable | No clear consumer or business purpose |
| E | Estimable | Too vague to size — missing input/output shape |
| S | Small | Covers multiple endpoints or multiple operation types |
| T | Testable | No clear success/failure criteria |

---

### 5. Input / Request Shape
| Check | Criteria |
|-------|----------|
| Input categories identified | What data goes in — at least at the category level |
| Required vs. optional | Clear which inputs are required |
| Data types noted | High-level types for key fields |
| Auth requirements | Who/what is authorized to call this |

---

### 6. Output / Response Shape
| Check | Criteria |
|-------|----------|
| Success response defined | What comes back on success (data categories, status code) |
| Error responses defined | Each error scenario has a specific response code and message |
| Empty/null cases | What happens when there's no data to return |

---

### 7. Error Handling
| Check | Criteria |
|-------|----------|
| Validation errors | Invalid input scenarios and their error responses |
| Dependency failures | What happens when downstream services fail |
| Conflict handling | Concurrency, duplicate submissions, optimistic locking |
| Idempotency | Whether the operation is safe to retry |
| Rate limits / constraints | Documented if applicable |

---

### 8. Acceptance Criteria
| Check | Criteria |
|-------|----------|
| Numbered | Each criterion has a number for easy reference |
| Covers success path | Happy path behavior is fully specified |
| Covers error paths | Each error scenario has a criterion |
| Input validation specified | What makes input invalid and the exact error response |
| Response codes specified | Not just "returns error" — specific codes and messages |
| No scope creep | Doesn't slip in a second operation |

**AC Types to verify (based on operation type):**

| AC Type | API Endpoint | Event Handler | Event Publisher | Scheduled Job |
|---------|-------------|---------------|-----------------|---------------|
| Success behavior | Yes | Yes | Yes | Yes |
| Input validation | Yes | Yes | | |
| Error responses | Yes | Yes | | Yes |
| Auth/permissions | Yes | | | |
| Idempotency | Yes | Yes | | Yes |
| Retry / failure | | Yes | Yes | Yes |

---

## Bug Evaluation

| Section | Criteria |
|---------|----------|
| **Title** | Names the broken behavior + affected area; not just "it's broken" |
| **Steps to Reproduce** | Numbered, complete, reproducible step-by-step |
| **Expected Behavior** | Clear statement of what should happen |
| **Actual Behavior** | Clear statement of what actually happens |
| **Environment** | Browser, OS, app version, user role/data context |
| **Acceptance Criteria** | Defines what "fixed" looks like (not just "it works") |
| **Attachments** | Screenshots, logs, or recordings provided |

---

## Output Format

Deliver feedback in this structure:

```
## Prefinement Review: [Title]
**Type:** Story | Bug
**Overall Readiness:** Ready / Needs Work / Not Ready

### Scorecard
[table with each section and Pass / Needs Work / Fail]

### Section Feedback
[For each Needs Work or Fail section: specific finding + rewrite suggestion where possible]

### Priority Fix List
1. [Most critical issue]
2. [Next issue]
...

### What's Working Well
[Highlight 1-3 genuine strengths — junior POs need encouragement too]
```

---

## Common Junior PO Mistakes

| Mistake | Better Approach |
|---------|----------------|
| Describing database fields instead of user experience | Start with "As a [persona]..." and describe what they see and do |
| One story covers Create + Read + Update | Split by CRUD verb; use "Story Order of Operations" |
| Acceptance criteria are vague ("data is saved correctly") | Be explicit: field name, valid values, error message text |
| Skipping validation entirely | For every input: rule, message, and does it block? |
| Title describes the task, not the deliverable | Ask: "what will the user be able to do when this is done?" |
| Missing persona | Name the user type affected — admin, member, guest, etc. |
| Multiple states in one story | Split: one story per distinct UI state |
| No error messages specified | Developers invent error messages — specify them |

---

## Tone Guidelines

- Be **specific and constructive** — point to exact lines that need work
- Show **rewrites, not just critiques** — "try this instead: ..."
- Be **encouraging** — call out what's done well
- Be **direct about blockers** — if a story isn't ready for refinement, say so clearly and explain why
- Never say "looks good overall" when critical sections are missing
