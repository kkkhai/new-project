# Diamond Rush Recreate (working title)

A top-down, grid-based puzzle adventure inspired by Gameloft's *Diamond Rush*. An explorer pushes boulders, dodges traps and collects diamonds across three worlds — **Jungle → Desert → Snow** — with difficulty rising level by level.

All names, art and levels are original; only the genre and mechanics are borrowed.

- **Platforms:** web, iOS and Android
- **Scope (draft):** 3 worlds × 10 levels + 1 boss each = 33 stages
- **Engine:** Phaser 3 + TypeScript (Vite); iOS/Android via Capacitor later
- **Status:** M4: all three worlds playable (33 stages)

## Documents

| File | What it is |
| --- | --- |
| [`docs/GDD.md`](docs/GDD.md) | Game design document: mechanics, worlds, levels, art/audio, architecture, roadmap |
| [`CREDITS.md`](CREDITS.md) | Every third-party asset used, with source and licence |
| [`levels/README.md`](levels/README.md) | Level file format and naming |

## Run it

Needs Node.js 22.18 or newer.

```bash
npm install
npm run dev            # play at http://localhost:5173
npm test               # rule tests
npm run verify-levels  # replay every level's stored solution
npm run build          # production build in dist/
```

Controls: arrows / WASD to move, Space (or X) uses the world tool, R restart room (back to last checkpoint, no heart lost), Esc pause menu, M mute. On phones: on-screen D-pad and TOOL button, or swipe.

Progress (unlocked levels, stars, best scores) is saved in the browser.

## Repository layout

```
docs/            design documents
src/core/        game rules: grid, tick, physics (no rendering)
src/game/        engine scenes and rendering
src/ui/          menus, HUD, results
assets/sprites/  owner-supplied art (PNG)
assets/audio/    free-licence sound and music (see CREDITS.md)
levels/          level JSON files per world
tools/solver/    solver that proves levels are solvable
```

## Assets

- **Art:** supplied by the owner. Placeholder grey boxes are used until files arrive in `assets/sprites/`.
- **Audio:** free CC0 / Pixabay / Sonniss sources for the test version. Log every file in `CREDITS.md`.

## Roadmap

M0 Prototype → M1 Core systems → M2 Jungle slice → M3 Desert → M4 Snow → M5 Polish and launch. Details and open decisions are in [`docs/GDD.md`](docs/GDD.md#production-roadmap-and-open-decisions).
