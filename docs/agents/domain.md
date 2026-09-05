# Domain Docs

PromptTracker uses a single-context domain-documentation layout.

## Before exploring

- Read the root `CONTEXT.md` and use its canonical domain vocabulary.
- Read relevant decisions under `docs/adr/` before changing the affected area.
- If either location is absent, proceed silently; domain-modeling workflows create documentation lazily when decisions are resolved.

## Layout

- `CONTEXT.md` contains the domain glossary and no implementation details.
- `docs/adr/` contains repository-wide architectural decisions.

## Rules

- Use glossary terms in issues, specifications, designs, and tests; avoid synonyms explicitly rejected by the glossary.
- If required terminology is missing, note it for domain modeling instead of inventing competing language silently.
- Explicitly identify any proposed work that contradicts an existing ADR.
