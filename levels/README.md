# Levels

One JSON file per level, drawn in the [Tiled](https://www.mapeditor.org/) editor and exported as JSON.

- `jungle/` — J-01 … J-10, J-BOSS
- `desert/` — D-01 … D-10, D-BOSS
- `snow/` — S-01 … S-10, S-BOSS

File name = level id, e.g. `jungle/J-05.json`.

## Format (simplified)

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

Every level must pass the checklist in [`docs/GDD.md`](../docs/GDD.md#puzzle-design-principles) before it ships.
