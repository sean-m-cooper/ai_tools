# Optional MSBuild entry point

The normal workflow is `node <skill>/scripts/run-scorecard.mjs`; see [bootstrap.md](../bootstrap.md). No build customization is required.

For a repository that explicitly wants an MSBuild `Scorecard` target, import this directory's `Directory.Build.targets` from an existing project/targets file. Merge the import; do not replace the repository's existing `Directory.Build.targets`. Set `ScorecardRunnerPath` to the absolute path of `scripts/run-scorecard.mjs` and `ScorecardRepoRoot` to the audited repository root. `ScorecardEntryPointPath` defaults to the current project, and `ScorecardConfiguration` defaults to the current configuration or Release.

Invoke `dotnet msbuild <project> /t:Scorecard` after restoring it. The target delegates to the same pinned, validated runner. Outputs are the run-specific paths and `latest.json` described in bootstrap.md. It does not invoke or update a global tool. Keep the skill available at the configured runner path, or update the property when moving it.
