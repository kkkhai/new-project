# Art resources needed

**Decided (18 Nov 2026):** 32×32 pixel art. The explorer follows the owner's concept: messy brown hair, goggles on the forehead, green cloak, olive jacket, leather straps and backpack, sword on the back, blue fingerless gloves, golden compass. The Jungle world follows the owner's reference photos of Angkor-style temple ruins: carved, mossy grey sandstone, strangler-fig roots, reddish laterite paths and a dark green river.

**Current state:** the 32×32 explorer and Jungle tile set are drawn by scripts in `tools/art/` (`python3 tools/art/build.py` regenerates `src/game/art/generated.ts`). **Received from the owner and in the game (19 Nov):** heart, blue/red diamond (octagon cut), silver/gold keys, wooden/gold chests, converted by `tools/art/import_images.py` from `tools/art/source/`; the boulder is drawn in the style of the owner's stone-ball reference. Machete, shovel, pickaxe, sand pile, ice block and snowballs are still 16×16 drawn at 2×; Desert and Snow tiles, enemies and bosses are still simple shapes. This list is what's needed to replace everything with finished art, in priority order.

## 0. Decisions first (owner)

| Decision | Options | Why it matters |
| --- | --- | --- |
| **Pixel size** | ~~16×16 at 2×~~ · **32×32 at 1× (chosen)** | 32×32 allows much more detail but takes 4× the drawing work per frame |
| **Palette** | Free choice · a fixed palette (e.g. [Endesga 32](https://lospec.com/palette-list/endesga-32), [Resurrect 64](https://lospec.com/palette-list/resurrect-64)) | A shared palette keeps three worlds and many artists consistent |
| **Look of the explorer** | **Owner's concept (chosen)**: green cloak, goggles, sword, compass | Everything else is styled around the hero |
| **Mood references** | Jungle: **provided** (Angkor temple ruins, fig roots, jungle river). Desert, Snow: still needed | Fastest way to agree on a style |

## 1. Explorer (highest priority)

One PNG sprite sheet, transparent background, frames in a grid of 16×16 (or 32×32) cells. Left-facing frames aren't needed (the game mirrors right-facing ones).

| Animation | Directions | Frames | Notes |
| --- | --- | --- | --- |
| Idle | down, up, right | 2 | slight breathing / blink |
| Walk | down, up, right | 4 | one step = 150 ms |
| Push | right, down, up | 2 | leaning into a boulder |
| Dig | down, up, right | 3 | when walking through dirt |
| Use tool | down, up, right | 3 per tool | machete swing, shovel dig, pickaxe strike |
| Slide on ice | down, up, right | 1 | arms out |
| Hurt / death | any | 4 | crushed, spiked, fall, freeze can share one |
| Victory | down | 3 | at the exit |
| Golden costume | — | — | recolour of all the above (reward) |

## 2. Items and pickups (16×16 or 32×32 each)

| Item | Frames | Notes |
| --- | --- | --- |
| Boulder | 1 + 2 roll | ✓ drawn in the style of your stone-ball reference |
| Blue diamond | 4 | sparkle loop — ✓ received |
| Red diamond | 4 | sparkle loop, clearly rarer than blue — ✓ received |
| Silver key, gold key | 1 each | — ✓ received |
| Heart | 2 | gentle pulse — ✓ received |
| Machete, shovel, pickaxe | 1 each | pickup icons; also used in the HUD |
| Sand pile | 1 | |
| Ice block | 1 | |
| Snowball small / big | 1 each + 2 roll | |
| Chest, gold chest | ✓ received | opened by walking into them, no key; gold chests hold red diamonds |

## 3. Tiles, per world (Jungle, Desert, Snow)

32×32 tiles (or 16×16 at 2×). Walls should join seamlessly: either a 16-tile edge set or a 47-tile "blob" set.

| Tile | Jungle | Desert | Snow |
| --- | --- | --- | --- |
| Floor (2–3 variants) | ✓ | ✓ | ✓ |
| Wall (edge set) | ✓ | ✓ | ✓ |
| Dirt / diggable ground | ✓ | ✓ | ✓ |
| Cracked wall | ✓ | ✓ | ✓ |
| Exit gate closed / open | ✓ | ✓ | ✓ |
| Spikes, pit, checkpoint totem | ✓ | ✓ | ✓ |
| Doors silver / gold, plate up/down, lever on/off, gate open/closed | ✓ | ✓ | ✓ |
| World tiles | vines, thorn bush, river (animated 4) | crumbling floor (3 crack stages), quicksand (animated 4), packed sand, dart trap left/right (+ firing frame) | ice, thin ice, cracked ice, icy water (animated 4), ice wall |

## 4. Enemies (32×32, 2–4 frame move + 3 frame death)

| World | Enemies |
| --- | --- |
| Jungle | snake, spider (+ hanging thread), monkey (+ carrying-diamond variant) |
| Desert | scorpion, scarab, mummy |
| Snow | ice bat, yeti cub (+ charge pose), frost spirit |

## 5. Bosses (64×64 shown over one tile, or 32×32)

Stone Idol Guardian, Pharaoh's Sand Serpent, Great Yeti. Each needs idle (2–4), move (4), hit (2), stunned (Yeti, 2) and defeat (4–6).

## 6. Screens and UI

| Asset | Size |
| --- | --- |
| Game logo / title | ~600×200, transparent |
| Title screen background | 960×640 |
| World map background (three regions) | 960×640 |
| HUD icons: heart, diamond, red diamond, keys, tools, timer | 16×16 |
| Buttons and panels (9-slice) | 48×48 |
| Pixel font | e.g. [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) or [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans), both SIL Open Font License. **Must include Vietnamese diacritics** (Pixelify Sans does) |
| Backgrounds behind levels (optional parallax) | 2–3 layers per world |
| Concept art for the gallery reward | any size, PNG/JPG, into `assets/gallery/` |

## 7. Effects (16×16 or 32×32, 3–6 frames)

Dust puff (landing, digging), diamond pickup sparkle, splash (river/icy water), sand collapse, ice shatter, dart streak, snow particles, boss-hit flash.

## 8. Phone app

App icon 1024×1024 and a splash image 2732×2732 (centred logo). Capacitor can generate all store sizes from these (`npx @capacitor/assets generate`).

## File format and hand-off

- **PNG with transparency**, no anti-aliasing (hard pixel edges), one sprite sheet per character or object, frames on an even grid.
- If you use [Aseprite](https://www.aseprite.org/) (or the free [LibreSprite](https://libresprite.github.io/)), the `.aseprite` file plus a JSON export is ideal.
- Name files `<thing>_<animation>.png`, e.g. `explorer_walk.png`, `snake_move.png`.
- Put files in `assets/sprites/` (characters, items), `assets/tiles/<world>/`, `assets/ui/`. Send them and I'll wire them in.
- Only use art you made, commissioned, or that is CC0 / properly licensed. Record anything third-party in `CREDITS.md`.
