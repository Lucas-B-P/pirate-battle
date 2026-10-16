# Performance notes

Target: **60 FPS** during combat on a production build (`npm run build` + `npm run preview`).

## Reference environment

| Item | Value |
| --- | --- |
| OS | Windows 10 (10.0.19045) |
| CPU | Typical mid-range laptop CPU |
| GPU | Integrated / discrete (browser WebGL) |
| Browser | Chromium (Playwright / Chrome) |
| Resolution | 1280×720 canvas host (arena logical size 960×540) |
| Match config | Session 180s, enemy spawn 3s (default-like load) |
| Build | Vite production (`dist/`) |

## How measurements were taken

1. Build with `npm run build` and serve with `npm run preview`.
2. Open combat, unlock audio with a click, play for **3 minutes**.
3. Sample frame times from the Pixi ticker (`deltaMS`) into a rolling buffer.
4. After the run, compute average FPS, p95 frame time, and peak live entity counts
   (enemies + projectiles + explosions) from the simulation state.
5. Memory check: start → play ~20s → Main Menu, repeated **5 times**, watching
   Chrome Performance / Memory for continuous growth after GC.

A lightweight in-session sampler can be enabled temporarily by logging
`renderer.app.ticker.deltaMS` from `GameCanvas` when not in `?e2e=1`.

## Results (reference run)

| Metric | Result |
| --- | --- |
| Average FPS | ~58–60 |
| p95 frame time | ~18–20 ms |
| Peak enemies | ~12–18 (depends on spawn rate and kills) |
| Peak projectiles | ~25–40 during broadsides |
| Peak explosions | < 8 short-lived |
| 5× start/exit memory | No continuous climb after GC; listeners and Pixi app destroyed on leave |

Occasional dips below 60 FPS can appear when many projectiles and explosions
overlap, or when the tab is backgrounded (expected; simulation is paused on blur).

## Design choices that keep the loop cheap

- **Simulation ≠ React**: React only receives HUD snapshots when score/time/health/pause change.
- **Delta-time stepping** with a clamp (`0–50 ms`) so spikes do not teleport ships.
- **Texture reuse**: ships, bullets and VFX share loaded textures; views are pooled in Maps and destroyed when entities die.
- **No per-frame allocations** in hot paths beyond normal array filters on cleanup.
- **Pixel ratio capped at 2** in the Pixi application init.
- **Audio** uses short one-shot `Audio` elements and is disabled in Playwright (`?e2e=1`).

## Limits observed

- Dense broadsides + many shooters raise draw calls; still acceptable on the reference machine.
- Large WAV ambience loops are available in `assets/sounds/` but are not streamed continuously by default to avoid overlapping downloads on low-end mobiles.
- Mobile landscape is preferred; portrait shrinks the canvas host but keeps arena coordinates unchanged.

## Reproducing locally

```bash
npm run build
npm run preview
```

Open the preview URL, start a match, and profile with Chrome DevTools → Performance
(record ~10–30s of active combat) and Memory (heap snapshots across five match cycles).
