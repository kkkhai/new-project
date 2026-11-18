# Levels

One JSON file per level. The map is drawn as text, one string per row, so levels are easy to edit and review in pull requests.

- `test/` — prototype rooms (T-01 …)
- `jungle/` — J-01 … J-10, J-BOSS
- `desert/` — D-01 … D-10, D-BOSS
- `snow/` — S-01 … S-10, S-BOSS
- `secret/` — X-01, unlocked by collecting every red diamond

File name = level id, e.g. `jungle/J-05.json`.

## Format

```json
{
  "id": "T-01",
  "name": "First Steps",
  "world": "test",
  "quota": 3,
  "notes": "Insight: dig through dirt to reach diamonds; the exit opens at the quota.",
  "map": [
    "##########",
    "#P..*...E#",
    "#.####.#.#",
    "#*.....*.#",
    "##########"
  ],
  "solution": "DDUURRRRRDDRRUU"
}
```

| Field | Meaning |
| --- | --- |
| `quota` | Diamonds needed to open the exit |
| `notes` | The room's one insight (design checklist) |
| `parTimeSec` | Par time for 2 stars |
| `tools` | Tools already owned at the start (earned in earlier levels), e.g. `["machete"]` |
| `chests` | What each chest holds, by `"x,y"`, e.g. `{"4,1": "keySilver"}` |
| `solution` | Moves that win the level: `U D L R`, `X` = use tool, `.` = wait one tick. CI replays it on every pull request. |
| `secretSolution` | Required when the map has red diamonds: a route that wins *and* collects them all. CI checks it. |

## Map legend

| Char | Tile |
| --- | --- |
| `#` | Wall |
| `.` | Dirt (dug away when walked on) |
| ` ` | Floor (empty) |
| `P` | Player start (exactly one) |
| `E` | Exit gate (opens at the quota) |
| `O` | Boulder |
| `*` | Diamond |
| `r` | Red diamond (secret, not part of the quota) |
| `x` | Cracked wall (breaks when a falling boulder lands on it) |
| `^` | Spikes |
| `_` | Pit (an object that falls or is pushed in fills it) |
| `C` | Checkpoint totem |
| `k` / `K` | Silver / gold key |
| `d` / `D` | Silver / gold locked gate (padlock; the matching key opens it) |
| `h` | Heart |
| `$` | Chest: walk into it to open it (no key needed); holds a heart unless `chests` says otherwise |
| `&` | Gold chest: same, holds a red diamond by default |
| `=` | Pressure plate (a boulder or the player holds it down) |
| `/` | Lever (bump it to toggle) |
| `G` | Gate (open while any plate is pressed or the lever is on) |
| `v` | Vines (blocks; cut with the machete) |
| `t` | Thorn bush (hurts on touch; cut with the machete) |
| `~` | River water (blocks the player; a boulder dropped or pushed in becomes a bridge) |
| `m` | Machete pickup |
| `S` / `s` | Snake, starts moving right / left |
| `W` | Spider (hangs; drops when you pass below) |
| `M` | Monkey (steals a diamond on contact) |
| `B` | Stone Idol Guardian (Jungle boss, 3 hits) |
| `c` | Crumbling floor (collapses into a pit ~1 s after you leave it) |
| `q` | Quicksand (3 ticks in it and you sink; shovel or a pushed object fills it) |
| `%` | Packed sand (blocks; dig with the shovel) |
| `o` | Sand pile (falls like a boulder, never crushes, pushable) |
| `u` | Shovel pickup |
| `>` / `<` | Dart trap firing right / left along its row every 8 ticks |
| `Z` / `z` | Scorpion, patrols down / up |
| `A` | Scarab (chases when you're within 5 tiles) |
| `U` | Mummy (slowly chases you) |
| `Y` | Pharaoh's Sand Serpent (Desert boss: falls when crumbling floor collapses under it) |
| `i` | Ice (you and pushed objects slide until stopped) |
| `j` | Thin ice (cracks when you step off; breaks into icy water the second time) |
| `w` | Icy water (deadly; an object pushed or dropped in freezes it solid) |
| `I` | Ice wall (pickaxe breaks it; the Great Yeti shatters it by charging into it) |
| `Q` | Ice block (pushable, slides, never crushes; pickaxe breaks it) |
| `n` / `N` | Snowball / big snowball (a snowball grows after rolling 3 tiles; big ones crush and can't be pushed) |
| `a` | Pickaxe pickup |
| `V` | Ice bat (zigzags, flies over pits and water) |
| `H` | Yeti cub (charges when it sees you along a line) |
| `F` | Frost spirit (patrols, turns floor to ice behind it) |
| `T` | The Great Yeti (Snow boss: hurt each time it charges into an ice wall) |

More characters are added as new tiles arrive; `src/core/level.ts` (`LEGEND`) is the source of truth.

## Tools

```bash
node tools/solver/solve.ts levels/test/T-01.json          # find the shortest solution
node tools/solver/solve.ts levels/test/T-01.json --write  # ...and save it into the file
npm run verify-levels                                     # replay every stored solution
```

The solver is breadth-first, so it only handles small rooms (lots of dirt slows it down). For larger levels use the waypoint router, which finds safe moves between cells you name:

```bash
node tools/solver/route.ts levels/jungle/J-01.json "4,1 1,3 4,3 7,3 !R X 12,3 12,1 11,1 6,3 !D X 11,5" --write
```

Waypoints: `x,y` walk there · `X` use the tool · `!MOVES` literal moves.

`node tools/place-red-diamonds.ts levels/<world>/*.json` places one red diamond per level in a pocket beside the solution's route and writes its `secretSolution`. Hand-placed red diamonds are better; this tool gives a first pass.
