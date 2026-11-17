import type { Actor, GameState, Obj, ObjKind, Terrain } from './types.ts';

export const idx = (s: GameState, x: number, y: number): number => y * s.width + x;

export const inBounds = (s: GameState, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < s.width && y < s.height;

export const terrainAt = (s: GameState, x: number, y: number): Terrain =>
  inBounds(s, x, y) ? s.terrain[idx(s, x, y)] : 'wall';

export const objAt = (s: GameState, x: number, y: number): Obj | null =>
  inBounds(s, x, y) ? s.objs[idx(s, x, y)] : null;

export const playerAt = (s: GameState, x: number, y: number): boolean =>
  s.player.alive && s.player.x === x && s.player.y === y;

export const setTerrain = (s: GameState, x: number, y: number, t: Terrain): void => {
  s.terrain[idx(s, x, y)] = t;
};

export const setObj = (s: GameState, x: number, y: number, o: Obj | null): void => {
  s.objs[idx(s, x, y)] = o;
};

export const makeObj = (s: GameState, kind: ObjKind): Obj => ({ id: s.nextId++, kind, falling: false });

/** Fast deep copy (used by checkpoints, undo and the solvers). */
export const cloneState = (s: GameState): GameState => ({
  ...s,
  terrain: s.terrain.slice(),
  objs: s.objs.map((o) => (o ? { ...o } : null)),
  player: { ...s.player },
  keys: { ...s.keys },
  tools: { ...s.tools },
  actors: s.actors.map((a) => ({ ...a })),
  timers: { ...s.timers },
  events: s.events.slice(),
});

export const actorAt = (s: GameState, x: number, y: number): Actor | undefined =>
  s.actors.find((a) => a.alive && a.x === x && a.y === y);
