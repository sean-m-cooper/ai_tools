# Context Dependency Model

This reference distills the model developed in [*Context Is a Dependency*](https://yourdevteamcoach.com/long-form/the-architecture-of-nonfiction/context-is-a-dependency), a companion to [*The Architecture of Nonfiction*](https://yourdevteamcoach.com/long-form/the-architecture-of-nonfiction).

## Core Distinction

Context is information an artifact requires its consumer to possess. Background may be accurate, interesting, and useful without being required.

The correct amount of context is the smallest sufficient set for the intended consumer and outcome:

- **Required context** must appear before the component that depends on it or be declared as a reasonable prerequisite.
- **Helpful context** may sit behind a link, footnote, appendix, example, or separate artifact.
- **Unused context** does not support a later component and should not burden the primary path.

## Prerequisite States

| State | Meaning | Audit question |
|---|---|---|
| Supplied | The primary path provides the prerequisite before use | Where was it established? |
| Declared | The artifact or supplied consumer contract identifies it as knowledge or access the consumer must bring | Is that expectation reasonable for this consumer? |
| Absent | The artifact depends on it but neither supplies nor declares it | What question must the consumer answer before continuing? |

Declaring familiarity with a framework does not explain the framework. It tells consumers whether the artifact is meant for them and which dependencies they must bring.

## Dependency Shapes

| Type | Consumer question | Typical failure |
|---|---|---|
| Referential | What does this word or phrase refer to? | The antecedent exists only in the author's working context |
| Terminological | What does this term, acronym, role, or label mean here? | Personal familiarity is mistaken for shared knowledge |
| Argumentative | Which premise or evidence makes this conclusion follow? | A logical or causal relationship is skipped |
| Situational | Under what conditions does this decision or advice apply? | A bounded judgment reads like a universal rule |
| Audience | What knowledge may this artifact reasonably assume? | The intended consumer and prerequisites are unstated |
| Procedural | What state, permission, input, or prior action must exist? | A procedure begins after an unstated setup step |
| Authoritative | Which rule, source, or instruction controls when inputs disagree? | Multiple sources exist without precedence or ownership |

Report only dependency types that create a real consumer consequence. Do not manufacture one finding per row.

## Recovery Work

Clark and Haviland's Given-New Contract describes ways a listener may recover when an intended antecedent is missing:

- **Bridging:** Infer an unstated relationship.
- **Addition:** Invent or assume context that would make the statement work.
- **Restructuring:** Reinterpret what the statement treats as established and new.

These mechanisms explain why a consumer may continue even when an artifact is incomplete. Successful recovery does not prove that the dependency was supplied. It may instead conceal a plausible but incorrect interpretation.

## Primary-Path Rule

A link can expose a dependency without satisfying it. The primary path must state the definition, premise, constraint, or instruction required by the next component. Links and citations may then provide verification, history, implementation detail, or another application.

Apply the same rule to phrases such as *as discussed above*, references to meetings, ticket links, source repositories, standards, appendices, and companion documents.

## Independent Entry Points

Treat every independently discoverable artifact as a cold start. A reader may arrive through search or a direct link. An operator may open only the runbook. An engineer may receive only the story. An AI collaborator may receive only the prompt and files selected for its context.

Necessary repetition is not automatically duplication. Repeat enough context to make the entry point usable, then route optional depth elsewhere.

## Artifact-Specific Prerequisites

| Artifact | Common dependencies to inspect |
|---|---|
| Article or essay | Audience assumptions, definitions, prior conclusions, source contribution, scope |
| Architecture decision | Operating constraints, alternatives, quality attributes, decision owner, consequences |
| Proposal | Existing problem, evidence, affected parties, decision requested, evaluation criteria |
| User story or specification | Actor, starting state, behavior, constraints, acceptance conditions, terminology |
| Runbook or procedure | Permissions, environment, target system, initial state, safe stopping conditions |
| Prompt or AI instruction | Authority, scope, inputs, output contract, conflicts, prohibited behavior |

Use these as orientation, not mandatory templates.

## False Positives

- A term is not missing merely because a novice would need a definition. The declared consumer may reasonably know it.
- A link is not a hidden dependency when the primary path already explains the source's contribution.
- Delayed context may create a deliberate rhetorical effect in narrative or persuasive writing.
- Repeated context may be required when two artifacts are independent entry points.
- A long explanation is not automatically a brain dump. Length does not determine whether later components depend on it.
- A factual or evidentiary problem is not necessarily a context problem. A clear argument can still be wrong.

The cold-start audit asks whether the consumer received what the artifact requires, not whether the artifact is perfect.
