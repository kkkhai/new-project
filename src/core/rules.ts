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
  sand: { gravity: true, round: false, crushes: false, pushable: true, collectible: false },
  iceBlock: { gravity: true, round: false, crushes: false, pushable: true, collectible: false },
  snowball: { gravity: true, round: true, crushes: false, pushable: true, collectible: false },
  bigSnowball: { gravity: true, round: true, crushes: true, pushable: false, collectible: false },
  chest: { gravity: false, round: false, crushes: false, pushable: false, collectible: false },
  goldChest: { gravity: false, round: false, crushes: false, pushable: false, collectible: false },
};

/** What a chest holds when the level doesn't say. */
export const CHEST_DEFAULT: Readonly<Record<'chest' | 'goldChest', ObjKind>> = { chest: 'heart', goldChest: 'redDiamond' };

/** Which tool cuts/breaks which terrain, and what it leaves behind. */
export const TOOL_TARGETS: Readonly<Partial<Record<Terrain, { tool: ToolKind; becomes: Terrain }>>> = {
  vines: { tool: 'machete', becomes: 'floor' },
  thorns: { tool: 'machete', becomes: 'floor' },
  packedSand: { tool: 'shovel', becomes: 'floor' },
  quicksand: { tool: 'shovel', becomes: 'floor' },
  iceWall: { tool: 'pickaxe', becomes: 'floor' },
};

/** Ticks a snowball must roll before it becomes a big snowball. */
export const SNOWBALL_GROW = 3;
/** Ticks the Great Yeti stays stunned after slamming into an ice wall. */
export const YETI_STUN = 10;

/** Dart traps fire every this many ticks (on ticks where tick % DART_PERIOD === 0). */
export const DART_PERIOD = 8;
/** Ticks between the player leaving a crumbling floor and it becoming a pit (about 1 s). */
export const CRUMBLE_TICKS = 6;
/** Ticks in quicksand before the player sinks. */
export const SINK_TICKS = 3;

/** Terrain a dart flies over. */
export const dartPasses = (t: Terrain, gateOpen: boolean): boolean =>
  t === 'floor' || t === 'plate' || t === 'spikes' || t === 'pit' || t === 'water' || t === 'checkpoint' ||
  t === 'crumble' || t === 'crumbling' || t === 'quicksand' || (t === 'gate' && gateOpen);

/** Ticks between moves for each enemy. */
export const ACTOR_SPEED: Readonly<Record<ActorKind, number>> = {
  snake: 2, spider: 1, monkey: 2, idol: 3, scorpion: 2, scarab: 2, mummy: 3, serpent: 2,
  bat: 2, yetiCub: 1, frostSpirit: 3, yeti: 1,
};

/** Terrain an object may move into (it must also be free of other objects and the player). */
export const objectCanEnter = (t: Terrain, gateOpen: boolean): boolean =>
  t === 'floor' || t === 'plate' || t === 'spikes' || t === 'pit' || t === 'water' || t === 'crumble' ||
  t === 'crumbling' || t === 'quicksand' || t === 'ice' || t === 'thinIce' || t === 'crackedIce' || t === 'icyWater' ||
  (t === 'gate' && gateOpen);

/** Terrain that swallows an object and becomes floor (pit filled, river bridged, quicksand packed). */
export const fillsWithObject = (t: Terrain): boolean => t === 'pit' || t === 'water' || t === 'quicksand' || t === 'icyWater';

/** Terrain enemies may walk on. */
export const actorCanEnter = (t: Terrain, gateOpen: boolean): boolean =>
  t === 'floor' || t === 'plate' || t === 'checkpoint' || t === 'crumble' || t === 'crumbling' || t === 'ice' ||
  t === 'thinIce' || t === 'crackedIce' || (t === 'gate' && gateOpen);

/** Terrain flying enemies (bats) may cross: anything that isn't solid. */
export const flyerCanEnter = (t: Terrain, gateOpen: boolean): boolean =>
  !solidForPlayer(t) && t !== 'dirt' && t !== 'exit' && t !== 'doorSilver' && t !== 'doorGold' && (t !== 'gate' || gateOpen);

/** Terrain the player can never walk into. */
export const solidForPlayer = (t: Terrain): boolean =>
  t === 'wall' || t === 'cracked' || t === 'lever' || t === 'vines' || t === 'water' || t === 'packedSand' ||
  t === 'dartRight' || t === 'dartLeft' || t === 'iceWall';
