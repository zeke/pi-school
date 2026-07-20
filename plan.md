# pi-school.ziki.boo — plan

A course site that teaches people how to use [Pi](https://pi.dev), the minimal
agent harness. Modeled on
[opencode.school](https://github.com/opencodeschool/opencode.school)
(Apache-2.0 — forking/adapting is fine, attribution appreciated).

## Audience

Pi has no GUI app — TUI/CLI/print-mode/RPC/SDK only. Target audience shifts
from OpenCode School's "non-technical, GUI-first" framing to "comfortable
enough to open a terminal, new to agentic coding." Still positioned as a tool
for creative work generally, not coding-only — same "it's not just for
coding" spirit as the original, just delivered through a terminal instead of
a GUI.

## Decisions locked in

- Fresh repo, not a fork: `zeke/pi-school`, private for now.
- Deploy to personal Cloudflare account. Worker name `pi-school` →
  `pi-school.ziki.workers.dev`. Custom domain `pi-school.ziki.boo`.
- Keep the quiz format (teach → quiz → verify). Drop the changelog bot. Drop
  the AI Search widget.
- Port all lessons/exercises with adaptations below, not a smaller subset.

## Research findings that shaped the plan

- **Anthropic explicitly prohibits** routing Claude Pro/Max subscription
  credentials through third-party tools. Confirmed on
  `docs.claude.com/en/docs/claude-code/legal-and-compliance`: "Anthropic does
  not permit third-party developers to... route requests through Free, Pro,
  or Max plan credentials on behalf of their users... may [enforce] without
  prior notice." Pi's own docs list Claude Pro/Max as a `/login` option, but
  using it violates Anthropic's terms regardless.
- **OpenAI explicitly sanctions** ChatGPT Plus/Pro (Codex) use in third-party
  harnesses. `developers.openai.com/community/codex-for-oss` names **Pi by
  name** alongside Codex, OpenCode, Cline, and OpenClaw as supported tools.
  This is the one genuinely safe subscription path.
- **GitHub Copilot subscription use in third-party tools is not permitted**
  and is actively enforced. Reddit r/GithubCopilot: "It's not technically
  allowed by their terms of service. They may choose to suspend your
  account." Real reports of GitHub Security emailing users after detecting
  non-official-client Copilot usage (OpenCode specifically named in threads).
- **OpenRouter has real $0 "free" models** (verified via
  `openrouter.ai/api/v1/models`, 23 models tagged `:free` at time of
  research, e.g. `google/gemma-4-31b-it:free`,
  `nvidia/nemotron-3-super-120b-a12b:free`). This is Pi's actual answer to
  OpenCode Zen's free tier — sign up, get an API key, no local compute
  required.
- **Vision support confirmed on both recommended free paths**: OpenAI's
  Codex model supports multimodal image input (confirmed via GitHub issue
  history), and multiple OpenRouter `:free` models support image input
  (`google/gemma-4-31b-it:free`, `nvidia/nemotron-nano-12b-v2-vl:free`,
  `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`).
- **`npx skills` (skills.sh) already supports Pi by name** — confirmed on
  npmjs.com/package/skills: Pi is listed with `.pi/skills/` (project) and
  `~/.pi/agent/skills/` (global) as target directories, alongside OpenCode,
  Claude Code, Codex, etc.
- **`/reload` covers nearly everything** — confirmed in `docs/usage.md`:
  "Reload keybindings, extensions, skills, prompts, themes, and context
  files." Only project-trust decisions require a full restart (per
  `settings.md`). This replaces OpenCode's repeated "quit and reopen the
  app" instruction throughout the course with a single `/reload`.
- **A real community MCP adapter exists**: `pi-mcp-adapter`
  (github.com/nicobailon/pi-mcp-adapter, MIT, 1k+ stars, actively
  maintained, listed on pi.dev/packages at 136K/mo downloads). Built around
  the same "raw MCP definitions burn context" argument Pi's own docs make —
  one lightweight proxy tool instead of loading every tool definition.
  `pi install npm:pi-mcp-adapter`, then `/mcp setup`.
- **A real, useful extension package exists for the Extensions lesson**:
  `pi-web-access` (web search, URL fetch, GitHub clone, PDF extraction,
  YouTube understanding — 130K/mo downloads). Fills a real gap since Pi has
  no built-in web-search/webfetch tool.
- **pi.dev/packages is a real, active ecosystem** (5,300+ packages at time
  of research) — `pi install npm:<package>` / `pi install git:<repo>` is a
  legitimate, well-supported install path, not a hypothetical.

## Final lesson lineup (13 lessons)

| # | Slug | Title | Change from OpenCode |
|---|---|---|---|
| 1 | installation | Installation | No Desktop app. `curl \| sh` / npm / pnpm / bun install, OS-detected tabs, asciinema walkthrough (large font). System-check widget kept. Homebrew path dropped. Ends with a model-setup decision tree: (1) ChatGPT Plus/Pro → `/login` (OpenAI-sanctioned, safe); (2) no subscription → free OpenRouter API key with a `:free` model (verified real). Explicit warning against Claude Pro/Max or GitHub Copilot subscription login via Pi — both prohibited by provider terms, both have documented enforcement. No uninstall section. |
| 2 | interview | Interview | Same 7-question structure, but no structured "question" tool in Pi's TUI — becomes plain conversational text Q&A (agent asks all at once, student replies in sentences). No permission-prompt caveat (replaced with: first-run project-trust prompt, say yes). Every API call in `agentInstructions` uses `bash` + `curl` (Pi has no native `webfetch` tool) — this pattern applies to every lesson that touches the API. New: explicitly tell students they can update any interview answer later just by asking the agent to change it. |
| 3 | configuration | Configuration | `~/.pi/agent/settings.json` (global) + `.pi/settings.json` (project) replace `opencode.json`. No `default_agent`/Plan-mode field (Pi has no modes). No `permission` block (moved to lesson 4). Personal-instructions-URL concept dropped entirely — no `instructions` array equivalent in Pi settings, and not needed since every lesson's `AgentPrompt` already carries the student ID forward. Content becomes: global vs. project settings, `defaultProvider`/`defaultModel`, and leaving `theme` unset (Pi auto-detects terminal background dark/light on first run — no live "auto" mode exists, confirmed no `"dark/light"` value in settings). Keep the backup-before-editing safety instructions. |
| 4 | trust | Trust | Reframed from Permissions. No per-tool allow/ask/deny grid — Pi's only gate is the one-time project-trust prompt. Covers `defaultProjectTrust` (`ask`/`always`/`never`), `/trust`, `--approve`/`-a`/`--no-approve`/`-na`. Explicitly compares Pi's model to Claude Code, OpenAI Codex, and OpenCode's permission systems so students understand the philosophy difference (no per-action prompts once trusted; mentions `permission-gate.ts` extension as the opt-in path for those who want prompts back). Shortened quiz is fine given thinner content. |
| 5 | instructions | Instructions | Near 1:1 — best mapping in the course. `~/.pi/agent/AGENTS.md` (global), `AGENTS.md`/`CLAUDE.md` from parent dirs + cwd (project). No `/init` command in Pi (doesn't exist) — replaced with "ask Pi directly to scan the project and write an AGENTS.md," framed as a teaching moment about Pi's philosophy. Restart/`/reload` note updated. |
| 6 | models | Models | Cost/capability intro kept. No OpenCode Zen equivalent — free path is OpenRouter `:free` models (verified) or Ollama (mentioned, not walked through — avoiding local-model setup per steer). Subscriptions via `/login`: only ChatGPT Codex recommended as safe; Claude/Copilot mentioned with explicit ToS risk. Cloudflare AI Gateway + Workers AI are natively supported providers, same as OpenCode. Context windows/compaction section ports directly, with Pi's actual tunable settings (`compaction.enabled`, `reserveTokens`, `keepRecentTokens`). Model switching: `/model`, Ctrl+L, Shift+Tab (thinking level), Ctrl+P (favorites cycling via `enabledModels`). |
| 7 | prompt-templates | Prompt templates | Reframed from Commands (Pi's actual term). Only one definition method — Markdown files in `~/.pi/agent/prompts/*.md` / `.pi/prompts/*.md` (no JSON-in-config alternative). Richer arguments than OpenCode: `$1`/`$2`/`$@`/`$ARGUMENTS`, defaults (`${1:-default}`), slicing (`${@:N}`). New: `argument-hint` frontmatter for autocomplete. No `agent`/`model` pinning frontmatter (doesn't exist in Pi). Confirmed `/reload` picks up new templates — no restart needed. |
| 8 | skills | Skills | Near 1:1 — Pi implements the same agentskills.io standard. Locations: `~/.pi/agent/skills/` + `~/.agents/skills/` (global), `.pi/skills/` + `.agents/skills/` (project, discovered up to git root). Recommends `.agents/skills/` (agent-agnostic) as the primary convention over `.pi/skills/`. New: explicit `/skill:name` invocation syntax. New: cross-harness skill directories (point at `~/.claude/skills`, `~/.codex/skills` via settings). `npx skills` confirmed to support Pi by name. Same four starter skills (Cloudflare, Replicate, frontend-design, skill-creator). `/reload` picks up new skills. |
| 9 | tools | Tools | Reworked — this lesson was 90% MCP-specific in OpenCode, and Pi has no native MCP by design. Keep: what a tool is, Pi's actual built-in tools (`read`/`write`/`edit`/`bash` + optional `grep`/`find`/`ls`). Explain the MCP gap honestly (context-bloat argument, sourced from Pi's own reasoning) rather than silence. Hands-on: install `pi-mcp-adapter` (`pi install npm:pi-mcp-adapter`), `/mcp setup`, connect the same free Open-Meteo weather MCP server the original lesson used. Drop: `/mcp` command (doesn't exist), MCP registry discovery, remote/OAuth servers, AGENTS.md "MCP authentication" section. |
| 10 | extensions | Extensions | Reframed from Plugins — Pi's flagship feature, broader API than OpenCode's plugin hooks (`registerTool`, `registerCommand`, event interception, custom TUI via `ctx.ui.custom()`, custom rendering, persistent state). Locations: `~/.pi/agent/extensions/` (global), `.pi/extensions/` (project). Hands-on: `pi install npm:pi-web-access` (web search/fetch/GitHub clone/PDF/YouTube — fills a real gap since Pi has no built-in webfetch), `/reload`, try a web search. One-line mention of `plan-mode.ts` example for students who want Plan-mode-like behavior back (this is where the cut Agents lesson's residue lives). Points to the 50+ bundled examples in Pi's repo. |
| 11 | sessions | Sessions | Storage: `~/.pi/agent/sessions/` as JSONL, organized by working directory. Covers `/new`, `/name`/`--name`, `/resume`/`pi -r`, `/session` info. `/share` uploads as a **private GitHub gist** with a shareable HTML link (not a hosted `opncd.ai/s/<id>` link) — one-line caveat that this needs GitHub auth, full setup deferred to the "Use Git and GitHub" exercise. No `opencode session list`/`export` CLI equivalent — exercise instead has the agent inspect its own JSONL session files directly and summarize past work. |
| 12 | branching | Branching | New lesson, split out of Sessions because Pi's tree model deserves its own space. Tree-structured sessions, `/tree` navigation and controls, `/fork` vs. `/clone` vs. `/tree` comparison table, branch summaries when switching away from a path. No OpenCode equivalent — pure upgrade content. |
| 13 | images | Images | Near 1:1. Ctrl+V/Alt+V paste, drag-and-drop in supported terminals, `pi @screenshot.png "..."` / `@` fuzzy-search reference. New: `images.autoResize` and `images.blockImages` settings. Vision-support table rebuilt around verified free-tier options instead of OpenCode Zen/Go: OpenAI Codex model confirmed multimodal, specific OpenRouter `:free` vision models named. |

**Cut entirely:**
- **Agents** (Plan/Build modes) — Pi has no built-in modes. One-line residue in Extensions lesson pointing to the `plan-mode.ts` example for anyone who wants that behavior back.
- **Workspaces** (Desktop-only git-worktree UI) — no Pi equivalent, dropped rather than replaced. (Considered a "Parallel work" replacement teaching manual `git worktree` + `tmux`, and a "Packages" lesson on `pi install`/`pi list`/`pi update`/authoring — both rejected in favor of just dropping it, since package mechanics are already taught piecemeal via hands-on installs in Tools, Skills, and Extensions.)

**Not ported as a dedicated lesson** (corrected from earlier draft): "Not Just for Coding" was never a standalone lesson on the live opencode.school site — it's framing on the About page and homepage copy, plus the "Learn anything" exercise. Same approach for pi-school: positioning, not a lesson.

**Considered and rejected:** a dedicated Themes lesson (Pi has genuinely deep theme support with no OpenCode equivalent) — rejected, not adding it.

## Exercises (not yet discussed in detail — next up)

11 exercises port mostly unchanged since they're tool exercises, not agent
exercises (build a website, run AI models, edit videos, transcribe speech,
drive a browser, post to social media, git/GitHub, inbox zero, AI gateway,
native Mac apps, learn anything). Known adaptation needed: "Drive a browser"
depends on MCP (Chrome DevTools MCP) in the original — needs rework given
Pi's `pi-mcp-adapter` path or a CDP-based skill/extension instead. Full
per-exercise pass still to come.

## Stack (same as opencode.school)

- Astro 6, `@astrojs/cloudflare` adapter, `output: "server"`
- MDX content collections: `lessons`, `exercises`, `pages` (glossary,
  cheatsheet, about, tips, etc.)
- Tailwind v4 via `@tailwindcss/vite`, `stone` palette for dark mode
- Cloudflare KV for progress tracking (binding `PROGRESS`)
- Cloudflare R2 for video/asciinema assets if needed (binding
  `ASSETS_BUCKET`)
- Biome for lint/format
- JSONC `wrangler.jsonc`, custom domain via `routes` + `custom_domain: true`
- asciinema player for the Installation lesson's terminal walkthrough (large
  font size — flagged as a specific requirement)

## Deployment

- Worker name: `pi-school` → `pi-school.ziki.workers.dev`
- Custom domain: `pi-school.ziki.boo`
- GitHub repo: `zeke/pi-school`, private, Apache-2.0
- GitHub Actions: `ci.yml` (lint+test on PR/push), `deploy.yml` (deploy on
  push to main)
- `.env` for any secrets (never `.dev.vars`)

## Agent-facing API (same shape as OpenCode School)

- `/llms.txt` — plain-text overview + pointer to OpenAPI spec
- `/api/openapi.json` — OpenAPI 3.1 spec
- `/api/lessons`, `/api/lessons/:slug` — lesson content + agentInstructions
- `/api/exercises`, `/api/exercises/:slug`
- `/api/enroll`, `/api/progress/:studentId`
- Same student-ID scheme (`adjective-noun-nnnn`), same `?sid=` sync flow,
  same KV schema
- No `/api/instructions/:studentId` endpoint — the personal-instructions-URL
  concept was dropped for pi-school (see Configuration/Instructions lessons
  above)
- No changelog bot, no AI Search widget (explicitly dropped)

## Open items for next session

1. Go through all 11 exercises one at a time, same format as the lessons
   pass.
2. Decide site pages: about, tips, glossary, cheatsheet, troubleshooting,
   contributing, disenroll — likely direct ports with terminology swaps, but
   need a pass.
3. Confirm quiz question counts per lesson given several lessons got
   shorter (Trust) or restructured (Tools, Extensions).
4. Scaffold the actual Astro project once content planning is done.

## Phased execution (once exercises + pages are planned)

1. Scaffold: Astro + Cloudflare adapter, Tailwind, Biome, content
   collections, wrangler.jsonc, GitHub Actions skeleton.
2. Core pages: home, lesson layout, glossary, about, troubleshooting,
   disenroll.
3. Progress API: enroll, KV progress, student-id generation.
4. Port lessons in the order above.
5. Port exercises.
6. Agent-facing surface: llms.txt, openapi.json.
7. Deploy to `pi-school.ziki.workers.dev`, wire up `pi-school.ziki.boo`.
8. CI (lint/test on PR, deploy on push to main).
