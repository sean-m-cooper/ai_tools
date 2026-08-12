---
name: audit-writing-architecture
description: Audit technical and professional nonfiction with SOLID, DRY, YAGNI, paragraph contracts, and refactoring practices. Use when asked to review an article, essay, white paper, newsletter, documentation set, or similar nonfiction for structural cohesion, coupling, reader context, replaceable support, repetition, unnecessary material, or readiness to publish. Produce a read-only, prioritized architectural diagnosis unless the user explicitly asks for revision.
---

# Audit Writing Architecture

Review a complete piece as an editor conducting an architectural review. Diagnose how its components compose into a useful whole. Do not treat sentence-level smoothness as proof that the document works.

## Prepare

1. Read the complete target piece, including frontmatter, notes, citations, tables, and appendices that are part of the reader's path.
2. Read applicable repository instructions, publication standards, and author style guidance. Those requirements override this skill.
3. Establish or infer:
   - intended reader;
   - governing question or purpose;
   - desired reader outcome;
   - scope and publication context.
4. Ask the author one focused question only when missing context would materially change the diagnosis. Otherwise state the inference.
5. Read [references/framework.md](references/framework.md) before conducting the audit.

## Build the Structural Model

Inspect the work from the top down:

1. Map the document's chapters or major divisions, sections, paragraphs, and important sentences.
2. State the responsibility of each major component in plain language.
3. Trace the reader's path through the argument. Record the context each component requires and the result it must provide.
4. Identify the first structural level that fails. Do not start by polishing sentences when a chapter, section, or paragraph has the wrong responsibility or position.
5. Separate architectural problems from:
   - factual or evidentiary gaps;
   - copyediting and proofreading;
   - authorial voice and cadence;
   - publication mechanics.

Use `$content-voice-audit` for broad voice and AI-pattern heuristics. Use `$content-voice-revision` for an editor-author revision process. Do not duplicate those skills inside this audit.

## Apply the Diagnostics

Test every principle internally, but report only principles that reveal a meaningful strength, risk, or failure. Never invent one finding per principle.

For each suspected failure:

1. Name the exact component and quote only enough text to locate it.
2. Identify the relevant diagnostic and explain the problem without relying on software jargon.
3. State the violated or unclear reader contract:
   - **Preconditions:** What must the reader already know, accept, or be considering?
   - **Responsibility:** What one rhetorical purpose must this component fulfill?
   - **Postconditions:** What information, reasoning, question, or condition must be available afterward?
4. Explain the consequence for the reader or the surrounding argument.
5. Propose the smallest useful refactor: keep, cut, move, split, merge, promote, replace, qualify, or rewrite.
6. State what must be retested after the change.

Treat the framework as a set of diagnostic lenses, not laws. Preserve deliberate ambiguity, pacing, repetition, parallel examples, emotional effect, and persuasive technique when they serve the author's purpose.

## Prioritize

Order findings by reader consequence, not by principle or location:

- **Must fix:** The governing argument, evidence, reader context, or component contracts do not compose into the intended result.
- **Should fix:** The piece works, but unnecessary coupling, mixed responsibility, duplication, or detours make it harder to understand, revise, or reuse.
- **Optional:** A defensible improvement whose value depends on the author's taste, channel, or intended effect.

Do not assign a numerical score unless the user explicitly requests one. Do not chase framework purity at the expense of a piece that already works.

## Report

Lead with the editorial judgment. Use this structure:

1. **Overall judgment:** State whether the piece fulfills its purpose and name the highest-impact architectural issue.
2. **Intended contract:** Summarize the inferred reader, governing purpose, outcome, and scope.
3. **Strengths to protect:** Identify structures or techniques that already work and should survive revision.
4. **Prioritized findings:** For each finding, give location, diagnostic, evidence, reader consequence, smallest refactor, and retest condition.
5. **Architecture map:** Include a compact component-to-responsibility map only when it clarifies three or more relationships.
6. **Refactoring sequence:** Recommend the smallest safe order of operations. Work from document to sentence and change one relationship at a time.
7. **Open questions:** List only factual, evidentiary, or author-intent questions that block a confident recommendation.

Keep the report proportional to the piece. A strong article may need only a few findings. Say explicitly when a suspected failure is a false positive or an intentional choice.

## Boundaries

- Remain read-only unless the user explicitly requests edits.
- Never invent facts, citations, outcomes, quotations, anecdotes, or author intent.
- Do not use a source's prestige as a substitute for explaining its role.
- Do not assume shorter is better. Necessary depth may be long, and a two-sentence aside may still be unnecessary.
- Do not confuse a shared topic with a shared responsibility.
- Do not confuse a transition with the full reader contract across a boundary.
- Do not describe a revised paragraph as a software subtype. Liskov is used here only as a behavioral-substitution lens.
- Do not let the thesis overrule contrary evidence. The argument organizes support, but evidence controls what the argument may responsibly conclude.

When revision is requested, preserve the diagnosis as the test plan. Make changes small enough to verify, then recheck the affected component contracts and downstream dependencies.
