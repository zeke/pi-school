# pi-school

A free, self-paced course for learning [Pi](https://pi.dev), the minimal
agent harness. Modeled on
[opencode.school](https://github.com/opencodeschool/opencode.school).

See [README.md](README.md) for a human-facing overview and
[plan.md](plan.md) for the full lesson-by-lesson mapping, research
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

## Design and functionality: a faithful clone of opencode.school

pi-school is intentionally a close functional and visual clone of
[opencode.school](https://github.com/opencodeschool/opencode.school) (same
owner, continuity is a goal, not an accident). Ported near-verbatim, with
branding swapped OpenCode→Pi:

- Inter (body) + JetBrains Mono (headings/code) via `@fontsource`
- Tailwind's `stone` palette for dark mode (not `gray`)
- Sidebar layout: lesson list, exercises section (hidden until exercises
  exist), secondary page links, disenroll link (hidden until enrolled)
- **Full per-student color theme picker** — 18 colors,
  `window.__schoolThemePalettes` + `window.__applySchoolTheme`, CSS custom
  properties set at runtime, persisted to `localStorage`
- **Full enrollment flow** — rainbow-gradient CTA button
  (`.rainbow-bg`), color picker with staggered swatch animation, student ID
  card with a cipher-reveal animation and particle celebration effect on
  first enroll (fast/no-celebration replay on subsequent page loads)
- **`window.school` client-side progress API** — `enroll()`,
  `fetchProgress()`, `markComplete()`, `markExerciseComplete()`,
  `updateAllCheckmarks()`, theme getters/setters, device ID, visited-lessons
  tracking. 1-second polling so agent-driven completions (via the API) show
  up in the browser without a page reload. `?sid=` query param handling for
  syncing a student ID from Pi back into the browser.
- **Full progress/profile API**: `POST /api/enroll`, `GET/PUT/DELETE
  /api/progress/:studentId` (including reset-all and incomplete/undo),
  `GET/PUT /api/profile/:studentId` (structured interview data: coding
  experience, AI tools used, editor, terminal comfort, learning style,
  depth preference, languages, OS)
- `/disenroll` — reset progress or fully disenroll, matching source exactly
- `/llms.txt` — agent discovery document, adapted for Pi's actual API
  surface and support channels

Deliberately **not** ported:

- **Cloudflare AI Search widget** and **Umami analytics** — explicitly out of
  scope for pi-school (decided early in planning)
- **Intro video** — opencode.school's homepage has a rainbow-bordered intro
  video above the enrollment widget, hosted on R2. We have no equivalent
  asset (would need to actually record one) — omitted rather than faked
- **Exercises content** — the `exercises` content collection exists (schema
  only, matching source) so the API/lib layer works end to end, but no
  exercise MDX files exist yet. Sidebar/homepage exercise sections are
  conditionally hidden (`exercises.length > 0`) until real content lands.

### Known inherited quirk

The homepage's enrollment script calls `window.school.markComplete("enrollment")`
after a student picks their color. This 400s silently (harmless —
`markComplete` just returns `null` on a failed request) because
"enrollment" isn't a real lesson slug in either project's content
collection. Confirmed this exists in the current opencode.school source
too, not something introduced here — left as-is for fidelity rather than
"fixed" unilaterally.

`src/pages/{about,tips,cheatsheet,glossary,troubleshooting,contributing}.astro`
are still placeholder stubs ("Coming soon.") — `disenroll.astro` is fully
built. Replace the rest with real content per plan.md's pages pass.

### CSS/tooling gotchas hit while porting

- Biome's CSS linter doesn't know Tailwind v4's `theme()` function — same
  fix opencode.school uses: `correctness.noUnknownFunction: "off"` in
  `biome.json`.
- Biome's `complexity.noImportantStyles` rule (and running `biome check
  --write --unsafe`) will silently strip `!important` from `main.css`,
  which breaks real cascade-layer overrides (Tailwind Typography's
  `@layer utilities` beats non-important `@layer base` rules regardless of
  specificity). Set `complexity.noImportantStyles: "off"` and never run
  `--unsafe` on this file.
- `cloudflare:workers`' `env` binding: don't rely on `wrangler types`
  (generates `worker-configuration.d.ts` with a conflicting `Env`
  declaration). Instead declare `declare namespace Cloudflare { interface
  Env { PROGRESS: KVNamespace } }` in `src/env.d.ts`, matching
  `@cloudflare/workers-types`' own module augmentation pattern for
  `cloudflare:workers`. Requires `/// <reference types="@cloudflare/workers-types" />`
  for the global `KVNamespace` type to resolve. `script/build` and
  `script/lint` no longer run `wrangler types` as a result.

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

All lessons and exercises also get a formatting note appended at serve
time, from `src/lib/formatting-instructions.ts`: tell the model to use
inline single-backtick code for one-off commands/URLs, not triple-backtick
fenced blocks. Pi's TUI always prints the literal ``` fence lines
(confirmed against upstream issues like earendil-works/pi#6682, closed
`not_planned`), and fenced blocks with no specific language (e.g.
` ```text `) get no syntax highlighting — so a single command in a fenced
block reads as unrendered markdown. Don't duplicate this note in MDX
frontmatter.

The `<AgentPrompt>` component (`src/components/AgentPrompt.astro`) renders
a copy-paste prompt linking back to the lesson. Every lesson should include
at least one, except Installation — a student can't paste a prompt into
Pi before Pi is installed, so that lesson has none.

## Progress API

- `POST /api/enroll` — create a student, optional `{ deviceId }` body,
  returns `{ studentId, progress }`
- `GET /api/progress/:studentId` — fetch progress, 404 if unknown
- `PUT /api/progress/:studentId` — body `{ lessonSlug }` or
  `{ exerciseSlug }`, plus optional `source` (`"browser"` | `"agent"`) and
  `model`. Additive and idempotent. Rejects agent-only lessons from
  `source: "browser"`.
- `DELETE /api/progress/:studentId` — body `{ lessonSlug }` or
  `{ exerciseSlug }` to mark incomplete, or `{ reset: true }` to clear all
  progress (keeps profile/createdAt/deviceId)
- `GET /api/profile/:studentId`, `PUT /api/profile/:studentId` — structured
  interview data (`codingExperience`, `aiTools`, `editor`,
  `terminalComfort`, `learningStyle`, `depthPreference`, `languages`, `os`),
  each field validated against a fixed enum/array where applicable
- `GET /api/lessons`, `GET /api/lessons/:slug` — lesson content +
  agentInstructions as JSON, quiz boilerplate injected server-side
- `GET /api/exercises`, `GET /api/exercises/:slug` — exercise content +
  agentInstructions as JSON (no exercise MDX files exist yet, so these
  currently return an empty list / 404s)
- `GET /api/openapi.json` — OpenAPI 3.1 spec for the full API surface,
  linked from `/llms.txt`. `src/pages/api/openapi.json.test.ts` validates it
  with `@apidevtools/swagger-parser` (structural OpenAPI 3.1 conformance +
  `$ref` resolution) and cross-checks it against the actual route files
  (documented paths/methods must match what's exported from
  `src/pages/api/**`, and `StudentProfile` enum options must match the
  `profile/[studentId].ts` validation lists) so the spec can't silently
  drift from the implementation. `package.json` pins a `fast-uri` override
  since swagger-parser's `ajv` dependency pulled in a version with a known
  advisory (GHSA-v2hh-gcrm-f6hx).
- `GET /llms.txt` — plain-text agent discovery document, points agents at
  `/api/openapi.json` for endpoint details rather than describing them
  inline

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
