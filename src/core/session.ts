import { cloneState } from './grid.ts';
import { parseLevel, type LevelDef } from './level.ts';
import { step } from './tick.ts';
import type { GameState, Input } from './types.ts';

export type TickResult = 'playing' | 'won' | 'respawn' | 'gameOver';

export type Difficulty = 'easy' | 'normal' | 'hard';

/** GDD difficulty modes: Easy (undo, 5 hearts), Normal (3 hearts), Hard (1 heart, no checkpoints in boss stages). */
export const DIFFICULTY: Readonly<Record<Difficulty, { hearts: number; undo: boolean; bossCheckpoints: boolean }>> = {
  easy: { hearts: 5, undo: true, bossCheckpoints: true },
  normal: { hearts: 3, undo: false, bossCheckpoints: true },
  hard: { hearts: 1, undo: false, bossCheckpoints: false },
};

const UNDO_LIMIT = 300;

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
  readonly difficulty: Difficulty;
  state: GameState;
  private history: GameState[] = [];
  /** Deaths and elapsed ticks over the whole attempt (for the results screen). */
  deaths = 0;
  ticks = 0;
  private checkpoint: GameState;

  constructor(def: LevelDef, difficulty: Difficulty = 'normal') {
    this.def = def;
    this.difficulty = difficulty;
    this.maxHearts = DIFFICULTY[difficulty].hearts;
    const maxHearts = this.maxHearts;
    this.state = parseLevel(def, { hearts: maxHearts });
    this.checkpoint = cloneState(this.state);
  }

  /** Advance one tick. On death the state is already restored when this returns. */
  tick(input: Input = {}): TickResult {
    if (DIFFICULTY[this.difficulty].undo) {
      this.history.push(cloneState(this.state));
      if (this.history.length > UNDO_LIMIT) this.history.shift();
    }
    step(this.state, input);
    this.ticks++;
    const s = this.state;
    if (s.status === 'won') return 'won';
    if (s.status === 'dead') {
      this.deaths++;
      const hearts = s.hearts - 1;
      if (hearts <= 0) {
        this.restartLevel();
        return 'gameOver';
      }
      this.restore(hearts);
      return 'respawn';
    }
    const checkpointsAllowed = DIFFICULTY[this.difficulty].bossCheckpoints || !this.def.id.endsWith('BOSS');
    if (checkpointsAllowed && s.events.some((e) => e.type === 'checkpoint')) this.saveCheckpoint();
    return 'playing';
  }

  get canUndo(): boolean {
    return DIFFICULTY[this.difficulty].undo && this.history.length > 0;
  }

  /** Easy mode: step back one tick. */
  undo(): boolean {
    const prev = this.history.pop();
    if (!prev) return false;
    this.state = prev;
    this.state.events = [];
    return true;
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
    this.history = [];
  }

  private restore(hearts: number): void {
    this.state = cloneState(this.checkpoint);
    this.state.hearts = hearts;
    this.state.events = [];
    this.history = [];
  }
}
