# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MuscleUp is a self-contained fitness tracking web app built as a **single HTML file** (`index.html`) with vanilla JavaScript, CSS, and HTML5. No build system, no dependencies, no package manager. Deployed as a static site on Vercel with PWA support for iOS home screen install.

## Architecture

### Single-file structure (~650 lines)

- **Lines 1-13**: HTML head, Google Fonts (Bebas Neue, DM Sans)
- **Lines 14-114**: CSS (dark theme, mobile-first max-width 430px, Safari fixes)
- **Lines 115-178**: HTML body (auth screens, app shell with header/content/nav)
- **Lines 179-645**: JavaScript (all app logic in one `<script>` block)

### Data Layer

All data lives in **localStorage** with no backend:
- `mu_users` — all user accounts
- `mu_data_[uid]` — per-user workout/schedule data
- `mu_session` — current session (auto-login)

The `DB` object wraps localStorage. `UD` (User Data) is the main in-memory state object containing `xp`, `streak`, `workouts`, `schedule`, `checked`, and `friends`.

### Rendering Pattern

Direct DOM manipulation via `innerHTML` with template literals. The cycle is: `onclick` handler → update global state → `save()` → `render()` → dispatch to tab-specific renderer (`renderHome`, `renderLog`, `renderSchedule`, `renderRivals`, `renderProfile`).

### Key Modules (all in the single script block)

| Module | Functions | Purpose |
|--------|-----------|---------|
| Storage | `DB`, `getUsers`, `saveUsers`, `getUserData`, `saveUD` | localStorage CRUD |
| Auth | `doLogin`, `doRegister`, `doGuest`, `doLogout`, `loginUser` | Client-side auth with base64 password hashing |
| Core | `initApp`, `save`, `render`, `gotoTab`, `updateHeader`, `flashXP` | App lifecycle and navigation |
| Home | `renderHome`, `toggleExpand`, `toggleSet`, `startFromPlan` | Dashboard, workout tracking |
| Log | `renderLog`, `startNewWorkout`, `addEx`, `finishWorkout` | Workout builder |
| Schedule | `renderSchedule`, `renderAI`, `applyAI`, `renderCalendarModal`, `getWeekMonday` | Weekly planner with date navigation, calendar picker, AI training plans |
| Rivals | `renderRivals`, `tryAddFriend`, `removeFriend` | Friend leaderboard |
| Profile | `renderProfile` | Stats, achievements, badges |

### Exercise Database

`EX` is a hardcoded object mapping categories (Push, Pull, Legs, Core, Cardio) to exercise arrays. AI plans are also hardcoded at three levels (beginner, intermediate, advanced).

## Deployment

- **Platform**: Vercel (static site)
- **PWA**: `manifest.json` + `sw.js` for iOS Add to Home Screen support
- **Icons**: `icon-192.png`, `icon-512.png` (placeholder M logo)
- **Config**: `vercel.json` for cache headers
- **Deploy**: `vercel` CLI or connect GitHub repo to Vercel dashboard

## Development Notes

- No build step, tests, linting, or formatting tools exist — just serve `index.html`
- State is managed via global variables (`currentUser`, `isGuest`, `UD`, `currentTab`, `building`, `nw`, `weekOffset`, etc.)
- CSS uses `-webkit-` prefixes for iOS Safari compatibility
- Auth passwords are base64-encoded (not cryptographically secure)
- Schedule uses `weekOffset` (integer) to navigate weeks relative to current week

<!-- VERCEL BEST PRACTICES START -->
## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or `NEXT_PUBLIC_*`
- Provision Marketplace native integrations with `vercel integration add` (CI/agent-friendly)
- Sync env + project settings with `vercel env pull` / `vercel pull` when you need local/offline parity
- Use `waitUntil` for post-response work; avoid the deprecated Function `context` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., `maxDuration`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via `@vercel/otel` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access
<!-- VERCEL BEST PRACTICES END -->
