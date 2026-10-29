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
test('Python Method Complexity installed package integrates with scope, freshness and failure controls', { timeout: 300_000 }, async t => {
  const npmPackage = process.env.SCORECARD_NPM_PACKAGE;
  assert.ok(npmPackage, 'Set SCORECARD_NPM_PACKAGE to the freshly packed development archive.');
  const temporary = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'python skill ')));
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

  await t.test('async scoring survives installed helper with documented choices and tamper rejection', () => {
    write('app/src/scoring.py', 'import time\nimport asyncio\ndef wait(): time.sleep(1)\nasync def bad():\n    wait()\n    wait()\nasync def documented():\n    # Synchronous operation required by the device protocol\n    time.sleep(1)\nasync def offloaded():\n    await asyncio.to_thread(wait)\nasync def unknown(client):\n    await client.fetch()\n');
    const run=success('--ecosystem','python'), evidence=readJson(run.artifacts.evidence), d=evidence.dimensions.performanceAsync;
    assert.equal(d.status,'scored'); assert.equal(d.score,0);
    assert.equal(d.asyncScoring.summary.eligibleOwners,4); assert.equal(d.asyncScoring.summary.affectedOwners,1);
    assert.equal(d.asyncScoring.summary.ownersWithUnresolvedPaths,1);
    assert.equal(d.helperReview.runId,run.runId); assert.equal(d.asyncScoring.auditId,run.auditId);
    assert.equal(evidence.dimensions.errorHandling.status,'skipped'); assert.equal(evidence.dimensions.errorHandling.score,undefined);
    assert.equal(Object.values(evidence.dimensions).filter(d=>d.status==='scored').length,2);
    for (const mutate of [d=>{d.asyncScoring.summary.score=10;},d=>{d.helperReview.runId='11111111-1111-4111-8111-111111111111';},d=>{delete d.asyncScoring;}]) {
      const changed=structuredClone(evidence); mutate(changed.dimensions.performanceAsync); write('forged-score.json',JSON.stringify(changed));
      assert.equal(invoke('--ecosystem','python','--existing','forged-score.json').code,2);
    }
    fs.unlinkSync(path.join(root,'app/src/scoring.py'));
  });

  let initial;
  await t.test('callback adapter syntax survives installed helper and forged links fail', () => {
    write('app/src/adapters.py', 'from functools import partial\nfrom asgiref.sync import sync_to_async\nimport asyncio\ndef local(x):\n    return x + 1\n@sync_to_async\ndef decorated(x):\n    return x + 1\nasync def run(items):\n    callback = partial(local, 1)\n    await asyncio.to_thread(callback)\n    await decorated(1)\n    deferred = (callback() for x in items)\n');
    const run = success('--ecosystem', 'python'), evidence = readJson(run.artifacts.evidence);
    const d = evidence.dimensions.performanceAsync, r = d.adapterReview;
    assert.equal(r.runId, run.runId); assert.equal(r.auditId, run.auditId);
    assert.equal(r.summary.contexts['async-body'].partialConstructions, 1);
    assert.equal(r.summary.contexts['async-body'].partialCallbackReferences, 1);
    assert.equal(r.summary.contexts['async-body'].decoratedCalleeReferences, 1);
    assert.equal(r.summary.contexts['deferred-generator-body'].partialCalleeReferences, 0);
    assert.equal(d.status, 'scored'); assert.equal(d.score, d.asyncScoring.summary.score);
    assert.equal(evidence.dimensions.errorHandling.status, 'skipped');
    assert.equal(success('--ecosystem', 'python', '--existing', run.artifacts.evidence).fresh, false);
    for (const mutate of [
      report => { report.runId = '11111111-1111-4111-8111-111111111111'; },
      report => { report.asyncRowsSha256 = '0'.repeat(64); },
      report => { report.summary.contexts['async-body'].partialConstructions++; },
      report => { report.functions.flatMap(row => row.calls).find(call => call.callbackPartial?.constructionCallId).callbackPartial.constructionCallId = '0'.repeat(64); },
      report => { report.functions.flatMap(row => row.calls).find(call => call.decoratedCallee?.decorator).decoratedCallee.definition.ownerId = '0'.repeat(64); },
    ]) {
      const changed = structuredClone(evidence); mutate(changed.dimensions.performanceAsync.adapterReview);
      write('forged-adapters.json', JSON.stringify(changed));
      assert.equal(invoke('--ecosystem', 'python', '--existing', 'forged-adapters.json').code, 2);
    }
    fs.unlinkSync(path.join(root, 'app/src/adapters.py'));
  });
  await t.test('async context links survive installed helper validation alongside the scoped score', () => {
    write('app/src/async_context.py', 'from asgiref.sync import sync_to_async as wrap\ndef local(x):\n    return x + 1\nasync def run(items):\n    wrapped = wrap(local)\n    await wrapped(1)\n    await wrapped(2)\n    deferred = (wrapped(x) for x in items)\n');
    const run = success('--ecosystem', 'python'), evidence = readJson(run.artifacts.evidence);
    const d = evidence.dimensions.performanceAsync, r = d.contextReview;
    assert.equal(r.runId, run.runId); assert.equal(r.auditId, run.auditId);
    assert.equal(d.status, 'scored'); assert.equal(d.score, d.asyncScoring.summary.score);
    assert.equal(evidence.dimensions.errorHandling.status, 'skipped');
    assert.equal(r.summary.contexts['async-body'].storedWrapperInvocationLinks, 2);
    assert.equal(r.summary.contexts['deferred-generator-body'].storedWrapperInvocationLinks, 0);
    assert.equal(success('--ecosystem', 'python', '--existing', run.artifacts.evidence).fresh, false);
    for (const mutate of [
      report => { report.runId = '11111111-1111-4111-8111-111111111111'; },
      report => { report.asyncRowsSha256 = '0'.repeat(64); },
      report => { report.summary.contexts['async-body'].storedWrapperInvocationLinks++; },
      report => { report.functions.flatMap(row => row.calls).find(call => call.storedWrapper?.definition).storedWrapper.definition.constructionCallId = '0'.repeat(64); },
    ]) {
      const altered = structuredClone(evidence); mutate(altered.dimensions.performanceAsync.contextReview);
      write('forged-async-context.json', JSON.stringify(altered));
      assert.equal(invoke('--ecosystem', 'python', '--existing', 'forged-async-context.json').code, 2);
    }
    fs.unlinkSync(path.join(root, 'app/src/async_context.py'));
  });
  await t.test('manifest routing emits one scored dimension without a CSV artifact', () => {
    initial = success('--ecosystem', 'python');
    const inspection = readJson(initial.artifacts.inspection);
    assert.equal(initial.status, 'complete'); assert.equal(initial.fresh, true);
    assert.equal(initial.artifacts.metrics, undefined); assert.equal(inspection.usable, true);
    assert.equal(inspection.evidence.analysis.runId, initial.runId); assert.equal(inspection.evidence.analysis.auditId, initial.auditId);
    assert.equal(inspection.evidence.population.members, 1); assert.equal(inspection.evidence.subject.root, path.join(root, 'app'));
    assert.equal(initial.version, '0.15.0');
    assert.equal(inspection.evidence.tool.version, '0.15.0');
    const facts = inspection.evidence.dimensions.codeQuality.sourceFacts;
    assert.equal(facts.measurementPolicy, 'python/owned-function-complexity-v2');
    assert.equal(facts.functions[0].complexity.value, 2);
    assert.equal(inspection.evidence.dimensions.codeQuality.status, 'scored');
    assert.ok(Object.entries(inspection.evidence.dimensions).every(([key, d]) => key === 'codeQuality' || d.status === 'skipped' && !('score' in d)));
  });
  await t.test('explicit directory and source scopes work without manifests and preserve selection flags', () => {
    const run = success('--ecosystem', 'python', '--entry-point', 'app', '--python-include-tests');
    const evidence = readJson(run.artifacts.evidence); assert.equal(evidence.population.members, 2);
    const single = success('--entry-point', 'app/src/work.py');
    assert.equal(readJson(single.artifacts.evidence).population.members, 1);
    const selected = success('--ecosystem', 'python', '--entry-point', 'app', '--python-include', 'src/**', '--python-exclude', '**/unused.py');
    assert.deepEqual(readJson(selected.artifacts.evidence).dimensions.codeQuality.sourceFacts.selection.options.include, ['src/**']);
  });
  await t.test('exception context stays unscored and stale or altered imports fail validation', () => {
    write('app/src/context.py', 'try: import optional\nexcept ImportError: pass\n' +
      'def fallback():\n    try: call()\n    except Missing: return None\n' +
      'with resource():\n    try: call()\n    except Missing: raise\n');
    const run = success('--ecosystem', 'python'), evidence = readJson(run.artifacts.evidence);
    const d = evidence.dimensions.errorHandling, report = d.contextReview;
    assert.equal(report.runId, run.runId); assert.equal(report.auditId, run.auditId);
    assert.deepEqual(report.handlerReview, d.review);
    assert.equal(report.summary.handlers, 3); assert.equal(report.summary.recognizedShapes, 2); assert.equal(report.summary.unresolved, 1);
    assert.equal(d.status, 'skipped'); assert.equal(d.score, undefined); assert.deepEqual(d.findings, []);
    assert.ok(Object.entries(evidence.dimensions).every(([key, value]) => key === 'codeQuality' || value.score === undefined));
    assert.equal(success('--ecosystem', 'python', '--existing', run.artifacts.evidence).fresh, false);
    for (const mutate of [r => { r.runId = initial.runId; }, r => { r.summary.unresolved++; },
      r => { r.contexts[0].sourceSha256 = '0'.repeat(64); }, r => { r.contexts = []; }]) {
      const copy = structuredClone(evidence); mutate(copy.dimensions.errorHandling.contextReview);
      const location = path.join(temporary, 'invalid-context.json'); fs.writeFileSync(location, JSON.stringify(copy));
      assert.equal(invoke('--ecosystem', 'python', '--existing', location).code, 2);
    }
    fs.unlinkSync(path.join(root, 'app/src/context.py'));
  });
  await t.test('parse failure updates latest attempt and does not reuse prior successful evidence', () => {
    write('app/src/broken.py', 'def broken(:');
    const result = invoke('--ecosystem', 'python'); assert.equal(result.code, 2);
    const run = result.value.results[0]; assert.equal(run.status, 'failed');
    assert.equal(run.analyzerExitCode, 2); assert.equal(run.validationExitCode, 2);
    assert.notEqual(run.runId, initial.runId); assert.equal(readJson(run.artifacts.inspection).usable, false);
    assert.equal(readJson(path.join(root, '.scorecard/python/latest.json')).runId, run.runId);
    assert.equal(readJson(run.artifacts.evidence).dimensions.codeQuality.methodComplexity.population, null);
    fs.unlinkSync(path.join(root, 'app/src/broken.py'));
  });
  await t.test('raise/chaining evidence preserves counts and rejects stale or inconsistent imports', () => {
    write('app/src/transfers.py', 'def chained():\n    try: call()\n    except Missing as error: raise NewError() from error\n' +
      'def suppressed():\n    try: call()\n    except Missing: raise NewError() from None\n' +
      'def conditional():\n    try: call()\n    except Missing as error:\n        if ready: raise error\n');
    const run = success('--ecosystem', 'python'), evidence = readJson(run.artifacts.evidence);
    const d = evidence.dimensions.errorHandling, report = d.transferReview;
    assert.equal(report.runId, run.runId); assert.equal(report.auditId, run.auditId);
    assert.deepEqual(report.contextReview, d.contextReview);
    assert.equal(report.summary.handlers, 3); assert.equal(report.summary.raiseStatements, 3);
    assert.equal(report.summary.newlyRecognizedShapes, 2); assert.equal(report.summary.unresolved, 1);
    assert.equal(report.summary.byCauseSyntax.none, 1); assert.equal(report.summary.handlerNameRaiseSyntax, 1);
    assert.equal(d.status, 'skipped'); assert.equal(d.score, undefined); assert.deepEqual(d.findings, []);
    assert.equal(success('--ecosystem', 'python', '--existing', run.artifacts.evidence).fresh, false);
    for (const mutate of [r => { r.runId = initial.runId; }, r => { r.summary.raiseStatements++; },
      r => { r.handlers[0].raises[0].cause.matchesHandlerNameSyntax = false; }, r => { r.handlers = []; }]) {
      const copy = structuredClone(evidence); mutate(copy.dimensions.errorHandling.transferReview);
      const location = path.join(temporary, 'invalid-transfers.json'); fs.writeFileSync(location, JSON.stringify(copy));
      assert.equal(invoke('--ecosystem', 'python', '--existing', location).code, 2);
    }
    fs.unlinkSync(path.join(root, 'app/src/transfers.py'));
  });
  await t.test('call/return observations and unresolved inventory remain unscored and source-bound', () => {
    write('app/src/operations.py', 'def reraised():\n    try: call()\n    except Missing as error:\n        logger.exception(error)\n        raise\n' +
      'def returned():\n    try: call()\n    except Missing: return factory()()\n' +
      'def fallback():\n    try: call()\n    except Missing: return recover()\n');
    const run = success('--ecosystem', 'python'), evidence = readJson(run.artifacts.evidence);
    const d = evidence.dimensions.errorHandling, report = d.operationReview;
    assert.equal(report.runId, run.runId); assert.equal(report.auditId, run.auditId);
    assert.deepEqual(report.transferReview, d.transferReview);
    assert.equal(report.summary.handlers, 3); assert.equal(report.summary.callExpressions, 4);
    assert.equal(report.summary.returnStatements, 2); assert.equal(report.summary.newlyRecognizedShapes, 2);
    assert.equal(report.summary.inputUnresolvedInventory.handlers, 3); assert.equal(report.summary.unresolved, 1);
    assert.equal(d.status, 'skipped'); assert.equal(d.score, undefined); assert.deepEqual(d.findings, []);
    assert.equal(success('--ecosystem', 'python', '--existing', run.artifacts.evidence).fresh, false);
    for (const mutate of [r => { r.runId = initial.runId; }, r => { r.summary.inputUnresolvedInventory.multiStatement++; },
      r => { r.handlers[0].calls[0].endColumn++; }, r => { r.handlers = []; }, r => { r.score = 10; }]) {
      const copy = structuredClone(evidence); mutate(copy.dimensions.errorHandling.operationReview);
      const location = path.join(temporary, 'invalid-operations.json'); fs.writeFileSync(location, JSON.stringify(copy));
      assert.equal(invoke('--ecosystem', 'python', '--existing', location).code, 2);
    }
    fs.unlinkSync(path.join(root, 'app/src/operations.py'));
  });
  await t.test('async observations preserve ownership and reject stale or altered imports alongside scoped scoring', () => {
    write('app/src/async_work.py', 'import time\nimport asyncio\nfrom asgiref.sync import sync_to_async\n' +
      'async def work(items):\n    time.sleep(0)\n    await asyncio.to_thread(time.sleep, 1)\n' +
      '    await sync_to_async(time.sleep)(1)\n    deferred = (time.sleep(x) for x in items)\n' +
      '    def nested():\n        time.sleep(2)\n    return nested\n');
    const run = success('--ecosystem', 'python'), evidence = readJson(run.artifacts.evidence);
    const d = evidence.dimensions.performanceAsync, report = d.review;
    assert.equal(report.runId, run.runId); assert.equal(report.auditId, run.auditId);
    assert.equal(report.summary.asyncFunctions, 1); assert.equal(report.summary.deferredGeneratorCallExpressions, 1);
    assert.equal(report.summary.asyncBodyCallCategories['blocking-call-candidate'], 1);
    assert.equal(report.summary.asyncBodyCallCategories['offload-call'], 1);
    assert.equal(report.summary.asyncBodyCallCategories['offload-wrapper-construction'], 1);
    assert.equal(report.summary.asyncBodyCallCategories['offload-wrapped-invocation'], 1);
    assert.equal(d.status, 'scored'); assert.equal(d.score, d.asyncScoring.summary.score);
    assert.equal(evidence.dimensions.errorHandling.score, undefined);
    assert.equal(Object.values(evidence.dimensions).filter(dimension => dimension.status === 'scored').length, 2);
    assert.equal(success('--ecosystem', 'python', '--existing', run.artifacts.evidence).fresh, false);
    for (const mutate of [r => { r.runId = initial.runId; }, r => { r.summary.asyncFunctions++; },
      r => { r.functions.find(f => f.measurement).measurement.calls[0].endColumn++; }, r => { r.functions = []; }, r => { r.score = 10; }]) {
      const copy = structuredClone(evidence); mutate(copy.dimensions.performanceAsync.review);
      const location = path.join(temporary, 'invalid-async.json'); fs.writeFileSync(location, JSON.stringify(copy));
      assert.equal(invoke('--ecosystem', 'python', '--existing', location).code, 2);
    }
    fs.unlinkSync(path.join(root, 'app/src/async_work.py'));
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
    assert.equal(evidence.dimensions.codeQuality.status, 'scored');
    assert.ok(Object.entries(evidence.dimensions).every(([key, d]) => key === 'codeQuality' || d.status === 'skipped' && !('score' in d)));
    const stale = structuredClone(evidence); stale.dimensions.codeQuality.duplication.runId = initial.runId;
    const staleFile = path.join(temporary, 'stale-duplication.json'); fs.writeFileSync(staleFile, JSON.stringify(stale));
    assert.equal(invoke('--ecosystem', 'python', '--existing', staleFile).code, 2);
    fs.unlinkSync(path.join(root, 'app/src/duplicates.py'));
  });
  await t.test('decomposition stays unscored with separate size/nesting and rejects stale or altered imports', () => {
    write('app/src/bodies.py', 'def large(x):\n' + '    x += 1\n'.repeat(35) + '    return x\n' +
      'def nested(x):\n    if x:\n        for y in x:\n            if y:\n                return y\n    return None\ncallback = lambda x: x\n');
    const run = success('--ecosystem', 'python'), evidence = readJson(run.artifacts.evidence);
    const cq = evidence.dimensions.codeQuality, report = cq.decomposition;
    assert.equal(report.runId, run.runId); assert.equal(report.auditId, run.auditId);
    assert.equal(report.summary.selectedFunctions, 4); assert.equal(report.summary.measuredFunctions, 3);
    assert.equal(report.summary.unavailableFunctions, 1);
    assert.equal(report.summary.populations.production.ownedStatements.max, 36);
    assert.equal(report.summary.populations.production.maxBlockNesting.max, 3);
    assert.deepEqual(cq.findings, []);
    assert.equal(evidence.dimensions.codeQuality.status, 'scored');
    assert.ok(Object.entries(evidence.dimensions).every(([key, d]) => key === 'codeQuality' || d.status === 'skipped' && !('score' in d)));
    for (const mutate of [r => { r.runId = initial.runId; }, r => { r.summary.populations.production.ownedStatements.p50++; }]) {
      const stale = structuredClone(evidence); mutate(stale.dimensions.codeQuality.decomposition);
      const location = path.join(temporary, 'invalid-decomposition.json'); fs.writeFileSync(location, JSON.stringify(stale));
      assert.equal(invoke('--ecosystem', 'python', '--existing', location).code, 2);
    }
    fs.unlinkSync(path.join(root, 'app/src/bodies.py'));
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
    assert.equal(evidence.dimensions.codeQuality.status, 'scored');
    assert.ok(Object.entries(evidence.dimensions).every(([key, d]) => key === 'codeQuality' || d.status === 'skipped' && !('score' in d)));
    const stale = structuredClone(evidence); stale.dimensions.codeQuality.coverageReview.auditId = initial.auditId;
    write('stale-coverage.json', JSON.stringify(stale));
    assert.equal(invoke('--ecosystem', 'python', '--existing', 'stale-coverage.json').code, 2);
    assert.equal(invoke('--ecosystem', 'python', '--existing', run.artifacts.evidence, '--python-coverage-json', 'supplied-coverage.json').code, 2);
    const failed = invoke('--ecosystem', 'python', '--python-coverage-json', 'supplied-coverage.json', '--python-collection-manifest', 'missing.json');
    assert.equal(failed.code, 2);
    const failure = readJson(failed.value.results[0].artifacts.inspection);
    assert.equal(failure.usable, false);
    assert.equal(failure.evidence.dimensions.codeQuality.methodComplexity.population, null);
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
  await t.test('compatible Method Complexity gates work with the pinned Python package', () => {
    const result = invoke('--ecosystem', 'python', '--baseline', initial.artifacts.evidence, '--max-score-drop', '0');
    assert.equal(result.code, 0, result.error);
    assert.equal(compatibility.analyzers.python.requiresLocalPackage, false);
    assert.equal(result.value.results[0].source, 'compatibility-manifest-local-package');
  });
  await t.test('handler evidence remains unscored and stale or altered observations are rejected', () => {
    write('app/src/handlers.py', 'try: import optional\nexcept ImportError: pass\nclass Client:\n    try: load()\n    except Missing:\n        # Default configuration applies.\n        pass\n    def work(self):\n        try: run()\n        except Missing: return None\n');
    const run = success('--ecosystem', 'python');
    const evidence = readJson(run.artifacts.evidence), report = evidence.dimensions.errorHandling.review;
    assert.equal(report.summary.handlers, 3);
    assert.equal(report.runId, run.runId); assert.equal(report.auditId, run.auditId);
    assert.deepEqual(report.summary.byOwnerKind, { 'class-body': 1, function: 1, module: 1 });
    assert.equal(evidence.dimensions.errorHandling.status, 'skipped');
    assert.equal(evidence.dimensions.errorHandling.score, undefined);
    assert.deepEqual(evidence.dimensions.errorHandling.findings, []);
    for (const mutate of [
      r => { r.runId = '11111111-1111-4111-8111-111111111111'; },
      r => { r.handlers[0].sourceSha256 = '0'.repeat(64); },
      r => { r.summary.handlers++; },
    ]) {
      const copy = structuredClone(evidence); mutate(copy.dimensions.errorHandling.review);
      write('forged-handler-evidence.json', JSON.stringify(copy));
      assert.equal(invoke('--ecosystem', 'python', '--existing', 'forged-handler-evidence.json').code, 2);
    }
    const historical = success('--ecosystem', 'python', '--existing', run.artifacts.evidence);
    assert.equal(historical.fresh, false);
    fs.unlinkSync(path.join(root, 'app/src/handlers.py'));
  });
  await t.test('a Method Complexity regression trips the gate and included test code cannot change the production score', () => {
    const before = success('--ecosystem', 'python');
    const source = fs.readFileSync(path.join(root, 'app/src/work.py'), 'utf8');
    write('app/src/work.py', 'def work(x):\n' + '    if x: x -= 1\n'.repeat(19) + '    return x\n');
    const regressed = invoke('--ecosystem', 'python', '--baseline', before.artifacts.evidence, '--max-score-drop', '1');
    assert.equal(regressed.code, 1, regressed.error + JSON.stringify(regressed.value));
    assert.equal(regressed.value.results[0].status, 'gate-failed');
    const comparison = readJson(regressed.value.results[0].artifacts.comparison);
    assert.equal(comparison.compatible, true);
    assert.equal(comparison.dimensions.codeQuality.delta, -6);
    const included = success('--ecosystem', 'python', '--python-include-tests');
    const cq = readJson(included.artifacts.evidence).dimensions.codeQuality;
    assert.equal(cq.score, 4); assert.equal(cq.methodComplexity.eligibleFunctions, 1);
    assert.equal(cq.methodComplexity.excludedPopulations.test, 1);
    write('app/src/work.py', source);
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
