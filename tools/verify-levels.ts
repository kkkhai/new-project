/**
 * CI check: every level file must parse, have enough diamonds for its quota,
 * and its stored "solution" must win the level when replayed.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { countDiamonds, parseLevel, type LevelDef } from '../src/core/level.ts';
import { replay } from '../src/core/replay.ts';

function levelFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return levelFiles(p);
    return name.endsWith('.json') ? [p] : [];
  });
}

const files = levelFiles('levels');
let failed = 0;
for (const file of files) {
  try {
    const def = JSON.parse(readFileSync(file, 'utf8')) as LevelDef;
    const start = parseLevel(def);
    const available = countDiamonds(start);
    if (available < def.quota) throw new Error(`quota ${def.quota} but only ${available} diamonds on the map`);
    if (!def.solution) throw new Error('no "solution" stored (run tools/solver/solve.ts --write)');
    const end = replay(def, def.solution);
    if (end.status !== 'won') throw new Error(`stored solution ends with status "${end.status}"`);
    console.log(`ok   ${def.id.padEnd(8)} ${def.name} (${def.solution.length} moves)`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${file}: ${(e as Error).message}`);
  }
}
console.log(`\n${files.length - failed}/${files.length} levels verified`);
if (failed || files.length === 0) process.exit(1);
