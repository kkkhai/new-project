import type { LevelDef } from './level.ts';
import type { Difficulty } from './session.ts';

/** Seconds per game tick (GDD: a step takes 150 ms). */
export const TICK_SECONDS = 0.15;

export interface LevelResult {
  timeSec: number;
  diamonds: number;
  redDiamonds: number;
  /** Red diamonds placed in the level. */
  redTotal: number;
  deaths: number;
}

/** GDD stars: 1 = finished, 2 = under par, 3 = under par and every red diamond. */
export function starsFor(def: LevelDef, r: LevelResult): 1 | 2 | 3 {
  const underPar = r.timeSec <= (def.parTimeSec ?? Infinity);
  if (!underPar) return 1;
  return r.redDiamonds >= r.redTotal ? 3 : 2;
}

/** GDD score: 100 per diamond + 500 per red diamond + 10 per second under par − 200 per death. */
export function scoreFor(def: LevelDef, r: LevelResult): number {
  const par = def.parTimeSec ?? 0;
  const timeBonus = Math.max(0, Math.floor(par - r.timeSec)) * 10;
  return Math.max(0, r.diamonds * 100 + r.redDiamonds * 500 + timeBonus - r.deaths * 200);
}

export interface LevelRecord {
  stars: number;
  score: number;
  bestTimeSec: number;
  redDiamonds: number;
}

export interface SaveData {
  version: 1;
  /** Ids of levels the player may start. */
  unlocked: string[];
  records: Record<string, LevelRecord>;
  settings: Settings;
}

export type Language = 'en' | 'vi';

export interface Settings {
  muted: boolean;
  difficulty: Difficulty;
  language: Language;
  /** Reward toggles (only usable once unlocked). */
  timeTrial: boolean;
  costume: boolean;
}

export const DEFAULT_SETTINGS: Settings = { muted: false, difficulty: 'normal', language: 'en', timeTrial: false, costume: false };

export const newSave = (firstLevelId: string): SaveData => ({
  version: 1,
  unlocked: [firstLevelId],
  records: {},
  settings: { ...DEFAULT_SETTINGS },
});

/** Record a finished level: keep the best of each stat and unlock the next level in order. */
export function recordResult(save: SaveData, def: LevelDef, r: LevelResult, order: string[]): SaveData {
  const prev = save.records[def.id];
  const rec: LevelRecord = {
    stars: Math.max(prev?.stars ?? 0, starsFor(def, r)),
    score: Math.max(prev?.score ?? 0, scoreFor(def, r)),
    bestTimeSec: Math.min(prev?.bestTimeSec ?? Infinity, r.timeSec),
    redDiamonds: Math.max(prev?.redDiamonds ?? 0, r.redDiamonds),
  };
  const next = order[order.indexOf(def.id) + 1];
  const unlocked = next && !save.unlocked.includes(next) ? [...save.unlocked, next] : save.unlocked;
  return { ...save, unlocked, records: { ...save.records, [def.id]: rec } };
}

export const totalRedDiamonds = (save: SaveData): number =>
  Object.values(save.records).reduce((n, r) => n + r.redDiamonds, 0);

/** Red-diamond rewards (GDD), as fractions of all red diamonds in the game so they scale with the levels. */
export const REWARDS = [
  { id: 'gallery', share: 0.25 },
  { id: 'timeTrial', share: 0.5 },
  { id: 'costume', share: 0.75 },
  { id: 'secretLevel', share: 1 },
] as const;

export type RewardId = (typeof REWARDS)[number]['id'];

export const rewardThreshold = (id: RewardId, totalAvailable: number): number =>
  Math.max(1, Math.ceil(REWARDS.find((r) => r.id === id)!.share * totalAvailable));

export const rewardUnlocked = (save: SaveData, id: RewardId, totalAvailable: number): boolean =>
  totalAvailable > 0 && totalRedDiamonds(save) >= rewardThreshold(id, totalAvailable);
