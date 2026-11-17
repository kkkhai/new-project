import * as Phaser from 'phaser';
import { parseLevel, type LevelDef } from '../core/level.ts';
import { exitOpen, step } from '../core/tick.ts';
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
  private state!: GameState;
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
      } else if (e.code === 'KeyR') {
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
    this.state = parseLevel(this.def);
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
    step(this.state, { dir: this.nextDir() });
    this.render(false);

    if (this.state.status === 'dead') {
      this.showBanner('Crushed! Restarting…', '#ff6b6b');
      this.pauseTicks = true;
      this.cameras.main.shake(250, 0.01);
      this.time.delayedCall(900, () => this.loadLevel(this.levelIndex));
    } else if (this.state.status === 'won') {
      this.showBanner(`${this.def.name} complete!`, '#f0c850');
      this.pauseTicks = true;
      this.time.delayedCall(1200, () => this.loadLevel((this.levelIndex + 1) % LEVELS.length));
    }
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
    this.hud.setText(
      `${this.def.id} ${this.def.name}   ◆ ${this.state.diamonds}/${this.state.quota}` +
        `${exitOpen(this.state) ? '  EXIT OPEN' : ''}\nArrows/WASD move · R restart · N next level`,
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
    switch (o.kind) {
      case 'boulder':
        return this.add.circle(0, 0, TILE / 2 - 2, COLORS.boulder).setStrokeStyle(2, COLORS.boulderEdge).setDepth(5);
      case 'diamond':
        return this.add
          .polygon(0, 0, [10, 0, 20, 12, 10, 24, 0, 12], COLORS.diamond)
          .setStrokeStyle(2, 0xffffff, 0.6)
          .setDepth(5);
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
