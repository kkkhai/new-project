import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OBJ_RULES } from '../../src/core/rules.ts';
import { SPRITE_SIZE, SPRITES } from '../../src/game/spriteData.ts';

test('every sprite frame is 16×16 and only uses its palette', () => {
  for (const [key, def] of Object.entries(SPRITES)) {
    for (const [name, rows] of Object.entries(def.frames)) {
      assert.equal(rows.length, SPRITE_SIZE, `${key}/${name} has ${rows.length} rows`);
      rows.forEach((row, y) => {
        assert.equal(row.length, SPRITE_SIZE, `${key}/${name} row ${y} is ${row.length} wide: "${row}"`);
        for (const ch of row) assert.ok(ch === '.' || ch in def.palette, `${key}/${name} row ${y}: "${ch}" not in palette`);
      });
    }
  }
});

test('every object kind has a sprite', () => {
  for (const kind of Object.keys(OBJ_RULES)) assert.ok(SPRITES[kind], `no sprite for ${kind}`);
});

test('the explorer has walk frames for every facing', () => {
  for (const dir of ['down', 'up', 'right']) {
    for (const f of [0, 1, 2]) assert.ok(SPRITES.explorer.frames[`${dir}-${f}`], `${dir}-${f}`);
  }
});
