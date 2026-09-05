import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n');
  fs.renameSync(temporary, file);
}
export function run(command, args, cwd, environment = {}) {
  const result = spawnSync(command, args, { cwd, env: { ...process.env, ...environment }, encoding: 'utf8', windowsHide: true, timeout: 600_000, maxBuffer: 16 * 1024 * 1024 });
  if (result.stdout) process.stderr.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`Command interrupted: ${result.signal}`);
  return result.status ?? 2;
}
function requireSuccess(command, args, cwd, environment) {
  const code = run(command, args, cwd, environment);
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
function cacheKey(version, localPackage) {
  return localPackage ? `${version}-${createHash('sha256').update(fs.readFileSync(localPackage)).digest('hex').slice(0, 16)}` : version;
}
export function installTools(options, compatibility, dotnetVersion) {
  const cache = path.resolve(options.cache ?? path.join(os.homedir(), '.cache', 'code-scorecard'));
  const version = compatibility.evidenceToolVersion;
  const npmPackage = options['npm-package'] && path.resolve(options['npm-package']);
  const jsRoot = path.join(cache, 'npm', cacheKey(version, npmPackage));
  const packageRoot = path.join(jsRoot, 'node_modules', 'codemetrics-ai');
  if (!fs.existsSync(path.join(packageRoot, 'dist', 'evidence-reader.js'))) {
    fs.mkdirSync(jsRoot, { recursive: true });
    writeJson(path.join(jsRoot, 'package.json'), { private: true });
    requireSuccess(process.execPath, [npmCli(), 'install', '--prefix', jsRoot, '--ignore-scripts', '--no-audit', '--no-fund', '--save-exact', npmPackage ?? `codemetrics-ai@${version}`], jsRoot);
  }
  if (readJson(path.join(packageRoot, 'package.json')).version !== version) throw new Error('Local npm package does not match the tested evidence-tool version.');
  const result = { js: path.join(packageRoot, 'dist', 'cli.js'), evidence: path.join(packageRoot, 'dist', 'evidence-cli.js'), packageRoot };
  if (dotnetVersion) {
    const localPackage = options['dotnet-package'] && path.resolve(options['dotnet-package']);
    const toolRoot = path.join(cache, 'dotnet', cacheKey(dotnetVersion, localPackage));
    const command = path.join(toolRoot, process.platform === 'win32' ? 'code-metrics.exe' : 'code-metrics');
    if (!fs.existsSync(command)) {
      fs.mkdirSync(toolRoot, { recursive: true });
      const args = ['tool', 'install', 'CodeMetrics.AI', '--version', dotnetVersion, '--tool-path', toolRoot];
      if (localPackage) {
        // An isolated source avoids falling back to a published package with the same version.
        const source = path.join(toolRoot, 'source');
        fs.mkdirSync(source, { recursive: true });
        fs.copyFileSync(localPackage, path.join(source, `CodeMetrics.AI.${dotnetVersion}.nupkg`));
        const config = path.join(toolRoot, 'NuGet.config');
        fs.writeFileSync(config, '<configuration><packageSources><clear/><add key="local" value="source"/></packageSources></configuration>');
        args.push('--configfile', config, '--no-cache');
      }
      requireSuccess('dotnet', args, toolRoot, { NUGET_PACKAGES: path.join(toolRoot, 'packages') });
    }
    result.dotnet = command;
  }
  return result;
}
