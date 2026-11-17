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
  | 'gate'; // open while any plate is pressed or the lever is on

/** Things that occupy a cell and can move or be picked up. */
export type ObjKind =
  | 'boulder'
  | 'diamond'
  | 'redDiamond'
  | 'keySilver'
  | 'keyGold'
  | 'heart';

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
  | 'fall';

/** Events produced by a tick, used by the renderer for sound and effects. */
export interface GameEvent {
  type: GameEventType;
  x: number;
  y: number;
  kind?: string;
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
  tick: number;
  status: GameStatus;
  nextId: number;
  events: GameEvent[];
}

export interface Input {
  dir?: Dir | null;
}
