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
| Forward | `W` / `↑` | ▲ |
| Turn | `A` `D` | ◀ ▶ |
| Front cannon (aim with mouse) | `Space` / click | Fire |
| Port broadside | `Q` | L |
| Starboard broadside | `E` | R |
| Pause | `P` / `Esc` | Pause |

Supported mobile orientation: **landscape** (see `manifest.webmanifest`). In portrait, or when the window resizes, the HUD and touch pads shrink and stay on-screen. Match rules do not change with viewport size.

On touch, the left cluster moves/turns and the right cluster fires. On desktop with a fine pointer, movement pads are hidden; keyboard and arena click still work. Game keys are captured only while gameplay is active.

UI fonts: Figtree and Syne (SIL OFL) under `src/fonts/`.

## Tile map

Edit the ASCII grid in `src/game/maps/channel.level.ts`.

Notes: `src/game/maps/README.md`

Tiles: `assets/png/default/tiles/` and sheet under `assets/tilesheet/`.

## Options (persisted in `localStorage`)

- **Game session time**: 60–180 seconds
- **Enemy spawn time**: 1–10 seconds

Each match snapshots the options at start; later edits apply to the next match.

## Network scenarios (MSW)

On **Options** → Network scenario:

- Success
- Empty lists
- Slow / variable latency
- API error (5xx)
- Client error (4xx)
- Connection failure
- Out-of-order responses
- Timeout on register

**Reset mock data** clears confirmed matches, pending saves, and MSW request counters.

How to reproduce failures:

1. Open Options → pick a scenario (for example **Timeout on register**).
2. Finish a match and watch the Result screen keep a pending save.
3. Refresh and use **Retry** — the same match id is sent again (no duplicates).
4. Switch back to **Success** and confirm Ranking / Match History update.
5. Use **Out-of-order responses** while paging Ranking to verify stale replies do not replace newer data.

Mocks run in `npm run dev`, Playwright, and the **published** build via `/mockServiceWorker.js`.

## Project docs

- Challenge statement: `CHALLENGE.md`
- Architecture: `ARCHITECTURE.md`
- Performance profiling: `PERFORMANCE.md`
- UI language: English (challenge requirement)

## Deploy

Static SPA (Vite). `vercel.json` rewrites SPA routes to `index.html`.

```bash
npm run build
```

GitHub Pages (project site under `/pirate-battle/`):

```bash
set BASE_PATH=/pirate-battle/
npm run build
npx gh-pages -d dist
```

### Public links

- Repository: https://github.com/Lucas-B-P/pirate-battle
- Live demo: https://lucas-b-p.github.io/pirate-battle/

MSW worker file is served from `public/mockServiceWorker.js` (works in the published build).
