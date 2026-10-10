# Experimental Python workflow

Python support measures selected implementation bodies using Python 3.12's native AST. It is a source-only complexity assessment, not a nine-dimension scoring implementation. Node.js 20+ and Python 3.12 are required. No target installation, build backend, import, or test execution is needed.

## Local package and scope

This integration is not published yet. Supply a freshly built `codemetrics-ai` npm archive containing `codemetrics-python` via `--npm-package`. The preferred Python adapter identifies itself as `0.3.0-experimental`; the enclosing development npm package retains the manifest's evidence-tool version. The helper deliberately refuses to download a published package as a substitute. Do not remove this restriction until a coordinated release has been tested and the compatibility manifest updated.

```sh
node <skill>/scripts/run-scorecard.mjs --repo <repo> --ecosystem python --npm-package <archive.tgz> --cache <cache>
node <skill>/scripts/run-scorecard.mjs --repo <repo> --entry-point src/app.py --npm-package <archive.tgz>
node <skill>/scripts/run-scorecard.mjs --repo <repo> --ecosystem python --entry-point . --python-include 'src/**' --npm-package <archive.tgz>
```

Discovery selects `pyproject.toml` and stops below a containing manifest. It does not resolve workspace membership, installed-package boundaries, or runtime reachability. A nested manifest outside the requested selection needs a separate run. For repositories without a manifest, explicitly choose a source directory or file. A manifest selects its containing directory; it is not executed or interpreted as analyzer configuration. Python finding paths are relative to that selected directory (or a selected file's parent), recorded as `subject.root`.

Windows defaults to `py -3.12`; other platforms use `python3` and require it to be version 3.12. `--python <interpreter-path>` selects an interpreter explicitly; a relative helper path is resolved against `--repo`. An unsupported interpreter produces an incomplete run, never an empty success. Do not silently switch parsers or install SDKs to make evidence appear complete.

Selection options use a `python-` prefix in the helper:

- Repeatable `--python-include`, `--python-exclude`, `--python-test-path`, and `--python-production-path` select or classify root-relative POSIX paths.
- `--python-include-tests`, `--python-include-generated`, and `--python-include-support` add those otherwise excluded populations.
- Exclusions win. Production overrides win over test/support path conventions, but generated code still requires explicit inclusion. `.pyi` files and recognized declaration-only bodies remain excluded.

These are case-sensitive fnmatch patterns, not Git-ignore patterns: `*` can cross `/`; a leading `**/` also matches zero directories. Absolute paths, backslashes, and `..` are rejected. Inspect `codeQuality.sourceFacts.selection` for the effective options, file classifications, content digests, pruned directories, and excluded declaration identities. Public testing utilities may be production code: Django's `django/test/**` is one example requiring an explicit production override. Do not infer that every path containing `test` is expendable.

## Evidence and presentation

The helper writes evidence v3 and a validated inspection under a unique run directory, with the standard run/audit ID checks. There is no metrics CSV. Full source-facts v2 are embedded at `dimensions.codeQuality.sourceFacts`; this smaller contract's version is separate from evidence schema v3. Keep the enclosing evidence IDs with extracted measurements and findings.

For a complete run:

- Show all nine dimension scores as **unavailable**. Code Quality is `skipped` because its measurements are not yet a calibrated dimension score; the other dimensions are unsupported.
- Separately report selected implementation count, measured CC distribution or hotspots, and `codeQuality.experimentalPreview.population.score` as **experimental method-complexity preview** if present. Use the supplied result; do not reproduce its ladder or weighting in this skill. A null population is unavailable, not zero or ten.
- Report the selection, Python/parser version, measurement policy, ruleset, calibration, configuration fingerprint, exclusions, and current run/audit IDs. `population.types: 0` is a schema placeholder for an unmeasured quantity, not proof that the project contains no classes.
- CC ≥ 10 findings are informational control-flow review leads. They do not assert defects, poor performance, inappropriate error handling, or that a safe decomposition exists. Read source before recommending changes. `except` branches contribute to CC but do not establish bad exception handling.
- Measurement policy `python/owned-function-complexity-v2` treats whole-case simple OR-pattern lists as one membership decision, retaining guards, body decisions, and structural alternatives. Version 0.2.0 used v1, which counted every OR alternative. A policy-driven reduction is not a code improvement; preserve the recorded policy and do not reinterpret historical findings.
- Recognized overload/protocol/abstract placeholders receive no implementation credit; concrete bodies and ordinary no-op functions remain measured. Honor recorded declaration exclusions without inventing additional exemptions or Python CMAI annotations.
- Do not give an overall or compare these previews as equivalent to JS/TS or .NET scores. Contextual qualitative observations can accompany the measurements but do not supply missing dimension grades in this experimental workflow.

For incomplete runs, use diagnostics only: no preview, overall, or recovery from old files. The shared validator checks the embedded population and recomputes the experimental result; stale IDs are still rejected even if another process reports exit zero. Explicit `--existing` imports remain historical, never fresh. Baseline comparisons and score gates are disabled for this experimental policy; the shared CLI can export informational findings to SARIF.
