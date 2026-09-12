#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { readJson, writeJson, run, installTools } from './runtime.mjs';
import { readPackagedRuleCatalog } from './rule-catalog.mjs';

export const compatibility = readJson(new URL('../compatibility.json', import.meta.url));
const excluded = new Set(['.git', '.scorecard', '.worktrees', 'node_modules', 'bin', 'obj', 'dist', 'build', 'vendor', '.next', 'coverage', '.venv', 'venv', 'TestResults', 'fixtures', '__fixtures__', 'testdata']);
const ecosystems = Object.keys(compatibility.analyzers);
const within = (root, file) => { const relative = path.relative(root, file); return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith('..' + path.sep); };

/** Prefer a containing solution/workspace; search nested layouts only where no entry point covers that ecosystem. */
export function discover(root, ecosystem) {
  function visit(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'));
    const files = entries.filter(entry => entry.isFile()).map(entry => path.join(directory, entry.name));
    const solutions = files.filter(file => /\.slnx?$/i.test(file));
    const candidates = ecosystem === 'dotnet' ? (solutions.length ? solutions : files.filter(file => /\.csproj$/i.test(file))) : files.filter(file => path.basename(file) === 'package.json');
    if (candidates.length) return candidates;
    return entries.filter(entry => entry.isDirectory() && !excluded.has(entry.name) && !fs.existsSync(path.join(directory, entry.name, '.git')))
      .flatMap(entry => visit(path.join(directory, entry.name)));
  }
  return visit(root);
}
function ancestors(directory, root) {
  const result = [];
  for (let current = directory; within(root, current); current = path.dirname(current)) {
    result.push(current);
    if (current === root) break;
  }
  return result;
}
function pinnedVersion(root, entryPoint, ecosystem) {
  const policy = compatibility.analyzers[ecosystem];
  let pin;
  for (const directory of ancestors(path.dirname(entryPoint), root)) {
    const file = path.join(directory, ecosystem === 'dotnet' ? '.config/dotnet-tools.json' : 'package.json');
    if (!fs.existsSync(file)) continue;
    const config = readJson(file);
    pin = ecosystem === 'dotnet' ? Object.entries(config.tools ?? {}).find(([name]) => name.toLowerCase() === 'codemetrics.ai')?.[1].version
      : config.devDependencies?.['codemetrics-ai'] ?? config.dependencies?.['codemetrics-ai'];
    if (pin !== undefined || (ecosystem === 'dotnet' && config.isRoot)) break;
  }
  if (pin !== undefined && !policy.testedVersions.includes(pin)) throw new Error(`Repository pin ${pin} is not in tested ${ecosystem} versions (${policy.testedVersions.join(', ')}). Keep the pin; update compatibility intentionally after testing. Exact versions are required.`);
  return { version: pin ?? policy.preferredVersion, source: pin === undefined ? 'compatibility-manifest' : 'repository-pin' };
}
function expectedRoot(entryPoint) {
  const fallback = path.dirname(entryPoint);
  for (let directory = fallback; ; directory = path.dirname(directory)) {
    if (fs.existsSync(path.join(directory, '.git'))) return directory;
    if (directory === path.dirname(directory)) return fallback;
  }
}
export async function execute(options) {
  if (Number(process.versions.node.split('.')[0]) < 20) throw new Error('Node.js 20 or newer is required.');
  const timeoutSeconds = Number(options['timeout-seconds'] ?? 1800);
  if (!Number.isSafeInteger(timeoutSeconds) || timeoutSeconds < 1 || timeoutSeconds > 86400) throw new Error('--timeout-seconds must be an integer between 1 and 86400.');
  const root = fs.realpathSync(path.resolve(options.repo ?? '.'));
  if (options.ecosystem && !ecosystems.includes(options.ecosystem)) throw new Error('Unknown ecosystem.');
  let selected = options.ecosystem ? [options.ecosystem] : ecosystems;
  let explicit;
  if (options['entry-point']) {
    explicit = fs.realpathSync(path.resolve(root, options['entry-point']));
    if (!within(root, explicit)) throw new Error('Entry point must be inside --repo.');
    const ecosystem = /\.csproj$|\.slnx?$/i.test(explicit) ? 'dotnet' : path.basename(explicit) === 'package.json' ? 'javascript-typescript' : undefined;
    if (!ecosystem || !selected.includes(ecosystem)) throw new Error('Entry point does not match the requested ecosystem.');
    selected = [ecosystem];
  }
  const candidates = Object.fromEntries(selected.map(ecosystem => [ecosystem, explicit ? [explicit] : discover(root, ecosystem)]));
  if (options.discover) return { candidates };
  for (const [ecosystem, entries] of Object.entries(candidates))
    if (entries.length > 1) throw new Error(`Ambiguous ${ecosystem} scope; pass --entry-point. Candidates: ${entries.join(', ')}`);
  const scopes = Object.entries(candidates).filter(([, entries]) => entries.length).map(([ecosystem, [entryPoint]]) => ({ ecosystem, entryPoint, ...pinnedVersion(root, entryPoint, ecosystem) }));
  if (!scopes.length) throw new Error('No supported entry point found. Specify a nested --entry-point or report a qualitative-only audit.');
  if ((options.existing || options.baseline) && scopes.length !== 1) throw new Error('--existing and --baseline require one ecosystem/entry point.');
  if (!options.baseline && (options['fail-on-new'] !== undefined || options['max-score-drop'] !== undefined)) throw new Error('Quality gates require --baseline.');
  const auditId = randomUUID();
  const results = [];
  for (const scope of scopes) {
    const runId = randomUUID();
    const directory = path.join(root, '.scorecard', scope.ecosystem, 'runs', runId);
    const latest = path.join(root, '.scorecard', scope.ecosystem, 'latest.json');
    const evidence = options.existing ? path.resolve(root, options.existing) : path.join(directory, 'evidence.json');
    const summary = { ...scope, runId, auditId, timeoutSeconds, status: 'running', fresh: !options.existing, artifacts: { evidence, inspection: path.join(directory, 'inspection.json') } };
    fs.mkdirSync(directory, { recursive: true });
    writeJson(latest, summary);
    try {
      const tooling = await installTools(options, compatibility, scope.ecosystem === 'dotnet' && !options.existing ? scope.version : undefined);
      const variant = scope.ecosystem === 'dotnet' ? options.configuration ?? 'Release' : 'source';
      if (!options.existing) {
        summary.artifacts.metrics = path.join(directory, 'metrics.csv');
        const args = ['--run-id', runId, '--audit-id', auditId, '--output', summary.artifacts.metrics, '--scorecard-output', evidence];
        if (scope.ecosystem === 'dotnet') {
          args.push('--solution', scope.entryPoint, '--configuration', variant);
          if (options['skip-dependency-probe']) args.push('--skip-dependency-probe');
          if (options.coverage) args.push('--coverage', path.resolve(root, options.coverage));
          summary.analyzerExitCode = await run(tooling.dotnet, args, root, {}, timeoutSeconds * 1000);
        } else {
          args.push('--project', scope.entryPoint);
          if (options.tsconfig) args.push('--tsconfig', path.resolve(root, options.tsconfig));
          summary.analyzerExitCode = await run(process.execPath, [tooling.js, ...args], root, {}, timeoutSeconds * 1000);
        }
      }
      const inspectArgs = [tooling.evidence, '--input', evidence, '--inspect-output', summary.artifacts.inspection,
        '--expected-ecosystem', scope.ecosystem, '--expected-entry-point', scope.entryPoint, '--expected-variant', variant, '--expected-root', expectedRoot(scope.entryPoint)];
      // Historical imports retain their recorded tool version; an explicit repository pin still takes precedence.
      if (!options.existing || scope.source === 'repository-pin') inspectArgs.push('--expected-version', scope.version);
      if (!options.existing) inspectArgs.push('--expected-run-id', runId, '--expected-audit-id', auditId);
      summary.validationExitCode = await run(process.execPath, inspectArgs, root);
      if (summary.validationExitCode !== 0 || (summary.analyzerExitCode !== undefined && summary.analyzerExitCode !== 0)) throw new Error('Analysis or validation failed. Partial evidence is diagnostic only; CSV must not restore a score.');
      const inspection = readJson(summary.artifacts.inspection);
      summary.evidenceRunId = inspection.evidence.analysis?.runId ?? null;
      summary.evidenceAuditId = inspection.evidence.analysis?.auditId ?? null;
      if (!compatibility.supportedEvidenceSchemas.includes(inspection.evidence.schemaVersion)) throw new Error('Unsupported evidence schema.');
      if (!options.existing && inspection.evidence.schemaVersion !== compatibility.preferredEvidenceSchema) throw new Error('Fresh analysis did not emit the preferred schema.');
      summary.status = inspection.compatibility.mode === 'legacy' ? 'legacy' : 'complete';
      if (scope.ecosystem === 'dotnet') {
        summary.ruleCatalog = { status: 'unavailable', reason: options.existing ? 'Historical import; no catalog loaded from another package.' : 'Analyzer evidence does not advertise a packaged rule catalog.' };
        if (!options.existing && Object.values(inspection.evidence.dimensions).some(dimension => dimension.ruleCatalog)) {
          try {
            const catalogPath = path.join(directory, 'rules.json');
            const catalog = await readPackagedRuleCatalog(tooling.dotnet, inspection.evidence, catalogPath, root);
            summary.artifacts.ruleCatalog = catalogPath;
            summary.ruleCatalog = { status: 'available', catalogVersion: catalog.catalogVersion, toolVersion: catalog.tool.version };
          } catch (error) {
            // Catalog guidance is optional; its failure cannot change validated analysis scores.
            summary.ruleCatalog.reason = error.message;
          }
        }
      }
      if (options.baseline) {
        summary.artifacts.comparison = path.join(directory, 'comparison.json');
        const args = [tooling.evidence, '--input', evidence, '--baseline', path.resolve(root, options.baseline), '--output', summary.artifacts.comparison];
        if (!options.existing) args.push('--expected-run-id', runId, '--expected-audit-id', auditId);
        for (const key of ['fail-on-new', 'max-score-drop']) if (options[key] !== undefined) args.push('--' + key, options[key]);
        summary.comparisonExitCode = await run(process.execPath, args, root);
        if (summary.comparisonExitCode === 1) summary.status = 'gate-failed';
        else if (summary.comparisonExitCode !== 0) throw new Error('Baseline is incompatible or the comparison failed.');
      }
    } catch (error) { summary.status = 'failed'; summary.error = error.message; }
    writeJson(path.join(directory, 'run.json'), summary);
    writeJson(latest, summary);
    results.push(summary);
  }
  return { auditId, results };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const strings = ['repo', 'entry-point', 'ecosystem', 'configuration', 'coverage', 'tsconfig', 'cache', 'npm-package', 'dotnet-package', 'existing', 'baseline', 'fail-on-new', 'max-score-drop', 'timeout-seconds'];
    const { values } = parseArgs({ options: { ...Object.fromEntries(strings.map(key => [key, { type: 'string' }])), discover: { type: 'boolean' }, 'skip-dependency-probe': { type: 'boolean' }, help: { type: 'boolean' } } });
    if (values.help) console.log('run-scorecard.mjs --repo <root> [--entry-point <path> | --ecosystem <id>] [--discover]\nFresh analysis is the default. See bootstrap.md for pinned tools, local packages, imports and gates.');
    else {
      const result = await execute(values);
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.results?.some(item => item.status === 'failed') ? 2 : result.results?.some(item => item.status === 'gate-failed') ? 1 : 0;
    }
  } catch (error) { console.error(error.message); process.exitCode = 2; }
}
