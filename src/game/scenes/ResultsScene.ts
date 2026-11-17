import * as Phaser from 'phaser';
import { button, text } from '../ui.ts';

export interface ResultsData {
  levelId: string;
  name: string;
  timeSec: number;
  diamonds: number;
  quota: number;
  redDiamonds: number;
  redTotal: number;
  deaths: number;
  stars: number;
  score: number;
  nextId?: string;
}

/** Overlay shown on top of the game when a level is finished. */
export class ResultsScene extends Phaser.Scene {
  constructor() {
    super('Results');
  }

  create(r: ResultsData): void {
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    this.add.rectangle(width / 2, height / 2, 520, 400, 0x2a2420).setStrokeStyle(3, 0xf0c850);
    text(this, width / 2, height / 2 - 160, `${r.name} complete!`, 28, '#f0c850').setOrigin(0.5);
    text(this, width / 2, height / 2 - 110, '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars), 44, '#f0c850').setOrigin(0.5);
    const m = Math.floor(r.timeSec / 60);
    const s = Math.floor(r.timeSec % 60).toString().padStart(2, '0');
    const lines = [
      `Time          ${m}:${s}`,
      `Diamonds      ${r.diamonds} / ${r.quota}`,
      `Red diamonds  ${r.redDiamonds} / ${r.redTotal}`,
      `Deaths        ${r.deaths}`,
      `Score         ${r.score}`,
    ];
    text(this, width / 2, height / 2 - 30, lines.join('\n'), 20).setOrigin(0.5, 0.5).setLineSpacing(6);

    const go = (target: string, data?: object) => {
      this.scene.stop('Game');
      this.scene.start(target, data);
    };
    const next = () => (r.nextId ? go('Game', { levelId: r.nextId }) : go('LevelSelect'));
    button(this, width / 2 - 170, height / 2 + 140, 'Menu', () => go('LevelSelect'), { size: 18, width: 120 });
    button(this, width / 2, height / 2 + 140, 'Retry', () => go('Game', { levelId: r.levelId }), { size: 18, width: 120 });
    button(this, width / 2 + 170, height / 2 + 140, r.nextId ? 'Next ▶' : 'Done', next, { size: 18, width: 120 });

    const kb = this.input.keyboard!;
    kb.on('keydown-ENTER', next);
    kb.on('keydown-SPACE', next);
    kb.on('keydown-R', () => go('Game', { levelId: r.levelId }));
    kb.on('keydown-ESC', () => go('LevelSelect'));
  }
}
