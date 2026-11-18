# Diamond Rush Recreate (working title)

A top-down, grid-based puzzle adventure inspired by Gameloft's *Diamond Rush*. An explorer pushes boulders, dodges traps and collects diamonds across three worlds — **Jungle → Desert → Snow** — with difficulty rising level by level.

All names, art and levels are original; only the genre and mechanics are borrowed.

- **Platforms:** web, iOS and Android
- **Scope (draft):** 3 worlds × 10 levels + 1 boss each = 33 stages
- **Engine:** Phaser 3 + TypeScript (Vite); iOS/Android via Capacitor later
- **Status:** M5: feature-complete test version (33 campaign stages + secret level), awaiting real art, audio and playtesting

## Documents

| File | What it is |
| --- | --- |
| [`docs/GDD.md`](docs/GDD.md) | Game design document: mechanics, worlds, levels, art/audio, architecture, roadmap |
| [`CREDITS.md`](CREDITS.md) | Every third-party asset used, with source and licence |
| [`levels/README.md`](levels/README.md) | Level file format, map legend and tools |
| [`docs/MOBILE.md`](docs/MOBILE.md) | Building the iOS and Android apps with Capacitor |
| [`assets/audio/README.md`](assets/audio/README.md) | Sound file names to drop in |

## Play the test version

**https://kkkhai.github.io/new-project/**, rebuilt automatically every time `main` changes. Works in desktop and phone browsers.

This is a **demo build: every level is unlocked** (including the secret level) so testers can jump anywhere. To make levels unlock one by one again, set `DEMO_UNLOCK_ALL = false` in `src/game/config.ts`.

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

Progress (unlocked levels, stars, best scores, settings) is saved in the browser.

- **Difficulty** (Settings): Easy (5 hearts, Z / Undo button), Normal (3 hearts), Hard (1 heart, no checkpoints in boss stages).
- **Language** (Settings): English or Tiếng Việt.
- **Red diamonds** unlock rewards: concept art gallery, Time Trial timer, golden costume, and the secret level.
- **iOS / Android**: see [`docs/MOBILE.md`](docs/MOBILE.md).

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
