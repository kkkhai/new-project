import { countRedDiamonds, parseLevel, type LevelDef } from '../core/level.ts';

const modules = import.meta.glob<LevelDef>('../../levels/**/*.json', { eager: true, import: 'default' });

/** Worlds in play order. "test" holds the training rooms, which are always open. */
export const WORLDS = [
  { id: 'jungle', name: 'Jungle: Lost Temple' },
  { id: 'desert', name: 'Desert: Sunken Tombs' },
  { id: 'snow', name: 'Snow: Frozen Peak' },
] as const;

const byId = (a: LevelDef, b: LevelDef) => a.id.localeCompare(b.id);

export const ALL_LEVELS: LevelDef[] = Object.values(modules);

export const TRAINING: LevelDef[] = ALL_LEVELS.filter((l) => l.world === 'test').sort(byId);

/** Unlocked by collecting every red diamond. */
export const SECRET: LevelDef[] = ALL_LEVELS.filter((l) => l.world === 'secret').sort(byId);

/** Campaign order: each world's levels by id (J-01 … J-10, then J-BOSS). */
export const CAMPAIGN: LevelDef[] = WORLDS.flatMap((w) => ALL_LEVELS.filter((l) => l.world === w.id).sort(byId));

export const CAMPAIGN_ORDER = CAMPAIGN.map((l) => l.id);

export const levelById = (id: string): LevelDef | undefined => ALL_LEVELS.find((l) => l.id === id);

/** The level that follows `id` in its list (campaign or training), if any. */
export function nextLevelId(id: string): string | undefined {
  if (SECRET.some((l) => l.id === id)) return undefined;
  const list = TRAINING.some((l) => l.id === id) ? TRAINING : CAMPAIGN;
  return list[list.findIndex((l) => l.id === id) + 1]?.id;
}

/** Red diamonds placed across the campaign (rewards scale with this). */
export const RED_TOTAL = CAMPAIGN.reduce((n, l) => n + countRedDiamonds(parseLevel(l)), 0);
