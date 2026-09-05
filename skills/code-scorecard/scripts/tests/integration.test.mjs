import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compatibility, discover } from '../run-scorecard.mjs';
import { installTools, readJson } from '../runtime.mjs';

const runner = fileURLToPath(new URL('../run-scorecard.mjs', import.meta.url));
const npmPackage = process.env.SCORECARD_NPM_PACKAGE;
const dotnetPackage = process.env.SCORECARD_DOTNET_PACKAGE;

test('packaged analyzers satisfy the scorecard skill contract', { timeout: 300_000 }, async t => {
  assert.ok(npmPackage && dotnetPackage, 'Set SCORECARD_NPM_PACKAGE and SCORECARD_DOTNET_PACKAGE to freshly built local packages.');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'scorecard integration '));
  const root = path.join(temporary, 'repository with spaces');
  const cache = path.join(temporary, 'tool cache');
  const write = (file, value) => { const full = path.join(root, file); fs.mkdirSync(path.dirname(full), { recursive: true }); fs.writeFileSync(full, value); };
  const invoke = (...args) => {
    const result = spawnSync(process.execPath, [runner, '--repo', root, '--cache', cache, '--npm-package', npmPackage, '--dotnet-package', dotnetPackage, ...args], { encoding: 'utf8', timeout: 180_000, windowsHide: true });
    assert.ifError(result.error);
    return { code: result.status, value: result.stdout.trim() ? JSON.parse(result.stdout) : null, error: result.stderr };
  };
  const success = (...args) => { const result = invoke(...args); assert.equal(result.code, 0, result.error + JSON.stringify(result.value)); return result.value.results[0]; };
  try {
    write('.git', 'gitdir: fixture');
    write('src/App/App.csproj', '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup><ItemGroup><ProjectReference Include="../Library/Library.csproj"/></ItemGroup></Project>');
    write('src/App/App.cs', 'public class App { public int Run() => new Library().Value();\n#if DEBUG\npublic int DebugOnly() => 2;\n#endif\n}');
    write('src/Library/Library.csproj', '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><TargetFramework>net10.0</TargetFramework></PropertyGroup></Project>');
    write('src/Library/Library.cs', 'public class Library { public int Value() => 1; }');
    write('ui/package.json', '{"name":"ui"}');
    write('ui/tsconfig.json', '{"include":["src/*.tsx"]}');
    write('ui/src/App.tsx', "import {useEffect} from 'react'; export function App(){ return null; }");
    write('vendor/ignored/package.json', '{}');
    write('shared/fixtures/calibration/package.json', '{}');
    write('shared/fixtures/calibration/Fixture.csproj', '<Project/>');
    write('another-repo/.git', 'gitdir: unrelated');
    write('another-repo/package.json', '{}');
    await t.test('nested discovery ignores generated and foreign repositories and reports ambiguity', () => {
      assert.deepEqual(discover(root, 'javascript-typescript'), [path.join(root, 'ui/package.json')]);
      assert.equal(discover(root, 'dotnet').length, 2);
      const ambiguous = invoke('--ecosystem', 'dotnet');
      assert.equal(ambiguous.code, 2); assert.match(ambiguous.error, /Ambiguous/);
    });
    let dotnet;
    await t.test('project entry points load references but score only the selected project and honor repository pins', () => {
      write('.config/dotnet-tools.json', '{"version":1,"isRoot":true,"tools":{"codemetrics.ai":{"version":"2.0.0","commands":["code-metrics"]}}}');
      const restore = spawnSync('dotnet', ['restore', 'src/App/App.csproj', '--ignore-failed-sources'], { cwd: root, encoding: 'utf8', timeout: 90_000, windowsHide: true });
      assert.equal(restore.status, 0, restore.stdout + restore.stderr);
      dotnet = success('--entry-point', 'src/App/App.csproj', '--skip-dependency-probe');
      assert.equal(dotnet.source, 'repository-pin');
      const inspected = readJson(dotnet.artifacts.inspection);
      assert.equal(inspected.evidence.schemaVersion, 3);
      assert.equal(inspected.evidence.filters.totalUnits, 1);
      assert.equal(inspected.evidence.population.members, 1);
      assert.equal(inspected.evidence.subject.variant, 'Release');
      assert.equal(inspected.evidence.dimensions.dependencyManagement.status, 'skipped');
      assert.equal(inspected.evidence.dimensions.performanceAsync.scope.coverage, 'partial');
      const debug = success('--entry-point', 'src/App/App.csproj', '--configuration', 'Debug', '--skip-dependency-probe');
      assert.equal(readJson(debug.artifacts.evidence).population.members, 2);
      const mismatch = invoke('--entry-point', 'src/App/App.csproj', '--configuration', 'Debug', '--skip-dependency-probe', '--baseline', dotnet.artifacts.evidence);
      assert.equal(mismatch.code, 2); assert.equal(mismatch.value.results[0].comparisonExitCode, 2);
    });
    let initial;
    await t.test('fresh JS runs expose scope and shared gates detect a new warning', () => {
      initial = success('--entry-point', 'ui/package.json');
      assert.equal(initial.fresh, true);
      const original = readJson(initial.artifacts.evidence);
      assert.ok(original.dimensions.performanceAsync.scope.excludes.includes('general-async'));
      assert.equal(original.dimensions.security.status, 'skipped');
      write('ui/src/App.tsx', "import {useEffect} from 'react'; export function App(){ useEffect(async()=>{},[]); return null; }");
      const changed = invoke('--entry-point', 'ui/package.json', '--baseline', initial.artifacts.evidence, '--fail-on-new', 'warning', '--max-score-drop', '0');
      assert.equal(changed.code, 1, changed.error);
      const latest = changed.value.results[0];
      assert.equal(latest.status, 'gate-failed');
      assert.notEqual(latest.artifacts.evidence, initial.artifacts.evidence);
      assert.equal(readJson(latest.artifacts.comparison).new.length, 1);
    });
    await t.test('changed configuration is incompatible and partial outputs never recover earlier scores', () => {
      write('ui/tsconfig.json', '{"include":["src/**/*.tsx"]}');
      const changed = invoke('--entry-point', 'ui/package.json', '--baseline', initial.artifacts.evidence);
      assert.equal(changed.code, 2); assert.match(changed.error, /configurationFingerprint/);
      write('ui/src/App.tsx', 'export function {');
      const broken = invoke('--entry-point', 'ui/package.json');
      assert.equal(broken.code, 2);
      const run = broken.value.results[0];
      assert.equal(run.status, 'failed'); assert.equal(run.analyzerExitCode, 2);
      assert.equal(readJson(run.artifacts.evidence).dimensions.codeQuality.score, undefined);
      assert.equal(readJson(path.join(root, '.scorecard/javascript-typescript/latest.json')).status, 'failed');
      assert.ok(fs.existsSync(initial.artifacts.metrics));
    });
    await t.test('canonical v2 is explicitly historical, has unknown provenance fields and cannot be gated', () => {
      const tooling = installTools({ cache, 'npm-package': npmPackage }, compatibility);
      const legacy = readJson(path.join(tooling.packageRoot, 'dist/contract-examples/javascript-typescript-evidence.json'));
      legacy.subject = { root, entryPoint: path.join(root, 'ui/package.json'), name: 'ui', variant: 'source' };
      write('archive/v2.json', JSON.stringify(legacy));
      const imported = success('--entry-point', 'ui/package.json', '--existing', 'archive/v2.json');
      assert.equal(imported.status, 'legacy'); assert.equal(imported.fresh, false);
      const inspected = readJson(imported.artifacts.inspection);
      assert.equal(inspected.compatibility.analysisStatus, 'unknown');
      assert.equal(inspected.evidence.analysis, undefined);
      const gate = invoke('--entry-point', 'ui/package.json', '--existing', 'archive/v2.json', '--baseline', 'archive/v2.json', '--max-score-drop', '0');
      assert.equal(gate.code, 2); assert.match(gate.error, /compatibility-only/);
    });
    await t.test('unsupported schemas, provenance mismatches and incompatible pins fail explicitly', () => {
      write('archive/invalid.json', '{"schemaVersion":99}');
      assert.equal(invoke('--entry-point', 'ui/package.json', '--existing', 'archive/invalid.json').code, 2);
      write('ui/package.json', '{"name":"ui","devDependencies":{"codemetrics-ai":"0.2.0"}}');
      const wrong = readJson(initial.artifacts.evidence); wrong.tool.version = '99.0.0';
      write('archive/wrong.json', JSON.stringify(wrong));
      const mismatch = invoke('--entry-point', 'ui/package.json', '--existing', 'archive/wrong.json');
      assert.equal(mismatch.code, 2); assert.match(mismatch.error, /tool.version/);
      wrong.tool.version = '0.2.0'; wrong.subject.entryPoint = path.join(root, 'different/package.json');
      write('archive/wrong.json', JSON.stringify(wrong));
      assert.match(invoke('--entry-point', 'ui/package.json', '--existing', 'archive/wrong.json').error, /subject.entryPoint/);
      write('ui/package.json', '{"name":"ui","devDependencies":{"codemetrics-ai":"^0.2.0"}}');
      const pin = invoke('--entry-point', 'ui/package.json');
      assert.equal(pin.code, 2); assert.match(pin.error, /Repository pin/);
      assert.equal(readJson(path.join(root, 'ui/package.json')).devDependencies['codemetrics-ai'], '^0.2.0');
    });
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
});
