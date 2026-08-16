---
name: cold-start-audit
description: Audit a standalone artifact for context its intended reader, operator, or AI collaborator needs but was never given. Use when asked whether an article, essay, specification, architecture decision, proposal, user story, runbook, prompt, instruction file, or similar artifact can stand on its own; when asked to run a cold-start review; or when looking for undefined terms, ambiguous referents, undeclared prerequisites, missing logical steps, required information hidden behind links, or irrelevant background. Produce a read-only, prioritized context-dependency diagnosis unless the user explicitly requests revision.
---

# Cold-Start Audit

Review the artifact from the intended consumer's environment, not the author's workbench. Treat every question required to continue as evidence of a possible missing dependency.

## Create the Cold Start

1. Read the complete artifact, including frontmatter, tables, footnotes, appendices, and other material on its primary path.
2. Read applicable repository and publication requirements. Use them as audit constraints, not as hidden context supplied to the artifact's reader.
3. Establish the intended consumer, desired outcome, publication or operating context, and explicitly declared prerequisites. Infer them from the artifact when necessary and label the inference.
4. Exclude outlines, source notes, earlier drafts, author conversations, meeting history, implementation knowledge, and explanations that the eventual consumer will not receive.
5. When a fresh worker or isolated context is available, give it only:
   - the exact artifact;
   - the intended consumer and outcome;
   - explicitly declared prerequisites;
   - applicable public standards.

Do not include a suspected defect, intended answer, private rationale, or prior diagnosis. When isolation is unavailable, quarantine that knowledge and never use it to resolve ambiguity. Record the question instead.

Read [references/context-dependency-model.md](references/context-dependency-model.md) completely before conducting the audit.

## Establish the Consumer Contract

State:

- **Consumer:** Who must understand, evaluate, decide, execute, or generate something from this artifact?
- **Outcome:** What should that consumer be able to do afterward?
- **Primary path:** What content will the consumer receive without following an optional link or consulting another artifact?
- **Declared prerequisites:** What knowledge or access does the artifact explicitly require the consumer to bring?

Do not ask the author to explain an ambiguity before auditing it. The missing explanation may be the finding. Ask one focused question only when the target artifact or intended consumer cannot be identified.

## Inventory the Prerequisites

List the domain knowledge, definitions, prior conclusions, permissions, system state, constraints, and source material the artifact depends upon. Classify each prerequisite as:

- **Supplied:** The artifact provides it before the consumer needs it.
- **Declared:** The artifact or supplied consumer contract identifies it as knowledge or access the consumer must bring, and the expectation is reasonable for that consumer.
- **Absent:** The artifact depends on it but neither supplies nor declares it.

A declaration makes the interface explicit. It does not teach the prerequisite itself.

## Trace the Consumer Path

Inspect the artifact in reading or execution order:

1. **Openings:** Verify that every major division, section, paragraph, step, or instruction begins from information already available.
2. **Referents:** Trace words such as *this*, *that*, *it*, *they*, *the example*, *the result*, and *the approach* to one unmistakable antecedent.
3. **Terms:** Find undefined acronyms, overloaded words, domain terms, named frameworks, and role names whose local meaning is not clear.
4. **Reasoning:** Identify the premise, evidence, constraint, or prior conclusion that makes each important step follow.
5. **Conditions:** Check whether advice, decisions, behaviors, and procedures state when they apply and when they do not.
6. **Audience assumptions:** Determine whether omitted background is appropriate for the declared consumer or merely familiar to the author.
7. **Optional paths:** Verify that links, citations, appendices, and related documents support verification or depth rather than contain context required to continue.
8. **Excess context:** Identify background that no later component uses and that every consumer is nevertheless forced to process.

For each suspected dependency, write the cold consumer's question in plain language. Do not answer it from private context.

## Prioritize the Findings

Order findings by consumer consequence:

- **Must supply:** The missing context prevents understanding, evaluation, execution, or a safe result, or makes a materially wrong interpretation likely.
- **Should supply:** The consumer can recover by rereading, guessing, searching, or following an unnecessary detour, but the artifact imposes avoidable work.
- **Optional:** The artifact already works; added context may help a broader audience or improve convenience.

Do not assign a numerical score unless the user requests one. A strong artifact may pass with no findings.

## Report

Use this structure:

1. **Overall judgment:** State whether the artifact survives a cold start and name the highest-impact dependency.
2. **Consumer contract:** Summarize the consumer, outcome, primary path, and declared prerequisites.
3. **Prerequisite inventory:** Show supplied, declared, and absent prerequisites. Omit empty categories.
4. **Prioritized findings:** For each finding, provide:
   - exact location;
   - the cold consumer's question;
   - dependency type;
   - consumer consequence;
   - smallest useful fix;
   - what must be verified afterward.
5. **Strengths to protect:** Identify context that is already supplied effectively and deliberate choices that should remain.
6. **Open questions:** Include only questions that block a confident recommendation.

Keep the report proportional to the artifact. Do not turn a clean artifact into a long checklist of passes.

## Boundaries

- Remain read-only unless the user explicitly requests edits.
- Separate missing context from factual accuracy, evidentiary strength, voice, copyediting, and broader structural problems.
- Do not demand that every specialized term be defined. A declared expert audience may reasonably bring domain knowledge.
- Preserve deliberate suspense, ambiguity, delayed context, and persuasive sequencing when they serve an identifiable purpose.
- Do not assume more context is better. Require the smallest sufficient context for the consumer and outcome.
- Do not treat a link as a failure when the primary path already supplies what the consumer needs.
- Do not use external knowledge to silently repair the artifact.
- Use `$audit-writing-architecture` when the main problem is component responsibility, composition, coupling, repetition, or document-wide structure.
- Use `$content-voice-revision` when the user wants approved findings revised in the source artifact.

When revision is requested, preserve the findings as verification criteria. Change one dependency at a time, then rerun the cold-start audit with the revised artifact and the same consumer contract.
