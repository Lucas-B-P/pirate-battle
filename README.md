# Pirate Battle

Naval top-down shooter for the Jungle Gaming developer challenge.

Stack: **React + TypeScript (strict)**, **PixiJS**, **TanStack Query**, **Axios**, **MSW**, **Playwright**.

## Setup

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. No environment variables are required for the default demo (MSW mocks ranking and history in the browser).

Optional:

| Variable | Purpose |
| --- | --- |
| _(none required)_ | Ranking/history are mocked with MSW in every build, including production. |

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | TypeScript only |
| `npm run lint` | Lint `src` with oxlint |
| `npm run test:e2e` | Playwright (builds + serves preview on `:4173`) |
| `npm run test:e2e:update` | Update visual baselines |
| `npm run test:e2e:ui` | Playwright UI mode |

Combat tests use `?e2e=1` and `window.__pirateBattleTest` (seeded RNG + `step(dt)`).

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move forward | `W` / `ArrowUp` | ▲ |
| Rotate | `A` `D` / arrows | ◀ ▶ |
| Front shot | `Space` / `J` | Fire |
| Left broadside | `Q` / `K` | L |
| Right broadside | `E` / `L` | R |
| Pause | `P` / `Esc` | Pause / Resume in HUD |

Mobile: **landscape** is preferred. Touch pads appear on smaller widths.

## Options (persisted in `localStorage`)

- **Game session time**: 60–180 seconds
- **Enemy spawn time**: 1–10 seconds

Each match snapshots the options at start; later edits apply to the next match.

## Network scenarios (MSW)

On the main menu:

- Success
- Empty lists
- Slow network
- API error
- Timeout on register

**Reset mock data** clears confirmed fixtures and pending mock records.

How to reproduce failures:

1. Open Main Menu → pick a scenario (for example **Timeout on register**).
2. Finish a match and watch the Result screen keep a pending save.
3. Refresh and use **Retry** — the same match id is sent again (no duplicates).
4. Switch back to **Success** and confirm Ranking / Match History update.

Mocks run in `npm run dev`, Playwright, and the **published** build via `/mockServiceWorker.js`.

## Project docs

- Challenge statement: `CHALLENGE.md`
- Architecture: `ARCHITECTURE.md`
- Performance profiling: `PERFORMANCE.md`
- UI language: English (challenge requirement)

## Deploy

Static SPA (Vite). Suggested host: Vercel.

```bash
npm run build
# dist/ is the output; vercel.json rewrites SPA routes to index.html
```

MSW worker file is served from `public/mockServiceWorker.js`.
