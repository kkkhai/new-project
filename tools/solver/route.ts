/**
 * Waypoint router for large levels where the full solver is too slow.
 * You give the route as waypoints; it finds safe moves between them with the real rules
 * (a short search per leg that never walks into death), then checks the level is won.
 *
 * Usage:
 *   node tools/solver/route.ts levels/jungle/J-01.json "4,1  1,3  X  13,5" [--write]
 * Waypoint forms:
 *   x,y     walk to that cell
 *   X       use the world tool on the faced tile
 *   !MOVES  literal moves (U D L R X .), e.g. !LLU or !....
 */
import { readFileSync, writeFileSync } from 'node:fs';
import type { LevelDef } from '../../src/core/level.ts';
import { parseLevel } from '../../src/core/level.ts';
import { cloneState } from '../../src/core/grid.ts';
import { encodeInput, parseInputs } from '../../src/core/replay.ts';
import { step } from '../../src/core/tick.ts';
import type { GameState, Input } from '../../src/core/types.ts';

const MOVES: Input[] = [{ dir: 'up' }, { dir: 'down' }, { dir: 'left' }, { dir: 'right' }, {}];

function leg(start: GameState, tx: number, ty: number, maxNodes = 300_000): { s: GameState; path: string } | null {
  if (start.player.x === tx && start.player.y === ty) return { s: start, path: '' };
  const seen = new Set<string>();
  let frontier = [{ s: start, path: '' }];
  let nodes = 0;
  while (frontier.length && nodes < maxNodes) {
    const next: typeof frontier = [];
    for (const { s, path } of frontier) {
      for (const m of MOVES) {
        const n = cloneState(s);
        step(n, m);
        nodes++;
        if (n.status === 'dead') continue;
        const p = path + encodeInput(m);
        if ((n.player.x === tx && n.player.y === ty) || n.status === 'won') return { s: n, path: p };
        const moving = n.objs.some((o) => o?.falling) ? 'f' : '';
        const actors = n.actors.map((a) => `${a.x},${a.y},${a.wait},${a.mode}`).join(';');
        const k = `${n.player.x},${n.player.y},${n.diamonds},${moving},${actors}`;
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ s: n, path: p });
      }
    }
    frontier = next;
  }
  return null;
}

export function route(def: LevelDef, spec: string): { path: string; state: GameState } {
  let s = parseLevel(def);
  let path = '';
  for (const wp of spec.trim().split(/\s+/)) {
    if (wp === 'X' || wp.startsWith('!')) {
      for (const input of parseInputs(wp === 'X' ? 'X' : wp.slice(1))) step(s, input);
      path += wp === 'X' ? 'X' : wp.slice(1);
      if (s.status === 'dead') throw new Error(`died during "${wp}" after ${path}`);
      continue;
    }
    const [x, y] = wp.split(',').map(Number);
    const r = leg(s, x, y);
    if (!r) throw new Error(`no safe path to ${wp} (route so far: ${path})`);
    s = r.s;
    path += r.path;
    if (s.status === 'won') break;
  }
  return { path, state: s };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, spec] = process.argv.slice(2);
  const def = JSON.parse(readFileSync(file, 'utf8')) as LevelDef;
  try {
    const { path, state } = route(def, spec);
    console.log(`${def.id}: status=${state.status} diamonds=${state.diamonds}/${def.quota} red=${state.redDiamonds} moves=${path.length}\n${path}`);
    if (state.status !== 'won') process.exit(1);
    if (process.argv.includes('--write')) {
      def.solution = path;
      writeFileSync(file, JSON.stringify(def, null, 2) + '\n');
      console.log(`saved to ${file}`);
    }
  } catch (e) {
    console.error(`${def.id}: ${(e as Error).message}`);
    process.exit(1);
  }
}
