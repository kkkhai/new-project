import { newSave, type SaveData } from '../core/progress.ts';
import { CAMPAIGN } from './levels.ts';

const KEY = 'diamond-rush-recreate/save/slot1';

/** Load the save from browser storage; falls back to a fresh save if missing or unreadable. */
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as SaveData;
      if (data.version === 1) return data;
    }
  } catch {
    // storage blocked or corrupt: start fresh
  }
  return newSave(CAMPAIGN[0].id);
}

export function writeSave(save: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // storage full or blocked: progress just isn't kept this session
  }
}
