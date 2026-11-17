import { parseLevel, type LevelDef } from './level.ts';
import { step } from './tick.ts';
import type { Dir, GameState } from './types.ts';

const MOVE: Readonly<Record<string, Dir | null>> = { U: 'up', D: 'down', L: 'left', R: 'right', '.': null };

export function parseMoves(moves: string): (Dir | null)[] {
  return [...moves.replace(/\s+/g, '')].map((c) => {
    if (!(c in MOVE)) throw new Error(`Unknown move "${c}" (use U D L R or .)`);
    return MOVE[c];
  });
}

export const encodeMoves = (dirs: (Dir | null)[]): string =>
  dirs.map((d) => (d ? d[0].toUpperCase() : '.')).join('');

/** Play a move string on a level. Extra idle ticks let falling objects settle at the end. */
export function replay(def: LevelDef, moves: string, settleTicks = 0): GameState {
  const s = parseLevel(def);
  for (const dir of parseMoves(moves)) {
    if (s.status !== 'playing') break;
    step(s, { dir });
  }
  for (let i = 0; i < settleTicks && s.status === 'playing'; i++) step(s);
  return s;
}
