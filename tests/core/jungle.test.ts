import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, type LevelDef } from '../../src/core/level.ts';
import { objAt, terrainAt } from '../../src/core/grid.ts';
import { replay } from '../../src/core/replay.ts';
import { exitOpen, step } from '../../src/core/tick.ts';

const lvl = (map: string[], quota = 0, extra: Partial<LevelDef> = {}): LevelDef => ({
  id: 'T', name: 'test', world: 'test', quota, map, ...extra,
});

test('vines block until cut with the machete', () => {
  const s = replay(lvl(['######', '#Pv E#', '######']), 'R');
  assert.equal(s.player.x, 1);
  const s2 = parseLevel(lvl(['#######', '#mPv E#', '#######']));
  step(s2, { dir: 'left' }); // pick up machete
  step(s2, { dir: 'right' });
  step(s2, { dir: 'right' }); // blocked by vines, now facing them
  step(s2, { action: true });
  assert.equal(terrainAt(s2, 3, 1), 'floor');
  assert.equal(s2.tools.machete, true);
});

test('the machete does nothing without owning it', () => {
  const s = parseLevel(lvl(['######', '#Pv E#', '######']));
  step(s, { dir: 'right' });
  step(s, { action: true });
  assert.equal(terrainAt(s, 2, 1), 'vines');
});

test('tools listed on the level are owned from the start', () => {
  const s = parseLevel(lvl(['#####', '#Pt #', '#####'], 0, { tools: ['machete'] }));
  step(s, { dir: 'right' }); // facing right is already set; walking into thorns would hurt, so face first via action
  assert.equal(s.status, 'dead', 'walking into thorns hurts');
  const s2 = parseLevel(lvl(['#####', '#Pt #', '#####'], 0, { tools: ['machete'] }));
  s2.player.facing = 'right';
  step(s2, { action: true });
  assert.equal(terrainAt(s2, 2, 1), 'floor');
});

test('water blocks the player; a boulder pushed in bridges it', () => {
  assert.equal(replay(lvl(['######', '#P~ E#', '######']), 'R').player.x, 1);
  const s = replay(lvl(['#######', '#PO~ E#', '#######']), 'RRRR');
  assert.equal(terrainAt(s, 3, 1), 'floor');
  assert.equal(s.status, 'won');
});

test('a snake patrols, turns at walls and bites', () => {
  const s = parseLevel(lvl(['#######', '#S   #P', '#######'].map((r) => r.padEnd(7, '#'))));
  const xs: number[] = [];
  for (let i = 0; i < 20; i++) {
    step(s);
    xs.push(s.actors[0].x);
  }
  assert.ok(Math.max(...xs) === 4 && Math.min(...xs) === 1, `patrol range ${xs}`);
  const bite = replay(lvl(['#######', '#S  P #', '#######']), '......');
  assert.equal(bite.status, 'dead');
});

test('walking into a snake is deadly', () => {
  const s = replay(lvl(['######', '#PS ##', '######']), 'R');
  assert.equal(s.status, 'dead');
});

test('a falling boulder kills an enemy', () => {
  const s = parseLevel(lvl(['#######', '#O   P#', '#     #', '#S    #', '#######']));
  s.actors[0].wait = 99; // hold the snake under the boulder
  for (let i = 0; i < 3; i++) step(s);
  assert.equal(s.actors[0].alive, false);
  assert.equal(objAt(s, 1, 3)?.kind, 'boulder');
});

test('a resting boulder does not hurt an enemy below it', () => {
  const s = parseLevel(lvl(['#####', '#O P#', '#S###', '#####']));
  for (let i = 0; i < 6; i++) step(s);
  assert.equal(s.actors[0].alive, true);
});

test('a spider drops when the player passes below and kills on contact', () => {
  const s = replay(lvl(['#####', '#W  #', '#   #', '#   #', '#  P#', '#####']), 'LL....');
  assert.equal(s.status, 'dead');
});

test('a spider climbs back home after dropping', () => {
  const s = parseLevel(lvl(['######', '#W   #', '#    #', '#   P#', '######']));
  step(s, { dir: 'left' });
  step(s, { dir: 'left' });
  step(s, { dir: 'left' }); // under the spider at (1,3): it drops
  step(s, { dir: 'right' });
  step(s, { dir: 'right' });
  for (let i = 0; i < 8; i++) step(s);
  assert.equal(s.status, 'playing');
  assert.equal(s.actors[0].y, 1);
  assert.equal(s.actors[0].mode, 'idle');
});

test('a monkey steals a diamond and drops it when crushed', () => {
  const s = parseLevel(lvl(['#######', '#P*M  #', '#######'], 1));
  step(s, { dir: 'right' }); // collect the diamond
  assert.equal(s.diamonds, 1);
  for (let i = 0; i < 3 && s.diamonds === 1; i++) step(s, { dir: 'right' });
  assert.equal(s.diamonds, 0, 'monkey took it');
  assert.equal(s.actors[0].carrying, 1);
  // Crush the monkey: boulder falls on it.
  const s2 = parseLevel(lvl(['#####', '#O  #', '#   #', '#M P#', '#####']));
  s2.actors[0].carrying = 1;
  s2.actors[0].wait = 99;
  for (let i = 0; i < 3; i++) step(s2);
  assert.equal(s2.actors[0].alive, false);
  assert.equal(objAt(s2, 1, 3)?.kind, 'diamond', 'the stolen diamond is dropped where the monkey died');
});

test('the idol boss takes three boulder hits; the exit opens only when it is defeated', () => {
  const s = parseLevel(lvl(['#######', '#O O O#', '#  . .#', '#B    #', '#P   E#', '#######']));
  const boss = s.actors[0];
  boss.wait = 1000; // hold the boss still; move it by hand under each boulder
  assert.equal(exitOpen(s), false);
  step(s);
  step(s);
  assert.equal(boss.hp, 2);
  assert.equal(objAt(s, 1, 2), null, 'boulder shatters on the boss');
  boss.x = 3;
  s.terrain[2 * s.width + 3] = 'floor';
  step(s);
  step(s);
  assert.equal(boss.hp, 1);
  boss.x = 5;
  s.terrain[2 * s.width + 5] = 'floor';
  step(s);
  step(s);
  assert.equal(boss.alive, false);
  assert.ok(s.events.some((e) => e.type === 'bossDefeated'));
  assert.equal(exitOpen(s), true);
});
