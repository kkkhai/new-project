import * as Phaser from 'phaser';
import { REWARDS, rewardThreshold, rewardUnlocked, totalRedDiamonds, type RewardId } from '../../core/progress.ts';
import { t, type TextKey } from '../i18n.ts';
import { RED_TOTAL, SECRET } from '../levels.ts';
import { loadSave, writeSave } from '../save.ts';
import { button, text } from '../ui.ts';

const LABEL: Record<RewardId, TextKey> = {
  gallery: 'rewardGallery',
  timeTrial: 'rewardTimeTrial',
  costume: 'rewardCostume',
  secretLevel: 'rewardSecretLevel',
};

const galleryImages = import.meta.glob<string>('../../../assets/gallery/*.{png,jpg,jpeg,webp}', { eager: true, query: '?url', import: 'default' });

/** Red-diamond rewards from the GDD: gallery, Time Trial, costume, secret level. */
export class RewardsScene extends Phaser.Scene {
  constructor() {
    super('Rewards');
  }

  create(): void {
    const { width, height } = this.scale;
    const save = loadSave();
    text(this, width / 2, 40, t('rewards'), 28, '#f0c850').setOrigin(0.5);
    text(this, width / 2, 80, t('redCollected', { n: totalRedDiamonds(save), total: RED_TOTAL }), 18, '#ff6b85').setOrigin(0.5);

    REWARDS.forEach((r, i) => {
      const y = 150 + i * 90;
      const open = rewardUnlocked(save, r.id, RED_TOTAL);
      text(this, 120, y, `${open ? '♦' : '🔒'}  ${t(LABEL[r.id])}`, 19, open ? '#f5e9d0' : '#7a6e5e').setOrigin(0, 0.5);
      if (!open) {
        text(this, width - 120, y, t('needRed', { n: rewardThreshold(r.id, RED_TOTAL) }), 15, '#7a6e5e').setOrigin(1, 0.5);
        return;
      }
      if (r.id === 'timeTrial' || r.id === 'costume') {
        const on = save.settings[r.id];
        button(this, width - 190, y, on ? t('enabled') : t('disabled'), () => {
          save.settings[r.id as 'timeTrial' | 'costume'] = !on;
          writeSave(save);
          this.scene.restart();
        }, { size: 16, width: 140 });
      } else if (r.id === 'gallery') {
        button(this, width - 190, y, t('open'), () => this.showGallery(), { size: 16, width: 140 });
      } else if (SECRET.length) {
        button(this, width - 190, y, t('play'), () => this.scene.start('Game', { levelId: SECRET[0].id }), { size: 16, width: 140 });
      }
    });

    button(this, width / 2, height - 50, t('back'), () => this.scene.start('WorldMap'), { size: 16 });
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('WorldMap'));
  }

  private showGallery(): void {
    const urls = Object.values(galleryImages);
    const { width, height } = this.scale;
    const layer = this.add.container(0, 0).setDepth(50);
    layer.add(this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85).setInteractive());
    if (!urls.length) {
      layer.add(text(this, width / 2, height / 2, t('galleryEmpty'), 18).setOrigin(0.5));
    } else {
      urls.forEach((url, i) => this.load.image(`gallery-${i}`, url));
      this.load.once(Phaser.Loader.Events.COMPLETE, () => {
        urls.forEach((_, i) => {
          const img = this.add.image(160 + (i % 4) * 210, 160 + Math.floor(i / 4) * 170, `gallery-${i}`);
          img.setScale(Math.min(190 / img.width, 150 / img.height));
          layer.add(img);
        });
      });
      this.load.start();
    }
    layer.add(button(this, width / 2, height - 50, t('back'), () => layer.destroy(), { size: 16 }));
  }
}
