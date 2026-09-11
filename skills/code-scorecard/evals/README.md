# Behavioral report evaluations

These tests exercise the agent's report, separately from the packaged runner integration tests. Five synthetic fixtures cover selected versus nonbinding score conditions, repeated dependency occurrences, partial assessment scope, prior conclusions, absent attribution in older evidence, failed runs, and conclusions rechecked against supplied current source. They contain no private repository artifacts.

Each case runs two fresh Codex processes: a generator receives the actual skill, user request and evidence; a judge receives the evidence, generated report and a private factual rubric. The generator never receives the rubric or control reports. The judge evaluates meaning and omissions, accepting paraphrases and different layouts. Quotes are checked against the actual report. Missing criteria, invented quotes and process errors fail closed.

Requires Node 20+ and an authenticated Codex CLI supporting `exec`, `--ignore-user-config`, `--ephemeral`, `--sandbox`, `--output-schema` and `--output-last-message`. Uses the CLI's default model with read-only permissions. This is a live model evaluation and consumes account usage. All child processes have five-minute timeouts; generated reports and judgments are saved to the requested output directory. Run only with synthetic, shareable inputs.

```sh
# Offline harness invariants; also run by CI. This alone does not validate reports.
node --test skills/code-scorecard/evals/run.test.mjs

# Calibrate the judge against an accurate report and a report with known factual errors.
node skills/code-scorecard/evals/run.mjs --controls --output /tmp/scorecard-controls

# Generate and independently judge real reports using the current skill.
node skills/code-scorecard/evals/run.mjs --output /tmp/scorecard-reports

# Narrow a case; set CODEX_BIN or --codex to an executable path if needed.
node skills/code-scorecard/evals/run.mjs --case prior-context --output /tmp/scorecard-prior
```

Exit codes: 0 all cases pass, 1 a factual criterion or control expectation fails, 2 an execution/protocol error occurs. Review the actual report and judgment before changing the skill or rubric. A passing stochastic judge is evidence, not proof; rerun after material skill or model changes. Do not change a criterion merely to make a failing report pass. Keep rubric expectations independent of the desired prose.

`summary.json` records skill/input/rubric/report hashes, timings, and CLI/model metadata when available. Each case preserves the raw report and structured judgment for inspection. User configuration is ignored to isolate the evaluation from custom integrations and prompts. Outputs belong outside the repository. Live evaluations are deliberately separate from credential-free CI, which checks harness integrity and packaged integration.
