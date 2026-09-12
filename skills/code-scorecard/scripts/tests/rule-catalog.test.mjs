import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateRuleCatalog } from '../rule-catalog.mjs';

function fixture() {
  const rule = { code: 'CMAI5001', ruleId: 'dotnet/errorHandling/emptyCatch', dimension: 'errorHandling',
    category: 'emptyCatch', kind: 'finding', title: 'Empty catch', description: 'Review intentional handling.',
    annotation: { supported: true, rationaleRequired: true, scopes: ['catch', 'member'],
      example: '// codemetrics-ignore: CMAI5001 -- Required fallback' } };
  const tool = { name: 'CodeMetrics.AI', version: '2.3.0' };
  return {
    catalog: { schemaVersion: 1, catalogVersion: 1, ecosystem: 'dotnet', tool, rules: [rule] },
    evidence: { tool, dimensions: { errorHandling: {
      ruleCatalog: { version: 1, toolVersion: tool.version, rules: [{ code: rule.code, ruleId: rule.ruleId, kind: rule.kind }] },
      findings: [{ ruleId: rule.ruleId, observations: { diagnosticCode: rule.code } }]
    } } }
  };
}

test('catalog joins package evidence by stable identity and code', () => {
  const { catalog, evidence } = fixture();
  assert.equal(validateRuleCatalog(catalog, evidence), catalog);
});

for (const [name, mutate] of [
  ['another package version', c => { c.tool = { ...c.tool, version: '2.2.0' }; }],
  ['unknown schema', c => { c.schemaVersion = 2; }],
  ['duplicate codes', c => { c.rules.push({ ...c.rules[0] }); }],
  ['mismatched rule identity', c => { c.rules[0].category = 'throwEx'; c.rules[0].ruleId = 'dotnet/errorHandling/throwEx'; }],
  ['unsupported annotation contract', c => { c.rules[0].annotation.rationaleRequired = false; }]
]) {
  test(`rejects ${name}`, () => {
    const { catalog, evidence } = fixture();
    mutate(catalog);
    assert.throws(() => validateRuleCatalog(catalog, evidence));
  });
}

test('unsupported annotations can be cataloged without an example', () => {
  const { catalog, evidence } = fixture();
  catalog.rules[0].annotation = { supported: false, scopes: [], rationaleRequired: false, example: null };
  assert.equal(validateRuleCatalog(catalog, evidence), catalog);
});

test('finding cannot borrow a code from a different identity', () => {
  const { catalog, evidence } = fixture();
  evidence.dimensions.errorHandling.findings[0].ruleId = 'dotnet/errorHandling/throwEx';
  assert.throws(() => validateRuleCatalog(catalog, evidence));
});
