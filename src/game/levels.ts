import type { LevelDef } from '../core/level.ts';

const modules = import.meta.glob<LevelDef>('../../levels/**/*.json', { eager: true, import: 'default' });

/** Order worlds are played in. Levels inside a world sort by id (J-01 … J-10, then J-BOSS). */
export const WORLD_ORDER = ['test', 'jungle', 'desert', 'snow'];

const worldRank = (w: string) => {
  const i = WORLD_ORDER.indexOf(w);
  return i === -1 ? WORLD_ORDER.length : i;
};

export const LEVELS: LevelDef[] = Object.values(modules).sort(
  (a, b) => worldRank(a.world) - worldRank(b.world) || a.id.localeCompare(b.id),
);
