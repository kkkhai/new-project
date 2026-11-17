import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LevelDef } from '../../src/core/level.ts';
import { newSave, recordResult, rewardThreshold, rewardUnlocked, scoreFor, starsFor, type LevelResult } from '../../src/core/progress.ts';

const def: LevelDef = { id: 'J-01', name: 'x', world: 'jungle', quota: 4, parTimeSec: 60, map: ['#P#'] };
const res = (o: Partial<LevelResult> = {}): LevelResult => ({ timeSec: 50, diamonds: 4, redDiamonds: 0, redTotal: 0, deaths: 0, ...o });

test('stars follow the GDD rules', () => {
  assert.equal(starsFor(def, res({ timeSec: 61 })), 1);
  assert.equal(starsFor(def, res({ redTotal: 3, redDiamonds: 2 })), 2);
  assert.equal(starsFor(def, res({ redTotal: 3, redDiamonds: 3 })), 3);
  assert.equal(starsFor(def, res()), 3, 'no red diamonds in the level: under par is enough');
});

test('score follows the GDD formula and never goes negative', () => {
  assert.equal(scoreFor(def, res({ diamonds: 4, redDiamonds: 1, timeSec: 50, deaths: 1 })), 400 + 500 + 100 - 200);
  assert.equal(scoreFor(def, res({ diamonds: 0, deaths: 9, timeSec: 99 })), 0);
});

test('finishing a level unlocks the next one and keeps best records', () => {
  const order = ['J-01', 'J-02', 'J-03'];
  let save = newSave('J-01');
  save = recordResult(save, def, res({ timeSec: 70 }), order);
  assert.deepEqual(save.unlocked, ['J-01', 'J-02']);
  assert.equal(save.records['J-01'].stars, 1);
  save = recordResult(save, def, res({ timeSec: 40 }), order);
  assert.equal(save.records['J-01'].stars, 3);
  assert.equal(save.records['J-01'].bestTimeSec, 40);
  save = recordResult(save, def, res({ timeSec: 90 }), order);
  assert.equal(save.records['J-01'].stars, 3, 'a worse run never lowers the record');
  assert.deepEqual(save.unlocked, ['J-01', 'J-02']);
});

test('red diamond rewards unlock at a quarter, half, three quarters and all', () => {
  assert.equal(rewardThreshold('gallery', 23), 6);
  assert.equal(rewardThreshold('secretLevel', 23), 23);
  const save = newSave('J-01');
  save.records['J-01'] = { stars: 3, score: 0, bestTimeSec: 1, redDiamonds: 6 };
  assert.equal(rewardUnlocked(save, 'gallery', 23), true);
  assert.equal(rewardUnlocked(save, 'timeTrial', 23), false);
});
