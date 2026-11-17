import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, type LevelDef } from '../../src/core/level.ts';
import { step } from '../../src/core/tick.ts';
import { objAt, terrainAt } from '../../src/core/grid.ts';
import { replay } from '../../src/core/replay.ts';
import type { GameState } from '../../src/core/types.ts';

const lvl = (map: string[], quota = 0): LevelDef => ({ id: 'T', name: 'test', world: 'test', quota, map });
const settle = (s: GameState, n = 10) => {
  for (let i = 0; i < n; i++) step(s);
};

test('player digs dirt and leaves floor behind', () => {
  const s = replay(lvl(['#####', '#P..#', '#####']), 'R');
  assert.equal(s.player.x, 2);
  assert.equal(terrainAt(s, 2, 1), 'floor');
});

test('walls block the player', () => {
  const s = replay(lvl(['###', '#P#', '###']), 'LRUD');
  assert.deepEqual([s.player.x, s.player.y], [1, 1]);
});

test('collecting diamonds counts toward the quota and opens the exit', () => {
  const s = replay(lvl(['######', '#P**E#', '######'], 2), 'RRR');
  assert.equal(s.diamonds, 2);
  assert.equal(s.status, 'won');
});

test('closed exit blocks the player', () => {
  const s = replay(lvl(['#####', '#P*E#', '#####'], 2), 'RR');
  assert.equal(s.status, 'playing');
  assert.equal(s.player.x, 2);
});

test('boulder falls into empty space and lands', () => {
  const s = parseLevel(lvl(['#####', '#O P#', '#   #', '#   #', '#####']));
  settle(s);
  assert.equal(objAt(s, 1, 3)?.kind, 'boulder');
  assert.equal(objAt(s, 1, 3)?.falling, false);
});

test('boulder resting on dirt stays put', () => {
  const s = parseLevel(lvl(['#####', '#O P#', '#.  #', '#####']));
  settle(s);
  assert.equal(objAt(s, 1, 1)?.kind, 'boulder');
});

test('falling boulder crushes the player (rule 4)', () => {
  const s = replay(lvl(['#####', '#O  #', '#.  #', '#.  #', '#P  #', '#####']), 'UU');
  // Digging up under the boulder: it now rests on the player's head, which is safe.
  assert.equal(s.status, 'playing');
  // Stepping back down leaves a gap; the boulder falls and catches the player.
  const s2 = replay(lvl(['#####', '#O  #', '#.  #', '#.  #', '#P  #', '#####']), 'UUD.');
  assert.equal(s2.status, 'dead');
});

test('boulder already resting on the player does not crush', () => {
  const s = replay(lvl(['#####', '#O  #', '#.  #', '#P  #', '#####']), 'U....');
  assert.equal(s.status, 'playing');
  assert.equal(objAt(s, 1, 1)?.kind, 'boulder');
});

test('player walks out from under a boulder sideways and survives', () => {
  const s = replay(lvl(['#####', '#O  #', '#.  #', '#P  #', '#####']), 'UR...');
  assert.equal(s.status, 'playing');
  assert.equal(objAt(s, 1, 3)?.kind, 'boulder');
});

test('push moves a boulder one cell sideways when the far cell is empty', () => {
  const s = replay(lvl(['######', '#PO  #', '######']), 'R');
  assert.equal(s.player.x, 2);
  assert.equal(objAt(s, 3, 1)?.kind, 'boulder');
});

test('cannot push two boulders in a row', () => {
  const s = replay(lvl(['######', '#POO #', '######']), 'R');
  assert.equal(s.player.x, 1);
});

test('cannot push a boulder vertically', () => {
  const s = replay(lvl(['###', '#P#', '#O#', '# #', '###']), 'D');
  assert.equal(s.player.y, 1);
});

test('pushed boulder over a gap falls', () => {
  const s = replay(lvl(['######', '#PO  #', '### ##', '#    #', '######']), 'R...');
  assert.equal(objAt(s, 3, 3)?.kind, 'boulder');
});

test('boulder rolls off another boulder to the left first', () => {
  const s = parseLevel(lvl(['#####', '# O #', '# O #', '#..P#', '#####']));
  settle(s);
  assert.equal(objAt(s, 2, 1), null);
  assert.equal(objAt(s, 1, 2)?.kind, 'boulder');
});

test('boulder never rolls onto the player', () => {
  const s = parseLevel(lvl(['#####', '# O #', '#PO##', '#...#', '#####']));
  settle(s);
  assert.equal(s.status, 'playing');
  assert.equal(objAt(s, 2, 1)?.kind, 'boulder');
});

test('falling diamond never crushes', () => {
  const s = replay(lvl(['#####', '#*  #', '#.  #', '#.  #', '#P  #', '#####']), 'UUD.');
  assert.equal(s.status, 'playing');
});

test('physics is deterministic', () => {
  const def = lvl(['########', '#O*O*O #', '#......#', '#P     #', '########']);
  const a = replay(def, 'URURURUR', 20);
  const b = replay(def, 'URURURUR', 20);
  assert.deepEqual(a, b);
});
