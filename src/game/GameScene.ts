import * as Phaser from 'phaser';
import type { LevelDef } from '../core/level.ts';
import { Session } from '../core/session.ts';
import { exitOpen } from '../core/tick.ts';
import type { Dir, GameState, Obj } from '../core/types.ts';
import { LEVELS } from './levels.ts';
import { COLORS, TILE } from './palette.ts';

const TICK_MS = 150;
const KEY_DIRS: Record<string, Dir> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
};

/** Debug/test hook so the browser smoke test can read the game state. */
declare global {
  interface Window {
    __drr?: { state: () => GameState; levelId: () => string };
  }
}

/**
 * M0 prototype scene: draws the grid with placeholder shapes, runs the fixed tick,
 * and animates objects between tick states. Game rules live in src/core.
 */
export class GameScene extends Phaser.Scene {
  private levelIndex = 0;
  private def!: LevelDef;
  private session!: Session;
  private get state(): GameState {
    return this.session.state;
  }
  private terrainGfx!: Phaser.GameObjects.Graphics;
  private objViews = new Map<number, Phaser.GameObjects.Shape>();
  private playerView!: Phaser.GameObjects.Rectangle;
  private hud!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private heldDirs: Dir[] = [];
  private queuedDir: Dir | null = null;
  private swipeStart: { x: number; y: number } | null = null;
  private pauseTicks = false;

  constructor() {
    super('Game');
  }

  create(): void {
    this.terrainGfx = this.add.graphics();
    this.hud = this.add
      .text(12, 10, '', { fontFamily: 'monospace', fontSize: '18px', color: '#f5e9d0' })
      .setScrollFactor(0)
      .setDepth(100);
    this.banner = this.add
      .text(this.scale.width / 2, this.scale.height / 2, '', {
        fontFamily: 'monospace', fontSize: '36px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101)
      .setVisible(false);

    this.setupInput();
    this.loadLevel(0);
    this.time.addEvent({ delay: TICK_MS, loop: true, callback: () => this.onTick() });

    window.__drr = { state: () => this.state, levelId: () => this.def.id };
  }

  // ---------- input ----------

  private setupInput(): void {
    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.code];
      if (dir) {
        this.heldDirs = [...this.heldDirs.filter((d) => d !== dir), dir];
        this.queuedDir ??= dir;
      } else if (e.code === 'KeyR' && !this.pauseTicks) {
        this.session.restartRoom();
        this.render(true);
        this.flash('Room restarted', '#f5e9d0');
      } else if (e.code === 'KeyL') {
        this.loadLevel(this.levelIndex);
      } else if (e.code === 'KeyN') {
        this.loadLevel((this.levelIndex + 1) % LEVELS.length);
      }
    });
    kb.on('keyup', (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.code];
      if (dir) this.heldDirs = this.heldDirs.filter((d) => d !== dir);
    });
    this.game.events.on(Phaser.Core.Events.BLUR, () => (this.heldDirs = []));

    // Touch: swipe to move one tile.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => (this.swipeStart = { x: p.x, y: p.y }));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.swipeStart) return;
      const dx = p.x - this.swipeStart.x;
      const dy = p.y - this.swipeStart.y;
      this.swipeStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      this.queuedDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    });
  }

  private nextDir(): Dir | null {
    const dir = this.queuedDir ?? this.heldDirs.at(-1) ?? null;
    this.queuedDir = null;
    return dir;
  }

  // ---------- level lifecycle ----------

  private loadLevel(index: number): void {
    this.levelIndex = index;
    this.def = LEVELS[index];
    this.session = new Session(this.def);
    this.pauseTicks = false;
    this.queuedDir = null;
    this.banner.setVisible(false);

    for (const v of this.objViews.values()) v.destroy();
    this.objViews.clear();
    this.playerView?.destroy();
    this.playerView = this.add.rectangle(0, 0, TILE - 8, TILE - 6, COLORS.player).setStrokeStyle(2, COLORS.playerFace).setDepth(10);

    const w = this.state.width * TILE;
    const h = this.state.height * TILE;
    const cam = this.cameras.main;
    if (w <= this.scale.width && h <= this.scale.height - 64) {
      // Small room: keep it centred on screen.
      cam.stopFollow();
      cam.removeBounds();
      cam.centerOn(w / 2, h / 2 - 24);
    } else {
      // Large level: follow the player; leave room at the top for the HUD.
      cam.setBounds(0, -64, w, h + 64);
      cam.startFollow(this.playerView, true, 0.15, 0.15);
    }

    this.render(true);
  }

  private onTick(): void {
    if (this.pauseTicks) return;
    const result = this.session.tick({ dir: this.nextDir() });
    const events = this.state.events;
    this.render(result === 'respawn' || result === 'gameOver');

    if (events.some((e) => e.type === 'checkpoint')) this.flash('Checkpoint saved', '#3fbf7f');
    if (result === 'respawn') {
      this.cameras.main.shake(200, 0.01);
      this.flash(`Ouch! ${this.state.hearts} ♥ left`, '#ff6b6b');
    } else if (result === 'gameOver') {
      this.cameras.main.shake(300, 0.015);
      this.flash('Out of hearts: level restarted', '#ff6b6b');
    } else if (result === 'won') {
      this.showBanner(`${this.def.name} complete!`, '#f0c850');
      this.pauseTicks = true;
      this.time.delayedCall(1200, () => this.loadLevel((this.levelIndex + 1) % LEVELS.length));
    }
  }

  /** Short message that fades out on its own. */
  private flash(text: string, color: string): void {
    this.showBanner(text, color);
    this.time.delayedCall(900, () => {
      if (!this.pauseTicks) this.banner.setVisible(false);
    });
  }

  private showBanner(text: string, color: string): void {
    this.banner.setText(text).setColor(color).setVisible(true);
  }

  // ---------- drawing ----------

  private render(instant: boolean): void {
    this.drawTerrain();
    this.syncObjects(instant);
    this.moveView(this.playerView, this.state.player.x, this.state.player.y, instant);
    this.playerView.setVisible(this.state.player.alive);
    const st = this.state;
    const hearts = '♥'.repeat(st.hearts) + '♡'.repeat(Math.max(0, st.maxHearts - st.hearts));
    const keys = `${st.keys.silver ? ` ⚿×${st.keys.silver}` : ''}${st.keys.gold ? ` ⚷×${st.keys.gold}` : ''}`;
    this.hud.setText(
      `${hearts}   ◆ ${st.diamonds}/${st.quota}${exitOpen(st) ? ' EXIT OPEN' : ''}   ♦ ${st.redDiamonds}${keys}\n` +
        `${this.def.id} ${this.def.name} · R restart room · L restart level · N next`,
    );
  }

  private drawTerrain(): void {
    const g = this.terrainGfx;
    const s = this.state;
    g.clear();
    for (let y = 0; y < s.height; y++) {
      for (let x = 0; x < s.width; x++) {
        const px = x * TILE;
        const py = y * TILE;
        switch (s.terrain[y * s.width + x]) {
          case 'floor':
            g.fillStyle(COLORS.floor).fillRect(px, py, TILE, TILE);
            break;
          case 'wall':
            g.fillStyle(COLORS.wallEdge).fillRect(px, py, TILE, TILE);
            g.fillStyle(COLORS.wall).fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
            break;
          case 'dirt':
            g.fillStyle(COLORS.dirt).fillRect(px, py, TILE, TILE);
            g.fillStyle(COLORS.dirtSpeck);
            for (const [sx, sy] of [[6, 7], [20, 5], [12, 18], [25, 22], [5, 26]]) g.fillRect(px + sx, py + sy, 3, 3);
            break;
          case 'exit':
            g.fillStyle(COLORS.floor).fillRect(px, py, TILE, TILE);
            g.fillStyle(exitOpen(s) ? COLORS.exitOpen : COLORS.exitClosed).fillRect(px + 4, py + 2, TILE - 8, TILE - 2);
            break;
          case 'cracked':
            g.fillStyle(COLORS.wallEdge).fillRect(px, py, TILE, TILE);
            g.fillStyle(COLORS.wall).fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
            g.lineStyle(2, COLORS.cracks).lineBetween(px + 6, py + 4, px + 16, py + 16).lineBetween(px + 16, py + 16, px + 12, py + 28).lineBetween(px + 16, py + 16, px + 27, py + 20);
            break;
          case 'spikes':
            g.fillStyle(COLORS.floor).fillRect(px, py, TILE, TILE);
            g.fillStyle(COLORS.spikes);
            for (const sx of [2, 12, 22]) g.fillTriangle(px + sx, py + 28, px + sx + 4, py + 6, px + sx + 8, py + 28);
            break;
          case 'pit':
            g.fillStyle(COLORS.floor).fillRect(px, py, TILE, TILE);
            g.fillStyle(COLORS.pit).fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
            break;
          case 'checkpoint':
            g.fillStyle(COLORS.floor).fillRect(px, py, TILE, TILE);
            g.fillStyle(COLORS.checkpoint).fillRect(px + 12, py + 4, 8, 24).fillTriangle(px + 8, py + 10, px + 16, py + 2, px + 24, py + 10);
            break;
          case 'doorSilver':
          case 'doorGold':
            g.fillStyle(COLORS.wallEdge).fillRect(px, py, TILE, TILE);
            g.fillStyle(s.terrain[y * s.width + x] === 'doorGold' ? COLORS.keyGold : COLORS.keySilver).fillRect(px + 4, py + 2, TILE - 8, TILE - 2);
            g.fillStyle(COLORS.wallEdge).fillCircle(px + 16, py + 14, 4).fillRect(px + 14, py + 16, 4, 8);
            break;
          case 'plate': {
            const pressed = !!s.objs[y * s.width + x] || (s.player.x === x && s.player.y === y);
            g.fillStyle(COLORS.floor).fillRect(px, py, TILE, TILE);
            g.fillStyle(pressed ? COLORS.plateDown : COLORS.plate).fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
            break;
          }
          case 'lever':
            g.fillStyle(COLORS.wallEdge).fillRect(px, py, TILE, TILE);
            g.lineStyle(4, COLORS.lever).lineBetween(px + 16, py + 26, s.leverOn ? px + 26 : px + 6, py + 6);
            break;
          case 'gate':
            g.fillStyle(COLORS.floor).fillRect(px, py, TILE, TILE);
            if (!s.gateOpen) {
              g.fillStyle(COLORS.gate);
              for (const bx of [4, 13, 22]) g.fillRect(px + bx, py, 6, TILE);
            } else {
              g.lineStyle(1, COLORS.gate).strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
            }
            break;
        }
      }
    }
  }

  private syncObjects(instant: boolean): void {
    const s = this.state;
    const seen = new Set<number>();
    s.objs.forEach((o, i) => {
      if (!o) return;
      seen.add(o.id);
      let view = this.objViews.get(o.id);
      if (!view) {
        view = this.makeObjView(o);
        this.objViews.set(o.id, view);
        this.moveView(view, i % s.width, Math.floor(i / s.width), true);
      } else {
        this.moveView(view, i % s.width, Math.floor(i / s.width), instant);
      }
    });
    for (const [id, view] of this.objViews) {
      if (seen.has(id)) continue;
      this.objViews.delete(id);
      this.tweens.add({ targets: view, scale: 1.6, alpha: 0, duration: 160, onComplete: () => view.destroy() });
    }
  }

  private makeObjView(o: Obj): Phaser.GameObjects.Shape {
    const gem = (color: number) =>
      this.add.polygon(0, 0, [10, 0, 20, 12, 10, 24, 0, 12], color).setStrokeStyle(2, 0xffffff, 0.6).setDepth(5);
    switch (o.kind) {
      case 'boulder':
        return this.add.circle(0, 0, TILE / 2 - 2, COLORS.boulder).setStrokeStyle(2, COLORS.boulderEdge).setDepth(5);
      case 'diamond':
        return gem(COLORS.diamond);
      case 'redDiamond':
        return gem(COLORS.redDiamond);
      case 'keySilver':
      case 'keyGold':
        return this.add
          .rectangle(0, 0, 18, 10, o.kind === 'keyGold' ? COLORS.keyGold : COLORS.keySilver)
          .setStrokeStyle(2, 0x000000, 0.5)
          .setDepth(5);
      case 'heart':
        return this.add.star(0, 0, 5, 5, 11, COLORS.heart).setDepth(5);
    }
  }

  private moveView(view: Phaser.GameObjects.Shape, x: number, y: number, instant: boolean): void {
    const tx = x * TILE + TILE / 2;
    const ty = y * TILE + TILE / 2;
    this.tweens.killTweensOf(view);
    if (instant) view.setPosition(tx, ty);
    else this.tweens.add({ targets: view, x: tx, y: ty, duration: TICK_MS - 10 });
  }
}
