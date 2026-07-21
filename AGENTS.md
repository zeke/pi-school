# pi-school

A free, self-paced course for learning [Pi](https://pi.dev), the minimal
agent harness. Modeled on
[opencode.school](https://github.com/opencodeschool/opencode.school).

See [plan.md](plan.md) for the full lesson-by-lesson mapping, research
findings, and decisions made during planning. This file covers the
technical reference for the actual codebase.

## Stack

- [Astro 7](https://astro.build) with `@astrojs/cloudflare` adapter,
  `output: "server"`
- MDX content collections: `lessons`, `pages` (both defined in
  `src/content.config.ts`)
- Tailwind CSS v4 via `@tailwindcss/vite`
- Cloudflare KV for student progress (binding `PROGRESS`)
- Biome for lint/format, Vitest for unit tests
- JSONC `wrangler.jsonc`

## Cloudflare account

Deploys to the personal account (`Sikelianos@gmail.com's Account`, id
`d37edcc2a3a79f5a6df92ad287430b02`) — the same account that hosts other
`ziki.workers.dev` projects. Production KV namespace `pi-school-progress`
(id `1b59814976b94c2087d2cf0c272de99c`) already exists; its id is in
`wrangler.jsonc`.

## Scripts

| Script | What it does |
|---|---|
| `script/dev` | `astro dev` |
| `script/build` | `wrangler types` + `astro build` |
| `script/lint` | `biome check .` + `astro check` |
| `script/test` | `vitest run` |
| `script/deploy` | `script/build` + `wrangler deploy --env production` — do not run manually; CI does this on push to `main` |

Always run `script/lint` and `script/test` before committing.

## Known dependency notes

- `~/.npmrc` has `min-release-age=7`, which blocks packages published in the
  last 7 days. This is why `package.json` uses broad semver ranges rather
  than exact pinned versions — let npm resolve within the allowed window
  rather than hardcoding a version that might be too new to install.
- Astro is currently pinned to the 7.0.x line due to a moderate XSS
  advisory (GHSA-4g3v-8h47-v7g6) affecting ≤7.0.9, fixed in 7.1.0. We don't
  use Astro's View Transitions feature anywhere, so exposure is
  effectively zero, but bump to 7.1.0+ once it clears the 7-day age
  window and before treating this as a finished v1.
- `@astrojs/cloudflare` 14.x removed `Astro.locals.runtime.env` — bindings
  are accessed via `import { env } from "cloudflare:workers"` instead. See
  any file in `src/pages/api/`.
- `wrangler kv` key/bulk subcommands default to **local** miniflare
  storage now. Always pass `--remote` for anything that should touch real
  Cloudflare KV — this bit us once while testing the preview-deploy script
  and would silently no-op in CI otherwise.
- `compatibility_date` in `wrangler.jsonc` is capped by whatever workerd
  binary version is installed (currently `2026-07-15`); a newer date than
  the installed binary supports fails to start rather than warning.
- `assets.directory` in `wrangler.jsonc` must point at `./dist/client`,
  not `./dist` — Astro's Cloudflare adapter puts the server bundle in
  `dist/server/` and static assets in `dist/client/`.
- `@astrojs/cloudflare` generates `dist/server/wrangler.json` at build
  time — a fully resolved deploy config with `main` and `assets.directory`
  baked in. This is the actual file `wrangler deploy` needs when deploying
  from a directory other than the project root (e.g. previews); a
  hand-rolled config without a resolved `main` will build and "deploy"
  successfully but silently serve 404s for every request, since Cloudflare's
  assets binding intercepts requests before they'd reach a Worker script
  that was never wired up. Point `astro.config.mjs`'s `cloudflare({
  configPath })` at whatever wrangler config you want resolved (see
  `WRANGLER_CONFIG_PATH` support in `astro.config.mjs`), then deploy
  `dist/server/wrangler.json` directly.
- `@astrojs/cloudflare` auto-provisions a `<worker-name>-session` KV
  namespace on first deploy (Astro's built-in session feature, which we
  don't use) even though it's not declared anywhere in our config. Preview
  teardown deletes it explicitly by name since Wrangler won't clean it up
  on its own.
- **Always merge preview/fix work into `main` before closing the PR that
  introduced it.** `destroy-preview` in `preview.yml` checks out
  `default_branch`, not the PR branch — if a fix only exists on the PR
  branch, teardown runs the stale version from `main` and can leak
  resources. Learned this the hard way while building the preview
  workflow itself: closed a smoke-test PR before merging its fix commits,
  and teardown missed the `-session` namespace cleanup that only existed
  on the unmerged branch.

## Content authoring

Each lesson is an MDX file in `src/content/lessons/`. Schema (in
`src/content.config.ts`): `title`, `slug`, `description`, `order`, `quiz`,
`agentOnly` (default false), `agentInstructions`.

For lessons with `quiz: true`, `agentInstructions` should list four topics
and a verification step only — the shared quiz boilerplate in
`src/lib/quiz-instructions.ts` gets appended at serve time by the lessons
API. Don't duplicate it in the MDX.

Every API call an agent needs to make (checking progress, marking a lesson
complete) should be described as `curl` via the `bash` tool in
`agentInstructions` — Pi has no built-in `webfetch` tool.

The `<AgentPrompt>` component (`src/components/AgentPrompt.astro`) renders
a copy-paste prompt linking back to the lesson. Every lesson should include
at least one.

## Progress API

- `POST /api/enroll` — create a student, return `{ studentId, progress }`
- `GET /api/progress/:studentId` — fetch progress, 404 if unknown
- `PUT /api/progress/:studentId` — body `{ lessonSlug }`, additive and
  idempotent
- `GET /api/lessons`, `GET /api/lessons/:slug` — lesson content +
  agentInstructions as JSON, quiz boilerplate injected server-side

Not yet built: `/api/profile/:studentId` (referenced by the Interview
lesson's `agentInstructions` for storing interview answers — needs a KV
schema and route before that lesson actually works end to end),
`/llms.txt`, `/api/openapi.json`.

## Custom domain

`wrangler deploy` does not attach the custom domain automatically even
though `wrangler.jsonc` declares it under `env.production.routes` — it
needs an explicit non-interactive confirmation that gets skipped in CI.
The custom domain was attached once, manually, via the Workers domains API:

```bash
curl -X PUT "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/domains" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "production",
    "hostname": "pi-school.ziki.boo",
    "service": "pi-school",
    "zone_id": "c7d532041443d0c4a26680cfa1657e36"
  }'
```

This only needs to happen once per Worker; it persists across future
deploys. Live at both `https://pi-school.ziki.boo` and
`https://pi-school.ziki.workers.dev`.

**Note:** Cloudflare's bot protection returns `error code: 1042` for
requests with no/generic User-Agent (e.g. bare `curl`) on the
`workers.dev` subdomain. Not a bug — pass a browser-like `-A` header when
smoke-testing with curl.

## Preview deployments

`.github/workflows/preview.yml` deploys a per-PR Worker
(`pi-school-pr-<number>`) with its own KV namespace, seeded from a snapshot
of the production `PROGRESS` namespace on every deploy (via
`script/preview-env.mjs`). Torn down on PR close. Requires
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` repo secrets (Workers
Scripts Edit + Workers KV Storage Edit permissions).

## CI/CD

- `.github/workflows/ci.yml` — lint + test on every PR and non-main push
- `.github/workflows/deploy.yml` — build + deploy to production on push to
  `main`
- `.github/workflows/preview.yml` — per-PR preview deploy/teardown

## Self-updating this file

Revise this AGENTS.md whenever the stack, scripts, schema, or API surface
change. Keep `plan.md` as the historical planning record — don't merge new
technical details into it once the codebase exists; put those here instead.
