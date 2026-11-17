import { DEFAULT_SETTINGS, newSave, type SaveData } from '../core/progress.ts';
import { setLanguage } from './i18n.ts';
import { CAMPAIGN } from './levels.ts';

const KEY = 'diamond-rush-recreate/save/slot1';

/** Load the save from browser storage; falls back to a fresh save if missing or unreadable. */
export function loadSave(): SaveData {
  let save = newSave(CAMPAIGN[0].id);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw) as SaveData;
      if (data.version === 1) save = { ...data, settings: { ...DEFAULT_SETTINGS, ...data.settings } };
    }
  } catch {
    // storage blocked or corrupt: start fresh
  }
  setLanguage(save.settings.language);
  return save;
}

export function writeSave(save: SaveData): void {
  setLanguage(save.settings.language);
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // storage full or blocked: progress just isn't kept this session
  }
}
