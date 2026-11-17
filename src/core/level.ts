import { makeObj } from './grid.ts';
import type { GameState, ObjKind, Terrain } from './types.ts';

/**
 * A level as stored in levels/<world>/<id>.json.
 * The map is an array of equal-length strings; see LEGEND below.
 */
export interface LevelDef {
  id: string;
  name: string;
  world: string;
  quota: number;
  parTimeSec?: number;
  difficulty?: number;
  map: string[];
  /** Moves that finish the level: U D L R, and "." to wait one tick. Checked in CI. */
  solution?: string;
  notes?: string;
}

type Cell = { terrain: Terrain; obj?: ObjKind; player?: true };

export const LEGEND: Readonly<Record<string, Cell>> = {
  '#': { terrain: 'wall' },
  '.': { terrain: 'dirt' },
  ' ': { terrain: 'floor' },
  E: { terrain: 'exit' },
  P: { terrain: 'floor', player: true },
  O: { terrain: 'floor', obj: 'boulder' },
  '*': { terrain: 'floor', obj: 'diamond' },
  r: { terrain: 'floor', obj: 'redDiamond' },
  x: { terrain: 'cracked' },
  '^': { terrain: 'spikes' },
  _: { terrain: 'pit' },
  C: { terrain: 'checkpoint' },
  k: { terrain: 'floor', obj: 'keySilver' },
  K: { terrain: 'floor', obj: 'keyGold' },
  d: { terrain: 'doorSilver' },
  D: { terrain: 'doorGold' },
  h: { terrain: 'floor', obj: 'heart' },
  '=': { terrain: 'plate' },
  '/': { terrain: 'lever' },
  G: { terrain: 'gate' },
};

export interface ParseOptions {
  hearts?: number;
}

export class LevelError extends Error {}

export function parseLevel(def: LevelDef, opts: ParseOptions = {}): GameState {
  const height = def.map.length;
  if (height === 0) throw new LevelError(`${def.id}: map is empty`);
  const width = def.map[0].length;
  const s: GameState = {
    width,
    height,
    terrain: new Array<Terrain>(width * height).fill('floor'),
    objs: new Array(width * height).fill(null),
    player: { x: -1, y: -1, facing: 'down', alive: true },
    diamonds: 0,
    quota: def.quota,
    redDiamonds: 0,
    hearts: opts.hearts ?? 3,
    maxHearts: opts.hearts ?? 3,
    keys: { silver: 0, gold: 0 },
    gateOpen: false,
    leverOn: false,
    tick: 0,
    status: 'playing',
    nextId: 1,
    events: [],
  };
  let players = 0;
  def.map.forEach((row, y) => {
    if (row.length !== width) throw new LevelError(`${def.id}: row ${y} has length ${row.length}, expected ${width}`);
    [...row].forEach((ch, x) => {
      const cell = LEGEND[ch];
      if (!cell) throw new LevelError(`${def.id}: unknown map character "${ch}" at ${x},${y}`);
      const i = y * width + x;
      s.terrain[i] = cell.terrain;
      if (cell.obj) s.objs[i] = makeObj(s, cell.obj);
      if (cell.player) {
        players++;
        s.player.x = x;
        s.player.y = y;
      }
    });
  });
  if (players !== 1) throw new LevelError(`${def.id}: expected exactly one P, found ${players}`);
  return s;
}

export const countDiamonds = (s: GameState): number => s.objs.filter((o) => o?.kind === 'diamond').length;
