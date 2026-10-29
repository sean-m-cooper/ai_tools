import fs from 'node:fs';
import path from 'node:path';

export const installationId = record => `${record.package}@${record.version}`;
export function installation(compatibility, kind, id) {
  const record = compatibility.installations[kind].find(item => kind === 'dotnet'
    ? installationId(item).toLowerCase() === id.toLowerCase() : installationId(item) === id);
  if (!record) throw new Error(`Package selection ${id} is not in tested ${kind} installations. Exact package names and versions are required; preserve the repository pin.`);
  return record;
}
export function defaultInstallation(options, compatibility, kind) {
  return installation(compatibility, kind, options[`${kind}-tool`] ?? compatibility.defaults[kind]);
}

/** Nearest manifest wins; conflicting names/versions in that manifest never do. */
export function selectInstallation(root, entryPoint, ecosystem, options, compatibility) {
  const kind = ecosystem === 'dotnet' ? 'dotnet' : 'npm';
  const packages = new Set(compatibility.installations[kind].map(item => item.package.toLowerCase()));
  let directory = fs.statSync(entryPoint).isDirectory() ? entryPoint : path.dirname(entryPoint);
  let pin;
  while (true) {
    const file = path.join(directory, kind === 'dotnet' ? '.config/dotnet-tools.json' : 'package.json');
    let stop = false;
    if (fs.existsSync(file)) {
      const config = JSON.parse(fs.readFileSync(file, 'utf8'));
      const entries = kind === 'dotnet' ? Object.entries(config.tools ?? {}).map(([name, tool]) => [name, tool.version])
        : [...Object.entries(config.dependencies ?? {}), ...Object.entries(config.devDependencies ?? {})];
      const pins = [...new Set(entries.filter(([name]) => packages.has(name.toLowerCase()))
        .map(([name, version]) => `${name}@${version}`))];
      if (pins.length > 1) throw new Error(`Ambiguous analyzer pins in ${file}: ${pins.join(', ')}. Keep one exact package pin for this scope.`);
      if (pins.length) {
        try { pin = installation(compatibility, kind, pins[0]); }
        catch (error) { throw new Error(`Repository pin: ${error.message}`); }
      }
      stop = kind === 'dotnet' && config.isRoot;
    }
    if (pin || stop || directory === root) break;
    const parent = path.dirname(directory), relative = path.relative(root, parent);
    if (parent === directory || path.isAbsolute(relative) || relative === '..' || relative.startsWith('..' + path.sep)) break;
    directory = parent;
  }
  const explicit = options[`${kind}-tool`] && defaultInstallation(options, compatibility, kind);
  if (pin && explicit && installationId(pin) !== installationId(explicit))
    throw new Error(`Explicit ${kind} selection conflicts with repository pin ${installationId(pin)}. Preserve the pin or update it intentionally.`);
  const record = pin ?? explicit ?? defaultInstallation({}, compatibility, kind);
  const tool = record.tools[ecosystem];
  if (!tool) throw new Error(`${installationId(record)} does not contain the tested ${ecosystem} analyzer. Select a supported preview package explicitly.`);
  return { record, version: tool.version, toolName: tool.name, package: record.package, packageVersion: record.version,
    command: record.commands[ecosystem], source: pin ? 'repository-pin' : explicit ? 'explicit-selection' : 'compatibility-manifest' };
}

export function assertEvidenceIdentity(evidence, scope, compatibility, existing) {
  if (!existing || scope.source === 'repository-pin') {
    if (evidence.tool.name !== scope.toolName) throw new Error('Provenance mismatch: tool.name');
    if (evidence.tool.version !== scope.version) throw new Error('Provenance mismatch: tool.version');
    return;
  }
  // Canonical validation owns historical schema/profile support. Do not relabel
  // legacy artifacts. New-brand identities must match an explicit tested record.
  const legacyNames = { dotnet: 'CodeMetrics.AI', 'javascript-typescript': 'codemetrics-ai', python: 'CodeMetrics.AI.Python' };
  if (evidence.tool.name === legacyNames[scope.ecosystem]) return;
  const known = Object.values(compatibility.installations).flat().some(record => {
    const tool = record.tools[scope.ecosystem];
    return tool?.name === evidence.tool.name && tool.version === evidence.tool.version;
  });
  if (!known) throw new Error('Unsupported historical tool identity/version. Select a tested reader; never rename saved evidence.');
}
