import { DX, DY, type Dir, type GameState, type Input } from './types.ts';
import { inBounds, objAt, playerAt, setObj, setTerrain, terrainAt } from './grid.ts';
import { OBJ_RULES, objectCanEnter } from './rules.ts';

/**
 * Advance the game by one tick. Order (see docs/GDD.md, Technical architecture):
 * player input → pushes → physics (bottom-to-top) → win/death checks.
 * Mutates the state in place; clone first if you need the previous state.
 */
export function step(s: GameState, input: Input = {}): void {
  s.events = [];
  if (s.status !== 'playing') return;
  s.tick++;
  if (input.dir) movePlayer(s, input.dir);
  if (s.status === 'playing') physics(s);
}

export const exitOpen = (s: GameState): boolean => s.diamonds >= s.quota;

/** True if an object could move into (x, y) right now. */
export function freeForObject(s: GameState, x: number, y: number): boolean {
  return inBounds(s, x, y) && objectCanEnter(terrainAt(s, x, y)) && !objAt(s, x, y) && !playerAt(s, x, y);
}

function movePlayer(s: GameState, dir: Dir): void {
  const p = s.player;
  p.facing = dir;
  const nx = p.x + DX[dir];
  const ny = p.y + DY[dir];
  if (!inBounds(s, nx, ny)) return;
  const t = terrainAt(s, nx, ny);

  if (t === 'wall') return;

  if (t === 'exit') {
    if (!exitOpen(s)) return;
    p.x = nx;
    p.y = ny;
    s.status = 'won';
    s.events.push({ type: 'win', x: nx, y: ny });
    return;
  }

  const o = objAt(s, nx, ny);
  if (o) {
    const rule = OBJ_RULES[o.kind];
    if (rule.collectible) {
      setObj(s, nx, ny, null);
      if (o.kind === 'diamond') {
        s.diamonds++;
        if (s.diamonds === s.quota) s.events.push({ type: 'exitOpen', x: nx, y: ny });
      }
      s.events.push({ type: 'collect', x: nx, y: ny, kind: o.kind });
    } else if (rule.pushable && DY[dir] === 0 && !o.falling) {
      const bx = nx + DX[dir];
      if (!freeForObject(s, bx, ny)) return;
      setObj(s, nx, ny, null);
      setObj(s, bx, ny, o);
      s.events.push({ type: 'push', x: bx, y: ny, kind: o.kind });
    } else {
      return;
    }
  }

  if (t === 'dirt') {
    setTerrain(s, nx, ny, 'floor');
    s.events.push({ type: 'dig', x: nx, y: ny });
  }
  p.x = nx;
  p.y = ny;
  s.events.push({ type: 'step', x: nx, y: ny });
}

function physics(s: GameState): void {
  const moved = new Set<number>();
  for (let y = s.height - 1; y >= 0; y--) {
    for (let x = 0; x < s.width; x++) {
      const o = objAt(s, x, y);
      if (!o || moved.has(o.id) || !OBJ_RULES[o.kind].gravity) continue;
      updateGravityObject(s, x, y, moved);
      if (s.status !== 'playing') return;
    }
  }
}

function updateGravityObject(s: GameState, x: number, y: number, moved: Set<number>): void {
  const o = objAt(s, x, y)!;
  const rule = OBJ_RULES[o.kind];
  const wasFalling = o.falling;

  // 1. Fall straight down.
  if (freeForObject(s, x, y + 1)) {
    setObj(s, x, y, null);
    setObj(s, x, y + 1, o);
    o.falling = true;
    moved.add(o.id);
    return;
  }

  // 2. Land on the player: a falling crusher kills; a resting object never does.
  if (playerAt(s, x, y + 1)) {
    if (wasFalling && rule.crushes) {
      s.player.alive = false;
      s.status = 'dead';
      s.events.push({ type: 'crush', x, y: y + 1, kind: o.kind });
    }
    o.falling = false;
    return;
  }

  // 3. Roll off round objects: left first, then right.
  const below = objAt(s, x, y + 1);
  if (below && OBJ_RULES[below.kind].round) {
    for (const dx of [-1, 1]) {
      if (freeForObject(s, x + dx, y) && freeForObject(s, x + dx, y + 1)) {
        setObj(s, x, y, null);
        setObj(s, x + dx, y, o);
        o.falling = true;
        moved.add(o.id);
        return;
      }
    }
  }

  // 4. Come to rest.
  o.falling = false;
  if (wasFalling) s.events.push({ type: 'land', x, y, kind: o.kind });
}
