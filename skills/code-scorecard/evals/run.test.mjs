import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { generationPrompt, judgmentPrompt, validateJudgment } from './run.mjs';

test('generator receives inputs and skill but no hidden rubric or expected answer', () => {
  const input = { request: 'Show the scorecard.', evidence: { score: 4 } };
  const criteria = [{ id: 'cause', criterion: 'PRIVATE_RUBRIC_SENTINEL' }];
  const generated = generationPrompt('SKILL_SENTINEL', input);
  assert.ok(generated.includes('SKILL_SENTINEL'));
  assert.ok(generated.includes(JSON.stringify(input)));
  assert.ok(!generated.includes('PRIVATE_RUBRIC_SENTINEL'));
  assert.ok(judgmentPrompt(input, 'REPORT_SENTINEL', criteria).includes('PRIVATE_RUBRIC_SENTINEL'));
});

test('judge protocol fails closed on missing, duplicated, unknown or fabricated evidence', () => {
  const criteria = [{ id: 'cause' }]; const report = 'A different accurate paraphrase.';
  const valid = { checks: [{ id: 'cause', passed: true, reason: 'Supported by input.', quote: report }] };
  assert.equal(validateJudgment(valid, criteria, report), true);
  assert.equal(validateJudgment({ checks: [{ ...valid.checks[0], passed: false, quote: null }] }, criteria, report), false);
  for (const value of [{ checks: [] }, { checks: [valid.checks[0], valid.checks[0]] },
    { checks: [{ ...valid.checks[0], id: 'unknown' }] }, { checks: [{ ...valid.checks[0], quote: 'invented quotation' }] },
    { checks: [{ ...valid.checks[0], passed: 'true' }] }]) assert.throws(() => validateJudgment(value, criteria, report));
});

test('fixture cases have distinct criteria and controls name actual checks', async () => {
  const cases = JSON.parse(await fs.readFile(new URL('./cases.json', import.meta.url), 'utf8'));
  assert.equal(new Set(cases.map(c => c.id)).size, cases.length);
  for (const item of cases) {
    const input = JSON.parse(await fs.readFile(new URL(item.input, import.meta.url), 'utf8'));
    assert.ok(input.inspection.evidence && input.runnerResult);
    const rubric = JSON.parse(await fs.readFile(new URL(item.criteria, import.meta.url), 'utf8'));
    assert.equal(new Set(rubric.map(c => c.id)).size, rubric.length);
    for (const control of item.controls ?? []) {
      await fs.access(new URL(control.report, import.meta.url));
      assert.ok(control.expectedFailures.every(id => rubric.some(c => c.id === id)));
    }
  }
});
