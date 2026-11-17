import { DX, DY, type Dir, type GameState, type Input, type Obj } from './types.ts';
import { inBounds, objAt, playerAt, setObj, setTerrain, terrainAt } from './grid.ts';
import { OBJ_RULES, objectCanEnter, solidForPlayer } from './rules.ts';

/**
 * Advance the game by one tick. Order (see docs/GDD.md, Technical architecture):
 * player input → pushes → physics (bottom-to-top) → triggers → win/death checks.
 * Mutates the state in place; clone first if you need the previous state.
 */
export function step(s: GameState, input: Input = {}): void {
  s.events = [];
  if (s.status !== 'playing') return;
  s.tick++;
  if (input.dir) movePlayer(s, input.dir);
  if (s.status === 'playing') physics(s);
  if (s.status === 'playing') updateGates(s);
}

export const exitOpen = (s: GameState): boolean => s.diamonds >= s.quota;

/** True if an object could move into (x, y) right now. */
export function freeForObject(s: GameState, x: number, y: number): boolean {
  return inBounds(s, x, y) && objectCanEnter(terrainAt(s, x, y), s.gateOpen) && !objAt(s, x, y) && !playerAt(s, x, y);
}

function kill(s: GameState, type: 'crush' | 'spiked' | 'fall', x: number, y: number): void {
  s.player.alive = false;
  s.status = 'dead';
  s.events.push({ type, x, y });
}

function movePlayer(s: GameState, dir: Dir): void {
  const p = s.player;
  p.facing = dir;
  const nx = p.x + DX[dir];
  const ny = p.y + DY[dir];
  if (!inBounds(s, nx, ny)) return;
  const t = terrainAt(s, nx, ny);

  if (t === 'lever') {
    s.leverOn = !s.leverOn;
    s.events.push({ type: 'lever', x: nx, y: ny });
    return;
  }
  if (solidForPlayer(t)) return;
  if (t === 'gate' && !s.gateOpen) return;
  if (t === 'doorSilver' || t === 'doorGold') {
    const key = t === 'doorSilver' ? 'silver' : 'gold';
    if (s.keys[key] === 0) return;
    s.keys[key]--;
    setTerrain(s, nx, ny, 'floor');
    s.events.push({ type: 'unlock', x: nx, y: ny, kind: key });
  }
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
      collect(s, o, nx, ny);
    } else if (rule.pushable && DY[dir] === 0 && !o.falling) {
      const bx = nx + DX[dir];
      if (!freeForObject(s, bx, ny)) return;
      setObj(s, nx, ny, null);
      placeObject(s, o, bx, ny);
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

  if (t === 'spikes') kill(s, 'spiked', nx, ny);
  else if (t === 'pit') kill(s, 'fall', nx, ny);
  else if (t === 'checkpoint') s.events.push({ type: 'checkpoint', x: nx, y: ny });
}

function collect(s: GameState, o: Obj, x: number, y: number): void {
  switch (o.kind) {
    case 'diamond':
      s.diamonds++;
      if (s.diamonds === s.quota) s.events.push({ type: 'exitOpen', x, y });
      break;
    case 'redDiamond':
      s.redDiamonds++;
      break;
    case 'keySilver':
      s.keys.silver++;
      break;
    case 'keyGold':
      s.keys.gold++;
      break;
    case 'heart':
      s.hearts = Math.min(s.maxHearts, s.hearts + 1);
      break;
    case 'boulder':
      break;
  }
  s.events.push({ type: 'collect', x, y, kind: o.kind });
}

/** Put an object into a free cell; a pit swallows it and becomes floor. Returns false if swallowed. */
function placeObject(s: GameState, o: Obj, x: number, y: number): boolean {
  if (terrainAt(s, x, y) === 'pit') {
    setTerrain(s, x, y, 'floor');
    s.events.push({ type: 'fill', x, y, kind: o.kind });
    return false;
  }
  setObj(s, x, y, o);
  return true;
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

  // 1. Fall straight down (into a pit: fill it).
  if (freeForObject(s, x, y + 1)) {
    setObj(s, x, y, null);
    o.falling = true;
    moved.add(o.id);
    placeObject(s, o, x, y + 1);
    return;
  }

  // 2. Land on the player: a falling crusher kills; a resting object never does.
  if (playerAt(s, x, y + 1)) {
    if (wasFalling && rule.crushes) kill(s, 'crush', x, y + 1);
    o.falling = false;
    return;
  }

  // 3. A falling boulder breaks a cracked wall it lands on.
  if (wasFalling && rule.crushes && terrainAt(s, x, y + 1) === 'cracked') {
    setTerrain(s, x, y + 1, 'floor');
    s.events.push({ type: 'break', x, y: y + 1 });
    o.falling = true; // keeps falling next tick
    return;
  }

  // 4. Roll off round objects: left first, then right.
  const below = objAt(s, x, y + 1);
  if (below && OBJ_RULES[below.kind].round) {
    for (const dx of [-1, 1]) {
      if (freeForObject(s, x + dx, y) && freeForObject(s, x + dx, y + 1)) {
        setObj(s, x, y, null);
        o.falling = true;
        moved.add(o.id);
        placeObject(s, o, x + dx, y);
        return;
      }
    }
  }

  // 5. Come to rest.
  o.falling = false;
  if (wasFalling) s.events.push({ type: 'land', x, y, kind: o.kind });
}

/** Gates open while any plate is pressed or the lever is on; they never close on something. */
function updateGates(s: GameState): void {
  let pressed = s.leverOn;
  let gateOccupied = false;
  for (let i = 0; i < s.terrain.length; i++) {
    const t = s.terrain[i];
    if (t !== 'plate' && t !== 'gate') continue;
    const x = i % s.width;
    const y = (i - x) / s.width;
    const occupied = !!s.objs[i] || playerAt(s, x, y);
    if (t === 'plate' && occupied) pressed = true;
    if (t === 'gate' && occupied) gateOccupied = true;
  }
  const open = pressed || (s.gateOpen && gateOccupied);
  if (open !== s.gateOpen) {
    s.gateOpen = open;
    s.events.push({ type: open ? 'gateOpen' : 'gateClose', x: s.player.x, y: s.player.y });
  }
}
