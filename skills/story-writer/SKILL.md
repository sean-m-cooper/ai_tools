---
name: story-writer
description: Use when a product manager or product owner wants to create a new story, bug, or task - guides them interactively through writing quality issues with proper acceptance criteria and technical details. Supports Jira and Azure DevOps.
---

# Story Writer

## Overview

Interactive guided interview for writing high-quality work items. Collects all required information through conversation, produces a structured document, and optionally creates the item in a tracking system (Jira or Azure DevOps).

**Announce at start:** "I'm using the story-writer skill to help you create a quality work item."

---

## Handling Pre-Populated Briefs

Check `$ARGUMENTS` for a **story brief** (passed from `story-splitter`) and/or a **TRACKING SYSTEM** block.

If a brief is present, extract what's already provided and **skip or pre-fill** the corresponding interview questions:

| Brief field | Pre-fills | Action |
|---|---|---|
| `Type: Story` | Step 1 (Issue Type) | Skip — announce "Creating a Story" |
| `Title:` | Q2 (Title) | Pre-fill — show and confirm: *"Proposed title: **[title]**. Does this work, or would you like to change it?"* |
| `CRUD Verb:` | Q4 (CRUD Verb) | Pre-fill — show and confirm |
| `This story covers:` | Q3 (Description) | Use as starting context — still ask the PO to expand it into a full user journey |
| `Relevant screens / resources:` | Q1 (Component), Q5 (UI Elements) | Use as context — still confirm component and ask about specific inputs |
| `Non-happy paths:` | Q6 (Validation), Q8 (AC) | Use as context — weave into AC draft |
| `Story Scope: Backend` | Step 1 (Issue Type) | Skip scope question — use Step 2C |
| `Story Scope: UI` or `Story Scope: Vertical Slice` | Step 1 (Issue Type) | Skip scope question — use Step 2A |
| `TRACKING SYSTEM` block | Step 4 (Create Work Item) | Use directly — skip asking which system |

For any field **not** in the brief, ask the question as normal.

When running **standalone** (no brief), run the full interview from Step 1.

---

## Step 1 — Detect Issue Type

Ask:
> "Are we writing a **Story**, **Bug**, or **Task**?"

Then determine the story scope:

- **Story (UI or vertical slice)** -> run the UI/Vertical Slice Interview (Step 2A)
- **Story (backend-only, no UI)** -> run the Backend Interview (Step 2C)
- **Bug** -> run the Bug Interview (Step 2B)
- **Task** -> run the Task Interview (abbreviated Step 2A — skip Q4 CRUD, Q5 inputs, Q6 validation, Q7 feedback)

**How to determine scope:** If the brief includes a `Story Scope: Backend` field, use Step 2C. If the PO says "Story", ask: *"Does this story involve **UI changes**, or is it a **backend-only** change (API, service, data pipeline, infrastructure)?"* UI or vertical slice -> Step 2A. Backend-only -> Step 2C.

---

## Step 2A — Story / Feature / Task Interview

Ask each question **one at a time**. Wait for the answer before asking the next. Do not batch questions.

### Q1 — Component / Area
> "Which component(s) or area(s) of the product does this affect?"

### Q2 — Title (Summary)
> "Write the story title. A good title completes the sentence: 'After this story, the [persona] will be able to...' — state the deliverable, not the task steps.
>
> Good: 'Flagging a message for SMS responses when a user creates a new template'
> Bad: 'Change navigation order and rename My Business Rules to My BRs'"

### Q3 — Description
> "Describe the user journey. Include: who is the persona (admin, member, guest, etc.), what they see, and what they do. Start with 'As a [persona]...' and describe the experience from the user's perspective — not the database schema or code changes."

### Q4 — CRUD Verb *(skip for Task type)*
> "What is the primary CRUD verb for this story?
> - **Create** — user adds something new
> - **Read** — user views or lists something
> - **Update** — user edits something existing
> - **Delete** — user removes something
>
> If more than one applies, we should consider splitting the story."

### Q5 — UI Elements / Inputs *(skip for Task type)*
> "What input fields, buttons, or UI elements are involved? For each input, what is its data type? (text, number, date, dropdown, checkbox, image, etc.)"

### Q6 — Validation Rules *(skip for Task and Read types)*
> "For each input field, what validation rules apply?
> - What makes it invalid?
> - What error message should appear?
> - Does a failed validation block the action (prevent save/navigation)?
> - Are there any format masks? (phone, zip, date, etc.)"

### Q7 — User Feedback *(skip for Task and Read types)*
> "What feedback does the user receive after completing the action? For example: success toast, confirmation modal, redirect to another page. Please specify the exact message text if possible."

### Q8 — Acceptance Criteria
> "Let's write the Acceptance Criteria. Based on your answers, here's a draft — review and expand it:
>
> [Generate a numbered draft AC from all prior answers. Group with sub-points. Cover Screen Events, UI Definition, User Actions, User Feedback, and Validation as applicable to the CRUD verb.]
>
> Make sure each criterion is numbered and specific. Avoid vague statements like 'data is saved correctly' — specify the exact field, value, and outcome."

### Q9 — Technical Details *(optional)*
> "Are there any technical details developers should know? For example: API endpoints to call, data model changes, third-party integrations, known constraints, or performance considerations. Skip if none."

### Q10 — Priority
> "What priority should this be assigned?
> Blocker / High / **Medium** (default) / Low / Lowest"

### Q11 — Parent *(optional)*
> "Is this a child of an existing Feature or Epic? If so, provide the work item key or ID. Otherwise, skip."

---

## Step 2B — Bug Interview

Ask each question **one at a time**. Do not batch questions.

### Q1 — Component / Area
> "Which component(s) or area(s) of the product is this bug in?"

### Q2 — Title (Summary)
> "Write the bug title. A good title names the **broken behavior** AND the **affected area**.
>
> Good: 'Payment form does not validate expiration date on submit'
> Bad: 'Payment not working'"

### Q3 — Steps to Reproduce
> "Provide numbered steps to reproduce the bug. Be specific enough that someone unfamiliar with the feature can follow them from scratch."

### Q4 — Expected Behavior
> "What **should** happen — what is the correct behavior?"

### Q5 — Actual Behavior
> "What **actually** happens — what is the broken behavior?"

### Q6 — Environment
> "Provide environment context:
> - Browser and version
> - Operating system
> - User role / account type
> - Any relevant data context (e.g., specific feature flag state, contract status)"

### Q7 — Acceptance Criteria
> "What does 'fixed' look like? Write the acceptance criteria — what must be true for this bug to be considered resolved? Be specific, not just 'it works'."

### Q8 — Technical Details *(optional)*
> "Any technical details, error logs, console output, or stack traces that would help developers? Skip if none."

### Q9 — Priority
> "What priority?
> **Blocker** / High / **Medium** (default) / Low / Lowest"

---

## Step 2C — Backend Story Interview

Use this path for stories that are purely backend — no UI component. Ask each question **one at a time**.

### Q1 — Component / Area
> "Which service(s) or area(s) of the system does this affect?"

### Q2 — Title (Summary)
> "Write the story title. A good title names the **operation and resource** — what the system will be able to do when this is done.
>
> Good: 'Create order via REST API', 'Process payment.failed events from Stripe webhook'
> Bad: 'Update database schema', 'Backend work for orders'"

### Q3 — Description
> "Describe what this operation does and who/what consumes it. Start with 'This operation allows [consumer] to...' and describe the behavior from the caller's perspective — not the internal implementation."

### Q4 — Operation Type
> "What type of operation is this?
> - **API endpoint** — a synchronous request/response operation
> - **Event handler** — processes an async event
> - **Event publisher** — emits an event for other services
> - **Scheduled job** — runs on a schedule or trigger
> - **Data migration** — one-time or versioned data transformation
> - **Integration** — connects to an external system
>
> If more than one applies, we should consider splitting the story."

### Q5 — Request / Input Shape
> "What data goes **in**? Describe the categories of input (e.g., 'customer details', 'order line items') and any required vs. optional fields at a high level. For APIs: what does the request look like?"

### Q6 — Response / Output Shape
> "What data comes **out**? Describe the response or output. For APIs: what does a successful response look like? What status codes are used?"

### Q7 — Error Handling
> "What are the error scenarios and how should each be handled?
> - What makes a request invalid? (validation errors)
> - What happens if a dependency is unavailable? (timeouts, retries, fallbacks)
> - What error codes or messages should be returned?
> - Are there idempotency requirements?"

### Q8 — Acceptance Criteria
> "Let's write the Acceptance Criteria. Based on your answers, here's a draft — review and expand it:
>
> [Generate a numbered draft AC from all prior answers. Cover: operation behavior, input validation, success response, error responses, edge cases, and any non-functional requirements.]
>
> Make sure each criterion is numbered and specific. Avoid vague statements like 'handles errors gracefully' — specify the exact error, response code, and behavior."

### Q9 — Technical Details *(optional)*
> "Any technical details developers should know? For example: auth requirements, rate limits, data model changes, migration steps, infrastructure dependencies, or performance constraints. Skip if none."

### Q10 — Priority
> "What priority should this be assigned?
> Blocker / High / **Medium** (default) / Low / Lowest"

### Q11 — Parent *(optional)*
> "Is this a child of an existing Feature or Epic? If so, provide the work item key or ID. Otherwise, skip."

---

## Step 3 — Preview & Confirm

Before creating the work item, show a structured preview:

```
Issue Preview
---------------------------------------------
Type:         [Story / Bug / Task / Feature]
Summary:      [title]
Component(s): [component(s)]
Priority:     [priority]

Description:
[description text]

Acceptance Criteria:
[AC text]

Technical Details:
[tech details or "(none)"]
---------------------------------------------
Shall I create this work item? (yes / edit [section name] / cancel)
```

- **yes** -> proceed to Step 4
- **edit [section name]** -> re-ask the relevant question(s), then re-show the preview
- **cancel** -> stop and discard

---

## Step 4 — Create the Work Item

**If a `TRACKING SYSTEM` block was provided** (from story-splitter or feature-writer), use it directly — do not re-ask the PO which system to use. Set the parent from the block if provided and Q11 was skipped.

**If no tracking context was provided** (standalone mode), ask:

> *"Would you like me to create this in a tracking system? If so, which one — **Jira**, **Azure DevOps**, or **none** (just keep the document)?"*

### Jira

Ask for the **project key** and **cloud ID** if not already known from the tracking context. Use the appropriate Jira MCP tool to create the issue with:

| Field | Value |
|-------|-------|
| `projectKey` | from tracking context or PO |
| `issueTypeName` | Story / Bug / Task / Feature (as selected) |
| `summary` | from Q2 |
| `description` | structured description (see format below) |
| `parent` | from tracking context or Q11, if provided |
| `priority` | from Q10 |
| `components` | from Q1, if the project supports components |

### Azure DevOps

Ask for the **organization** and **project name** if not already known from the tracking context. Use the appropriate Azure DevOps MCP tool to create the work item with:

| Field | Value |
|-------|-------|
| Work item type | Story / Bug / Task / Feature (as selected) |
| Title | from Q2 |
| Description | structured description (see format below) |
| Acceptance Criteria | from Q8 |
| Priority | from Q10 |
| Area Path | from Q1, if applicable |
| Parent | from tracking context or Q11, if provided |

### None

Present the final formatted document for the PO to copy into their system manually.

### Description format for Bugs

Construct from interview answers:
```
*Steps to Reproduce:*
1. [step]
2. [step]

*Expected Behavior:*
[expected]

*Actual Behavior:*
[actual]

*Environment:*
- Browser: [browser]
- OS: [OS]
- User Role: [role]
- Context: [context]
```

---

## Step 5 — Confirm & Review

After the work item is created (or document delivered):

1. Output confirmation:
   > "Created **[work item ID]** — [title]"

2. Ask: *"Would you like me to run a quality review on this work item?"*

   If yes, invoke the `story-prefinement` skill, passing the work item details and the `TRACKING SYSTEM` block if available.

---

## Common Mistakes to Prevent

| Situation | Coaching Response |
|-----------|------------------|
| Title describes a task ("Add checkbox to form") | Redirect: "After this story, the [persona] will be able to..." — what's the deliverable? |
| Description lists database columns or code changes | Redirect: "Describe what the *user* sees and does, not what changes in the code." |
| AC is vague ("data saves correctly") | Push back: "Be specific — which field? What valid values? What exact error message?" |
| Multiple CRUD verbs in one story | Flag: "This story covers both Create and Update. Should we split it into two?" |
| No validation rules for inputs | Ask: "For [field name]: what's invalid? What's the error message? Does it block saving?" |
| Bug title is too vague ("it's broken") | Require: "Name the broken behavior + the area. What exactly doesn't work, where?" |
| Missing bug environment | Always follow up: "What browser, OS, and user role were you using when this occurred?" |
| AC for bug is just "it works" | Push back: "What specifically must be true? What outcome verifies the fix?" |
