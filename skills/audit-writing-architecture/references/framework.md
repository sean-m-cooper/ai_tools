# Writing Architecture Framework

Use this reference to interpret the diagnostic lenses. It distills the framework developed in [*The Architecture of Nonfiction*](https://yourdevteamcoach.com/long-form/the-architecture-of-nonfiction).

## Contents

- [Core model](#core-model)
- [Component hierarchy](#component-hierarchy)
- [Paragraph contract](#paragraph-contract)
- [Architectural qualities](#architectural-qualities)
- [SOLID diagnostics](#solid-diagnostics)
- [DRY](#dry)
- [YAGNI](#yagni)
- [Refactoring cycle](#refactoring-cycle)
- [AI-assisted review](#ai-assisted-review)

## Core Model

A document is complete and correct only when two conditions are met: its statements are true, clear, and mechanically sound, and its parts compose into a useful whole.

The intended reader is the runtime environment. A passage can work for the author and fail for the reader because the author supplied context that never reached the page. Treat this as the writing equivalent of “works on my machine.”

The framework is scoped to technical and professional nonfiction whose purpose is to help a reader understand, evaluate, decide, or act. Persuasive writing may deliberately ask the reader to sit with a question or feel an effect, but those choices still need an identifiable purpose. Fiction may break these expectations for artistic effect.

## Component Hierarchy

Use **component** as the umbrella term for a bounded structural part of a complete work.

- **Document:** The complete architectural container. It answers a governing question or fulfills a governing purpose.
- **Chapter or major division:** Develops a major part of the document's cumulative argument.
- **Section:** Resolves a question or provides a key part of the chapter's argument.
- **Paragraph:** Serves one rhetorical purpose and establishes a condition the next component can use.
- **Sentence:** Performs a specific function within its paragraph.

Name the exact level when it matters. Reserve **passage** for an excerpt rather than using it as an interchangeable structural level.

## Paragraph Contract

Model the handoff across a paragraph boundary with three parts:

| Contract element | Diagnostic question |
|---|---|
| Preconditions | What must the reader already know, accept, or be considering? |
| Responsibility | What rhetorical purpose must the paragraph fulfill here? |
| Postconditions | What information, reasoning, question, or condition must be available afterward? |

A transition helps signal the handoff. It is not the entire interface. The surrounding argument also depends on context, terminology, logical position, tone, and the result the paragraph establishes.

## Architectural Qualities

- **Cohesion:** The component's parts change for the same reason and cooperate in one purpose.
- **Coupling:** One component depends on another component's specific wording, order, example, or hidden context.
- **Interface:** The complete reader-facing contract across a boundary, including necessary context and expected result.
- **Dependency:** Information or reasoning one component requires from another.
- **Encapsulation:** Detail is kept within the component that owns it, while readers receive the result or interface they need.
- **Composition:** Components combine into the document's intended reader outcome.
- **Refactoring:** Structure changes without abandoning the governing purpose, unless evidence shows that purpose or conclusion must change.

Low coupling is not independence from evidence. A conclusion remains accountable to the facts supporting it.

## SOLID Diagnostics

### Single Responsibility

Interpret SRP as **one reason to change**, not “do one thing.” A strong sentence can inform, evoke emotion, raise a question, and create momentum at once. Those effects may remain cohesive when new information would require them to change together.

Ask:

- If the audience changed, which components would require new context, terminology, or tone?
- If the evidence changed, which support and conclusions would require revision?
- If the rhetorical purpose changed, which components would also need revision?
- If the publication context changed, which framing would become irrelevant?

Components that change for different reasons probably hold separate responsibilities. A shared topic does not prove cohesion.

### Open-Closed

Keep the governing purpose, argumentative sequence, component responsibilities, and handoffs stable enough that sources, examples, counterarguments, applications, and channel-specific framing can be added, replaced, or removed without structural collapse.

Ask:

- Can support change without reconstructing the thesis and every transition?
- Do transitions depend on what an example establishes or on that example's exact chronology and wording?
- If the primary example disappears, does the general argument remain?
- Does new material extend or qualify the argument, or does it reveal that the argument must change?

**Boundary:** Closed does not mean untouched. A paragraph may be rewritten extensively while the surrounding role and contract remain stable. Contrary evidence is not an extension point; it may require revising the conclusion.

### Liskov Substitution

Use LSP as a behavioral-substitution test. A replacement paragraph may look entirely different while preserving the contract the surrounding argument relies upon.

Ask:

- What prior context does this component require?
- What purpose must it fulfill at this location?
- What must it establish for the next component?
- Can the surrounding components remain unchanged after the replacement?
- Does the replacement preserve the contract or merely discuss the same topic?

**Boundary:** This is not an inheritance or subtype relationship. It is a lens for checking whether a replacement preserves reader-facing behavior.

### Interface Segregation

Give a reader only the context, reasoning, terminology, and detail necessary for the intended outcome. This is not merely “write less.” It is the smallest interface that remains sufficient.

Ask:

- What should this reader understand, evaluate, decide, or do afterward?
- Which inputs are required for that result?
- Is the reader being forced through a brain dump meant for another audience or task?
- Can optional detail move to a footnote, appendix, link, sidebar, or separate publication?
- Does the primary path still make sense without following an optional path?
- Has compression removed a precondition the reader needs?

State audience assumptions when a piece intentionally omits background. Even comprehensive books define what readers must already know.

### Dependency Inversion

Separate the argument the author seeks to make from the sources, quotations, anecdotes, studies, and examples supporting it. The governing argument determines what role support must perform. Evidence retains authority to qualify, revise, or overturn the conclusion.

Ask:

- What governing question and thesis organize the piece?
- What exact role does each supporting item perform?
- Did the argument require this material, or did it receive space because it was interesting?
- Could stronger evidence replace a source without forcing unrelated components to change?
- Does each citation expose a specific evidentiary dependency?
- Has contrary evidence changed the relevant assertion?
- Has an interesting detail grown enough to require a separate treatment?

**Difference from Open-Closed:** OCP asks where support may change without unnecessary reconstruction. DIP asks which way the reasoning runs and whether the argument depends on roles rather than accidental details.

## DRY

Apply DRY to knowledge, not identical strings: **Don't repeat your knowledge, even when you change the words.** Facts, definitions, decisions, and instructions should have an authoritative representation when inconsistency would create drift.

Ask:

- Which knowledge appears in more than one place?
- Which representation is authoritative?
- If it changes, which components and publications require review?
- Do different words hide competing versions of the same idea?
- Could a maintained note, glossary, style guide, or data source prevent drift?

Repetition can remain useful when it provides emphasis, rhythm, recall, independent context, or parallel examples across different fields. Require each repetition to perform identifiable work.

## YAGNI

Evaluate material by present reader value, not by length or the effort already spent producing it. A brief aside can be unnecessary, while a long technical explanation can be essential.

Ask:

- What present reader need does this material serve?
- What part of the argument fails if it is removed?
- Does it answer a real objection or every objection the author can imagine?
- Is it present because the argument requires it or because the research already exists?
- Is an abstraction solving demonstrated reuse or hypothetical reuse?
- Is sunk effort affecting the decision to keep it?
- Should the material remain, be cut, move to working notes, or become a separate publication?

Low-cost AI research and generation make overloading easier. The author can accumulate more accurate and interesting material than the argument requires. Preserve valuable discoveries outside the reader's path without preserving them inside the current piece.

## Refactoring Cycle

Use this cycle:

1. **Plan:** State the reader, governing purpose, outcome, scope, component responsibilities, and evidence needs.
2. **Draft:** Implement the first version and discover what the argument actually requires.
3. **Test:** Inspect document, major divisions, sections, paragraphs, and sentences in that order.
4. **Review:** Add an experienced external reader who can question purpose, sequence, support, and reader context.
5. **Refactor:** Make one structural change at a time, then retest affected contracts and dependencies.
6. **Publish:** Release when the piece fulfills its responsibility, not when no imaginable improvement remains.

Automated proofreading and style tools roughly resemble linters. A substantive or developmental editor more closely resembles an experienced engineer conducting a pull-request review. This is a useful analogy, not a one-to-one equivalence.

## AI-Assisted Review

AI tends toward local optimization when asked local questions. “Make this paragraph clearer” presumes the paragraph should remain. Architectural review must also ask whether the paragraph should be deleted, moved, divided, merged, or assigned a different responsibility.

Provide AI with the intended audience, governing purpose, scope, component responsibilities, evidence constraints, and authorial standards. Ask it to test declared contracts and dependencies rather than merely make the writing smoother. The author remains responsible for factual accuracy, evidentiary judgment, voice, and the decision to publish.
