import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LevelDef } from '../../src/core/level.ts';
import { objAt, terrainAt } from '../../src/core/grid.ts';
import { replay } from '../../src/core/replay.ts';
import { Session } from '../../src/core/session.ts';
import { parseInputs } from '../../src/core/replay.ts';

const lvl = (map: string[], quota = 0): LevelDef => ({ id: 'T', name: 'test', world: 'test', quota, map });
const play = (sess: Session, moves: string) => parseInputs(moves).map((input) => sess.tick(input));

test('silver key opens a silver door and is used up', () => {
  const s = replay(lvl(['#######', '#Pkdd #', '#######']), 'RRR');
  assert.equal(s.player.x, 3);
  assert.equal(terrainAt(s, 3, 1), 'floor');
  assert.equal(s.keys.silver, 0);
  assert.equal(terrainAt(s, 4, 1), 'doorSilver', 'second door stays locked');
});

test('gold door ignores silver keys', () => {
  const s = replay(lvl(['######', '#PkD #', '######']), 'RR');
  assert.equal(s.player.x, 2);
});

test('spikes and pits kill the player', () => {
  assert.equal(replay(lvl(['#####', '#P^ #', '#####']), 'R').status, 'dead');
  assert.equal(replay(lvl(['#####', '#P_ #', '#####']), 'R').status, 'dead');
});

test('a boulder pushed into a pit fills it and makes floor', () => {
  const s = replay(lvl(['#######', '#PO_ E#', '#######']), 'RRRR');
  assert.equal(terrainAt(s, 3, 1), 'floor');
  assert.equal(objAt(s, 3, 1), null);
  assert.equal(s.status, 'won');
});

test('a falling boulder fills a pit below it', () => {
  const s = replay(lvl(['#####', '#PO #', '#._ #', '#####']), 'D...');
  assert.equal(terrainAt(s, 2, 2), 'floor');
});

test('a falling boulder breaks a cracked wall and keeps falling', () => {
  // Dig under the boulder, then step back out so it drops onto the cracked wall.
  const s2 = replay(lvl(['#####', '#PO #', '# . #', '# x #', '#   #', '#####']), 'DRL.....');
  assert.equal(terrainAt(s2, 2, 3), 'floor');
  assert.equal(objAt(s2, 2, 4)?.kind, 'boulder');
});

test('a resting boulder does not break a cracked wall', () => {
  const s = replay(lvl(['#####', '#PO #', '# x #', '#   #', '#####']), '.....');
  assert.equal(terrainAt(s, 2, 2), 'cracked');
});

test('a boulder on a plate holds the gate open; leaving the plate closes it', () => {
  const map = ['########', '#PO=G E#', '########'];
  // Push the boulder onto the plate: gate opens, but the boulder now blocks the way.
  const s = replay(lvl(map), 'R');
  assert.equal(s.gateOpen, true);
  // Standing on the plate yourself also opens it.
  const s2 = replay(lvl(['########', '#P=G  E#', '########']), 'R');
  assert.equal(s2.gateOpen, true);
  const s3 = replay(lvl(['########', '#P=G  E#', '########']), 'RL');
  assert.equal(s3.gateOpen, false);
});

test('a closed gate blocks the player and objects', () => {
  const s = replay(lvl(['######', '#PG E#', '######']), 'RR');
  assert.equal(s.player.x, 1);
});

test('bumping the lever toggles the gate', () => {
  const s = replay(lvl(['#######', '#/PG E#', '#######']), 'LRRR');
  assert.equal(s.leverOn, true);
  assert.equal(s.status, 'won');
});

test('gate does not close on the player standing in it', () => {
  const s = replay(lvl(['#########', '#P=G   E#', '#########']), 'RR');
  // Player stepped off the plate into the gate: it must stay open around them.
  assert.equal(s.player.x, 3);
  assert.equal(s.gateOpen, true);
  const s2 = replay(lvl(['#########', '#P=G   E#', '#########']), 'RRR');
  assert.equal(s2.gateOpen, false, 'closes once the gate cell is empty');
});

test('red diamonds count separately from the quota; hearts cap at max', () => {
  const s = replay(lvl(['#######', '#Prh*E#', '#######'], 1), 'RRRR');
  assert.equal(s.redDiamonds, 1);
  assert.equal(s.hearts, 3);
  assert.equal(s.status, 'won');
});

test('session: dying costs a heart and returns to the last checkpoint', () => {
  const sess = new Session(lvl(['#########', '#P C *^ #', '#########']));
  play(sess, 'RR'); // onto checkpoint
  play(sess, 'R'); // (4,1)
  assert.equal(sess.state.player.x, 4);
  const results = play(sess, 'RR'); // diamond, then spikes
  assert.equal(results.at(-1), 'respawn');
  assert.equal(sess.state.hearts, 2);
  assert.deepEqual([sess.state.player.x, sess.state.player.y], [3, 1]);
  assert.equal(sess.state.diamonds, 0, 'progress after the checkpoint is undone');
  assert.equal(sess.state.status, 'playing');
});

test('session: losing the last heart restarts the level with full hearts', () => {
  const sess = new Session(lvl(['#######', '#PC^  #', '#######']), 2);
  play(sess, 'RR');
  assert.equal(sess.state.hearts, 1);
  const r = play(sess, 'R');
  assert.equal(r[0], 'gameOver');
  assert.equal(sess.state.hearts, 2);
  assert.equal(sess.state.player.x, 1);
});

test('session: restart room keeps hearts and restores the checkpoint', () => {
  const sess = new Session(lvl(['#########', '#P.C..  #', '#########']));
  play(sess, 'RRRR');
  sess.restartRoom();
  assert.equal(sess.state.player.x, 3);
  assert.equal(terrainAt(sess.state, 4, 1), 'dirt', 'dirt dug after the checkpoint comes back');
  assert.equal(terrainAt(sess.state, 2, 1), 'floor', 'dirt dug before the checkpoint stays dug');
  assert.equal(sess.state.hearts, 3);
});
