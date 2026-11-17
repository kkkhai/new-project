/**
 * Breadth-first solver: finds the shortest move string that wins a level.
 * Usage: node tools/solver/solve.ts levels/jungle/J-01.json [--write] [--max=2000000]
 * With --write the solution is saved into the level file's "solution" field.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseLevel, type LevelDef } from '../../src/core/level.ts';
import { step } from '../../src/core/tick.ts';
import { cloneState, terrainAt } from '../../src/core/grid.ts';
import { encodeInput } from '../../src/core/replay.ts';
import { DART_PERIOD, TOOL_TARGETS } from '../../src/core/rules.ts';
import { DX, DY, type GameState, type Input } from '../../src/core/types.ts';

const MOVES: Input[] = [{ dir: 'up' }, { dir: 'down' }, { dir: 'left' }, { dir: 'right' }, {}];
const ACTION: Input = { action: true };

/** Only try the tool when it would do something (keeps the search small). */
function inputsFor(s: GameState): Input[] {
  const t = TOOL_TARGETS[terrainAt(s, s.player.x + DX[s.player.facing], s.player.y + DY[s.player.facing])];
  return t && s.tools[t.tool] ? [...MOVES, ACTION] : MOVES;
}

/** Everything that affects the future of the game, excluding counters like tick and ids. */
export function stateKey(s: GameState): string {
  const parts: string[] = [`${s.player.x},${s.player.y},${s.diamonds}`];
  // Dart traps fire on a global clock, so the clock phase matters when the level has any.
  if (s.terrain.some((t) => t === 'dartLeft' || t === 'dartRight')) parts.push(`t${s.tick % DART_PERIOD}`);
  parts.push(s.terrain.join(','));
  parts.push(s.player.facing);
  parts.push(s.objs.map((o) => (o ? o.kind.slice(0, 3) + (o.falling ? 'f' : '') : '-')).join(''));
  parts.push(s.actors.map((a) => `${a.alive ? 1 : 0}${a.x},${a.y},${a.dir[0]},${a.wait},${a.hp},${a.carrying},${a.mode[0]}`).join(';'));
  parts.push(JSON.stringify(extraKey(s)));
  return parts.join('|');
}

/** Hook for state that lives outside the grid (keys held, enemies, timers). */
function extraKey(s: GameState): unknown {
  const { width, height, terrain, objs, player, diamonds, quota, tick, status, nextId, events, actors, ...rest } = s;
  void [width, height, terrain, objs, player, diamonds, quota, tick, status, nextId, events, actors];
  return rest;
}

export function solve(def: LevelDef, maxNodes = 2_000_000): string | null {
  const start = parseLevel(def);
  const seen = new Set<string>([stateKey(start)]);
  let frontier: { s: GameState; path: string }[] = [{ s: start, path: '' }];
  while (frontier.length) {
    const next: typeof frontier = [];
    for (const { s, path } of frontier) {
      for (const a of inputsFor(s)) {
        const n = cloneState(s);
        step(n, a);
        if (n.status === 'won') return path + encodeInput(a);
        if (n.status !== 'playing') continue;
        const k = stateKey(n);
        if (seen.has(k)) continue;
        seen.add(k);
        if (seen.size > maxNodes) return null;
        next.push({ s: n, path: path + encodeInput(a) });
      }
    }
    frontier = next;
  }
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node tools/solver/solve.ts <level.json> [--write] [--max=N]');
    process.exit(2);
  }
  const max = Number(process.argv.find((a) => a.startsWith('--max='))?.slice(6) ?? 2_000_000);
  const def = JSON.parse(readFileSync(file, 'utf8')) as LevelDef;
  const t0 = Date.now();
  const sol = solve(def, max);
  if (!sol) {
    console.error(`${def.id}: no solution found within ${max} states`);
    process.exit(1);
  }
  console.log(`${def.id}: ${sol.length} moves in ${Date.now() - t0} ms\n${sol}`);
  if (process.argv.includes('--write')) {
    def.solution = sol;
    writeFileSync(file, JSON.stringify(def, null, 2) + '\n');
    console.log(`saved to ${file}`);
  }
}
