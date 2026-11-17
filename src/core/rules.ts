import type { ObjKind, Terrain } from './types.ts';

/** Per-object behaviour table. Add a row here when a new object kind is introduced. */
export interface ObjRule {
  /** Pulled down by gravity every tick. */
  gravity: boolean;
  /** Other gravity objects roll off it. */
  round: boolean;
  /** Kills the player when it falls onto them. */
  crushes: boolean;
  /** Player can push it sideways. */
  pushable: boolean;
  /** Player picks it up by walking into it. */
  collectible: boolean;
}

export const OBJ_RULES: Readonly<Record<ObjKind, ObjRule>> = {
  boulder: { gravity: true, round: true, crushes: true, pushable: true, collectible: false },
  diamond: { gravity: true, round: true, crushes: false, pushable: false, collectible: true },
  redDiamond: { gravity: true, round: true, crushes: false, pushable: false, collectible: true },
  keySilver: { gravity: false, round: false, crushes: false, pushable: false, collectible: true },
  keyGold: { gravity: false, round: false, crushes: false, pushable: false, collectible: true },
  heart: { gravity: false, round: false, crushes: false, pushable: false, collectible: true },
};

/** Terrain an object may move into (it must also be free of other objects and the player). */
export const objectCanEnter = (t: Terrain, gateOpen: boolean): boolean =>
  t === 'floor' || t === 'plate' || t === 'spikes' || t === 'pit' || (t === 'gate' && gateOpen);

/** Terrain the player can never walk into. */
export const solidForPlayer = (t: Terrain): boolean => t === 'wall' || t === 'cracked' || t === 'lever';
