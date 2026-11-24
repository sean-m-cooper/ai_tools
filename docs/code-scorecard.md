# Code Scorecard has moved to CodeTestament

The canonical skill, helper scripts, compatibility records, tests and evaluations
now live with the analyzers in the CodeTestament repository. This repository keeps
a pinned marketplace reference, not another copy of the implementation.

- [Canonical skill](https://github.com/sean-m-cooper/CodeTestament/tree/6c0bf17cb8796bd4ef6d4de91e6f308a06c3fa89/skills/code-scorecard/SKILL.md)
- [Installation and maintenance](https://github.com/sean-m-cooper/CodeTestament/tree/6c0bf17cb8796bd4ef6d4de91e6f308a06c3fa89/docs/scorecard-skill.md)
- [Scoring and output guide](https://github.com/sean-m-cooper/CodeTestament/tree/6c0bf17cb8796bd4ef6d4de91e6f308a06c3fa89/docs/code-scorecard.md)
- [Compatibility manifest](https://github.com/sean-m-cooper/CodeTestament/tree/6c0bf17cb8796bd4ef6d4de91e6f308a06c3fa89/skills/code-scorecard/compatibility.json)

Pinned source commit: `6c0bf17cb8796bd4ef6d4de91e6f308a06c3fa89`. GitHub was renamed to
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

Plugin **0.4.0** defaults to published NuGet `CodeTestament.Scorecard@2.4.3`
for .NET, `codetestament@0.7.0` for JS/TS and Python (adapter `0.15.0`). Fresh registry
installs are verified without local archives. Update the marketplace and plugin,
then reload the host to replace an older cached installation. Existing exact pins, CMAI annotations and
historical evidence keep the same compatibility rules. Python remains a partial assessment with at most two scored dimensions;
Error Handling stays unscored.

The .NET 2.4.2 release fixes authenticated candidate-package inspection for private NuGet feeds, including AWS CodeArtifact setups. Use the same NuGet identity as the project restore; the skill includes private-feed troubleshooting guidance.

JS/TS 0.5.2 and preview 0.6.0-preview.4 fix configuration fingerprints across worktrees. Regenerate affected baselines from their original revision with the corrected analyzer; do not edit stored hashes or bypass compatibility gates.

The .NET 2.4.3 release corrects EF Core SQL false positives: resolved parameterizing APIs no longer lower Security scores, while unsafe raw SQL construction remains flagged. Rerun affected scorecards; update older explicit pins to adopt the fix.

Stable npm 0.7.0 adds scoring policies for all nine JS/TS dimensions. Available evidence still controls which dimensions can be scored. Complexity & Decomposition retains both component scores; Error Handling discloses assessed and unknown populations. Request dependency metadata for a connected scorecard. Regenerate JS/TS baselines with 0.7.0 before comparison; historical evidence is unchanged. Python retains its two scored dimensions. The skill uses exact versions; existing supported preview pins remain honored until explicitly updated.

## Maintenance

Make all scorecard changes and run its integration checks in CodeTestament.
Bump the plugin version in CodeTestament when publishing changed skill or plugin
metadata; hosts can retain the cached version when only a SHA changes. Publish
and verify that source commit first, then update the `sha` on the
`codetestament` marketplace entry. Do not restore a bundled implementation here.
The moved skill and guide retain their original CC BY 4.0 license and attribution.
