# Architecture

Simple structure, junior-friendly names, clear ownership per file.

## Main idea

- **React** owns menus, forms, ranking, history, HUD chrome and navigation.
- **PixiJS** owns the combat arena (ships, bullets, islands, VFX).
- **Game rules** live in `src/game/simulation.ts` with **no Pixi imports**.
- **Remote data** (ranking / history) uses Axios + TanStack Query + MSW.

## Folder map

```text
src/
  api/         HTTP client and React Query hooks
  components/  Small reusable UI pieces
  config/      Typed gameplay balance (`gameConfig.ts`)
  mocks/       MSW handlers, fixtures and network scenarios
  screens/     Full pages (menu, options, game, result)
  storage/     localStorage helpers (options, pending matches, last result)
  styles/      Global and screen CSS
  types/       Shared TypeScript types
  game/        Simulation, renderer, input, audio, assets, e2e test API
```

## Game loop

```text
React GameScreen
  -> GameCanvas mounts PixiJS
  -> input.ts reads keyboard / touch
  -> simulation.ts updates rules with delta time
  -> soundBridge.ts reacts to state deltas (SFX)
  -> renderer.ts syncs sprites from state (tint / fire / explosions)
  -> React HUD updates only when the snapshot changes
```

Important separation:

- `simulation.ts` never imports Pixi
- `renderer.ts` only draws; it never decides damage or score
- React does not run every frame
- Leaving the game screen destroys the Pixi app, ticker listeners and input handlers (Strict Mode safe)

## Arena map

Designed archipelago (`arena.ts` + `mapView.ts`), not random props:

- Overlapping land blobs form NW fort peninsula, NE headland, SW beach, SE island and a mid-channel pinch
- Visual layers: tiled water → shallow cyan → sand → grass → fort / rocks / palms on land only
- Collision uses the same blobs; enemy spawns must be open water (`isWaterPoint`)

## Collisions and combat

- Circle vs circle for ships and projectiles (`math.ts`)
- Land blobs block movement and bullets
- Player front shot = 1 projectile; broadsides = 3 parallel shots (with motion trails)
- Chaser: chase + collide damage + self explode (no score)
- Shooter: approach + ranged fire with cooldown
- Match ends on death or timeout; pause freezes dt, cooldowns and spawns

## Feedback

- Explosions on destroy / player death
- Ship fire overlay under ~45% HP
- Progressive tint + short red flash on hit
- WAV SFX from `assets/sounds/` (disabled under `?e2e=1`)

## Ranking and history flow

1. Match ends → one `MatchRecord` with a stable id.
2. Save to a local pending queue (`localStorage`).
3. Result screen mutates with Axios + TanStack Query.
4. MSW stores the confirmed record; retries return the same record.
5. Ranking and History queries are invalidated after success.
6. Failures keep the pending entry so refresh/retry never duplicates.
7. Another match can start while pending saves still exist.

Contracts live in `src/types/match.ts`. Cache keys and hooks are under `src/api/hooks/`.

## Persistence

| Key purpose | Module |
| --- | --- |
| Player options | `optionsStorage.ts` |
| Pending match posts | `pendingMatchStorage.ts` |
| Last finished result | `lastResultStorage.ts` |
| Player id / name | `playerStorage.ts` |
| Confirmed mock DB | MSW + `localStorage` in `mocks/data.ts` |

Abandoned matches (leave combat early) are **not** registered.

## Playwright

- Config: `playwright.config.ts`
- Specs: `e2e/*.spec.ts`
- Combat: `?e2e=1` + `window.__pirateBattleTest` for seeded RNG and fixed `step(dt)`
- Visual baselines under `e2e/**/*-snapshots/`
- HTML report / traces on failure (`playwright-report/`)

## Assets

Challenge art and sounds live in `assets/`. Vite plugin serves them at `/assets` in dev and copies them into `dist/assets` on build.

## Balance knobs

Centralized in `src/config/gameConfig.ts` (speeds, damage, cooldowns, spawn mix, ranges). Options screen only exposes session length and spawn interval; both are validated and clamped.

## Limits / trade-offs

- Simulation cleanup filters arrays each frame (simple, clear for juniors).
- Ambience loops are available but not auto-streamed to keep mobile bandwidth low.
- See `PERFORMANCE.md` for FPS / memory notes on the reference machine.
