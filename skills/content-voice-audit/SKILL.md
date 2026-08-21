---
name: content-voice-audit
description: Run a read-only heuristic audit of Markdown blog posts, newsletters, essays, and thought-leadership content for formulaic cadence, weak evidence, generic significance, canned phrasing, repeated AI-pattern signals, and thin structure. Use when asked to run a content or slop audit, identify low-scoring pieces, rank editorial risks, or generate a content-quality report for one or more content directories.
---

# Content Voice Audit

Generate a repeatable editorial diagnostic. Do not edit source content.

## Workflow

1. Work from the target repository root.
2. Read the repository's writing instructions and brand guidance. Then read `author-style-guide.md` from the repository root when it exists. Use those rules to interpret the results.
3. Identify the Markdown files or directories to audit.
4. Resolve this skill's directory from the loaded `SKILL.md`, then run its bundled generator:

```shell
node "<skill-directory>/scripts/generate-content-audit.js" --content path/to/posts
```

Repeat `--content` to audit multiple files or directories. Use `--output-dir` to place the report somewhere other than the repository root:

```shell
node "<skill-directory>/scripts/generate-content-audit.js" --content posts --content drafts --output-dir reports
```

Without `--content`, the generator discovers common directories such as `content`, `posts`, `blog`, `_posts`, `articles`, `src/content/blog`, and `drafts`. It searches recursively for `.md` and `.mdx` files and writes `content-voice-audit-data.js` and `content-voice-audit.html`. Run it from the target repository root so links and defaults resolve correctly.

If discovery finds nothing, inspect the repository and rerun with explicit `--content` paths. If the repository has its own current audit generator, prefer it when it is clearly authoritative.

The formula-pattern checks are English-specific. For content in other languages, rely on the structural, cadence, evidence, link, date, and numeric signals, then evaluate voice manually.

## Interpret the Signals

Use cadence, formula, vocabulary, punctuation, and formatting signals to diagnose the writing, not to decide whether a person or model wrote it or to help prose evade a detector. Treat them as genre-aware clusters and repeated defaults. An isolated phrase or punctuation choice is not a violation, and ordinary words and marks are never banned.

For each surface signal, identify the underlying reader or argument problem before reporting it. Examples include a repeated rhetorical move flattening the cadence, canned language replacing a direct claim, formatting that conflicts with the medium, or emphasis outrunning the evidence. Recommend a correction for that problem, not cosmetic variation, mechanical removal of a tell, fabricated roughness, or random sentence-length changes.

Scrutinize claims of importance when abstract praise substitutes for an observable consequence. Words such as `pivotal`, `crucial`, and `transformative` are not findings by themselves. Ask what changed, what the reader can observe, or what decision the claim should affect, and flag the passage only when it does not earn its emphasis in context.

Route document composition, component responsibility, paragraph contracts, repetition across components, and argument flow to `$audit-writing-architecture` rather than duplicating those diagnostics here.

## Report

Report:

- The lowest-scoring pieces in score order.
- The likely editorial issue for each: cadence, missing evidence, unearned significance, formula turns, thin structure, or insufficient specificity.
- Whether the score appears to be a heuristic false positive.
- The smallest useful revision for each piece.

Interpret score bands as:

- **82–92:** strong.
- **72–81:** solid.
- **62–71:** needs work.
- **45–61:** high risk.

Treat the score as evidence of a possible problem, not the goal. Do not make source edits, propose invented receipts, or turn the report into generic writing advice.
Cross-check the generated narrative against the underlying metrics before reporting. Explain isolated formula signals even when they do not justify a penalty.
Do not describe the score as a likelihood of AI authorship. A strong audit may return no material findings.

For revision work, hand the findings to `$content-voice-revision` with an explicit scope, such as the lowest five pieces or a named post.
