# Diamond Rush Recreate — Game Design Frame

Last updated: 2026-11-18 · Owner: Vu Quang Khai · Live version: [Claude Doc](https://claude.ai/artifact/4ycu1jvdWqRcV6f7nHL3G5)

> Everything here is a draft until the decisions in [Production roadmap and open decisions](#production-roadmap-and-open-decisions) are approved by the owner.

## Overview

We are building a top-down, grid-based puzzle adventure inspired by Gameloft's *Diamond Rush* (2006): an explorer pushes boulders, dodges traps and collects diamonds across three worlds — Jungle, Desert, Snow — that get harder as the player goes. The original's worlds were Angkor Wat, Bavaria and Tibet; ours swap in a desert and keep the same feel. All names, art and levels are original; only the genre and mechanics are borrowed.

| Item | Decision |
| --- | --- |
| Working title | Diamond Rush Recreate (placeholder) |
| Genre | Grid puzzle adventure (Boulder Dash / Sokoban lineage) |
| View | Top-down 2D, tile grid, scrolling camera |
| Target platform | Web, iOS and Android at launch (owner decision, 18 Nov 2026) |
| Player | One explorer, single-player |
| Session length | 5–15 minutes per level |
| Scope v1.0 | 3 worlds × 10 levels + 1 boss stage each = 33 stages |

**Design pillars**

1. **Every death is fair.** Rules are deterministic and readable; the player can always see why a boulder fell.
2. **Think, then move.** Puzzles reward planning over reflexes; action moments are short and telegraphed.
3. **Each world teaches one new idea.** Jungle teaches gravity, Desert teaches collapse and timing, Snow teaches sliding momentum.
4. **Secrets for the curious.** Every level hides optional red diamonds behind harder side puzzles.

## Core gameplay loop

The player clears a level by collecting enough diamonds to open the exit gate, then walking through it alive. Each level is one screen-scrolling map made of connected puzzle rooms.

**Level loop**

1. Enter the level at the start tile; the HUD shows diamonds needed (e.g. 0 / 25).
2. Explore a room, read the hazards, plan a route.
3. Solve the room: push boulders, trigger switches, use keys, avoid traps.
4. Collect diamonds and items; touch a checkpoint totem to save progress.
5. Repeat for each room until the diamond quota is met.
6. The exit gate opens; reach it to finish. Results screen shows time, diamonds, secrets, deaths.

**Meta loop:** finish level → unlock the next one → finish 10 levels → boss stage → unlock the next world → beat all three bosses → game complete (final ending unlocks once all red diamonds are found).

**Win and lose conditions**

| Condition | Rule |
| --- | --- |
| Level win | Diamond quota met and player stands on the open exit tile |
| Life lost | Crushed by a falling object, touching a hazard or enemy, drowning, freezing, or falling into a pit |
| On death | Respawn at the last checkpoint; room state resets to how it was at that checkpoint |
| Lives | 3 hearts per attempt; at 0 hearts the level restarts from the beginning |
| Soft-lock | Player can press Restart Room at any time (no heart lost) if a puzzle becomes unsolvable |
| Game win | Defeat the Snow world boss |

## Tile and object catalogue

Every level is built from the shared tiles below plus each world's own set (see World structure). One tile = one grid cell; objects move one cell per game tick.

**Shared tiles (all worlds)**

| Tile / object | Type | Rule |
| --- | --- | --- |
| Floor | Terrain | Walkable |
| Wall | Terrain | Blocks movement; some walls are cracked and break when a boulder lands on them |
| Dirt / grass | Terrain | Walkable; disappears once walked on; supports objects above it |
| Boulder | Physics object | Falls into empty cells below; rolls off rounded objects; can be pushed sideways one cell if the far cell is empty; crushes the player when falling |
| Diamond (blue) | Collectible | Counts toward the quota; also falls and rolls like a boulder but never crushes |
| Red diamond | Secret collectible | 3 hidden per level; unlocks bonus content |
| Key (silver / gold) | Item | Opens the matching locked door; consumed on use |
| Locked door | Terrain | Opens with the matching key |
| Switch / pressure plate | Trigger | Opens or closes linked gates; plates need a boulder or the player on them |
| Gate | Terrain | Toggled by switches |
| Checkpoint totem | Save point | Saves position and room state |
| Spikes | Hazard | Instant death on contact; some extend on a timer |
| Pit | Hazard | Death; can be filled by pushing a boulder in, making floor |
| Exit gate | Goal | Opens when the quota is met |
| Heart | Pickup | Restores 1 heart (max 3) |
| Chest | Pickup | Holds a key, heart or red diamond |

**Physics rules (deterministic, checked every tick)**

1. Objects scan bottom-to-top so stacks fall in order.
2. An object with an empty cell below falls one cell.
3. An object resting on another round object rolls left if the left and lower-left cells are empty, else right; it never rolls onto the player.
4. A falling object that lands on the player kills them; one that was already resting on the player's head does not (the player can stand under a boulder they walked into, as in the original).
5. The player can push one object horizontally only; never two in a row, never vertically.

## Player controls and mechanics

The explorer moves one tile per step in four directions and interacts by walking into things; there is no jump. A step takes 150 ms (tunable), and holding a direction repeats it.

| Action | Keyboard | Touch | Effect |
| --- | --- | --- | --- |
| Move | Arrows / WASD | D-pad or swipe | One tile; digs dirt; picks up items |
| Push | Walk into object | Same | Moves a boulder/block one tile if the far cell is empty |
| Use tool | Space | Action button | Uses the world tool (see below) on the facing tile |
| Restart room | R | Pause menu | Resets to last checkpoint, no heart lost |
| Undo (Easy mode only) | Z | Undo button | Rewinds one step |
| Pause | Esc / P | Pause button | Menu, map, settings |

**World tools** (unlocked once, kept for the rest of the game)

- **Machete** (Jungle): cuts vines and thorn bushes in the facing tile.
- **Shovel** (Desert): digs through packed sand and uncovers buried items; can refill a quicksand tile with adjacent sand.
- **Pickaxe** (Snow): breaks ice blocks and cracked ice walls; cannot break stone.

**Health and checkpoints**

- 3 hearts; every hazard costs one heart and sends the player to the last checkpoint.
- Crushing by a boulder always costs a heart, even at full health.
- Checkpoints save player position, collected items and the state of every object in solved rooms, so solved puzzles stay solved.

**Difficulty modes:** Easy (undo, 5 hearts, hint arrows), Normal (as above), Hard (1 heart, no checkpoints in boss stages).

## World structure

The three worlds are played in order — Jungle, Desert, Snow — and each adds one core idea on top of everything before it, so Snow levels use all three worlds' mechanics.

| | Jungle: Lost Temple | Desert: Sunken Tombs | Snow: Frozen Peak |
| --- | --- | --- | --- |
| Setting | Overgrown stone temple, rivers, ruins | Sand pyramids, tomb corridors, oasis | Mountain monastery, glaciers, ice caves |
| Core idea taught | Gravity: falling and rolling boulders | Timing and collapse: floors and traps that change over time | Momentum: sliding on ice until stopped |
| World tool | Machete | Shovel | Pickaxe |
| New tiles | Vines (cut), thorn bush (cut, hurts on touch), river (impassable; fill with boulders to bridge), log (floats down river, ride it) | Crumbling floor (collapses 1 s after you leave it), quicksand (sinks you in 3 steps), sand pile (falls like a boulder but soft, does not crush), dart trap (fires on a timer along a line), pressure plate doors | Ice floor (player and objects slide until hitting something), snowball (grows when rolled; big ones block or crush), thin ice (cracks after 2 steps, then water), ice block (pushable, slides), freezing water (death; push an ice block in to make a bridge) |
| Enemies | Snake (patrols a fixed line), spider (drops from ceiling when you pass below), monkey (steals a diamond, drops it when hit by a boulder) | Scorpion (patrols), scarab swarm (follows you in dark rooms), mummy (chases slowly, stops in light) | Ice bat (flies in a sine path), yeti cub (charges in a straight line until it hits a wall), frost spirit (freezes tiles it passes) |
| Boss | Stone Idol Guardian: drop boulders on its head through ceiling holes, 3 hits | Pharaoh's Sand Serpent: lure it over crumbling floors into pits while dodging dart traps, 3 phases | Great Yeti: make it slide on ice into ice walls, then drop a giant snowball on it, 3 phases |
| Colour palette | Greens, moss stone, gold | Ochre, sandstone, turquoise | White, ice blue, violet night |
| Music mood | Drums, flutes, adventurous | Middle-Eastern scales, tense | Slow strings, bells, eerie |

Enemies die only when crushed by a falling object or pushed into a hazard; the player never fights directly, keeping the game a puzzle.

## Level progression and difficulty curve

Difficulty rises in a sawtooth: each world opens easier than the previous world's end, then climbs past it, so a new mechanic is always learned in a safe space. Every world follows the same 11-stage pattern.

| Stage | Role | What it does |
| --- | --- | --- |
| 1–2 | Teach | One new tile per level, no way to fail by accident, tool unlocked in level 1 |
| 3–4 | Practise | New tile mixed with old ones; first enemy introduced |
| 5 | Twist | The new mechanic used in an unexpected way (e.g. using a boulder as a key for a pressure plate) |
| 6–7 | Combine | Two-step puzzles across rooms; first secret area that needs the world tool |
| 8–9 | Test | Longer levels, timed hazards, fewer checkpoints |
| 10 | Exam | All of the world's ideas in one large level |
| Boss | Show-off | Arena fight using the world's core idea |

**Target numbers per world** (to tune in playtesting)

| | Jungle | Desert | Snow |
| --- | --- | --- | --- |
| Difficulty score (1–10), level 1 → 10 | 1 → 4 | 3 → 7 | 5 → 10 |
| Map size (tiles) | 20×15 → 40×30 | 30×20 → 50×40 | 30×25 → 60×45 |
| Rooms per level | 2 → 5 | 3 → 7 | 4 → 9 |
| Diamond quota | 10 → 30 | 20 → 45 | 30 → 60 |
| Checkpoints per level | 3 → 4 | 2 → 3 | 2 → 3 |
| Par time | 3 → 8 min | 5 → 12 min | 6 → 15 min |

**Level naming:** world letter + number, e.g. J-01 … J-10, J-BOSS; D-01 … D-BOSS; S-01 … S-BOSS.

**Example Jungle list (draft)**

| Level | Working name | Main idea |
| --- | --- | --- |
| J-01 | Temple Gate | Walking, dirt, diamonds, exit; machete on vines |
| J-02 | Rolling Stones | Boulders fall and roll; don't stand below |
| J-03 | Heavy Lifting | Pushing boulders to block and to bridge pits |
| J-04 | Snake Pit | First enemy; crush it with a boulder |
| J-05 | The Weight of Gold | Boulder on a pressure plate opens a gate |
| J-06 | River Crossing | Fill the river with boulders to cross |
| J-07 | Keys of the Monkey King | Silver and gold keys; monkey thief |
| J-08 | Spider Hall | Timing under ceiling spiders; spikes on a timer |
| J-09 | Collapsing Shrine | Chain reaction: one push drops a cascade |
| J-10 | Heart of the Temple | Exam level, 5 rooms |
| J-BOSS | Stone Idol Guardian | Boss arena |

## Puzzle design principles

A good room has one "aha" the player can find by looking, not by trial and error. Design every room around that single insight, then remove anything that distracts from it.

1. **One idea per room.** State the room's insight in one sentence before building it.
2. **Show before test.** A new tile appears first where it cannot hurt the player.
3. **Readable state.** Everything that will move is visible on screen when the room is entered; no off-screen surprises.
4. **Fail fast, retry fast.** A failed attempt should cost under 20 seconds to retry.
5. **No accidental soft-locks.** If a push can make the room unsolvable, either make it impossible or put a Restart Room hint on screen.
6. **Optional depth.** Red diamonds sit behind the hardest variant of the room's idea.
7. **Reuse with a twist.** When an old mechanic returns, it must do something it has not done before.

**Level design checklist** (every level must pass before it ships)

- [ ] The room's insight is written in the level's notes
- [ ] Solved by a tester who did not build it, without hints
- [ ] Solver script confirms it is solvable from every checkpoint
- [ ] No path lets the player bypass the intended puzzle
- [ ] Diamond quota reachable with at least 10% spare diamonds
- [ ] 3 red diamonds placed, at least one needing the world tool
- [ ] Par time set from 5 tester runs
- [ ] Difficulty score agreed and within the world's range

## Progression, scoring and saving

Levels unlock in a straight line inside each world, and a world unlocks when the previous boss is beaten; red diamonds are the only optional layer.

**Unlock rules**

- Next level unlocks on finishing the current one.
- Next world unlocks on beating the boss. Finished levels can be replayed any time.
- Red diamonds unlock rewards: 10 → concept art gallery, 30 → Time Trial mode, 60 → explorer costume, all 99 → secret final level and true ending.

**Score and star rating per level**

| Star | Requirement |
| --- | --- |
| 1 star | Finish the level |
| 2 stars | Finish under par time |
| 3 stars | Under par time and all 3 red diamonds |

Score = 100 per diamond + 500 per red diamond + time bonus (10 per second under par) − 200 per death. Shown on the results screen; used for an optional local leaderboard.

**Save system**

- Autosave after every level and at every checkpoint (mid-level resume).
- 3 save slots. Web build saves to browser local storage; later add cloud sync.
- Saved per slot: unlocked levels, best score and stars per level, red diamonds found, tools owned, settings.

## UI, art and audio direction

All item, character and map art comes from the owner's own resources (owner decision, 18 Nov 2026); the target look is 32×32 pixel art with strong silhouettes, so hazards and pushable objects read instantly even on a phone screen.

**Screens**

1. Title → Save slot select
2. World map: three regions on one map, levels as nodes on a path, stars and red diamonds shown per node
3. Level: game view + HUD
4. Pause: resume, restart room, restart level, settings, quit to map
5. Results: time, diamonds, red diamonds, deaths, stars, score
6. Settings: volume, controls, difficulty, language (English, Vietnamese)

**HUD:** hearts (top left), diamonds collected / quota (top centre), keys held and world tool (top right), red diamonds found (small, under the quota).

**Art rules**

- Tile size 32×32 px, rendered at integer scale (2× or 3×).
- Anything dangerous has a red or orange accent; anything pushable has a visible edge highlight.
- Player sprite: 4 directions × (idle, walk 4 frames, push 2 frames, death 4 frames).
- Each world needs: tileset, 3 enemies, boss, background parallax for the map.

**Art request list for the owner** (send files as PNG; a sprite sheet per object is fine; until they arrive the build uses grey placeholder boxes). Drop files into `assets/sprites/`.

| Asset | Size | Frames / variants | Needed for |
| --- | --- | --- | --- |
| Player explorer | 32×32 | 4 directions × idle, walk (4), push (2), death (4) | M0 prototype |
| Boulder, blue diamond, red diamond | 32×32 | 1 each + diamond sparkle (4) | M0 prototype |
| Shared tiles: floor, wall, cracked wall, dirt, exit gate (closed/open) | 32×32 | Per world style | M0 prototype |
| Keys, locked doors, switch, pressure plate, gate | 32×32 | Silver + gold; on/off states | M1 |
| Checkpoint totem, spikes, pit, heart, chest | 32×32 | Active/inactive states | M1 |
| Jungle tileset + vines, thorn bush, river, log | 32×32 | Tiles that connect at edges | M2 |
| Jungle enemies: snake, spider, monkey | 32×32 | Move (4) + death (3) | M2 |
| Jungle boss: Stone Idol Guardian | 96×96 | Idle, hit, defeat | M2 |
| Desert tileset and enemies, boss | Same as Jungle | Same as Jungle | M3 |
| Snow tileset and enemies, boss | Same as Jungle | Same as Jungle | M4 |
| World map, HUD icons, logo | Map 1920×1080; icons 32×32 | 1 each | M2 |

**Audio for the test version** comes from free libraries whose licences allow use in a released game: CC0 (public domain), the Pixabay License, or the Sonniss royalty-free licence. Real-game polish can replace any of these later. Every file used is logged in [`CREDITS.md`](../CREDITS.md).

| Sound | Used for | Source | Licence / credit |
| --- | --- | --- | --- |
| Footstep, dig, door creak, key, diamond pick-up (coin) | Player and item SFX | [Kenney – 50 RPG Sound Effects](https://opengameart.org/content/50-rpg-sound-effects) | CC0, no credit needed |
| Boulder land, crush, push scrape, ice crack | Physics SFX | Kenney – Impact Sounds (130 hits and thuds) on kenney.nl ([licence note](https://gtstu.com/?p=5011)) | CC0, no credit needed |
| Menu clicks, checkpoint, gate open, error | UI SFX | [Kenney – Interface Sounds](https://opengameart.org/content/interface-sounds) | CC0; crediting "Kenney.nl" optional |
| Snake hiss, wind, sand, river, monkey, ambience | World-specific SFX | [Pixabay Sound Effects](https://pixabay.com/service/faq/) | Pixabay License: commercial use, no credit |
| Anything still missing | Backup SFX library | [Sonniss GDC Game Audio Bundle](https://rekkerd.org/sonniss-releases-gdc-2026-game-audio-bundle/) | Royalty-free, no credit; cannot be used to train AI |
| Desert, Snow, boss and menu music | World and boss tracks | [Tom Feldmann – Wild Music Pack](https://tomfeldmann.itch.io/wild-music-pack) (40 tracks incl. snow, desert, boss) | CC0, no credit |
| Jungle music | Jungle world track | [TAD – Unexplored (looping)](https://opengameart.org/node/122596) (temple/jungle mood) | CC0 |
| Snow music (alternative) | Snow world track | [Bobjt – Snow Globe](https://opengameart.org/comment/100764) | CC0; credit "bobjt" optional |

**Licence rules for picking more sounds**

- Use only CC0, Pixabay License or Sonniss files in the test build.
- Freesound sets a licence per file: take CC0 only, never CC-BY-NC.
- Avoid the BBC Sound Effects archive (non-commercial licence only).
- Keep `CREDITS.md` listing every file, its source link and licence, even when credit is optional.

## Technical architecture

Engine: **TypeScript + Phaser 3, built with Vite** (owner decision, 18 Nov 2026); iOS/Android apps wrap the web build with Capacitor. Levels are stored as JSON with a text map (one string per row) so they diff cleanly in pull requests; see `levels/README.md`.

**Key rule:** game logic runs on a fixed grid tick and knows nothing about rendering. The renderer only animates between tick states. This makes the physics deterministic, testable and easy to undo/replay.

**Systems**

| System | Responsibility |
| --- | --- |
| GridState | 2D array of cells; each cell holds terrain + optional object + optional actor |
| TickEngine | Runs one tick: player input → pushes → physics (bottom-to-top) → enemies → hazards → win/death checks |
| Physics | Falling, rolling, sliding (ice), crumbling timers |
| EntityAI | Simple scripted patterns per enemy type |
| TriggerSystem | Links switches/plates to gates by id |
| CheckpointSystem | Snapshots GridState; restores on death |
| UndoStack | Stores the last N snapshots (Easy mode) |
| Renderer | Engine sprites, tweens between tick states, camera follow |
| UI / HUD | Menus, HUD, results |
| SaveSystem | Local storage, 3 slots |
| Solver (dev tool) | Breadth-first search that proves a room is solvable; runs in CI on every level |

**Level file format (early draft; the current format is in [`levels/README.md`](../levels/README.md))**

```json
{
  "id": "J-05",
  "name": "The Weight of Gold",
  "world": "jungle",
  "width": 30,
  "height": 20,
  "diamondQuota": 18,
  "parTimeSec": 300,
  "difficulty": 3,
  "layers": {
    "terrain": ["W","W","F","D", "..."],
    "objects": [
      { "type": "boulder", "x": 4, "y": 2 },
      { "type": "diamond", "x": 6, "y": 9 },
      { "type": "redDiamond", "x": 27, "y": 1 }
    ],
    "actors": [ { "type": "snake", "x": 10, "y": 5, "path": "horizontal" } ]
  },
  "triggers": [ { "plate": [12, 7], "opens": "gate_a" } ],
  "checkpoints": [[3, 3], [15, 10]],
  "start": [1, 1],
  "exit": [28, 18]
}
```

**Project folders:** `src/core` (grid, tick, physics — pure logic, unit-tested), `src/game` (engine scenes), `src/ui`, `assets/` (sprites, audio), `levels/jungle|desert|snow/*.json`, `tools/solver`.

## Production roadmap and open decisions

Build the rules first, then one world end to end, then copy the pipeline to the other two worlds. Each milestone ends with a playable build and a gate that must pass before the next starts.

1. **M0 – Prototype:** grid, player movement, boulders, diamonds, exit, placeholder art. *Gate:* physics rules 1–5 pass unit tests; 3 test rooms are fun with grey boxes.
2. **M1 – Core systems:** checkpoints, keys/doors, switches, hazards, restart room, level loader from Tiled JSON, solver tool. *Gate:* any level file loads and the solver verifies it.
3. **M2 – Jungle vertical slice:** Jungle tiles, 3 enemies, J-01 to J-10, boss, final art and audio for the world, HUD, results, save. *Gate:* 5 outside testers finish Jungle; average rating at least 4/5.
4. **M3 – Desert:** timed and collapsing tiles, D-01 to D-BOSS. *Gate:* same as M2.
5. **M4 – Snow:** sliding/ice physics, S-01 to S-BOSS. *Gate:* same as M2.
6. **M5 – Polish and launch:** world map, red-diamond rewards, difficulty modes, Vietnamese translation, performance on mid-range phones. *Gate:* no crash or soft-lock bugs open.

**Decisions awaiting the owner's approval** (everything above is a draft until these are confirmed)

- [x] Engine: Phaser + TypeScript, wrapped with Capacitor for iOS/Android (decided 18 Nov 2026). Platforms: web + iOS + Android
- [ ] Scope: 3 worlds × 10 levels + boss (33 stages) assumed for now, or a smaller first release
- [ ] Combat: puzzle-only (enemies die only by boulders/hazards) or add a direct attack
- [ ] Art style: 32×32 pixel art, or another style
- [ ] Lives model: 3 hearts + checkpoints, or unlimited retries
- [ ] Working title and final game name
