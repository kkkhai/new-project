import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, type LevelDef } from '../../src/core/level.ts';
import { objAt, terrainAt } from '../../src/core/grid.ts';
import { replay } from '../../src/core/replay.ts';
import { DART_PERIOD } from '../../src/core/rules.ts';
import { exitOpen, step } from '../../src/core/tick.ts';

const lvl = (map: string[], quota = 0, extra: Partial<LevelDef> = {}): LevelDef => ({
  id: 'T', name: 'test', world: 'test', quota, map, ...extra,
});

test('a crumbling floor collapses into a pit about a second after you leave it', () => {
  const s = replay(lvl(['######', '#Pc  #', '######']), 'RR');
  assert.equal(terrainAt(s, 2, 1), 'crumbling');
  for (let i = 0; i < 6; i++) step(s);
  assert.equal(terrainAt(s, 2, 1), 'pit');
});

test('standing on a crumbling floor does not start it; staying on a collapsing one kills', () => {
  const s = replay(lvl(['#####', '#cP #', '#####']), 'L........');
  assert.equal(terrainAt(s, 1, 1), 'crumble');
  const s2 = replay(lvl(['#####', '#Pcc#', '#####']), 'RRL......');
  assert.equal(s2.status, 'dead', 'went back onto the collapsing tile and fell');
});

test('quicksand: two tiles are safe to cross, standing still sinks you', () => {
  assert.equal(replay(lvl(['######', '#Pqq #', '######']), 'RRR').status, 'playing');
  assert.equal(replay(lvl(['######', '#Pqqq#', '######']), 'RRR').status, 'dead');
  assert.equal(replay(lvl(['#####', '#Pq #', '#####']), 'R..').status, 'dead');
});

test('the shovel digs packed sand and fills quicksand', () => {
  const s = parseLevel(lvl(['#######', '#uP%q #', '#######']));
  step(s, { dir: 'left' });
  step(s, { dir: 'right' });
  step(s, { dir: 'right' }); // bump the packed sand to face it
  step(s, { action: true });
  assert.equal(terrainAt(s, 3, 1), 'floor');
  step(s, { dir: 'right' });
  step(s, { action: true });
  assert.equal(terrainAt(s, 4, 1), 'floor');
});

test('sand piles fall but never crush and can be pushed', () => {
  const s = replay(lvl(['#####', '#o  #', '#.  #', '#.  #', '#P  #', '#####']), 'UUD..');
  assert.equal(s.status, 'playing');
  const s2 = replay(lvl(['######', '#Po  #', '######']), 'R');
  assert.equal(objAt(s2, 3, 1)?.kind, 'sand');
});

test('dart traps fire along their row on a timer and boulders block them', () => {
  const def = lvl(['#######', '#>  P #', '#######']);
  const s = parseLevel(def);
  for (let i = 0; i < DART_PERIOD; i++) step(s);
  assert.equal(s.status, 'dead');
  const shielded = parseLevel(lvl(['#######', '#> O P#', '#######']));
  for (let i = 0; i < DART_PERIOD * 2; i++) step(shielded);
  assert.equal(shielded.status, 'playing');
});

test('a scorpion patrols up and down', () => {
  const s = parseLevel(lvl(['#####', '#Z P#', '#   #', '#   #', '#####']));
  const ys: number[] = [];
  for (let i = 0; i < 12; i++) {
    step(s);
    ys.push(s.actors[0].y);
  }
  assert.ok(Math.max(...ys) === 3 && Math.min(...ys) === 1, `${ys}`);
});

test('a mummy chases the player; a scarab only when close', () => {
  const m = replay(lvl(['########', '#U     #', '#     P#', '########']), '..........................');
  assert.equal(m.status, 'dead');
  const far = parseLevel(lvl(['############', '#A        P#', '############']));
  for (let i = 0; i < 6; i++) step(far);
  assert.equal(far.actors[0].x, 1, 'scarab waits while the player is far away');
});

test('the serpent boss falls when a crumbling floor collapses under it, then returns home', () => {
  const s = parseLevel(lvl(['############', '#Y Pccc    #', '############']));
  const boss = s.actors[0];
  // Walk right across the crumbling floor; the serpent follows onto it as it collapses.
  for (let i = 0; i < 7; i++) step(s, { dir: 'right' });
  for (let i = 0; i < 5; i++) step(s);
  assert.equal(s.status, 'playing');
  assert.equal(boss.hp, 2);
  assert.deepEqual([boss.x, boss.y], [1, 1], 'back at its start');
  assert.equal(exitOpen(s), false);
});
