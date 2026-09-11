# AGENTS.md

## Never use Node

Never use Node.js, npm, or npx in this project, including indirectly through
scaffolding, scripts, development servers, build systems, tests, or deployment
configuration. Use Bun for TypeScript execution and local development.

## Architecture

Keep the app offline-first, static, and browser-local. Human-authored assessment
content belongs in `content/*.yaml`. Typed content validation belongs in
`src/content/`, pure scoring and interpretation in `src/domain/`, interface
rendering in `src/ui/`, and browser startup in `src/main.ts`.

`src/ui/Lab.ts` is an intentionally isolated, localhost-only development view
over the same content. It may be removed without changing the domain model or
client interface.

Prefer explicit data flow, small pure functions, few concepts, and no machinery
that does not make the program easier for a human reader to understand.
