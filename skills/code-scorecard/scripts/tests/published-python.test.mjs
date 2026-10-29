import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compatibility } from '../run-scorecard.mjs';

// Explicit release verification: downloads the exact published npm pin into a new cache.
// Retain all output for the subsequent generated-report evaluation.
const destination = process.env.SCORECARD_PUBLISHED_PYTHON_OUTPUT;
test('published Python preview installs from an empty cache and preserves scoring boundaries', {
  skip: !destination, timeout: 180_000,
}, () => {
  const output = path.resolve(destination);
  assert.ok(!fs.existsSync(output), 'Use a new output directory; cached installs are not release verification.');
  fs.mkdirSync(output, { recursive: true });
  const root = path.join(output, 'source'), cache = path.join(output, 'cache');
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, 'pyproject.toml'), '[project]\nname="python-preview-smoke"\nversion="0.0.0"\n');
  const source = `import asyncio
import time
def wait():
    time.sleep(1)
async def hazard():
    wait()
    wait()
async def documented():
    # Synchronous operation required by the device protocol
    time.sleep(1)
async def offloaded():
    await asyncio.to_thread(wait)
async def unresolved(client):
    await client.fetch()
def optional_feature():
    try:
        import optional_feature_package
    except ImportError:
        # Optional feature is unavailable; normal operation continues without it.
        pass
` + Array.from({ length: 21 }, (_, i) => `async def scheduled_${i}():\n    await asyncio.sleep(0)\n`).join('');
  fs.writeFileSync(path.join(root, 'work.py'), source);
  const runner = fileURLToPath(new URL('../run-scorecard.mjs', import.meta.url));
  const child = spawnSync(process.execPath, [runner, '--repo', root, '--ecosystem', 'python', '--cache', cache], {
    encoding: 'utf8', windowsHide: true, timeout: 170_000,
  });
  fs.writeFileSync(path.join(output, 'helper.stdout.json'), child.stdout ?? '');
  fs.writeFileSync(path.join(output, 'helper.stderr.log'), child.stderr ?? '');
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr);
  const result = JSON.parse(child.stdout).results[0];
  assert.equal(result.source, 'compatibility-manifest');
  assert.equal(result.fresh, true); assert.equal(result.status, 'complete');
  assert.equal(result.version, compatibility.analyzers.python.preferredVersion);
  const inspection = JSON.parse(fs.readFileSync(result.artifacts.inspection, 'utf8'));
  assert.equal(inspection.usable, true);
  const evidence = inspection.evidence, dimensions = evidence.dimensions;
  assert.equal(evidence.analysis.runId, result.runId);
  assert.equal(evidence.analysis.auditId, result.auditId);
  assert.equal(dimensions.codeQuality.score, 10);
  assert.equal(dimensions.performanceAsync.score, 8);
  const summary = dimensions.performanceAsync.asyncScoring.summary;
  assert.equal(summary.eligibleOwners, 25); assert.equal(summary.affectedOwners, 1);
  assert.equal(summary.ownersWithUnresolvedPaths, 1);
  assert.equal(dimensions.errorHandling.status, 'skipped');
  assert.equal(dimensions.errorHandling.score, undefined);
  assert.equal(Object.values(dimensions).filter(item => item.status === 'scored').length, 2);
  const install = result.tooling.analyzer.cache;
  const manifest = JSON.parse(fs.readFileSync(path.join(install, 'node_modules/codemetrics-ai/package.json'), 'utf8'));
  assert.equal(manifest.version, compatibility.evidenceToolVersion);
  const lock = JSON.parse(fs.readFileSync(path.join(install, 'package-lock.json'), 'utf8'));
  const published = lock.packages['node_modules/codemetrics-ai'];
  assert.match(published.resolved, /^https:\/\/registry\.npmjs\.org\/codemetrics-ai\/-\//);
  assert.match(published.integrity, /^sha512-/);
  fs.writeFileSync(path.join(output, 'report-input.json'), JSON.stringify({
    request: 'Show the full Python scorecard. Explain the async score, repeated helper calls, documented choice, offloaded callback, and unresolved receiver. Should the documented optional-feature handler lower Error Handling? How should I compare this with a Python adapter 0.14.0 report?',
    runnerResult: result, inspection, currentSource: { 'work.py': source },
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'package-provenance.json'), JSON.stringify({
    npmVersion: manifest.version, pythonAdapterVersion: result.version,
    resolved: published.resolved, integrity: published.integrity,
    runId: result.runId, auditId: result.auditId,
  }, null, 2) + '\n');
});
