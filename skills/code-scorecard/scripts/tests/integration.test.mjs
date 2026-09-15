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
      write('.config/dotnet-tools.json', JSON.stringify({ version: 1, isRoot: true, tools: { 'codemetrics.ai': { version: compatibility.analyzers.dotnet.preferredVersion, commands: ['code-metrics'] } } }));
      const restore = spawnSync('dotnet', ['restore', 'src/App/App.csproj', '--ignore-failed-sources'], { cwd: root, encoding: 'utf8', timeout: 90_000, windowsHide: true });
      assert.equal(restore.status, 0, restore.stdout + restore.stderr);
      dotnet = success('--entry-point', 'src/App/App.csproj', '--skip-dependency-probe');
      assert.equal(dotnet.source, 'repository-pin');
      const inspected = readJson(dotnet.artifacts.inspection);
      assert.equal(inspected.evidence.schemaVersion, 3);
      assert.equal(dotnet.ruleCatalog.status, 'available');
      const catalog = readJson(dotnet.artifacts.ruleCatalog);
      assert.equal(catalog.tool.version, inspected.evidence.tool.version);
      assert.equal(catalog.rules.find(rule => rule.code === 'CMAI5001').ruleId, 'dotnet/errorHandling/emptyCatch');
      assert.equal(catalog.rules.find(rule => rule.code === 'CMAI1001').annotation.supported, false);
      for (const dimension of Object.values(inspected.evidence.dimensions)) {
        if (dimension.status === 'scored') assert.equal(dimension.scoringDecision.finalScore, dimension.score);
        else assert.equal(dimension.scoringDecision, undefined);
      }
      assert.equal(inspected.evidence.analysis.runId, dotnet.runId);
      assert.equal(inspected.evidence.analysis.auditId, dotnet.auditId);
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
    await t.test('MSBuild advisory warnings remain visible without invalidating complete evidence', () => {
      const project = path.join(root, 'src/App/App.csproj');
      fs.writeFileSync(project, fs.readFileSync(project, 'utf8').replace('</Project>',
        '<Target Name="AuditWarning" BeforeTargets="CoreCompile"><Warning Code="NU1903" Text="Package advisory fixture" /></Target></Project>'));
      const run = success('--entry-point', 'src/App/App.csproj', '--skip-dependency-probe');
      const inspection = readJson(run.artifacts.inspection);
      assert.equal(run.analyzerExitCode, 0);
      assert.equal(run.validationExitCode, 0);
      assert.equal(inspection.usable, true);
      assert.equal(inspection.evidence.analysis.status, 'complete');
      assert.ok(inspection.evidence.analysis.diagnostics.some(d => d.kind === 'workspaceWarning' && d.message.includes('Package advisory fixture')));
      assert.equal(inspection.evidence.dimensions.codeQuality.status, 'scored');
    });
    await t.test('failed dependency assessment exposes diagnostics without restoring scores', () => {
      const failed = readJson(dotnet.artifacts.evidence);
      failed.analysis.status = 'incomplete';
      const dimension = failed.dimensions.dependencyManagement;
      dimension.status = 'failed';
      dimension.basis = 'Dependency compatibility assessment unavailable; no dependency score is assigned.';
      delete dimension.score; delete dimension.scoringDecision; delete dimension.scoring;
      dimension.dependencyCompatibility = { status: 'failed', uniquePackageVersions: 1,
        totalObservations: 20, knownObservations: 0, elapsedMilliseconds: 10,
        failures: [{ package: 'Example.Library', latestVersion: '2.0.0', affectedObservations: 20,
          reasons: ['sourceIndex:HttpRequestException', 'noPackageBaseAddress'] }] };
      write('archive/dependency-failed.json', JSON.stringify(failed));
      const result = invoke('--entry-point', 'src/App/App.csproj', '--existing', 'archive/dependency-failed.json');
      assert.equal(result.code, 2, result.error);
      const run = result.value.results[0];
      assert.equal(run.status, 'failed');
      assert.equal(run.validationExitCode, 2);
      assert.equal(run.fresh, false);
      assert.match(run.error, /Assessment unavailable: dependencyManagement/);
      assert.equal(run.assessmentFailures.length, 1);
      assert.equal(run.assessmentFailures[0].dependencyCompatibility.failures[0].affectedObservations, 20);
      const inspected = readJson(run.artifacts.inspection);
      assert.equal(inspected.usable, false);
      assert.equal(inspected.evidence.dimensions.dependencyManagement.score, undefined);
      assert.equal(inspected.evidence.dimensions.dependencyManagement.scoringDecision, undefined);
      assert.equal(readJson(path.join(root, '.scorecard/dotnet/latest.json')).status, 'failed');
    });
    let initial;
    await t.test('fresh JS runs expose scope and shared gates detect a new warning', () => {
      initial = success('--entry-point', 'ui/package.json');
      assert.equal(initial.fresh, true);
      const original = readJson(initial.artifacts.evidence);
      assert.equal(original.analysis.runId, initial.runId);
      assert.equal(original.analysis.auditId, initial.auditId);
      assert.ok(original.dimensions.performanceAsync.scope.excludes.includes('general-async'));
      assert.equal(original.dimensions.security.status, 'skipped');
      write('ui/src/App.tsx', "import {useEffect} from 'react'; export function App(){ useEffect(async()=>{},[]); return null; }");
      const changed = invoke('--entry-point', 'ui/package.json', '--baseline', initial.artifacts.evidence, '--fail-on-new', 'warning', '--max-score-drop', '0');
      assert.equal(changed.code, 1, changed.error);
      const latest = changed.value.results[0];
      assert.equal(latest.status, 'gate-failed');
      assert.notEqual(latest.artifacts.evidence, initial.artifacts.evidence);
      assert.notEqual(latest.runId, initial.runId);
      assert.equal(readJson(latest.artifacts.comparison).currentRun.runId, latest.runId);
      assert.equal(readJson(latest.artifacts.comparison).new.length, 1);
    });
    await t.test('a producer returning old findings at the new path is rejected despite exit zero', async () => {
      const tooling = await installTools({ cache, 'npm-package': npmPackage }, compatibility);
      const originalCli = fs.readFileSync(tooling.js);
      try {
        fs.writeFileSync(tooling.js, `import fs from 'node:fs'; fs.copyFileSync(${JSON.stringify(initial.artifacts.evidence)}, process.argv[process.argv.indexOf('--scorecard-output') + 1]);`);
        const stale = invoke('--entry-point', 'ui/package.json');
        assert.equal(stale.code, 2);
        const run = stale.value.results[0];
        assert.equal(run.analyzerExitCode, 0);
        assert.equal(run.validationExitCode, 2);
        assert.notEqual(run.runId, initial.runId);
        assert.equal(readJson(run.artifacts.evidence).analysis.runId, initial.runId);
        assert.match(stale.error, /analysis.runId/);
        assert.equal(fs.existsSync(run.artifacts.inspection), false);
      } finally { fs.writeFileSync(tooling.js, originalCli); }
    });
    await t.test('one polyglot audit shares an audit ID but gives each ecosystem its own run ID', () => {
      write('Audit.slnx', '<Solution><Project Path="src/App/App.csproj"/><Project Path="src/Library/Library.csproj"/></Solution>');
      const audit = invoke('--skip-dependency-probe');
      assert.equal(audit.code, 0, audit.error);
      assert.equal(audit.value.results.length, 2);
      assert.equal(new Set(audit.value.results.map(run => run.runId)).size, 2);
      for (const run of audit.value.results) {
        assert.equal(run.auditId, audit.value.auditId);
        const evidence = readJson(run.artifacts.evidence);
        assert.equal(evidence.analysis.auditId, audit.value.auditId);
        assert.equal(evidence.analysis.runId, run.runId);
      }
    });
    await t.test('explicit sln and slnx entry points score the same production projects', () => {
      for (const args of [
        ['new', 'sln', '--format', 'sln', '--name', 'Legacy'],
        ['sln', 'Legacy.sln', 'add', 'src/App/App.csproj', 'src/Library/Library.csproj'],
      ]) {
        const command = spawnSync('dotnet', args, { cwd: root, encoding: 'utf8', timeout: 90_000, windowsHide: true });
        assert.equal(command.status, 0, command.stdout + command.stderr);
      }
      for (const entryPoint of ['Legacy.sln', 'Audit.slnx']) {
        const run = success('--entry-point', entryPoint, '--skip-dependency-probe');
        const evidence = readJson(run.artifacts.evidence);
        assert.equal(fs.realpathSync.native(evidence.subject.entryPoint), fs.realpathSync.native(path.join(root, entryPoint)));
        assert.equal(evidence.filters.totalUnits, 2);
        assert.equal(evidence.population.members, 2);
        assert.equal(evidence.subject.variant, 'Release');
        assert.equal(evidence.analysis.runId, run.runId);
        assert.equal(evidence.analysis.auditId, run.auditId);
      }
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
      assert.equal(readJson(run.artifacts.evidence).dimensions.codeQuality.scoringDecision, undefined);
      assert.equal(readJson(path.join(root, '.scorecard/javascript-typescript/latest.json')).status, 'failed');
      assert.ok(fs.existsSync(initial.artifacts.metrics));
    });
    await t.test('canonical v2 is explicitly historical, has unknown provenance fields and cannot be gated', async () => {
      const tooling = await installTools({ cache, 'npm-package': npmPackage }, compatibility);
      const legacy = readJson(path.join(tooling.packageRoot, 'dist/contract-examples/javascript-typescript-evidence.json'));
      legacy.subject = { root, entryPoint: path.join(root, 'ui/package.json'), name: 'ui', variant: 'source' };
      write('archive/v2.json', JSON.stringify(legacy));
      const imported = success('--entry-point', 'ui/package.json', '--existing', 'archive/v2.json');
      assert.equal(imported.status, 'legacy'); assert.equal(imported.fresh, false);
      assert.equal(imported.evidenceRunId, null);
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
