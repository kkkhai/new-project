import { makeObj } from './grid.ts';
import type { ActorKind, Dir, GameState, ObjKind, Terrain, ToolKind } from './types.ts';

/**
 * A level as stored in levels/<world>/<id>.json.
 * The map is an array of equal-length strings; see LEGEND below.
 */
export interface LevelDef {
  id: string;
  /** Tools the player already owns when the level starts (earned in earlier levels). */
  tools?: ToolKind[];
  name: string;
  world: string;
  quota: number;
  parTimeSec?: number;
  difficulty?: number;
  map: string[];
  /** Moves that finish the level: U D L R, and "." to wait one tick. Checked in CI. */
  solution?: string;
  /** A route that also collects every red diamond. Checked in CI. */
  secretSolution?: string;
  notes?: string;
}

type Cell = { terrain: Terrain; obj?: ObjKind; player?: true; actor?: ActorKind; dir?: Dir };

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
  v: { terrain: 'vines' },
  t: { terrain: 'thorns' },
  '~': { terrain: 'water' },
  m: { terrain: 'floor', obj: 'machete' },
  S: { terrain: 'floor', actor: 'snake', dir: 'right' },
  s: { terrain: 'floor', actor: 'snake', dir: 'left' },
  W: { terrain: 'floor', actor: 'spider', dir: 'down' },
  M: { terrain: 'floor', actor: 'monkey', dir: 'right' },
  B: { terrain: 'floor', actor: 'idol', dir: 'right' },
  c: { terrain: 'crumble' },
  q: { terrain: 'quicksand' },
  '%': { terrain: 'packedSand' },
  o: { terrain: 'floor', obj: 'sand' },
  u: { terrain: 'floor', obj: 'shovel' },
  '>': { terrain: 'dartRight' },
  '<': { terrain: 'dartLeft' },
  Z: { terrain: 'floor', actor: 'scorpion', dir: 'down' },
  z: { terrain: 'floor', actor: 'scorpion', dir: 'up' },
  A: { terrain: 'floor', actor: 'scarab', dir: 'left' },
  U: { terrain: 'floor', actor: 'mummy', dir: 'left' },
  Y: { terrain: 'floor', actor: 'serpent', dir: 'left' },
  i: { terrain: 'ice' },
  j: { terrain: 'thinIce' },
  w: { terrain: 'icyWater' },
  I: { terrain: 'iceWall' },
  Q: { terrain: 'floor', obj: 'iceBlock' },
  n: { terrain: 'floor', obj: 'snowball' },
  N: { terrain: 'floor', obj: 'bigSnowball' },
  a: { terrain: 'floor', obj: 'pickaxe' },
  V: { terrain: 'floor', actor: 'bat', dir: 'right' },
  H: { terrain: 'floor', actor: 'yetiCub', dir: 'left' },
  F: { terrain: 'floor', actor: 'frostSpirit', dir: 'right' },
  T: { terrain: 'floor', actor: 'yeti', dir: 'left' },
};

const ACTOR_HP: Partial<Record<ActorKind, number>> = { idol: 3, serpent: 3, yeti: 3 };

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
    tools: { machete: false, shovel: false, pickaxe: false },
    actors: [],
    timers: {},
    sinking: 0,
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
      if (cell.actor) {
        s.actors.push({
          id: s.nextId++, kind: cell.actor, x, y, dir: cell.dir ?? 'right', alive: true,
          wait: 0, hp: ACTOR_HP[cell.actor] ?? 1, homeX: x, homeY: y, carrying: 0, mode: 'idle',
        });
      }
      if (cell.player) {
        players++;
        s.player.x = x;
        s.player.y = y;
      }
    });
  });
  for (const tool of def.tools ?? []) s.tools[tool] = true;
  if (players !== 1) throw new LevelError(`${def.id}: expected exactly one P, found ${players}`);
  return s;
}

export const countRedDiamonds = (s: GameState): number => s.objs.filter((o) => o?.kind === 'redDiamond').length;

export const countDiamonds = (s: GameState): number => s.objs.filter((o) => o?.kind === 'diamond').length;
