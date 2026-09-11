# AI Fitness

A short, behavioral assessment for the AI Personal Training practice. It uses
Bun, TypeScript, and Preact and deploys as static files through Cloudflare
Workers Static Assets.

The app measures eight general capacities, interprets them relative to the
person's chosen AI sports, and produces a copyable profile for use in a
personal training session.

## Run locally

```sh
bun run dev
```

The assessment itself is edited as four readable documents:

- `content/ontology.yaml` — capacities, compounds, contexts, sports, and targets
- `content/questions.yaml` — every question, answer, and evidence contribution
- `content/profiles.yaml` — persona and general-profile language
- `content/interface.yaml` — client-interface language

The implementation is strict TypeScript under `src/`. Pure assessment logic is
independent of Preact and browser APIs; persistence and rendering remain at the
edges. `bun run build` validates the YAML and produces the deployable static app
in `dist/`. There is no Node, npm, server framework, or server dependency.

While `bun run dev` is running, saving any of these YAML documents validates and
rebuilds the app automatically. Reload the browser to see the new content.

## Deploy

Cloudflare builds with `bun run build`. The static asset configuration lives in
`wrangler.jsonc` with `run_worker_first: false`.

## Offline contract

The first online visit downloads the complete application. Later launches read
the installed application from cache immediately and work in airplane mode.
When online, service-worker registration quietly checks for a newer build. A
new version becomes active only after its complete shell has downloaded and
existing application windows have closed.

Assessment progress stays in browser storage. Stored-state format changes must
migrate existing data without erasing it.

## Theme

`styles.css` uses the Miami Beach palette: ink, muted, sand, surface, line,
seafoam, turquoise, ocean, coral, and sun. Extend those semantic tokens instead
of introducing unrelated colors.
