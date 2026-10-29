import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compatibility } from '../run-scorecard.mjs';
import { selectInstallation, defaultInstallation, assertEvidenceIdentity } from '../package-selection.mjs';
import { cacheLocation } from '../runtime.mjs';

test('published defaults and legacy metadata agree, while new-brand packages remain local-only', () => {
  const npm = defaultInstallation({}, compatibility, 'npm'), dotnet = defaultInstallation({}, compatibility, 'dotnet');
  assert.equal(npm.package, 'codemetrics-ai'); assert.equal(dotnet.package, 'CodeMetrics.AI');
  assert.equal(npm.version, compatibility.evidenceToolVersion);
  for (const ecosystem of Object.keys(compatibility.analyzers)) {
    const record = ecosystem === 'dotnet' ? dotnet : npm;
    assert.equal(record.tools[ecosystem].version, compatibility.analyzers[ecosystem].preferredVersion);
    assert.equal(record.requiresLocalPackage, false);
  }
  assert.ok(Object.values(compatibility.installations).flat().filter(record => record.package.startsWith('CodeTestament') || record.package === 'codetestament').every(record => record.requiresLocalPackage));
});

test('selects exact package records and rejects ambiguous or conflicting repository pins', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'package-selection-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'package.json');
  const write = manifest => fs.writeFileSync(file, JSON.stringify(manifest));
  const select = options => selectInstallation(root, file, 'javascript-typescript', options ?? {}, compatibility);
  write({ name: 'app' });
  assert.equal(select().package, 'codemetrics-ai');
  assert.equal(select().version, '0.6.0-preview.2');
  assert.equal(select({ 'npm-tool': 'codetestament@0.6.0-preview.3' }).toolName, 'CodeTestament.JavaScript');
  write({ dependencies: { 'codemetrics-ai': '0.2.0' } });
  assert.equal(select().record.version, '0.2.0');
  assert.equal(select().source, 'repository-pin');
  assert.throws(() => select({ 'npm-tool': 'codetestament@0.6.0-preview.3' }), /conflicts with repository pin/);
  write({ devDependencies: { codetestament: '0.6.0-preview.3' } });
  assert.equal(select().package, 'codetestament');
  for (const manifest of [
    { dependencies: { 'codemetrics-ai': '0.6.0-preview.2', codetestament: '0.6.0-preview.3' } },
    { dependencies: { 'codemetrics-ai': '0.5.0' }, devDependencies: { 'codemetrics-ai': '0.6.0-preview.2' } }
  ]) { write(manifest); assert.throws(select, /Ambiguous analyzer pins/); }
  for (const version of ['latest', '^0.6.0-preview.3', '0.6.0-preview.2']) {
    write({ devDependencies: { codetestament: version } }); assert.throws(select, /Repository pin/);
  }
  write({ dependencies: { codetestament: '0.6.0-preview.3' } });
  const python = path.join(root, 'pyproject.toml'); fs.writeFileSync(python, '');
  const selected = selectInstallation(root, python, 'python', {}, compatibility);
  assert.equal(selected.version, '0.15.0'); assert.equal(selected.packageVersion, '0.6.0-preview.3');
  assert.throws(() => selectInstallation(root, python, 'python', { 'npm-tool': 'codemetrics-ai@0.5.0' }, compatibility), /conflicts/);
  write({});
  assert.throws(() => selectInstallation(root, python, 'python', { 'npm-tool': 'codemetrics-ai@0.5.0' }, compatibility), /does not contain/);
});

test('honors dotnet manifest roots and nearest npm scopes, with case-insensitive NuGet identities', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'package-roots-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const child = path.join(root, 'child'); fs.mkdirSync(child);
  const project = path.join(child, 'App.csproj'); fs.writeFileSync(project, '');
  fs.mkdirSync(path.join(root, '.config')); fs.mkdirSync(path.join(child, '.config'));
  fs.writeFileSync(path.join(root, '.config/dotnet-tools.json'), JSON.stringify({ tools: { 'codetestament.scorecard': { version: '2.4.0' } } }));
  assert.equal(selectInstallation(root, project, 'dotnet', {}, compatibility).toolName, 'CodeTestament.Scorecard');
  fs.writeFileSync(path.join(child, '.config/dotnet-tools.json'), JSON.stringify({ isRoot: true, tools: {} }));
  assert.equal(selectInstallation(root, project, 'dotnet', {}, compatibility).packageVersion, '2.3.1');
  fs.writeFileSync(path.join(child, '.config/dotnet-tools.json'), JSON.stringify({ tools: {
    'codemetrics.ai': { version: '2.3.1' }, 'CodeTestament.Scorecard': { version: '2.4.0' } } }));
  assert.throws(() => selectInstallation(root, project, 'dotnet', {}, compatibility), /Ambiguous/);
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ devDependencies: { 'codemetrics-ai': '0.6.0-preview.2' } }));
  const npm = path.join(child, 'package.json'); fs.writeFileSync(npm, JSON.stringify({ devDependencies: { codetestament: '0.6.0-preview.3' } }));
  assert.equal(selectInstallation(root, npm, 'javascript-typescript', {}, compatibility).package, 'codetestament');
});

test('cache identity includes package, version and complete local archive content', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-identity-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'package.tgz'); fs.writeFileSync(file, 'one');
  const old = defaultInstallation({}, compatibility, 'npm');
  const next = { ...old, package: 'codetestament' };
  const key = cacheLocation(root, 'npm', old, file);
  assert.notEqual(key, cacheLocation(root, 'npm', next, file));
  assert.notEqual(key, cacheLocation(root, 'npm', old));
  fs.writeFileSync(file, 'two'); assert.notEqual(key, cacheLocation(root, 'npm', old, file));
  const copy = path.join(root, 'renamed.tgz'); fs.copyFileSync(file, copy);
  assert.equal(cacheLocation(root, 'npm', old, file), cacheLocation(root, 'npm', old, copy));
});

test('exact producer identity checks apply with legacy readers and historical imports stay explicit', () => {
  const scope = { ecosystem: 'python', toolName: 'CodeTestament.Python', version: '0.15.0', source: 'explicit-selection' };
  const old = { tool: { name: 'CodeMetrics.AI.Python', version: '0.15.0' } };
  assert.throws(() => assertEvidenceIdentity(old, scope, compatibility, false), /tool.name/);
  assert.doesNotThrow(() => assertEvidenceIdentity(old, scope, compatibility, true));
  assert.throws(() => assertEvidenceIdentity(old, { ...scope, source: 'repository-pin' }, compatibility, true), /tool.name/);
  assert.throws(() => assertEvidenceIdentity({ tool: { name: 'CodeTestament.Python', version: '0.14.0' } }, scope, compatibility, true), /Unsupported historical/);
});
