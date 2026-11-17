import { parseLevel, type LevelDef } from './level.ts';
import { step } from './tick.ts';
import type { Dir, GameState, Input } from './types.ts';

const MOVE: Readonly<Record<string, Input>> = {
  U: { dir: 'up' }, D: { dir: 'down' }, L: { dir: 'left' }, R: { dir: 'right' }, '.': {}, X: { action: true },
};

/** Parse a move string: U D L R move, X uses the world tool, . waits one tick. */
export function parseInputs(moves: string): Input[] {
  return [...moves.replace(/\s+/g, '')].map((c) => {
    if (!(c in MOVE)) throw new Error(`Unknown move "${c}" (use U D L R X or .)`);
    return MOVE[c];
  });
}

/** Directions only (X counts as a wait); kept for tests that drive the game by direction. */
export const parseMoves = (moves: string): (Dir | null)[] => parseInputs(moves).map((i) => i.dir ?? null);

export const encodeInput = (i: Input): string => (i.action ? 'X' : i.dir ? i.dir[0].toUpperCase() : '.');

/** Play a move string on a level. Extra idle ticks let falling objects settle at the end. */
export function replay(def: LevelDef, moves: string, settleTicks = 0): GameState {
  const s = parseLevel(def);
  for (const input of parseInputs(moves)) {
    if (s.status !== 'playing') break;
    step(s, input);
  }
  for (let i = 0; i < settleTicks && s.status === 'playing'; i++) step(s);
  return s;
}
