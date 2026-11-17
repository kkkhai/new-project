import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, type LevelDef } from '../../src/core/level.ts';
import { objAt, terrainAt } from '../../src/core/grid.ts';
import { replay } from '../../src/core/replay.ts';
import { exitOpen, step } from '../../src/core/tick.ts';

const lvl = (map: string[], quota = 0, extra: Partial<LevelDef> = {}): LevelDef => ({
  id: 'T', name: 'test', world: 'test', quota, map, ...extra,
});

test('the player slides across ice until something stops them, ignoring input', () => {
  const s = replay(lvl(['########', '#Piiii #', '########']), 'RUUUU');
  assert.equal(s.player.x, 6, 'slid to the far floor tile');
  const s2 = replay(lvl(['########', '#Piii##', '########'].map((r) => r.padEnd(8, '#'))), 'RLLL');
  assert.equal(s2.player.x, 4, 'stopped against the wall on the last ice tile');
});

test('stopping on ice lets you move again', () => {
  // R: step onto ice and slide to (3,1); the next input is swallowed while the slide ends against the wall.
  // D: onto ice (3,2), slide stops at the wall below; then L walks off onto the floor.
  const s = replay(lvl(['#######', '#Pii###', '#  i  #', '#######']), 'RR.D.L');
  assert.deepEqual([s.player.x, s.player.y], [2, 2]);
});

test('a pushed ice block slides across ice', () => {
  const s = replay(lvl(['#########', '#PQiiii #', '#########']), 'R...');
  assert.equal(objAt(s, 7, 1)?.kind, 'iceBlock');
});

test('thin ice cracks, then breaks into deadly icy water', () => {
  const s = replay(lvl(['######', '#Pj  #', '######']), 'RR');
  assert.equal(terrainAt(s, 2, 1), 'crackedIce');
  const s2 = replay(lvl(['######', '#Pj  #', '######']), 'RRLL');
  assert.equal(terrainAt(s2, 2, 1), 'icyWater');
  assert.equal(replay(lvl(['######', '#Pj  #', '######']), 'RRLLR').status, 'dead');
});

test('an ice block pushed into icy water freezes it solid', () => {
  const s = replay(lvl(['#######', '#PQw E#', '#######']), 'RRRR');
  assert.equal(terrainAt(s, 3, 1), 'floor');
  assert.equal(s.status, 'won');
});

test('a snowball grows after rolling 3 tiles and then crushes', () => {
  const s = replay(lvl(['########', '#Pn    #', '########']), 'RRR');
  assert.equal(objAt(s, 5, 1)?.kind, 'bigSnowball');
  const s2 = replay(lvl(['########', '#Pn    #', '########']), 'RRRR');
  assert.equal(s2.player.x, 4, 'too heavy to push once big');
});

test('the pickaxe breaks ice walls and ice blocks', () => {
  const s = parseLevel(lvl(['#######', '#aPIQ #', '#######']));
  step(s, { dir: 'left' });
  step(s, { dir: 'right' });
  step(s, { dir: 'right' });
  step(s, { action: true });
  assert.equal(terrainAt(s, 3, 1), 'floor');
  step(s, { dir: 'right' });
  step(s, { action: true });
  assert.equal(objAt(s, 4, 1), null);
});

test('a frost spirit turns the floor it leaves into ice', () => {
  const s = parseLevel(lvl(['#######', '#F   P#', '#######']));
  for (let i = 0; i < 4; i++) step(s);
  assert.equal(terrainAt(s, 1, 1), 'ice');
});

test('bats zigzag and cross pits', () => {
  const s = parseLevel(lvl(['#######', '#V_  P#', '#  _  #', '#######']));
  const seen: string[] = [];
  for (let i = 0; i < 6; i++) {
    step(s);
    seen.push(`${s.actors[0].x},${s.actors[0].y}`);
  }
  assert.ok(seen.includes('2,2') || seen.includes('2,1'), `bat path ${seen}`);
});

test('a yeti cub charges when it sees you along a line', () => {
  const s = replay(lvl(['#########', '#H     P#', '#########']), '.......');
  assert.equal(s.status, 'dead');
  const hidden = replay(lvl(['#########', '#H  #  P#', '#########']), '.......');
  assert.equal(hidden.status, 'playing');
});

test('the Great Yeti is hurt and stunned when it slams into an ice wall, which shatters', () => {
  const s = parseLevel(lvl(['#########', '#  N    #', '#  .    #', '#I T   P#', '#########']));
  const yeti = s.actors[0];
  // It sees the player and charges right... the player steps out of line first.
  step(s, { dir: 'up' });
  assert.equal(yeti.mode, 'idle');
  // Force a charge to the left into the ice wall.
  yeti.dir = 'left';
  yeti.mode = 'charge';
  for (let i = 0; i < 3; i++) step(s);
  assert.equal(yeti.mode, 'stun');
  assert.equal(yeti.x, 2);
  assert.equal(yeti.hp, 2);
  assert.equal(terrainAt(s, 1, 3), 'floor');
  assert.equal(exitOpen(s), false);
});
