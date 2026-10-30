# Code Scorecard has moved to CodeTestament

The canonical skill, helper scripts, compatibility records, tests and evaluations
now live with the analyzers in the CodeTestament repository. This repository keeps
a pinned marketplace reference, not another copy of the implementation.

- [Canonical skill](https://github.com/sean-m-cooper/CodeTestament/tree/4a8be18c7f2088fc6707966ba24ed4a8715dcdbe/skills/code-scorecard/SKILL.md)
- [Installation and maintenance](https://github.com/sean-m-cooper/CodeTestament/tree/4a8be18c7f2088fc6707966ba24ed4a8715dcdbe/docs/scorecard-skill.md)
- [Scoring and output guide](https://github.com/sean-m-cooper/CodeTestament/tree/4a8be18c7f2088fc6707966ba24ed4a8715dcdbe/docs/code-scorecard.md)
- [Compatibility manifest](https://github.com/sean-m-cooper/CodeTestament/tree/4a8be18c7f2088fc6707966ba24ed4a8715dcdbe/skills/code-scorecard/compatibility.json)

Pinned source commit: `4a8be18c7f2088fc6707966ba24ed4a8715dcdbe`. GitHub was renamed to
`sean-m-cooper/CodeTestament` on 2026-10-29. The pinned source commit has been pushed.

## Installation

Install the separate CodeTestament plugin:

```text
/plugin marketplace add sean-m-cooper/ai_tools
/plugin install codetestament@ai-tools
/reload-plugins
```

Use `/codetestament:code-scorecard` instead of `/ai-tools:code-scorecard`.
Install the separate plugin and update/reload ai-tools to remove the old bundled
copy. Updating ai-tools alone does not install CodeTestament. Other agent hosts
should load the canonical `skills/code-scorecard/SKILL.md`; copy its whole folder
when installing skills manually.

Plugin **0.2.0** defaults to published NuGet `CodeTestament.Scorecard@2.4.0`
and npm `codetestament@0.6.0-preview.3` (Python adapter `0.15.0`). Fresh registry
installs are verified without local archives. Update the marketplace and plugin,
then reload the host to replace a cached 0.1.x installation. Existing exact pins, CMAI annotations and
historical evidence keep the same compatibility rules. Python remains a preview;
Error Handling stays unscored.

## Maintenance

Make all scorecard changes and run its integration checks in CodeTestament.
Bump the plugin version in CodeTestament when publishing changed skill or plugin
metadata; hosts can retain the cached version when only a SHA changes. Publish
and verify that source commit first, then update the `sha` on the
`codetestament` marketplace entry. Do not restore a bundled implementation here.
The moved skill and guide retain their original CC BY 4.0 license and attribution.
