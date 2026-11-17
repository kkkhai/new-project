/**
 * Level-design helper: places one red diamond per campaign level in a side pocket next to the
 * stored solution's path, then records a "secretSolution" that also collects it.
 * A spot is only kept if the original solution still wins and the detour route wins with the red diamond.
 *
 * Usage: node tools/place-red-diamonds.ts levels/jungle/J-01.json [...more files]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseLevel, type LevelDef } from '../src/core/level.ts';
import { parseInputs, replay } from '../src/core/replay.ts';
import { step } from '../src/core/tick.ts';
import { DX, DY, type Dir } from '../src/core/types.ts';

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
const CODE: Record<Dir, string> = { up: 'U', down: 'D', left: 'L', right: 'R' };
const BACK: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
/** Map characters that never change, so a red diamond resting on them never falls. */
const SOLID_BELOW = new Set(['#', '>', '<']);

function place(def: LevelDef): LevelDef | null {
  if (!def.solution) return null;
  const s = parseLevel(def);
  const inputs = parseInputs(def.solution);
  const occupied = new Set<string>();
  const visits: { x: number; y: number; i: number }[] = [];
  const mark = () => {
    occupied.add(`${s.player.x},${s.player.y}`);
    s.objs.forEach((o, i) => o && occupied.add(`${i % s.width},${Math.floor(i / s.width)}`));
    for (const a of s.actors) occupied.add(`${a.x},${a.y}`);
  };
  mark();
  visits.push({ x: s.player.x, y: s.player.y, i: 0 });
  inputs.forEach((inp, i) => {
    step(s, inp);
    mark();
    visits.push({ x: s.player.x, y: s.player.y, i: i + 1 });
  });

  const start = parseLevel(def);
  const candidates: { x: number; y: number; at: number; dir: Dir; dist: number }[] = [];
  const free = (x: number, y: number) =>
    x >= 1 && y >= 1 && x < start.width - 1 && y < start.height - 1 && def.map[y][x] === ' ' && !occupied.has(`${x},${y}`);
  for (const v of visits) {
    for (const d of DIRS) {
      // One or two tiles off the route, along a straight line of free floor.
      for (let dist = 1; dist <= 2; dist++) {
        const x = v.x + DX[d] * dist;
        const y = v.y + DY[d] * dist;
        if (!free(x, y)) break;
        if (SOLID_BELOW.has(def.map[y + 1][x])) candidates.push({ x, y, at: v.i, dir: d, dist });
      }
    }
  }
  // Fallback: carve a one-tile alcove into a wall beside the route (never the outer border).
  for (const v of visits) {
    for (const d of DIRS) {
      const x = v.x + DX[d];
      const y = v.y + DY[d];
      if (x < 1 || y < 1 || x >= start.width - 1 || y >= start.height - 1) continue;
      if (def.map[y][x] === '#' && SOLID_BELOW.has(def.map[y + 1][x])) candidates.push({ x, y, at: v.i, dir: d, dist: 1 });
    }
  }
  // Prefer spots found late in the route (more of a reward for exploring).
  candidates.sort((a, b) => b.at - a.at);

  const tried = new Set<string>();
  for (const c of candidates) {
    const key = `${c.x},${c.y}`;
    if (tried.has(key)) continue;
    tried.add(key);
    const map = def.map.map((row, y) => (y === c.y ? row.slice(0, c.x) + 'r' + row.slice(c.x + 1) : row));
    const next: LevelDef = { ...def, map };
    if (replay(next, def.solution).status !== 'won') continue;
    const sol = def.solution;
    const secret = sol.slice(0, c.at) + CODE[c.dir].repeat(c.dist) + CODE[BACK[c.dir]].repeat(c.dist) + sol.slice(c.at);
    const end = replay(next, secret);
    if (end.status !== 'won' || end.redDiamonds !== 1) continue;
    return { ...next, secretSolution: secret };
  }
  return null;
}

for (const file of process.argv.slice(2)) {
  const def = JSON.parse(readFileSync(file, 'utf8')) as LevelDef;
  if (def.map.some((r) => r.includes('r'))) {
    console.log(`skip ${def.id}: already has a red diamond`);
    continue;
  }
  const out = place(def);
  if (!out) {
    console.log(`FAIL ${def.id}: no safe spot found`);
    continue;
  }
  const order = ['id', 'name', 'world', 'quota', 'parTimeSec', 'tools', 'notes', 'map', 'solution', 'secretSolution'];
  const sorted = Object.fromEntries(order.filter((k) => k in out).map((k) => [k, (out as unknown as Record<string, unknown>)[k]]));
  writeFileSync(file, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`ok   ${def.id}: red diamond placed`);
}
