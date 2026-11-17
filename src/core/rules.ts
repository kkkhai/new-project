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
};

/** Terrain an object may move into (it must also be free of other objects and the player). */
export const objectCanEnter = (t: Terrain): boolean => t === 'floor';

/** Terrain the player may walk onto (doors, exits etc. are handled separately in tick.ts). */
export const playerCanEnter = (t: Terrain): boolean => t === 'floor' || t === 'dirt';
