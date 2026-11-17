import * as Phaser from 'phaser';
import { totalRedDiamonds } from '../../core/progress.ts';
import { loadSave } from '../save.ts';
import { button, text } from '../ui.ts';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(): void {
    const { width, height } = this.scale;
    const save = loadSave();
    text(this, width / 2, height * 0.28, 'DIAMOND RUSH', 56, '#f0c850').setOrigin(0.5);
    text(this, width / 2, height * 0.28 + 56, 'recreate · working title', 18, '#b8a888').setOrigin(0.5);
    const stars = Object.values(save.records).reduce((n, r) => n + r.stars, 0);
    text(this, width / 2, height * 0.5, `★ ${stars}   ♦ ${totalRedDiamonds(save)}`, 22).setOrigin(0.5);
    button(this, width / 2, height * 0.66, 'PLAY', () => this.scene.start('LevelSelect'), { size: 28, width: 220 });
    text(this, width / 2, height - 40, 'Arrows/WASD move · Space uses tool · R restart room · Esc pause · M mute', 14, '#8a7a62').setOrigin(0.5);
    this.input.keyboard!.once('keydown', () => this.scene.start('LevelSelect'));
  }
}
