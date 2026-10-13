import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { discover, compatibility } from '../run-scorecard.mjs';
import { installTools, readJson } from '../runtime.mjs';

const runner = fileURLToPath(new URL('../run-scorecard.mjs', import.meta.url));
test('experimental Python installed package integrates with scope, freshness and failure controls', { timeout: 300_000 }, async t => {
  const npmPackage = process.env.SCORECARD_NPM_PACKAGE;
  assert.ok(npmPackage, 'Set SCORECARD_NPM_PACKAGE to the freshly packed development archive.');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'python skill '));
  t.after(() => fs.rmSync(temporary, { recursive: true, force: true }));
  const root = path.join(temporary, 'repository'); fs.mkdirSync(root);
  const cache = path.join(temporary, 'cache');
  const write = (file, text) => { const full = path.join(root, file); fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, text); };
  const invoke = (...args) => {
    const result = spawnSync(process.execPath, [runner, '--repo', root, '--cache', cache, '--npm-package', npmPackage, ...args],
      { encoding: 'utf8', windowsHide: true, timeout: 180_000 });
    assert.ifError(result.error);
    return { code: result.status, value: result.stdout.trim() ? JSON.parse(result.stdout) : null, error: result.stderr };
  };
  const success = (...args) => { const result = invoke(...args); assert.equal(result.code, 0, result.error + JSON.stringify(result.value)); return result.value.results[0]; };
  write('.git', 'gitdir: test');
  write('app/pyproject.toml', '[project]\nname="app"\n');
  write('app/src/work.py', 'def work(x):\n    match x:\n        case 1 | 2 | 3: return 1\n        case _: return 0\n');
  write('app/tests/test_work.py', 'def test_work(): pass\n');
  write('vendor/pyproject.toml', '');
  write('app/nested/pyproject.toml', '');
  write('.venv/pyproject.toml', '');
  await t.test('discovery selects containing manifests and excludes dependencies', () => {
    assert.deepEqual(discover(root, 'python'), [path.join(root, 'app/pyproject.toml')]);
    const discovered = invoke('--discover'); assert.equal(discovered.code, 0);
    assert.deepEqual(discovered.value.candidates.python, [path.join(root, 'app/pyproject.toml')]);
  });
  let initial;
  await t.test('manifest routing emits usable unscored evidence without a CSV artifact', () => {
    initial = success('--ecosystem', 'python');
    const inspection = readJson(initial.artifacts.inspection);
    assert.equal(initial.status, 'complete'); assert.equal(initial.fresh, true);
    assert.equal(initial.artifacts.metrics, undefined); assert.equal(inspection.usable, true);
    assert.equal(inspection.evidence.analysis.runId, initial.runId); assert.equal(inspection.evidence.analysis.auditId, initial.auditId);
    assert.equal(inspection.evidence.population.members, 1); assert.equal(inspection.evidence.subject.root, path.join(root, 'app'));
    assert.equal(initial.version, '0.5.0-experimental');
    assert.equal(inspection.evidence.tool.version, '0.5.0-experimental');
    const facts = inspection.evidence.dimensions.codeQuality.sourceFacts;
    assert.equal(facts.measurementPolicy, 'python/owned-function-complexity-v2');
    assert.equal(facts.functions[0].complexity.value, 2);
    assert.ok(Object.values(inspection.evidence.dimensions).every(d => d.status === 'skipped' && !('score' in d)));
  });
  await t.test('explicit directory and source scopes work without manifests and preserve selection flags', () => {
    const run = success('--ecosystem', 'python', '--entry-point', 'app', '--python-include-tests');
    const evidence = readJson(run.artifacts.evidence); assert.equal(evidence.population.members, 2);
    const single = success('--entry-point', 'app/src/work.py');
    assert.equal(readJson(single.artifacts.evidence).population.members, 1);
    const selected = success('--ecosystem', 'python', '--entry-point', 'app', '--python-include', 'src/**', '--python-exclude', '**/unused.py');
    assert.deepEqual(readJson(selected.artifacts.evidence).dimensions.codeQuality.sourceFacts.selection.options.include, ['src/**']);
  });
  await t.test('parse failure updates latest attempt and does not reuse prior successful evidence', () => {
    write('app/src/broken.py', 'def broken(:');
    const result = invoke('--ecosystem', 'python'); assert.equal(result.code, 2);
    const run = result.value.results[0]; assert.equal(run.status, 'failed');
    assert.equal(run.analyzerExitCode, 2); assert.equal(run.validationExitCode, 2);
    assert.notEqual(run.runId, initial.runId); assert.equal(readJson(run.artifacts.inspection).usable, false);
    assert.equal(readJson(path.join(root, '.scorecard/python/latest.json')).runId, run.runId);
    assert.equal(readJson(run.artifacts.evidence).dimensions.codeQuality.experimentalPreview.population, null);
    fs.unlinkSync(path.join(root, 'app/src/broken.py'));
  });
  await t.test('historical evidence retains its identities and is explicitly not fresh', () => {
    const imported = success('--ecosystem', 'python', '--existing', initial.artifacts.evidence);
    assert.equal(imported.fresh, false); assert.equal(imported.evidenceRunId, initial.runId); assert.notEqual(imported.runId, initial.runId);
  });
  await t.test('duplication groups retain current identities, population and review-only meaning', () => {
    const body = '    value = items[0]\n    value += 1\n    value *= 2\n    result = str(value)\n    return result\n';
    write('app/src/duplicates.py', ['one', 'two', 'three'].map(name => `def ${name}(items):\n${body}`).join('\n'));
    const run = success('--ecosystem', 'python');
    const evidence = readJson(run.artifacts.evidence), cq = evidence.dimensions.codeQuality, report = cq.duplication;
    assert.equal(report.runId, run.runId); assert.equal(report.auditId, run.auditId);
    assert.equal(report.summary.duplicateGroups, 1); assert.equal(report.summary.matchedFunctions, 3);
    assert.equal(report.summary.eligibleFunctions, 3); assert.equal(report.summary.selectedFunctions, 4);
    assert.equal(cq.findings[0].category, 'exactBodyDuplicationReview'); assert.equal(cq.findings[0].severity, 'info');
    assert.equal(cq.findings[0].observations.scoringDisposition, 'unscored');
    assert.equal(cq.findings[0].observations.occurrences.length, 3);
    assert.ok(Object.values(evidence.dimensions).every(d => d.status === 'skipped' && !('score' in d)));
    const stale = structuredClone(evidence); stale.dimensions.codeQuality.duplication.runId = initial.runId;
    const staleFile = path.join(temporary, 'stale-duplication.json'); fs.writeFileSync(staleFile, JSON.stringify(stale));
    assert.equal(invoke('--ecosystem', 'python', '--existing', staleFile).code, 2);
    fs.unlinkSync(path.join(root, 'app/src/duplicates.py'));
  });
  await t.test('stale producer output is rejected even after a zero exit', async () => {
    const tooling = await installTools({ cache, 'npm-package': npmPackage }, compatibility);
    const before = fs.readFileSync(tooling.python);
    try {
      fs.writeFileSync(tooling.python, `import fs from 'node:fs'; fs.copyFileSync(${JSON.stringify(initial.artifacts.evidence)}, process.argv[process.argv.indexOf('--scorecard-output') + 1]);`);
      const result = invoke('--ecosystem', 'python'); assert.equal(result.code, 2);
      assert.equal(result.value.results[0].analyzerExitCode, 0); assert.equal(result.value.results[0].validationExitCode, 2);
      assert.match(result.error, /analysis.runId/);
    } finally { fs.writeFileSync(tooling.python, before); }
  });
  await t.test('coverage forwarding keeps unbound reports conditional and fails closed for missing provenance', () => {
    write('supplied-coverage.json', JSON.stringify({ meta: { format: 3, version: '7.6.1', timestamp: '2020-01-01', branch_coverage: true },
      files: { 'src/work.py': { executed_lines: [1, 2, 3], missing_lines: [4], excluded_lines: [] } } }));
    const run = success('--ecosystem', 'python', '--python-coverage-json', 'supplied-coverage.json');
    const evidence = readJson(run.artifacts.evidence), report = evidence.dimensions.codeQuality.coverageReview;
    assert.equal(report.coverageInput.freshness, 'unverified'); assert.equal(report.summary.conditionalEstimates, 1);
    assert.equal(report.runId, run.runId); assert.equal(report.auditId, run.auditId);
    assert.ok(Object.values(evidence.dimensions).every(d => d.status === 'skipped' && !('score' in d)));
    const stale = structuredClone(evidence); stale.dimensions.codeQuality.coverageReview.auditId = initial.auditId;
    write('stale-coverage.json', JSON.stringify(stale));
    assert.equal(invoke('--ecosystem', 'python', '--existing', 'stale-coverage.json').code, 2);
    assert.equal(invoke('--ecosystem', 'python', '--existing', run.artifacts.evidence, '--python-coverage-json', 'supplied-coverage.json').code, 2);
    const failed = invoke('--ecosystem', 'python', '--python-coverage-json', 'supplied-coverage.json', '--python-collection-manifest', 'missing.json');
    assert.equal(failed.code, 2);
    const failure = readJson(failed.value.results[0].artifacts.inspection);
    assert.equal(failure.usable, false);
    assert.equal(failure.evidence.dimensions.codeQuality.experimentalPreview.population, null);
    assert.deepEqual(failure.evidence.dimensions.codeQuality.findings, []);
  });
  await t.test('explicit packaged collection survives helper validation and source drift is rejected', async () => {
    const tooling = await installTools({ cache, 'npm-package': npmPackage }, compatibility);
    write('app/exercise.py', 'from src.work import work\nassert work(1) == 1\n');
    const python = process.env.CODEMETRICS_COVERAGE_PYTHON ?? spawnSync(process.platform === 'win32' ? 'py' : 'python3',
      [...(process.platform === 'win32' ? ['-3.12'] : []), '-c', 'import sys; print(sys.executable)'], { encoding: 'utf8', windowsHide: true }).stdout.trim();
    const collection = path.join(temporary, 'collection');
    const result = spawnSync(process.execPath, [path.join(tooling.packageRoot, 'dist/python-collect-cli.js'), path.join(root, 'app'),
      '--python', python, '--module', 'exercise', '--include', 'src/**', '--output-directory', collection], { encoding: 'utf8', windowsHide: true, timeout: 60_000 });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const args = ['--ecosystem', 'python', '--python-include', 'src/**', '--python-coverage-json', path.join(collection, 'coverage.json'),
      '--python-collection-manifest', path.join(collection, 'provenance.json')];
    const run = success(...args), evidence = readJson(run.artifacts.evidence);
    assert.equal(evidence.dimensions.codeQuality.coverageReview.summary.sourceBoundEstimates, 1);
    assert.equal(readJson(run.artifacts.inspection).usable, true);
    const source = fs.readFileSync(path.join(root, 'app/src/work.py'), 'utf8');
    write('app/src/work.py', source.replace('return 0', 'return 2'));
    const failed = invoke(...args);
    assert.equal(failed.code, 2);
    assert.equal(readJson(failed.value.results[0].artifacts.inspection).usable, false);
    const historical = success('--ecosystem', 'python', '--existing', run.artifacts.evidence);
    assert.equal(historical.fresh, false);
    write('app/src/work.py', source);
    fs.unlinkSync(path.join(root, 'app/exercise.py'));
  });
  await t.test('no score gates or silent download of an unpublished Python package', () => {
    const result = invoke('--ecosystem', 'python', '--baseline', initial.artifacts.evidence); assert.equal(result.code, 2);
    assert.match(result.error, /previews are uncalibrated/);
    const missing = spawnSync(process.execPath, [runner, '--repo', root, '--ecosystem', 'python'], { encoding: 'utf8', windowsHide: true });
    assert.equal(missing.status, 2); assert.match(missing.stderr, /not published/);
  });
  await t.test('polyglot audit preserves separate runs and a shared audit identity', () => {
    write('ui/package.json', '{"name":"fixture"}'); write('ui/app.js', 'export function app(){return 1;}');
    const result = invoke(); assert.equal(result.code, 0, result.error);
    assert.deepEqual(result.value.results.map(item => item.ecosystem).sort(), ['javascript-typescript', 'python']);
    assert.equal(new Set(result.value.results.map(item => item.runId)).size, 2);
    assert.ok(result.value.results.every(item => item.auditId === result.value.auditId));
    const misplaced = invoke('--ecosystem', 'javascript-typescript', '--python-include-tests');
    assert.equal(misplaced.code, 2); assert.match(misplaced.error, /Python options require/);
  });
});
