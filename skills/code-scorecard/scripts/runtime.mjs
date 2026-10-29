import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { defaultInstallation, installation, installationId } from './package-selection.mjs';

export const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(temporary, file);
}
export function run(command, args, cwd, environment = {}, timeoutMs = 600_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: { ...process.env, ...environment }, windowsHide: true, detached: process.platform !== 'win32' });
    child.stdout.pipe(process.stderr, { end: false });
    child.stderr.pipe(process.stderr, { end: false });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      if (process.platform === 'win32') {
        spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', timeout: 10_000 });
        child.kill();
      } else {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
      }
    }, timeoutMs);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      if (timedOut) reject(new Error(`Command timed out after ${timeoutMs / 1000} seconds: ${command}`));
      else if (signal) reject(new Error(`Command interrupted: ${signal}`));
      else resolve(code ?? 2);
    });
  });
}
async function requireSuccess(command, args, cwd, environment) {
  const code = await run(command, args, cwd, environment);
  if (code !== 0) throw new Error(`Tool setup failed with exit ${code}; use the tested package version or an explicit local package override.`);
}
function npmCli() {
  const candidates = [process.env.npm_execpath];
  for (const directory of [path.dirname(process.execPath), ...(process.env.PATH ?? '').split(path.delimiter)]) {
    candidates.push(path.join(directory, 'node_modules/npm/bin/npm-cli.js'));
    const npm = path.join(directory, 'npm');
    if (fs.existsSync(npm)) candidates.push(fs.realpathSync(npm));
  }
  const found = candidates.find(file => file && file.endsWith('.js') && fs.existsSync(file));
  if (!found) throw new Error('Cannot locate npm-cli.js. Run this helper with a standard Node.js/npm installation.');
  return found;
}
export function cacheLocation(cache, kind, record, localPackage) {
  const hash = localPackage && createHash('sha256').update(fs.readFileSync(localPackage)).digest('hex');
  return path.join(cache, kind, record.package.toLowerCase(), record.version, hash ? `local-${hash}` : 'registry');
}
export async function withInstallLock(directory, action, timeoutMs = 600_000) {
  const lock = directory + '.install-lock';
  fs.mkdirSync(path.dirname(directory), { recursive: true });
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try { fs.mkdirSync(lock); break; }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() >= deadline) throw new Error(`Timed out waiting for tool installation lock: ${lock}. If its installer was terminated, remove the abandoned empty lock directory and retry.`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  try { return await action(); }
  finally { fs.rmdirSync(lock); }
}
function installIdentity(record, archive) {
  return { package: record.package, version: record.version,
    archiveSha256: archive ? createHash('sha256').update(fs.readFileSync(archive)).digest('hex') : null };
}
async function cachedInstall(directory, record, archive, setup, verify) {
  if (record.requiresLocalPackage && !archive)
    throw new Error(`${installationId(record)} is local-only until publication is verified. Supply its matching local package archive; public defaults are unchanged.`);
  const identity = installIdentity(record, archive);
  const receipt = path.join(directory, 'installation.json');
  await withInstallLock(directory, async () => {
    if (fs.existsSync(receipt)) {
      if (JSON.stringify(readJson(receipt)) !== JSON.stringify(identity))
        throw new Error(`Cached installation identity mismatch: ${directory}. Use a new --cache directory or repair this entry.`);
    } else {
      fs.mkdirSync(directory, { recursive: true });
      await setup();
    }
    verify(); // Verify installed metadata on reuse as well as first installation.
    writeJson(receipt, identity);
  });
  return { ...identity, cache: directory };
}
async function installNpm(cache, record, archive) {
  const directory = cacheLocation(cache, 'npm', record, archive);
  const packageRoot = path.join(directory, 'node_modules', record.package);
  const files = { 'javascript-typescript': 'cli.js', evidence: 'evidence-cli.js', python: 'python-cli.js' };
  const identity = await cachedInstall(directory, record, archive, async () => {
    writeJson(path.join(directory, 'package.json'), { private: true });
    await requireSuccess(process.execPath, [npmCli(), 'install', '--prefix', directory, '--ignore-scripts', '--no-audit', '--no-fund', '--save-exact',
      archive ?? installationId(record)], directory);
  }, () => {
    const manifestFile = path.join(packageRoot, 'package.json');
    if (!fs.existsSync(manifestFile)) throw new Error(`Installed npm package identity mismatch; expected ${installationId(record)}.`);
    const manifest = readJson(manifestFile);
    if (manifest.name !== record.package || manifest.version !== record.version)
      throw new Error(`Installed npm package identity mismatch; expected ${installationId(record)}.`);
    for (const [role, command] of Object.entries(record.commands)) {
      if (manifest.bin?.[command]?.replace(/^\.\//, '') !== `dist/${files[role]}` || !fs.existsSync(path.join(packageRoot, 'dist', files[role])))
        throw new Error(`Installed npm package has a missing or mismatched ${command} entry point.`);
    }
  });
  return { packageRoot, identity, js: path.join(packageRoot, 'dist/cli.js'), python: path.join(packageRoot, 'dist/python-cli.js'),
    evidence: path.join(packageRoot, 'dist/evidence-cli.js'), expectedNameOption: record.expectedNameOption };
}
function capture(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', windowsHide: true, timeout: 60_000 });
  if (result.error || result.status !== 0) throw new Error(`Cannot verify installed tool: ${result.error?.message ?? result.stderr}`);
  return result.stdout.trim();
}
async function installDotnet(cache, record, archive) {
  const directory = cacheLocation(cache, 'dotnet', record, archive);
  const commandName = record.commands.dotnet;
  const command = path.join(directory, commandName + (process.platform === 'win32' ? '.exe' : ''));
  const identity = await cachedInstall(directory, record, archive, async () => {
    const args = ['tool', 'install', record.package, '--version', record.version, '--tool-path', directory];
    if (archive) {
      const source = path.join(directory, 'source'); fs.mkdirSync(source, { recursive: true });
      fs.copyFileSync(archive, path.join(source, `${record.package}.${record.version}.nupkg`));
      const config = path.join(directory, 'NuGet.config');
      fs.writeFileSync(config, '<configuration><packageSources><clear/><add key="local" value="source"/></packageSources></configuration>');
      args.push('--configfile', config, '--no-cache');
    }
    await requireSuccess('dotnet', args, directory, { NUGET_PACKAGES: path.join(directory, 'packages'), NUGET_HTTP_CACHE_PATH: path.join(directory, 'http-cache') });
  }, () => {
    if (!fs.existsSync(command)) throw new Error(`Installed .NET command missing: ${commandName}.`);
    const rows = capture('dotnet', ['tool', 'list', '--tool-path', directory], directory).split(/\r?\n/).map(row => row.trim().split(/\s+/));
    if (!rows.some(([name, version, ...commands]) => name.toLowerCase() === record.package.toLowerCase() && version === record.version && commands.join('').split(',').includes(commandName)))
      throw new Error(`Installed .NET package identity mismatch; expected ${installationId(record)}.`);
    if (capture(command, ['--version'], directory).split('+')[0] !== record.version)
      throw new Error(`Installed .NET executable version mismatch; expected ${record.version}.`);
  });
  return { command, identity };
}
export async function installTools(options, compatibility, dotnetSelection, npmSelection) {
  const cache = path.resolve(options.cache ?? path.join(os.homedir(), '.cache', 'code-scorecard'));
  const record = npmSelection ?? defaultInstallation(options, compatibility, 'npm');
  const archive = options['npm-package'] && path.resolve(options['npm-package']);
  const result = await installNpm(cache, record, archive);
  // A pinned older analyzer does not imply using its older canonical reader.
  const reader = record.expectedNameOption ? record : defaultInstallation({}, compatibility, 'npm');
  const readerArchive = options['evidence-package'] ? path.resolve(options['evidence-package']) : installationId(record) === installationId(reader) ? archive : undefined;
  const evidenceTool = installationId(record) === installationId(reader) && readerArchive === archive ? result : await installNpm(cache, reader, readerArchive);
  result.evidence = evidenceTool.evidence;
  result.evidenceIdentity = evidenceTool.identity;
  result.expectedNameOption = evidenceTool.expectedNameOption;
  if (dotnetSelection) {
    const selected = typeof dotnetSelection === 'string' ? installation(compatibility, 'dotnet', `CodeMetrics.AI@${dotnetSelection}`) : dotnetSelection;
    const tool = await installDotnet(cache, selected, options['dotnet-package'] && path.resolve(options['dotnet-package']));
    result.dotnet = tool.command; result.dotnetIdentity = tool.identity;
  }
  return result;
}
