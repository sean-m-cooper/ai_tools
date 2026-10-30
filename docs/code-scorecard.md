# Code Scorecard has moved to CodeTestament

The canonical skill, helper scripts, compatibility records, tests and evaluations
now live with the analyzers in the CodeTestament repository. This repository keeps
a pinned marketplace reference, not another copy of the implementation.

- [Canonical skill](https://github.com/sean-m-cooper/CodeTestament/tree/53f7e28afc04661d7d77187148a42b62b6897ed8/skills/code-scorecard/SKILL.md)
- [Installation and maintenance](https://github.com/sean-m-cooper/CodeTestament/tree/53f7e28afc04661d7d77187148a42b62b6897ed8/docs/scorecard-skill.md)
- [Scoring and output guide](https://github.com/sean-m-cooper/CodeTestament/tree/53f7e28afc04661d7d77187148a42b62b6897ed8/docs/code-scorecard.md)
- [Compatibility manifest](https://github.com/sean-m-cooper/CodeTestament/tree/53f7e28afc04661d7d77187148a42b62b6897ed8/skills/code-scorecard/compatibility.json)

Pinned source commit: `53f7e28afc04661d7d77187148a42b62b6897ed8`. GitHub was renamed to
`sean-m-cooper/CodeTestament` on 2026-10-29. The pinned source commit has been pushed.

## Installation

Once this marketplace update is merged into main:

```text
/plugin marketplace add sean-m-cooper/ai_tools
/plugin install codetestament@ai-tools
/reload-plugins
```

For pre-merge verification, add this marketplace with
`claude plugin marketplace add "sean-m-cooper/ai_tools#codex/codetestament-skill-migration"`.

Use `/codetestament:code-scorecard` instead of `/ai-tools:code-scorecard`.
Install the separate plugin and update/reload ai-tools to remove the old bundled
copy. Updating ai-tools alone does not install CodeTestament. Other agent hosts
should load the canonical `skills/code-scorecard/SKILL.md`; copy its whole folder
when installing skills manually.

Analyzer defaults remain the verified published packages until new CodeTestament
packages pass publication checks. Existing exact pins, CMAI annotations and
historical evidence keep the same compatibility rules. Python remains a preview;
Error Handling stays unscored.

## Maintenance

Make all scorecard changes and run its integration checks in CodeTestament.
Publish and verify the source commit first, then update the `sha` on the
`codetestament` marketplace entry. Do not restore a bundled implementation here.
The moved skill and guide retain their original CC BY 4.0 license and attribution.
