# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body-file <file>`.
- **Read an issue**: `gh issue view <number> --comments`, including its labels.
- **List issues**: use `gh issue list` with appropriate state and label filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`.
- **Apply or remove labels**: use `gh issue edit`.
- **Close an issue**: `gh issue close <number> --comment "..."`.

Infer the repository from the Git remote when running inside this clone.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

- The map is one GitHub issue labelled `wayfinder:map`.
- Child tickets are GitHub sub-issues where supported, falling back to a task list and `Part of #<map>` in each child.
- Use native GitHub issue dependencies where supported; otherwise record `Blocked by: #<n>` in the child.
- The frontier contains unassigned open children with no open blockers, in map order.
- Claim work by assigning the issue to the current user.
- Resolve work by recording the answer, closing the child, and adding its context pointer to the map.
