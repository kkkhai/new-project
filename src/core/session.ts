import { cloneState } from './grid.ts';
import { parseLevel, type LevelDef } from './level.ts';
import { step } from './tick.ts';
import type { GameState, Input } from './types.ts';

export type TickResult = 'playing' | 'won' | 'respawn' | 'gameOver';

/**
 * One attempt at a level: hearts, checkpoints and restarts (GDD: Health and checkpoints).
 * - Touching a checkpoint snapshots the whole level, so solved puzzles stay solved.
 * - Dying costs a heart and restores the last snapshot.
 * - At 0 hearts the level restarts from the beginning with full hearts.
 * - Restart Room restores the snapshot without costing a heart.
 */
export class Session {
  readonly def: LevelDef;
  readonly maxHearts: number;
  state: GameState;
  private checkpoint: GameState;

  constructor(def: LevelDef, maxHearts = 3) {
    this.def = def;
    this.maxHearts = maxHearts;
    this.state = parseLevel(def, { hearts: maxHearts });
    this.checkpoint = cloneState(this.state);
  }

  /** Advance one tick. On death the state is already restored when this returns. */
  tick(input: Input = {}): TickResult {
    step(this.state, input);
    const s = this.state;
    if (s.status === 'won') return 'won';
    if (s.status === 'dead') {
      const hearts = s.hearts - 1;
      if (hearts <= 0) {
        this.restartLevel();
        return 'gameOver';
      }
      this.restore(hearts);
      return 'respawn';
    }
    if (s.events.some((e) => e.type === 'checkpoint')) this.saveCheckpoint();
    return 'playing';
  }

  saveCheckpoint(): void {
    this.checkpoint = cloneState(this.state);
    this.checkpoint.events = [];
  }

  /** Back to the last checkpoint, keeping the current hearts. */
  restartRoom(): void {
    this.restore(this.state.hearts);
  }

  restartLevel(): void {
    this.state = parseLevel(this.def, { hearts: this.maxHearts });
    this.checkpoint = cloneState(this.state);
  }

  private restore(hearts: number): void {
    this.state = cloneState(this.checkpoint);
    this.state.hearts = hearts;
    this.state.events = [];
  }
}
