import { DX, DY, type Actor, type Dir, type GameState, type Input, type Obj } from './types.ts';
import { actorAt, inBounds, makeObj, objAt, playerAt, setObj, setTerrain, terrainAt } from './grid.ts';
import { ACTOR_SPEED, OBJ_RULES, TOOL_TARGETS, actorCanEnter, fillsWithObject, objectCanEnter, solidForPlayer } from './rules.ts';

/**
 * Advance the game by one tick. Order (see docs/GDD.md, Technical architecture):
 * player input → pushes → physics (bottom-to-top) → triggers → win/death checks.
 * Mutates the state in place; clone first if you need the previous state.
 */
export function step(s: GameState, input: Input = {}): void {
  s.events = [];
  if (s.status !== 'playing') return;
  s.tick++;
  if (input.action) useTool(s);
  else if (input.dir) movePlayer(s, input.dir);
  if (s.status === 'playing') physics(s);
  if (s.status === 'playing') updateActors(s);
  if (s.status === 'playing') updateGates(s);
}

export const bossAlive = (s: GameState): boolean => s.actors.some((a) => a.alive && a.kind === 'idol');

export const exitOpen = (s: GameState): boolean => s.diamonds >= s.quota && !bossAlive(s);

/** True if an object could move into (x, y) right now. */
export function freeForObject(s: GameState, x: number, y: number): boolean {
  return (
    inBounds(s, x, y) &&
    objectCanEnter(terrainAt(s, x, y), s.gateOpen) &&
    !objAt(s, x, y) &&
    !playerAt(s, x, y) &&
    !actorAt(s, x, y)
  );
}

export function freeForActor(s: GameState, x: number, y: number): boolean {
  return (
    inBounds(s, x, y) &&
    actorCanEnter(terrainAt(s, x, y), s.gateOpen) &&
    !objAt(s, x, y) &&
    !playerAt(s, x, y) &&
    !actorAt(s, x, y)
  );
}

function kill(s: GameState, type: 'crush' | 'spiked' | 'fall' | 'bitten', x: number, y: number): void {
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

  const enemy = actorAt(s, nx, ny);
  if (enemy) {
    if (enemy.kind === 'monkey') {
      steal(s, enemy);
      return;
    }
    p.x = nx;
    p.y = ny;
    kill(s, 'bitten', nx, ny);
    return;
  }

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

  if (t === 'spikes' || t === 'thorns') kill(s, 'spiked', nx, ny);
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
    case 'machete':
    case 'shovel':
    case 'pickaxe':
      s.tools[o.kind] = true;
      s.events.push({ type: 'tool', x, y, kind: o.kind });
      break;
    case 'boulder':
      break;
  }
  s.events.push({ type: 'collect', x, y, kind: o.kind });
}

function useTool(s: GameState): void {
  const p = s.player;
  const x = p.x + DX[p.facing];
  const y = p.y + DY[p.facing];
  const target = TOOL_TARGETS[terrainAt(s, x, y)];
  if (!inBounds(s, x, y) || !target || !s.tools[target.tool]) return;
  setTerrain(s, x, y, target.becomes);
  s.events.push({ type: 'cut', x, y, kind: target.tool });
}

function steal(s: GameState, monkey: Actor): void {
  monkey.dir = monkey.dir === 'left' ? 'right' : 'left';
  if (s.diamonds === 0 || monkey.carrying > 0) return;
  s.diamonds--;
  monkey.carrying = 1;
  s.events.push({ type: 'steal', x: monkey.x, y: monkey.y });
}

/** Put an object into a free cell; a pit or river swallows it and becomes floor. Returns false if swallowed. */
function placeObject(s: GameState, o: Obj, x: number, y: number): boolean {
  const t = terrainAt(s, x, y);
  if (fillsWithObject(t)) {
    setTerrain(s, x, y, 'floor');
    s.events.push({ type: t === 'water' ? 'splash' : 'fill', x, y, kind: o.kind });
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

  // 3. Land on an enemy: a falling boulder kills it (the boss loses a heart and the boulder shatters).
  const enemy = actorAt(s, x, y + 1);
  if (enemy) {
    if (wasFalling && rule.crushes) {
      if (enemy.kind === 'idol') {
        setObj(s, x, y, null);
        hitBoss(s, enemy);
      } else {
        killActor(s, enemy);
        o.falling = true; // the cell is free again; keep falling next tick
      }
      return;
    }
    o.falling = false;
    return;
  }

  // 4. A falling boulder breaks a cracked wall it lands on.
  if (wasFalling && rule.crushes && terrainAt(s, x, y + 1) === 'cracked') {
    setTerrain(s, x, y + 1, 'floor');
    s.events.push({ type: 'break', x, y: y + 1 });
    o.falling = true; // keeps falling next tick
    return;
  }

  // 5. Roll off round objects: left first, then right.
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

  // 6. Come to rest.
  o.falling = false;
  if (wasFalling) s.events.push({ type: 'land', x, y, kind: o.kind });
}

function killActor(s: GameState, a: Actor): void {
  a.alive = false;
  s.events.push({ type: 'enemyKilled', x: a.x, y: a.y, kind: a.kind });
  if (a.carrying > 0 && !objAt(s, a.x, a.y)) setObj(s, a.x, a.y, makeObj(s, 'diamond'));
}

function hitBoss(s: GameState, boss: Actor): void {
  boss.hp--;
  s.events.push({ type: 'bossHit', x: boss.x, y: boss.y, kind: boss.kind });
  if (boss.hp > 0) return;
  boss.alive = false;
  s.events.push({ type: 'bossDefeated', x: boss.x, y: boss.y, kind: boss.kind });
  if (exitOpen(s)) s.events.push({ type: 'exitOpen', x: boss.x, y: boss.y });
}

function updateActors(s: GameState): void {
  for (const a of s.actors) {
    if (!a.alive) continue;
    if (a.wait > 0) {
      a.wait--;
      continue;
    }
    a.wait = ACTOR_SPEED[a.kind] - 1;
    if (a.kind === 'spider') moveSpider(s, a);
    else patrol(s, a);
    if (s.status !== 'playing') return;
  }
}

/** Walk left/right; turn around at anything in the way. Touching the player bites (monkeys steal). */
function patrol(s: GameState, a: Actor): void {
  const nx = a.x + DX[a.dir];
  if (playerAt(s, nx, a.y)) {
    if (a.kind === 'monkey') steal(s, a);
    else kill(s, 'bitten', nx, a.y);
    return;
  }
  if (freeForActor(s, nx, a.y)) a.x = nx;
  else a.dir = a.dir === 'left' ? 'right' : 'left';
}

/** Hang until the player is directly below with a clear drop, fall to the floor, then climb home. */
function moveSpider(s: GameState, a: Actor): void {
  const p = s.player;
  if (a.mode === 'idle') {
    if (p.x !== a.x || p.y <= a.y) return;
    for (let y = a.y + 1; y < p.y; y++) if (!freeForActor(s, a.x, y)) return;
    a.mode = 'drop';
  }
  if (a.mode === 'drop') {
    if (playerAt(s, a.x, a.y + 1)) {
      kill(s, 'bitten', a.x, a.y + 1);
      return;
    }
    if (freeForActor(s, a.x, a.y + 1)) a.y++;
    else a.mode = 'climb';
    return;
  }
  // climb: one cell every other tick
  a.wait = 1;
  if (a.y > a.homeY && freeForActor(s, a.x, a.y - 1)) a.y--;
  if (a.y === a.homeY) a.mode = 'idle';
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
    const occupied = !!s.objs[i] || playerAt(s, x, y) || !!actorAt(s, x, y);
    if (t === 'plate' && occupied) pressed = true;
    if (t === 'gate' && occupied) gateOccupied = true;
  }
  const open = pressed || (s.gateOpen && gateOccupied);
  if (open !== s.gateOpen) {
    s.gateOpen = open;
    s.events.push({ type: open ? 'gateOpen' : 'gateClose', x: s.player.x, y: s.player.y });
  }
}
