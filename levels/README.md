# Levels

One JSON file per level. The map is drawn as text, one string per row, so levels are easy to edit and review in pull requests.

- `test/` — prototype rooms (T-01 …)
- `jungle/` — J-01 … J-10, J-BOSS
- `desert/` — D-01 … D-10, D-BOSS
- `snow/` — S-01 … S-10, S-BOSS

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
| `solution` | Moves that win the level: `U D L R`, `.` = wait one tick. CI replays it on every pull request. |

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
| `d` / `D` | Silver / gold locked door |
| `h` | Heart |
| `=` | Pressure plate (a boulder or the player holds it down) |
| `/` | Lever (bump it to toggle) |
| `G` | Gate (open while any plate is pressed or the lever is on) |

More characters are added as new tiles arrive; `src/core/level.ts` (`LEGEND`) is the source of truth.

## Tools

```bash
node tools/solver/solve.ts levels/test/T-01.json          # find the shortest solution
node tools/solver/solve.ts levels/test/T-01.json --write  # ...and save it into the file
npm run verify-levels                                     # replay every stored solution
```

The solver is breadth-first, so it only handles small rooms. For large levels, write the solution by hand and let `verify-levels` check it.
