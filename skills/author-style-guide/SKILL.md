---
name: author-style-guide
description: Analyze an author's real writing samples, interview them about observed patterns and intended positioning, and create or update a personalized style guide for articles, newsletters, social posts, email, product writing, or thought leadership. Use when an author wants to define their voice, extract actionable core rules, distinguish audience or channel registers, document brand and product positioning, calibrate AI editing behavior, create author-style-guide.md, or give downstream writing agents a shared source of truth.
---

# Author Style Guide

Create a durable, evidence-led, author-approved style guide. Capture how the author writes at their best, not a polished generic voice or an aspirational persona they did not choose.

## Output And Precedence

Create `author-style-guide.md` in the target repository root unless the author gives another location. When downstream skills use the guide, apply this precedence:

1. System and repository instructions.
2. `author-style-guide.md`.
3. Generic skill references and defaults.

Do not overwrite an existing guide without explaining the proposed change and receiving the author's approval.

## Establish The Evidence Base

1. Ask for the writing samples to analyze and the channels, audiences, or time periods they represent.
2. Prefer 5–20 samples the author wrote or substantially edited. Favor finished work over isolated fragments and include multiple channels when the guide must support them.
3. Ask which samples were AI-assisted, ghostwritten, heavily edited by someone else, or intentionally unlike the author's normal voice. Treat those as comparison material, not primary evidence.
4. Read every selected sample before forming conclusions. If an existing `author-style-guide.md` is present, read it as a set of claims to validate, not unquestioned truth.
5. Do not reproduce private or sensitive sample content in the guide unless the author requests it.

If the author has no samples, continue through interview evidence and label the initial guide as provisional.

## Analyze The Samples

Build working hypotheses across:

- Sentence length, fragments, rhythm, paragraph shape, and transitions.
- Point of view, formality, emotional range, humor, directness, and trust in the reader.
- Openings, argument structure, examples, evidence, counterarguments, and conclusions.
- Vocabulary, metaphor, jargon, punctuation, formatting, and recurring phrases.
- Differences by audience, channel, purpose, or stage of the customer relationship.
- Product, company, category, competitor, and customer framing when present.
- Repeated edits or contrasts between drafted and published versions.

For each hypothesis, retain the sample evidence, confidence level, and the question that would confirm or disprove it. Distinguish:

- **Observed:** visible in the samples.
- **Confirmed:** explicitly approved by the author.
- **Provisional:** plausible but not yet tested.
- **Contextual:** true only for a named audience, channel, or purpose.

Do not turn incidental grammar, a one-off joke, or a single platform constraint into a universal rule.

## Interview From Evidence

Work as an editor, not a questionnaire. Ask one focused question at a time and follow the most revealing thread.

1. Confirm the intended readers and what the writing should help them understand, feel, decide, or do.
2. Present a small number of sample-backed hypotheses. Ask the author to confirm, reject, narrow, or reframe each one.
3. Convert confirmed patterns into specific core rules. Ask what must always remain true and what the author routinely removes from weak drafts.
4. Identify audience registers. Ask what changes between audiences and what must stay recognizable everywhere.
5. Identify channel behavior. Ask about length, structure, openings, closings, formatting, links, calls to action, and trust-building for each relevant channel.
6. When the author writes about a company or product, interview them separately about positioning:
   - Audience problem and desired outcome.
   - Category and value proposition.
   - Differentiators and proof.
   - Claims that require qualification.
   - Competitor and customer language.
   - Words, promises, comparisons, or frames to avoid.
7. Ask for drafted-versus-sent, before-and-after, or editor-revision pairs. Identify the lesson in each delta without assuming every change is a voice preference.
8. Ask how downstream agents should edit: preserve exact wording, suggest before rewriting, make narrow passes, or perform broader restructuring.

Use the author's own phrasing when it captures a real rule. Preserve dialect, multilingual influence, or non-native constructions the author considers part of their voice.

Read `references/default-ai-tells.md` as an interview aid. Include only patterns supported by the samples or confirmed by the author; do not impose the checklist as a universal house style.

## Draft The Guide

Read `references/style-guide-structure.md` and use the sections that the evidence supports. Omit irrelevant sections and mark important gaps as open questions rather than inventing preferences.

Write rules another agent can execute and a human author can recognize. Pair important rules with a short rationale or calibration example. Replace vague advice such as "sound authentic" with an observable instruction.

Keep voice rules separate from factual messaging rules:

- **Voice rules** govern expression.
- **Audience and channel rules** govern adaptation.
- **Positioning rules** govern what the author or organization claims.
- **Calibration examples** show how to apply the rules.

## Review With The Author

Present the draft as a working editorial document. Ask:

1. What feels exactly right?
2. What feels unlike you?
3. Which rule is too broad or belongs only to one context?
4. Which missing rule would most improve a future draft?

Revise from that feedback. Promote provisional rules to confirmed only when the author agrees. Do not revise source content as part of this skill.

For updates, preserve useful existing rules, add new evidence, resolve contradictions explicitly, and keep a short `Last calibrated` note in the guide.
