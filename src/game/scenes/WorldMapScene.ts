import * as Phaser from 'phaser';
import type { LevelDef } from '../../core/level.ts';
import { rewardUnlocked, totalRedDiamonds } from '../../core/progress.ts';
import { t } from '../i18n.ts';
import { CAMPAIGN, RED_TOTAL, SECRET, TRAINING, WORLDS } from '../levels.ts';
import { loadSave } from '../save.ts';
import { DEMO_UNLOCK_ALL } from '../config.ts';
import { button, text } from '../ui.ts';

const REGION = {
  jungle: { color: 0x1f4a24, edge: 0x3f8a44 },
  desert: { color: 0x6a5228, edge: 0xb08850 },
  snow: { color: 0x4a5a6a, edge: 0xc8e0f0 },
} as const;

/**
 * World map: the three regions side by side, each level a node on a winding path.
 * Locked nodes are dim; finished ones show their stars.
 */
export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super('WorldMap');
  }

  create(): void {
    const { width, height } = this.scale;
    const save = loadSave();
    const regionW = (width - 40) / 3;
    const top = 70;
    const bottom = height - 110;
    text(this, width / 2, 30, t('chooseLevel'), 26, '#f0c850').setOrigin(0.5);
    if (DEMO_UNLOCK_ALL) text(this, 20, 30, 'DEMO', 16, '#ff9f43').setOrigin(0, 0.5);
    text(this, width - 20, 30, `♦ ${totalRedDiamonds(save)}/${RED_TOTAL}`, 18, '#ff6b85').setOrigin(1, 0.5);

    const g = this.add.graphics();
    WORLDS.forEach((w, wi) => {
      const x0 = 20 + wi * regionW;
      const r = REGION[w.id];
      g.fillStyle(r.color).fillRoundedRect(x0 + 4, top, regionW - 8, bottom - top, 16);
      g.lineStyle(3, r.edge).strokeRoundedRect(x0 + 4, top, regionW - 8, bottom - top, 16);
      text(this, x0 + regionW / 2, top + 18, w.name, 16, '#ffffff').setOrigin(0.5);

      const levels = CAMPAIGN.filter((l) => l.world === w.id);
      const pts = levels.map((_, i) => {
        // Zigzag path down the region.
        const row = Math.floor(i / 2);
        const col = i % 2 === 0 ? (row % 2 === 0 ? 0.3 : 0.7) : row % 2 === 0 ? 0.7 : 0.3;
        return { x: x0 + regionW * col, y: top + 60 + row * ((bottom - top - 90) / Math.max(1, Math.ceil(levels.length / 2) - 1)) };
      });
      g.lineStyle(4, 0xf5e9d0, 0.35);
      for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
      levels.forEach((l, i) => this.node(l, pts[i].x, pts[i].y, DEMO_UNLOCK_ALL || save.unlocked.includes(l.id), save.records[l.id]?.stars ?? 0));
    });

    const showSecret = SECRET.length > 0 && (DEMO_UNLOCK_ALL || rewardUnlocked(save, 'secretLevel', RED_TOTAL));
    let bx = width / 2 - (showSecret ? 330 : 250);
    const bar: [string, () => void][] = [
      [t('back'), () => this.scene.start('Title')],
      [t('training'), () => this.scene.start('Training')],
      [t('rewards'), () => this.scene.start('Rewards')],
      [t('settings'), () => this.scene.start('Settings')],
    ];
    if (showSecret) bar.push([t('secret'), () => this.scene.start('Game', { levelId: SECRET[0].id })]);
    for (const [label, fn] of bar) {
      button(this, bx + 80, height - 50, label, fn, { size: 16, width: 150 });
      bx += 166;
    }

    const kb = this.input.keyboard!;
    kb.on('keydown-ESC', () => this.scene.start('Title'));
    // Enter: continue with the first unfinished level that is open.
    kb.on('keydown-ENTER', () => {
      const open = CAMPAIGN.filter((l) => DEMO_UNLOCK_ALL || save.unlocked.includes(l.id));
      const next = open.find((l) => !save.records[l.id]) ?? open.at(-1);
      if (next) this.scene.start('Game', { levelId: next.id });
    });
  }

  private node(l: LevelDef, x: number, y: number, open: boolean, stars: number): void {
    const boss = l.id.endsWith('BOSS');
    const r = boss ? 26 : 19;
    const c = this.add.circle(x, y, r, open ? 0x3a2f26 : 0x1a1612).setStrokeStyle(3, open ? (boss ? 0xff5d73 : 0xf0c850) : 0x4a4038);
    const label = boss ? '☠' : l.id.slice(2);
    text(this, x, y, open ? label : '🔒', boss ? 20 : 15, open ? '#f5e9d0' : '#6a5e4e').setOrigin(0.5);
    if (open && stars > 0) text(this, x, y + r + 9, '★'.repeat(stars), 12, '#f0c850').setOrigin(0.5);
    if (!open) return;
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => c.setFillStyle(0x5a4a3a));
    c.on('pointerout', () => c.setFillStyle(0x3a2f26));
    c.on('pointerup', () => this.scene.start('Game', { levelId: l.id }));
  }
}

/** The always-open training rooms from M0/M1. */
export class TrainingScene extends Phaser.Scene {
  constructor() {
    super('Training');
  }

  create(): void {
    const { width, height } = this.scale;
    const save = loadSave();
    text(this, width / 2, 40, t('training'), 26, '#f0c850').setOrigin(0.5);
    TRAINING.forEach((l, i) => {
      const stars = save.records[l.id]?.stars ?? 0;
      button(this, width / 2, 110 + i * 64, `${l.id}  ${l.name}  ${'★'.repeat(stars)}`, () => this.scene.start('Game', { levelId: l.id }), {
        size: 18,
        width: 460,
      });
    });
    button(this, width / 2, height - 50, t('back'), () => this.scene.start('WorldMap'), { size: 16 });
    this.input.keyboard!.on('keydown-ESC', () => this.scene.start('WorldMap'));
  }
}
