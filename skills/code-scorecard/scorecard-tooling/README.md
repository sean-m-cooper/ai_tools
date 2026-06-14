# Scorecard Tooling

MSBuild integration for the `code-metrics` global tool. Copy `Directory.Build.targets` to your solution or project root to enable the `Scorecard` target.

## Prerequisites

Install the global tool:

```bash
dotnet tool install -g CodeMetrics.AI
```

## Usage

```bash
dotnet build /t:Scorecard
```

Override the entry point or build configuration:

```bash
dotnet build .\src\Worker\Worker.csproj /t:Scorecard /p:ScorecardEntryPointPath=".\src\Worker\Worker.csproj"
dotnet build /t:Scorecard /p:ScorecardConfiguration=Release
```

## Output

The target produces two files under `.scorecard/dotnet/`:

- `metrics.csv` — VS-compatible raw code metrics
- `evidence.json` — scored scorecard evidence (schema v2)
