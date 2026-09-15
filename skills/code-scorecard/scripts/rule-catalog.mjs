import { readJson, run } from './runtime.mjs';

/** Validate the catalog against the exact package evidence; never infer codes by number or title. */
export function validateRuleCatalog(catalog, evidence) {
  if (catalog.schemaVersion !== 1 || !Number.isInteger(catalog.catalogVersion) || catalog.catalogVersion < 1 ||
      catalog.ecosystem !== 'dotnet' || catalog.tool?.name !== evidence.tool?.name ||
      catalog.tool?.version !== evidence.tool?.version || !Array.isArray(catalog.rules) || !catalog.rules.length)
    throw new Error('Rule catalog does not match the analyzed package or supported catalog schema.');
  const byCode = new Map();
  const identities = new Set();
  for (const rule of catalog.rules) {
    if (!/^CMAI\d{4}$/.test(rule.code) || typeof rule.ruleId !== 'string' ||
        rule.ruleId !== `dotnet/${rule.dimension}/${rule.category}` ||
        !['finding', 'metric'].includes(rule.kind) || !rule.title || !rule.description ||
        typeof rule.annotation?.supported !== 'boolean' || !Array.isArray(rule.annotation.scopes) ||
        (rule.annotation.supported && (!rule.annotation.rationaleRequired || !rule.annotation.example || !rule.annotation.scopes.length)) ||
        byCode.has(rule.code) || identities.has(rule.ruleId))
      throw new Error('Rule catalog contains an invalid or duplicate definition.');
    byCode.set(rule.code, rule);
    identities.add(rule.ruleId);
  }
  for (const dimension of Object.values(evidence.dimensions ?? {})) {
    if (dimension.ruleCatalog && (dimension.ruleCatalog.version !== catalog.catalogVersion ||
        dimension.ruleCatalog.toolVersion !== catalog.tool.version))
      throw new Error('Evidence and rule catalog provenance differ.');
    for (const reference of dimension.ruleCatalog?.rules ?? []) {
      const rule = byCode.get(reference.code);
      if (!rule || rule.ruleId !== reference.ruleId || rule.kind !== reference.kind)
        throw new Error('Evidence references a different rule catalog.');
    }
    for (const finding of dimension.findings ?? []) {
      const code = finding.observations?.diagnosticCode;
      if (code && byCode.get(code)?.ruleId !== finding.ruleId)
        throw new Error('Finding code does not match the packaged rule identity.');
    }
  }
  return catalog;
}

export async function readPackagedRuleCatalog(command, evidence, destination, cwd) {
  const exitCode = await run(command, ['rules', '--format', 'json', '--output', destination], cwd, {}, 60_000);
  if (exitCode !== 0) throw new Error(`Rule catalog command exited ${exitCode}.`);
  return validateRuleCatalog(readJson(destination), evidence);
}
