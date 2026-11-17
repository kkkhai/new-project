// Pure game-rule types. Nothing in src/core may import Phaser or touch the DOM.

export type Dir = 'up' | 'down' | 'left' | 'right';

export const DX: Readonly<Record<Dir, number>> = { up: 0, down: 0, left: -1, right: 1 };
export const DY: Readonly<Record<Dir, number>> = { up: -1, down: 1, left: 0, right: 0 };

/** What a cell is made of. Objects (boulders, diamonds…) sit on top of floor. */
export type Terrain =
  | 'floor'
  | 'wall'
  | 'dirt'
  | 'exit'
  | 'cracked' // wall that breaks when a falling boulder lands on it
  | 'spikes' // kills the player; objects may rest on it
  | 'pit' // kills the player; an object that enters fills it and becomes floor
  | 'checkpoint' // saves progress when the player steps on it
  | 'doorSilver'
  | 'doorGold'
  | 'plate' // pressed while a boulder or the player stands on it
  | 'lever' // bump to toggle
  | 'gate' // open while any plate is pressed or the lever is on
  | 'vines' // blocks everything; the machete cuts it
  | 'thorns' // hurts on touch; the machete cuts it
  | 'water' // river: blocks the player; a boulder dropped or pushed in makes a bridge
  | 'crumble' // floor that starts collapsing when the player leaves it
  | 'crumbling' // collapsing: becomes a pit when its timer runs out
  | 'quicksand' // stand on it for 3 ticks and you sink; the shovel fills it
  | 'packedSand' // blocks until dug with the shovel
  | 'dartRight' // wall trap that fires a dart along its row every DART_PERIOD ticks
  | 'dartLeft';

/** Things that occupy a cell and can move or be picked up. */
export type ObjKind =
  | 'boulder'
  | 'diamond'
  | 'redDiamond'
  | 'keySilver'
  | 'keyGold'
  | 'heart'
  | 'machete'
  | 'shovel'
  | 'pickaxe'
  | 'sand'; // falls like a boulder but never crushes and does not roll

export type ToolKind = 'machete' | 'shovel' | 'pickaxe';

export type ActorKind =
  | 'snake' // patrols left/right, reverses at obstacles
  | 'spider' // hangs still; drops when the player passes below, then climbs back
  | 'monkey' // patrols; steals a diamond on contact, drops it when crushed
  | 'idol' // Jungle boss: patrols slowly, takes a hit from each falling boulder
  | 'scorpion' // patrols up/down, reverses at obstacles
  | 'scarab' // chases the player when within 5 tiles
  | 'mummy' // slowly chases the player anywhere
  | 'serpent'; // Desert boss: chases; falls when a crumbling floor collapses under it

export interface Actor {
  id: number;
  kind: ActorKind;
  x: number;
  y: number;
  dir: Dir;
  alive: boolean;
  /** Ticks until the next move. */
  wait: number;
  hp: number;
  homeX: number;
  homeY: number;
  carrying: number;
  mode: 'idle' | 'drop' | 'climb';
}

export interface Obj {
  id: number;
  kind: ObjKind;
  /** True while the object moved down (or rolled) on the previous physics pass. */
  falling: boolean;
}

export interface Player {
  x: number;
  y: number;
  facing: Dir;
  alive: boolean;
}

export type GameStatus = 'playing' | 'won' | 'dead';

export type GameEventType =
  | 'step'
  | 'dig'
  | 'collect'
  | 'push'
  | 'land'
  | 'crush'
  | 'exitOpen'
  | 'win'
  | 'checkpoint'
  | 'unlock'
  | 'lever'
  | 'gateOpen'
  | 'gateClose'
  | 'fill'
  | 'break'
  | 'spiked'
  | 'fall'
  | 'cut'
  | 'splash'
  | 'tool'
  | 'enemyKilled'
  | 'steal'
  | 'bossHit'
  | 'bossDefeated'
  | 'bitten'
  | 'sink'
  | 'dart'
  | 'collapse';

/** Events produced by a tick, used by the renderer for sound and effects. */
export interface GameEvent {
  type: GameEventType;
  x: number;
  y: number;
  kind?: string;
  /** For darts: where the dart stopped. */
  toX?: number;
}

export interface GameState {
  width: number;
  height: number;
  terrain: Terrain[];
  objs: (Obj | null)[];
  player: Player;
  diamonds: number;
  quota: number;
  redDiamonds: number;
  hearts: number;
  maxHearts: number;
  keys: { silver: number; gold: number };
  gateOpen: boolean;
  leverOn: boolean;
  tools: Record<ToolKind, boolean>;
  actors: Actor[];
  /** Countdown per cell index for collapsing floors. */
  timers: Record<number, number>;
  /** Consecutive ticks the player has stood in quicksand. */
  sinking: number;
  tick: number;
  status: GameStatus;
  nextId: number;
  events: GameEvent[];
}

export interface Input {
  dir?: Dir | null;
  /** Use the world tool on the tile the player faces. */
  action?: boolean;
}
