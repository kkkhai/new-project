import * as Phaser from 'phaser';
import type { Language } from '../../core/progress.ts';
import type { Difficulty } from '../../core/session.ts';
import { t } from '../i18n.ts';
import { loadSave, writeSave } from '../save.ts';
import { button, text } from '../ui.ts';

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create(): void {
    const { width, height } = this.scale;
    const save = loadSave();
    const s = save.settings;
    const apply = () => {
      writeSave(save);
      this.scene.restart();
    };
    text(this, width / 2, 40, t('settings'), 28, '#f0c850').setOrigin(0.5);

    text(this, width / 2, 100, t('difficulty'), 20).setOrigin(0.5);
    (['easy', 'normal', 'hard'] as Difficulty[]).forEach((d, i) => {
      button(this, width / 2, 145 + i * 52, `${s.difficulty === d ? '● ' : '○ '}${t(d)}`, () => ((s.difficulty = d), apply()), {
        size: 17,
        width: 460,
      });
    });

    text(this, width / 2, 320, t('language'), 20).setOrigin(0.5);
    ([['en', 'English'], ['vi', 'Tiếng Việt']] as [Language, string][]).forEach(([l, name], i) => {
      button(this, width / 2 - 120 + i * 240, 365, `${s.language === l ? '● ' : '○ '}${name}`, () => ((s.language = l), apply()), {
        size: 17,
        width: 220,
      });
    });

    text(this, width / 2, 430, t('sound'), 20).setOrigin(0.5);
    button(this, width / 2, 475, s.muted ? t('off') : t('on'), () => ((s.muted = !s.muted), apply()), { size: 17, width: 160 });

    button(this, width / 2, height - 50, t('back'), () => this.scene.start('WorldMap'), { size: 16 });
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('WorldMap'));
  }
}
