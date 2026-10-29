import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compatibility } from '../run-scorecard.mjs';
import { installTools, readJson } from '../runtime.mjs';
import { defaultInstallation } from '../package-selection.mjs';

test('legacy and CodeTestament packages integrate without sharing caches or changing public defaults', { timeout: 360_000 }, async t => {
  const oldNpm = process.env.SCORECARD_NPM_PACKAGE, oldNet = process.env.SCORECARD_DOTNET_PACKAGE;
  const newNpm = process.env.SCORECARD_NEW_NPM_PACKAGE, newNet = process.env.SCORECARD_NEW_DOTNET_PACKAGE;
  assert.ok(oldNpm && oldNet && newNpm && newNet, 'Supply both legacy and migration npm/NuGet archives.');
  const temporary = fs.realpathSync.native(fs.mkdtempSync(path.join(process.env.SCORECARD_TEST_ROOT ?? os.tmpdir(), 'brand-skill-')));
  t.after(() => { if (!process.env.SCORECARD_MIGRATION_RECEIPT) fs.rmSync(temporary, { recursive: true, force: true }); });
  const root = path.join(temporary, 'repo'), cache = path.join(temporary, 'cache'); fs.mkdirSync(root);
  const write = (file, text) => { const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, text); };
  const runner = fileURLToPath(new URL('../run-scorecard.mjs', import.meta.url));
  const receipts = [];
  const invoke = (options, ...args) => {
    const result = spawnSync(process.execPath, [runner, '--repo', root, '--cache', cache,
      ...Object.entries(options).flatMap(([key, value]) => ['--' + key, value]), ...args], { encoding: 'utf8', windowsHide: true, timeout: 180_000 });
    assert.ifError(result.error);
    return { code: result.status, value: result.stdout.trim() ? JSON.parse(result.stdout) : null, error: result.stderr };
  };
  const legacy = { 'npm-package': oldNpm, 'dotnet-package': oldNet };
  const modern = { 'npm-tool': 'codetestament@0.6.0-preview.3', 'dotnet-tool': 'CodeTestament.Scorecard@2.4.0', 'npm-package': newNpm, 'dotnet-package': newNet };
  const success = (options, ...args) => {
    const result = invoke(options, ...args); assert.equal(result.code, 0, result.error + JSON.stringify(result.value));
    receipts.push(...result.value.results); return result.value.results[0];
  };
  write('.git', 'gitdir: test');
  write('ui/package.json', '{"name":"ui"}');
  write('ui/app.ts', 'export async function work(x: number) { if (x) return x; return 0; }');
  write('python/pyproject.toml', '[project]\nname="app"\n');
  write('python/work.py', 'import time\nasync def work():\n    time.sleep(1)\n');
  write('app/App.csproj', '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>');
  write('app/Work.cs', 'public class Work { public int Run(int x) { if(x > 0) return x; return 0; } }');
  const restore = spawnSync('dotnet', ['restore', path.join(root, 'app/App.csproj')], { encoding: 'utf8', windowsHide: true, timeout: 90_000 });
  assert.equal(restore.status, 0, restore.stdout + restore.stderr);
  const oldCache = path.join(cache, 'npm/0.6.0-preview.2'); fs.mkdirSync(oldCache, { recursive: true });
  fs.writeFileSync(path.join(oldCache, 'preserve'), 'legacy cache layout');
  let before, after;
  await t.test('new mixed audit emits correct identities, versions and separate fresh runs', () => {
    const result = invoke(modern, '--skip-dependency-probe'); assert.equal(result.code, 0, result.error + JSON.stringify(result.value));
    receipts.push(...result.value.results); assert.equal(result.value.results.length, 3);
    const names = { dotnet: 'CodeTestament.Scorecard', 'javascript-typescript': 'CodeTestament.JavaScript', python: 'CodeTestament.Python' };
    for (const run of result.value.results) {
      const evidence = readJson(run.artifacts.inspection).evidence;
      assert.equal(evidence.tool.name, names[run.ecosystem]); assert.equal(evidence.tool.version, run.version);
      assert.equal(evidence.analysis.runId, run.runId); assert.equal(evidence.analysis.auditId, result.value.auditId);
      assert.equal(run.tooling.analyzer.package, run.ecosystem === 'dotnet' ? 'CodeTestament.Scorecard' : 'codetestament');
      assert.ok(run.tooling.analyzer.archiveSha256);
      if (run.ecosystem === 'dotnet') { assert.equal(run.ruleCatalog.status, 'available'); assert.equal(readJson(run.artifacts.ruleCatalog).tool.name, names.dotnet); }
      if (run.ecosystem === 'python') {
        assert.equal(run.packageVersion, '0.6.0-preview.3'); assert.equal(run.version, '0.15.0');
        assert.equal(evidence.dimensions.errorHandling.status, 'skipped'); assert.equal(evidence.dimensions.errorHandling.score, undefined);
      }
    }
    assert.equal(new Set(result.value.results.map(item => item.runId)).size, 3);
    after = result.value.results.find(item => item.ecosystem === 'javascript-typescript');
  });
  await t.test('legacy defaults and explicit pins install the actual old producer separately', () => {
    before = success(legacy, '--entry-point', 'ui/package.json');
    assert.equal(readJson(before.artifacts.evidence).tool.name, 'codemetrics-ai');
    assert.notEqual(before.tooling.analyzer.cache, after.tooling.analyzer.cache);
    assert.equal(fs.readFileSync(path.join(oldCache, 'preserve'), 'utf8'), 'legacy cache layout');
    write('ui/package.json', JSON.stringify({ name: 'ui', devDependencies: { codetestament: '0.6.0-preview.3' } }));
    const pinned = success({ 'npm-package': newNpm }, '--entry-point', 'ui/package.json');
    assert.equal(pinned.source, 'repository-pin'); assert.equal(pinned.recordedTool.name, 'CodeTestament.JavaScript');
    const conflict = invoke(modern, '--entry-point', 'ui/package.json', '--npm-tool', 'codemetrics-ai@0.6.0-preview.2');
    assert.equal(conflict.code, 2); assert.match(conflict.error, /conflicts with repository pin/);
    write('ui/package.json', '{"name":"ui"}');
    const net = success(legacy, '--entry-point', 'app/App.csproj', '--skip-dependency-probe');
    assert.equal(net.recordedTool.name, 'CodeMetrics.AI'); assert.equal(net.ruleCatalog.status, 'available');
  });
  await t.test('historical imports keep recorded identities and cross-brand gates stay incompatible', () => {
    const imported = success(modern, '--entry-point', 'ui/package.json', '--existing', before.artifacts.evidence);
    assert.equal(imported.fresh, false); assert.equal(imported.recordedTool.name, 'codemetrics-ai'); assert.equal(imported.tooling.analyzer, null);
    const failed = invoke(modern, '--entry-point', 'ui/package.json', '--baseline', before.artifacts.evidence, '--max-score-drop', '0');
    assert.equal(failed.code, 2); assert.equal(failed.value.results[0].comparisonExitCode, 2);
    const python = success(legacy, '--ecosystem', 'python');
    assert.equal(success(modern, '--ecosystem', 'python', '--existing', python.artifacts.evidence).recordedTool.name, 'CodeMetrics.AI.Python');
  });
  await t.test('cache reuse verifies installed metadata and archives cannot substitute a different package', async () => {
    const tooling = await installTools({ ...modern, cache }, compatibility);
    const file = path.join(tooling.packageRoot, 'package.json'), original = fs.readFileSync(file);
    for (const change of [{ name: 'other' }, { version: '0.6.0-preview.2' }]) {
      fs.writeFileSync(file, JSON.stringify({ ...JSON.parse(original), ...change }));
      await assert.rejects(installTools({ ...modern, cache }, compatibility), /identity mismatch/);
      fs.writeFileSync(file, original);
    }
    const reused = await installTools({ ...modern, cache }, compatibility);
    assert.equal(reused.identity.cache, tooling.identity.cache);
    await assert.rejects(installTools({ ...modern, cache, 'npm-package': oldNpm }, compatibility), /identity mismatch/);
    await assert.rejects(installTools({ ...modern, cache, 'dotnet-package': oldNet }, compatibility,
      defaultInstallation(modern, compatibility, 'dotnet')), /Tool setup failed/);
    await assert.rejects(installTools({ 'npm-tool': modern['npm-tool'], cache }, compatibility), /local-only/);
    const noSource = invoke({ 'npm-package': oldNpm, 'dotnet-tool': modern['dotnet-tool'] }, '--ecosystem', 'dotnet');
    assert.equal(noSource.code, 2); assert.match(noSource.value.results[0].error, /local-only/);
  });
  await t.test('legacy reader cannot mark a fresh run usable after an exact producer-name mismatch', async () => {
    const tooling = await installTools({ ...legacy, cache }, compatibility);
    const original = fs.readFileSync(tooling.js);
    try {
      fs.appendFileSync(tooling.js, `\nconst alteredOutput = process.argv[process.argv.indexOf('--scorecard-output') + 1];\nconst altered = JSON.parse(fs.readFileSync(alteredOutput, 'utf8')); altered.tool.name = 'WrongBrand'; fs.writeFileSync(alteredOutput, JSON.stringify(altered));\n`);
      const failed = invoke(legacy, '--entry-point', 'ui/package.json');
      assert.equal(failed.code, 2);
      const run = failed.value.results[0]; assert.equal(run.validationExitCode, 2); assert.match(run.error, /tool.name/);
      assert.equal(readJson(run.artifacts.inspection).usable, false);
    } finally { fs.writeFileSync(tooling.js, original); }
  });
  await t.test('a newer reader validates an older pinned JS producer without replacing it', () => {
    const archive = process.env.SCORECARD_OLD_JS_PACKAGE;
    assert.ok(archive, 'Supply SCORECARD_OLD_JS_PACKAGE for codemetrics-ai 0.2.0.');
    write('ui/package.json', JSON.stringify({ name: 'ui', devDependencies: { 'codemetrics-ai': '0.2.0' } }));
    const run = success({ 'npm-package': archive, 'evidence-package': oldNpm }, '--entry-point', 'ui/package.json');
    assert.equal(run.recordedTool.version, '0.2.0'); assert.equal(run.tooling.analyzer.version, '0.2.0');
    assert.equal(run.tooling.evidence.version, '0.6.0-preview.2');
    write('ui/package.json', '{"name":"ui"}');
  });
  if (process.env.SCORECARD_MIGRATION_RECEIPT) fs.writeFileSync(process.env.SCORECARD_MIGRATION_RECEIPT,
    JSON.stringify({ temporary, defaults: compatibility.defaults, runs: receipts }, null, 2) + '\n');
});
