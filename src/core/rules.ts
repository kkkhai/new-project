import type { ActorKind, ObjKind, Terrain, ToolKind } from './types.ts';

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
  machete: { gravity: false, round: false, crushes: false, pushable: false, collectible: true },
  shovel: { gravity: false, round: false, crushes: false, pushable: false, collectible: true },
  pickaxe: { gravity: false, round: false, crushes: false, pushable: false, collectible: true },
};

/** Which tool cuts/breaks which terrain, and what it leaves behind. */
export const TOOL_TARGETS: Readonly<Partial<Record<Terrain, { tool: ToolKind; becomes: Terrain }>>> = {
  vines: { tool: 'machete', becomes: 'floor' },
  thorns: { tool: 'machete', becomes: 'floor' },
};

/** Ticks between moves for each enemy. */
export const ACTOR_SPEED: Readonly<Record<ActorKind, number>> = { snake: 2, spider: 1, monkey: 2, idol: 3 };

/** Terrain an object may move into (it must also be free of other objects and the player). */
export const objectCanEnter = (t: Terrain, gateOpen: boolean): boolean =>
  t === 'floor' || t === 'plate' || t === 'spikes' || t === 'pit' || t === 'water' || (t === 'gate' && gateOpen);

/** Terrain that swallows an object and becomes floor (pit filled, river bridged). */
export const fillsWithObject = (t: Terrain): boolean => t === 'pit' || t === 'water';

/** Terrain enemies may walk on. */
export const actorCanEnter = (t: Terrain, gateOpen: boolean): boolean =>
  t === 'floor' || t === 'plate' || t === 'checkpoint' || (t === 'gate' && gateOpen);

/** Terrain the player can never walk into. */
export const solidForPlayer = (t: Terrain): boolean =>
  t === 'wall' || t === 'cracked' || t === 'lever' || t === 'vines' || t === 'water';
