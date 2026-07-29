---
name: content-voice-revision
description: Revise selected blog posts, newsletters, and thought-leadership content using findings from a content audit. Use when asked to fix named essays, improve the lowest-scoring content, reduce AI-sounding cadence, add evidence or receipts, or strengthen an argument without changing the author's voice. Work conversationally with the author to solicit missing evidence, nuance, and lived experience before substantive rewrites.
---

# Content Voice Revision

Improve selected content through an editor-author conversation. Use an existing content audit as input when one is available. Do not widen the scope beyond the pieces the user named.

## Before Editing

1. Read the target repository's writing instructions, brand guidance, and anonymization rules. Then read `author-style-guide.md` from the repository root when it exists. Apply this precedence: repository rules, the author guide, the source piece's established conventions, then `references/default-content-guidelines.md`.
2. Read each complete target piece and its audit findings before editing.
3. Identify the real issue. A low score can be a false positive, and a strong line may deserve to remain isolated.
4. Separate expression problems from substance problems:
   - **Expression:** cadence, paragraph shape, repetition, structure, clarity, or phrasing. These can be revised directly.
   - **Substance:** a missing anecdote, measurement, counterargument, decision rationale, consequence, or source. These require author input.
5. Never invent a receipt, anecdote, number, outcome, source claim, or emotional motive.

If no current audit exists, ask the user to run `$content-voice-audit` first or identify the editorial issue they want addressed.

## Author Interview

When substance is missing, behave like a good editor working with an author.

1. Explain the specific weakness and why it matters to the argument.
2. Ask one focused question at a time. Prefer questions that invite a concrete memory or decision:
   - What happened in the real case that proves this point?
   - What constraint made the decision difficult?
   - What changed after the team acted?
   - Do you have a number, date, artifact, or source that makes this defensible?
   - What would a thoughtful skeptic say here?
3. Let the author answer in their own language. Preserve useful phrasing, judgment, and nuance from the answer.
4. Follow the most promising thread before moving to another weakness. Do not interrogate the author with a questionnaire.
5. Summarize the proposed editorial move before making a substantive rewrite: what new evidence will appear, where it will go, and how it supports the thesis.

For expression-only issues, make the narrow edit without creating unnecessary interview overhead.

## Revise

1. Preserve the thesis, distinctive voice, and real-world detail.
2. Use the author's answers to add evidence, nuance, and consequences. Do not use AI inference to fill factual gaps.
3. Merge explanatory one-line stacks into 2-4 sentence paragraphs.
4. Keep isolated sentences for pivots, section closers, and genuinely memorable claims.
5. Prefer a specific event first, the principle second, and the framework third.
6. When the argument relies on material first-party claims, external evidence, benchmarks, or a prediction, use the repository's evidence convention. If none exists, add a clearly named evidence or sources section appropriate to the format.
7. State the strongest counterargument when the claim is hot, predictive, or counterintuitive.
8. Use an artifact, decision rule, example, or before/after comparison when teaching a practice.
9. Do not add filler, fake detail, or formulaic prose merely to improve a score.

Read `references/default-content-guidelines.md` before editing. Treat it as fallback guidance, never as a substitute for the repository's rules or the author's demonstrated preferences.

## Validate

1. Read every changed file directly and check punctuation, spelling, and formatting against the applicable repository and author guidance.
2. Ensure long-form content does not read like a social thread unless that cadence is an explicit author preference.
3. Re-run the content audit after edits when the repository has an audit generator. Report score movement as a signal, not proof of quality.
4. Run the relevant site or document validation when applicable.
5. Do not commit or push unless the user explicitly asks.

## Report

Report the revised files, the substantive improvements, the author-provided evidence incorporated, score movement, validation results, and any remaining evidence gaps. Explain why the argument is stronger in human terms.
