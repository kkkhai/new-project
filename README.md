# Diamond Rush Recreate (working title)

A top-down, grid-based puzzle adventure inspired by Gameloft's *Diamond Rush*. An explorer pushes boulders, dodges traps and collects diamonds across three worlds — **Jungle → Desert → Snow** — with difficulty rising level by level.

All names, art and levels are original; only the genre and mechanics are borrowed.

- **Platforms:** web, iOS and Android
- **Scope (draft):** 3 worlds × 10 levels + 1 boss each = 33 stages
- **Status:** design phase — engine not chosen yet

## Documents

| File | What it is |
| --- | --- |
| [`docs/GDD.md`](docs/GDD.md) | Game design document: mechanics, worlds, levels, art/audio, architecture, roadmap |
| [`CREDITS.md`](CREDITS.md) | Every third-party asset used, with source and licence |
| [`levels/README.md`](levels/README.md) | Level file format and naming |

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
