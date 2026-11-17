import * as Phaser from 'phaser';
import type { LevelDef } from '../../core/level.ts';
import { CAMPAIGN, TRAINING, WORLDS } from '../levels.ts';
import { loadSave } from '../save.ts';
import { button, text } from '../ui.ts';

/** Simple level list until the M5 world map: one row per world plus the training rooms. */
export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create(): void {
    const { width } = this.scale;
    const save = loadSave();
    text(this, width / 2, 36, 'Choose a level', 30, '#f0c850').setOrigin(0.5);
    let y = 100;

    const row = (title: string, levels: LevelDef[], alwaysOpen: boolean) => {
      text(this, 40, y, title, 20, '#e8d8b8');
      y += 40;
      levels.forEach((l, i) => {
        const open = alwaysOpen || save.unlocked.includes(l.id);
        const rec = save.records[l.id];
        const stars = rec ? '★'.repeat(rec.stars) + '☆'.repeat(3 - rec.stars) : open ? '☆☆☆' : '🔒';
        const label = `${l.id.replace(/^[A-Z]-/, '')}\n${stars}`;
        const x = 80 + (i % 11) * 76;
        const b = button(this, x, y + Math.floor(i / 11) * 80, label, () => open && this.scene.start('Game', { levelId: l.id }), {
          size: 15,
          width: 66,
          color: open ? '#f5e9d0' : '#6a5e4e',
          bg: open ? '#3a2f26' : '#221c17',
        });
        if (!open) b.disableInteractive();
      });
      y += 80 * Math.ceil(levels.length / 11) + 16;
    };

    for (const w of WORLDS) {
      const levels = CAMPAIGN.filter((l) => l.world === w.id);
      if (levels.length) row(w.name, levels, false);
    }
    row('Training rooms', TRAINING, true);

    button(this, width / 2, this.scale.height - 40, 'Back', () => this.scene.start('Title'), { size: 18 });
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('Title'));
    // Keyboard shortcut: Enter starts the furthest unlocked campaign level.
    this.input.keyboard!.on('keydown-ENTER', () => {
      const last = [...CAMPAIGN].reverse().find((l) => save.unlocked.includes(l.id));
      if (last) this.scene.start('Game', { levelId: last.id });
    });
  }
}
