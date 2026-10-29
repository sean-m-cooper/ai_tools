**Python overall: 9.0/10 — partial assessment, 2/9 dimensions scored.**
Calculation: `(10 + 8) / 2 = 9.0`. The other seven dimensions are excluded, with no qualitative replacement grades.

| Dimension | Score | Scoring source | Scope and evidence |
|---|---:|---|---|
| Architecture & SOLID | N/A | Skipped; unsupported | Architecture is not measured. |
| Method Complexity | **10/10** | Deterministic; partial scope | All 27 selected production functions. Twenty-six have CC 1; `optional_feature` has CC 2. Excludes decomposition, duplication, coverage/CRAP, semantic validation and runtime performance. |
| Testing | N/A | Skipped; unsupported | No testing score. Coverage was not supplied for any of the 27 functions. |
| Security | N/A | Skipped; unsupported | No security assessment; absence of findings provides no security assurance. |
| Error Handling | N/A | Skipped; review evidence only | One documented no-op `ImportError` handler. Syntax and bounded context do not establish handling quality. |
| Documentation | N/A | Skipped; unsupported | Local rationale is recorded, but documentation quality is not scored. |
| Dependency Management | N/A | Skipped; unsupported | Dependencies are not assessed. |
| Async/Blocking Usage | **8/10** | Deterministic; partial scope | **1/25 production async owners affected; 1 owner has unresolved paths.** Limited blocking catalogue and bounded local-helper analysis. |
| Maintainability | N/A | Skipped; unsupported | Maintainability is not measured. |

Method Complexity uses the recorded policy `python/method-complexity-worst-40-remainder-60/v1`: 40% of one worst function’s individual score plus 60% of the remaining functions’ mean. Every individual score here is 10, yielding `0.4 × 10 + 0.6 × 10 = 10`. This measures branching, not correctness or readability.

**Why Async/Blocking Usage scores 8**

The executed policy is `python/async-blocking-owner-rate-v1`. Its affected-owner rate is **1/25 = 4%**, which selects the recorded **less-than-5% → 8** band. Findings are policy inputs, not independent deductions.

| Case | Current source and recorded interpretation | Scoring effect |
|---|---|---|
| Repeated helper calls | `work.py:6–7`, `hazard`, calls `wait()` twice. Bounded lexical tracing follows both calls to `time.sleep(1)` at line 4. | Two scored paths, **one distinct blocking source call and one affected async owner**. The synchronous helper is not another eligible async owner. |
| Documented choice | `work.py:9–10`, `documented`, records that synchronous operation is required by the device protocol. | Classified `documented-choice`; remains eligible but unaffected. The stated rationale is accepted without judging its merits. |
| Offloaded callback | `work.py:12`, `offloaded`, awaits `asyncio.to_thread(wait)`. The helper’s sleep is traced in `thread-helper-callback` context. | Classified `excluded-execution-context`; remains eligible but unaffected. This does not prove successful offloading or thread safety. |
| Unresolved receiver | `work.py:14`, `unresolved`, awaits `client.fetch()`. Receiver identity and implementation are unresolved. | Visible without deduction; remains eligible but unaffected. **Awaiting it does not establish that its implementation is nonblocking.** |
| Scheduled functions | `work.py:21–62` contains 21 async implementations awaiting `asyncio.sleep(0)`. | All 21 enter the selected production async-owner denominator; no scored blocking signals are recorded for them. |

The three emitted async findings have **medium confidence**: one warning for `hazard` and informational findings for the documented and offloaded cases. The initial import-only review lists three unresolved call expressions; later helper tracing resolves the two `wait()` references, leaving **one unresolved path in one owner**.

This is a limited static usage assessment. It excludes resolved receiver types, cross-file call graphs, complete blocking detection, business correctness and runtime performance. Several embedded experimental reports retain prose saying async is unscored; the authoritative dimension status and executed scoring decision explicitly score it at **8**.

**Should the optional-feature handler lower Error Handling?**

**No. Error Handling remains unscored; there is no grade to lower.**

At `work.py:18–20`, the handler catches `ImportError`, documents continued operation without the optional feature, and executes `pass`. The evidence recognizes one `documented-no-op` / `locally-documented-no-op` handler. Repeated representations across the review artifacts describe that same handler, not additional handlers.

The rationale records the developer’s intent. Neither the empty body nor its documentation establishes a defect, successful recovery, or runtime optionality. No replacement qualitative score or automatic logging requirement is warranted.

Other review evidence also stays unscored:

- **Decomposition:** all 27 functions measured; maximum owned statements 2 and maximum block nesting 1.
- **Duplication:** zero eligible functions because all 27 fall below the five-statement minimum. Zero duplicate groups therefore provides no substantive duplication assurance.
- **Coverage/CRAP:** coverage unavailable for all 27 functions; no coverage input or collection provenance. Fresh analysis does not supply coverage source binding.

**Evidence and provenance**

The supplied invocation completed successfully and is marked **fresh and usable**. Analyzer and validator exit codes are both 0; there are no assessment failures or analysis diagnostics. Runner IDs match the evidence:

- Audit: `d08edda1-e077-4969-8734-4ef16d507a1d`
- Run: `d2dd7a98-2b61-4a60-b29e-7e72ef1ad562`
- Tool: **CodeMetrics.AI.Python 0.15.0**, compatibility-manifest selection; schema **3**, native compatibility
- Entry point: `pyproject.toml` under `E:\repos\CodeMetrics.AI\TestResults\python-preview-release-2026-10-28\published-smoke\source`; variant `source`
- Generated: `2026-10-29T04:01:37.830Z`
- Ruleset: `python-2026-10-28-async-scoring-v1`; calibration `baseline`
- Configuration fingerprint: `9f769d5b00ee095332f30c5d5b3a8602fd2701be86f86d39ba86dfc8abef4843`
- Population: **1/1 files analyzed, 27 implementation bodies**, no skipped units. Tests, support and generated code are excluded by selection settings. `types: 0` is a placeholder, not a measured absence of types.

Exact artifacts: [evidence.json](E:/repos/CodeMetrics.AI/TestResults/python-preview-release-2026-10-28/published-smoke/source/.scorecard/python/runs/d2dd7a98-2b61-4a60-b29e-7e72ef1ad562/evidence.json), [inspection.json](E:/repos/CodeMetrics.AI/TestResults/python-preview-release-2026-10-28/published-smoke/source/.scorecard/python/runs/d2dd7a98-2b61-4a60-b29e-7e72ef1ad562/inspection.json).

Python annotation/code guidance beyond the recorded exclusions is unavailable in the supplied artifacts; no CMAI directive is inferred.

**Comparison with adapter 0.14.0**

Adapter **0.14.0 scores only Method Complexity**. Its absent async score is unavailable, not zero or ten.

Compare Method Complexity only after checking matching measurement/scoring policies, selection, configuration and source provenance. No 0.14.0 artifact was supplied, so compatibility and a numerical delta cannot be established here. Do not directly compare its one-dimension overall with this **9.0 partial assessment over two dimensions**: the denominator and assessment capabilities changed.

For future regression tracking, establish a fresh **0.15.0 baseline**. A score change across adapter versions alone does not demonstrate source improvement or regression.

**Priorities**

1. **Review `hazard`, `work.py:5–7` — Current context; context-verified blocking path.** Both direct helper calls reach the supplied `time.sleep(1)`. Confirm timing and execution requirements before choosing a cooperative delay or offloading approach; an appropriate replacement remains unresolved.
2. **Resolve `client.fetch`, `work.py:14` — Metrics; review candidate.** Inspect the supplied client’s concrete implementation and call contract to determine whether work blocks before or during awaiting. The current evidence establishes neither a blocking defect nor safe async behavior.
