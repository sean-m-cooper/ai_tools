# Troubleshooting

- **Ambiguous entry points:** use `--discover`, then pass the intended `--entry-point`. Do not pick an arbitrary solution or nested package.
- **Untested repository pin:** preserve it. Test that version against the integration suite and intentionally update `compatibility.json`, or use a checkout already pinned to a supported version. Do not auto-update to latest.
- **Pinned package unavailable:** check the feed/registry and release status. During coordinated development, supply local `.nupkg` and `.tgz` overrides from the pinned CodeMetrics.AI revision. Do not substitute an older package or qualitative scores without disclosing the failed setup.
- **Solution/project load failure:** restore the entry point with the required SDK/workloads and requested configuration. Read workspace/compiler diagnostics in this run's evidence and stderr. Partial CSV does not establish a complete population. Fix the cause and rerun.
- **Missing/invalid/mismatched evidence:** use the current result's inspection and status. The helper validates the canonical schema, tool version, ecosystem, entry point, root and variant. Do not read an old `evidence.json` or rewrite provenance to make it match.
- **Skipped probe:** show its reason and scope. A supported qualitative review may fill an intentionally skipped dimension; retain the skip in the evidence summary.
- **Failed probe or incomplete source:** report unavailable deterministic scores and retain findings as diagnostic leads. Do not calculate an overall or recover scores from CSV.
- **Empty population:** inspect filters and selected scope. Generated/build/test files may be intentionally excluded. Do not rename legitimate projects just to evade filtering; correct the scope or report an analyzer issue.
- **Incompatible baseline:** compare schema-v3 evidence generated with matching versions, rulesets, configuration, availability and scope. V2 has no comparison provenance. Regenerate an appropriate baseline deliberately; never use null/incompatible deltas as a passing gate.
- **Historical import:** even validated imports have unverified current-source freshness. Label v2 completeness and scope unknown. Run fresh analysis when current scores are needed.

See [bootstrap.md](bootstrap.md) for exact runner options and local-package testing.
