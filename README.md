# AI Fitness

A short, behavioral assessment for the AI Personal Training practice.

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

The implementation is strict TypeScript under `src/`. `bun run build` validates
the YAML and produces the deployable static app in `dist/`. There is no Node,
npm, application framework, or server dependency.

While `bun run dev` is running, saving any of these YAML documents validates and
rebuilds the app automatically. Reload the browser to see the new content.
