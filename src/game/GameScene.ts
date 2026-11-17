import * as Phaser from 'phaser';
import { countRedDiamonds, parseLevel, type LevelDef } from '../core/level.ts';
import { recordResult, scoreFor, starsFor, TICK_SECONDS, type LevelResult } from '../core/progress.ts';
import { Session } from '../core/session.ts';
import { exitOpen } from '../core/tick.ts';
import type { Actor, Dir, GameState, Obj } from '../core/types.ts';
import { Audio } from './audio.ts';
import { CAMPAIGN_ORDER, levelById, nextLevelId, TRAINING } from './levels.ts';
import { COLORS, TILE } from './palette.ts';
import type { ResultsData } from './scenes/ResultsScene.ts';
import { loadSave, writeSave } from './save.ts';
import { button, FONT } from './ui.ts';

const TICK_MS = TICK_SECONDS * 1000;
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

type View = Phaser.GameObjects.Shape | Phaser.GameObjects.Container;

/**
 * Plays one level: runs the fixed tick, draws placeholder shapes, handles input,
 * pause menu, touch controls, sound and the results screen. Game rules live in src/core.
 */
export class GameScene extends Phaser.Scene {
  private def!: LevelDef;
  private session!: Session;
  private get state(): GameState {
    return this.session.state;
  }
  private redTotal = 0;
  private terrainGfx!: Phaser.GameObjects.Graphics;
  private objViews = new Map<number, View>();
  private actorViews = new Map<number, View>();
  private playerView!: Phaser.GameObjects.Rectangle;
  private hud!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  private pauseLayer: Phaser.GameObjects.GameObject[] = [];
  private heldDirs: Dir[] = [];
  private queuedDir: Dir | null = null;
  private queuedAction = false;
  private swipeStart: { x: number; y: number } | null = null;
  private stopped = false;
  private paused = false;
  private audio!: Audio;

  constructor() {
    super('Game');
  }

  init(data: { levelId?: string }): void {
    this.def = levelById(data.levelId ?? '') ?? TRAINING[0];
    this.objViews = new Map();
    this.actorViews = new Map();
    this.heldDirs = [];
    this.queuedDir = null;
    this.queuedAction = false;
    this.stopped = false;
    this.paused = false;
    this.pauseLayer = [];
  }

  create(): void {
    const save = loadSave();
    this.audio = new Audio(this);
    this.audio.setMuted(save.settings.muted);
    this.audio.playMusic(this.def.id.endsWith('BOSS') ? 'boss' : this.def.world);

    this.session = new Session(this.def);
    this.redTotal = countRedDiamonds(parseLevel(this.def));
    this.terrainGfx = this.add.graphics();
    this.playerView = this.add.rectangle(0, 0, TILE - 8, TILE - 6, COLORS.player).setStrokeStyle(2, COLORS.playerFace).setDepth(10);

    this.hud = this.add
      .text(12, 10, '', { fontFamily: FONT, fontSize: '18px', color: '#f5e9d0', backgroundColor: '#00000088', padding: { x: 6, y: 4 } })
      .setScrollFactor(0)
      .setDepth(100);
    this.banner = this.add
      .text(this.scale.width / 2, this.scale.height / 2, '', {
        fontFamily: FONT, fontSize: '32px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101)
      .setVisible(false);

    this.setupCamera();
    this.setupInput();
    if (this.sys.game.device.input.touch) this.setupTouchControls();
    this.render(true);
    this.time.addEvent({ delay: TICK_MS, loop: true, callback: () => this.onTick() });

    window.__drr = { state: () => this.state, levelId: () => this.def.id };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.audio.stopMusic());
  }

  private setupCamera(): void {
    const w = this.state.width * TILE;
    const h = this.state.height * TILE;
    const cam = this.cameras.main;
    if (w <= this.scale.width && h <= this.scale.height - 120) {
      cam.centerOn(w / 2, h / 2 - 20);
    } else {
      cam.setBounds(0, -60, w, h + 160);
      cam.startFollow(this.playerView, true, 0.15, 0.15);
    }
  }

  // ---------- input ----------

  private setupInput(): void {
    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.code];
      if (dir) {
        this.press(dir);
        return;
      }
      switch (e.code) {
        case 'Space':
        case 'KeyX':
          this.queuedAction = true;
          break;
        case 'KeyR':
          this.restartRoom();
          break;
        case 'Escape':
        case 'KeyP':
          this.togglePause();
          break;
        case 'KeyM':
          this.toggleMute();
          break;
        case 'KeyN': // developer shortcut: Shift+N skips to the next level
          if (e.shiftKey) this.goTo(nextLevelId(this.def.id));
          break;
      }
    });
    kb.on('keyup', (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.code];
      if (dir) this.release(dir);
    });
    const onBlur = () => (this.heldDirs = []);
    this.game.events.on(Phaser.Core.Events.BLUR, onBlur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(Phaser.Core.Events.BLUR, onBlur));

    // Touch: swipe anywhere (outside the buttons) to step one tile.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      this.swipeStart = over.length ? null : { x: p.x, y: p.y };
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!this.swipeStart) return;
      const dx = p.x - this.swipeStart.x;
      const dy = p.y - this.swipeStart.y;
      this.swipeStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
      this.queuedDir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    });
  }

  private press(dir: Dir): void {
    this.heldDirs = [...this.heldDirs.filter((d) => d !== dir), dir];
    this.queuedDir ??= dir;
  }

  private release(dir: Dir): void {
    this.heldDirs = this.heldDirs.filter((d) => d !== dir);
  }

  /** On-screen D-pad (bottom left) and tool / pause buttons (bottom right) for phones. */
  private setupTouchControls(): void {
    const { width, height } = this.scale;
    const size = 64;
    const cx = 110;
    const cy = height - 110;
    const pad: [Dir, number, number, string][] = [
      ['up', cx, cy - size, '▲'], ['down', cx, cy + size, '▼'], ['left', cx - size, cy, '◀'], ['right', cx + size, cy, '▶'],
    ];
    for (const [dir, x, y, label] of pad) {
      const b = this.add
        .text(x, y, label, {
          fontFamily: FONT, fontSize: '28px', color: '#ffffff', backgroundColor: '#00000066',
          fixedWidth: size - 6, fixedHeight: size - 6, align: 'center', padding: { y: 12 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(120)
        .setInteractive();
      b.on('pointerdown', () => this.press(dir));
      b.on('pointerup', () => this.release(dir));
      b.on('pointerout', () => this.release(dir));
    }
    const tool = button(this, width - 90, height - 100, 'TOOL', () => (this.queuedAction = true), { size: 20, width: 100 });
    const pause = button(this, width - 60, 30, '❚❚', () => this.togglePause(), { size: 18 });
    for (const b of [tool, pause]) b.setScrollFactor(0).setDepth(120);
  }

  private nextInput(): { dir: Dir | null; action: boolean } {
    const action = this.queuedAction;
    const dir = action ? null : (this.queuedDir ?? this.heldDirs.at(-1) ?? null);
    this.queuedAction = false;
    this.queuedDir = null;
    return { dir, action };
  }

  // ---------- flow ----------

  private onTick(): void {
    if (this.stopped || this.paused) return;
    const result = this.session.tick(this.nextInput());
    const events = this.state.events;
    this.audio.playEvents(events);
    this.render(result === 'respawn' || result === 'gameOver');

    if (events.some((e) => e.type === 'checkpoint')) this.flash('Checkpoint saved', '#3fbf7f');
    if (events.some((e) => e.type === 'tool')) this.flash('Machete! Press Space (TOOL) to cut vines', '#f0c850', 2200);
    if (events.some((e) => e.type === 'steal')) this.flash('The monkey stole a diamond!', '#ff9f43');
    if (events.some((e) => e.type === 'bossDefeated')) this.flash('The guardian falls! The exit is open', '#f0c850', 1800);

    if (result === 'respawn') {
      this.cameras.main.shake(200, 0.01);
      this.flash(`Ouch! ${this.state.hearts} ♥ left`, '#ff6b6b');
    } else if (result === 'gameOver') {
      this.cameras.main.shake(300, 0.015);
      this.flash('Out of hearts: level restarted', '#ff6b6b', 1500);
    } else if (result === 'won') {
      this.finish();
    }
  }

  private finish(): void {
    this.stopped = true;
    const r: LevelResult = {
      timeSec: this.session.ticks * TICK_SECONDS,
      diamonds: this.state.diamonds,
      redDiamonds: this.state.redDiamonds,
      redTotal: this.redTotal,
      deaths: this.session.deaths,
    };
    let save = loadSave();
    save = recordResult(save, this.def, r, CAMPAIGN_ORDER);
    writeSave(save);
    const data: ResultsData = {
      levelId: this.def.id,
      name: this.def.name,
      timeSec: r.timeSec,
      diamonds: r.diamonds,
      quota: this.def.quota,
      redDiamonds: r.redDiamonds,
      redTotal: r.redTotal,
      deaths: r.deaths,
      stars: starsFor(this.def, r),
      score: scoreFor(this.def, r),
      nextId: nextLevelId(this.def.id),
    };
    this.time.delayedCall(700, () => this.scene.launch('Results', data));
  }

  private restartRoom(): void {
    if (this.stopped) return;
    this.session.restartRoom();
    this.render(true);
    this.flash('Room restarted', '#f5e9d0');
  }

  private goTo(levelId: string | undefined): void {
    if (levelId) this.scene.start('Game', { levelId });
    else this.scene.start('LevelSelect');
  }

  private toggleMute(): void {
    const save = loadSave();
    save.settings.muted = !save.settings.muted;
    writeSave(save);
    this.audio.setMuted(save.settings.muted);
    this.flash(save.settings.muted ? 'Sound off' : 'Sound on', '#f5e9d0');
  }

  private togglePause(): void {
    if (this.stopped) return;
    this.paused = !this.paused;
    for (const o of this.pauseLayer) o.destroy();
    this.pauseLayer = [];
    if (!this.paused) return;
    const { width, height } = this.scale;
    const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65).setScrollFactor(0).setDepth(200).setInteractive();
    const items: [string, () => void][] = [
      ['Resume', () => this.togglePause()],
      ['Restart room', () => {
        this.togglePause();
        this.restartRoom();
      }],
      ['Restart level', () => this.goTo(this.def.id)],
      ['Quit to levels', () => this.scene.start('LevelSelect')],
    ];
    this.pauseLayer = [
      bg,
      ...items.map(([label, fn], i) => button(this, width / 2, height / 2 - 90 + i * 60, label, fn, { width: 260 }).setScrollFactor(0).setDepth(201)),
    ];
  }

  /** Short message that fades out on its own. */
  private flash(text: string, color: string, ms = 900): void {
    this.banner.setText(text).setColor(color).setVisible(true);
    this.time.delayedCall(ms, () => {
      if (this.banner.text === text) this.banner.setVisible(false);
    });
  }

  // ---------- drawing ----------

  private render(instant: boolean): void {
    this.drawTerrain();
    this.syncObjects(instant);
    this.syncActors(instant);
    this.moveView(this.playerView, this.state.player.x, this.state.player.y, instant);
    this.playerView.setVisible(this.state.player.alive);
    const st = this.state;
    const hearts = '♥'.repeat(st.hearts) + '♡'.repeat(Math.max(0, st.maxHearts - st.hearts));
    const keys = `${st.keys.silver ? `  silver key ×${st.keys.silver}` : ''}${st.keys.gold ? `  gold key ×${st.keys.gold}` : ''}`;
    const tools = (Object.keys(st.tools) as (keyof typeof st.tools)[]).filter((t) => st.tools[t]).join(' ');
    this.hud.setText(
      `${hearts}   ◆ ${st.diamonds}/${st.quota}${exitOpen(st) ? ' EXIT OPEN' : ''}   ♦ ${st.redDiamonds}/${this.redTotal}${keys}` +
        `${tools ? `   [${tools}]` : ''}\n${this.def.id} ${this.def.name}`,
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
        const t = s.terrain[y * s.width + x];
        const floor = () => g.fillStyle(COLORS.floor).fillRect(px, py, TILE, TILE);
        switch (t) {
          case 'floor':
            floor();
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
            floor();
            g.fillStyle(exitOpen(s) ? COLORS.exitOpen : COLORS.exitClosed).fillRect(px + 4, py + 2, TILE - 8, TILE - 2);
            break;
          case 'cracked':
            g.fillStyle(COLORS.wallEdge).fillRect(px, py, TILE, TILE);
            g.fillStyle(COLORS.wall).fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
            g.lineStyle(2, COLORS.cracks)
              .lineBetween(px + 6, py + 4, px + 16, py + 16)
              .lineBetween(px + 16, py + 16, px + 12, py + 28)
              .lineBetween(px + 16, py + 16, px + 27, py + 20);
            break;
          case 'spikes':
            floor();
            g.fillStyle(COLORS.spikes);
            for (const sx of [2, 12, 22]) g.fillTriangle(px + sx, py + 28, px + sx + 4, py + 6, px + sx + 8, py + 28);
            break;
          case 'pit':
            floor();
            g.fillStyle(COLORS.pit).fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
            break;
          case 'checkpoint':
            floor();
            g.fillStyle(COLORS.checkpoint).fillRect(px + 12, py + 4, 8, 24).fillTriangle(px + 8, py + 10, px + 16, py + 2, px + 24, py + 10);
            break;
          case 'doorSilver':
          case 'doorGold':
            g.fillStyle(COLORS.wallEdge).fillRect(px, py, TILE, TILE);
            g.fillStyle(t === 'doorGold' ? COLORS.keyGold : COLORS.keySilver).fillRect(px + 4, py + 2, TILE - 8, TILE - 2);
            g.fillStyle(COLORS.wallEdge).fillCircle(px + 16, py + 14, 4).fillRect(px + 14, py + 16, 4, 8);
            break;
          case 'plate': {
            const pressed = !!s.objs[y * s.width + x] || (s.player.x === x && s.player.y === y);
            floor();
            g.fillStyle(pressed ? COLORS.plateDown : COLORS.plate).fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
            break;
          }
          case 'lever':
            g.fillStyle(COLORS.wallEdge).fillRect(px, py, TILE, TILE);
            g.lineStyle(4, COLORS.lever).lineBetween(px + 16, py + 26, s.leverOn ? px + 26 : px + 6, py + 6);
            break;
          case 'gate':
            floor();
            if (!s.gateOpen) {
              g.fillStyle(COLORS.gate);
              for (const bx of [4, 13, 22]) g.fillRect(px + bx, py, 6, TILE);
            } else {
              g.lineStyle(1, COLORS.gate).strokeRect(px + 1, py + 1, TILE - 2, TILE - 2);
            }
            break;
          case 'vines':
            floor();
            g.lineStyle(4, COLORS.vines);
            for (const vx of [6, 16, 26]) g.lineBetween(px + vx, py, px + vx - 3, py + TILE);
            g.fillStyle(COLORS.leaf).fillCircle(px + 8, py + 10, 4).fillCircle(px + 22, py + 20, 4);
            break;
          case 'thorns':
            floor();
            g.fillStyle(COLORS.vines).fillCircle(px + 16, py + 16, 12);
            g.fillStyle(COLORS.spikes);
            for (const [tx, ty] of [[6, 6], [24, 8], [8, 24], [26, 26], [16, 3]]) {
              g.fillTriangle(px + tx - 3, py + ty + 3, px + tx, py + ty - 4, px + tx + 3, py + ty + 3);
            }
            break;
          case 'water':
            g.fillStyle(COLORS.water).fillRect(px, py, TILE, TILE);
            g.lineStyle(2, COLORS.waterLight).lineBetween(px + 4, py + 10, px + 14, py + 10).lineBetween(px + 16, py + 22, px + 28, py + 22);
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
      const x = i % s.width;
      const y = Math.floor(i / s.width);
      let view = this.objViews.get(o.id);
      if (!view) {
        view = this.makeObjView(o);
        this.objViews.set(o.id, view);
        this.moveView(view, x, y, true);
      } else {
        this.moveView(view, x, y, instant);
      }
    });
    this.removeMissing(this.objViews, seen);
  }

  private syncActors(instant: boolean): void {
    const seen = new Set<number>();
    for (const a of this.state.actors) {
      if (!a.alive) continue;
      seen.add(a.id);
      let view = this.actorViews.get(a.id);
      if (!view) {
        view = this.makeActorView(a);
        this.actorViews.set(a.id, view);
        this.moveView(view, a.x, a.y, true);
      } else {
        this.moveView(view, a.x, a.y, instant);
      }
      if (a.kind === 'idol') view.setAlpha(0.55 + 0.15 * a.hp);
    }
    this.removeMissing(this.actorViews, seen);
  }

  private removeMissing(views: Map<number, View>, seen: Set<number>): void {
    for (const [id, view] of views) {
      if (seen.has(id)) continue;
      views.delete(id);
      this.tweens.killTweensOf(view);
      this.tweens.add({ targets: view, scale: 1.6, alpha: 0, duration: 180, onComplete: () => view.destroy() });
    }
  }

  private makeObjView(o: Obj): View {
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
      case 'machete':
      case 'shovel':
      case 'pickaxe':
        return this.add.rectangle(0, 0, 6, 24, COLORS.tool).setAngle(35).setStrokeStyle(2, 0x000000, 0.5).setDepth(5);
    }
  }

  private makeActorView(a: Actor): View {
    const c = this.add.container(0, 0).setDepth(8);
    switch (a.kind) {
      case 'snake':
        c.add([this.add.ellipse(0, 4, 26, 12, COLORS.snake), this.add.circle(10, 0, 6, COLORS.snake), this.add.circle(12, -2, 1.5, 0x000000)]);
        break;
      case 'spider':
        c.add([
          this.add.rectangle(0, -10, 2, 12, 0xdddddd),
          this.add.circle(0, 2, 9, COLORS.spider),
          this.add.circle(-3, 0, 2, 0xff3b30),
          this.add.circle(3, 0, 2, 0xff3b30),
        ]);
        break;
      case 'monkey':
        c.add([
          this.add.circle(0, 2, 11, COLORS.monkey),
          this.add.circle(0, 4, 6, 0xe0b080),
          this.add.circle(-3, 0, 1.5, 0x000000),
          this.add.circle(3, 0, 1.5, 0x000000),
        ]);
        break;
      case 'idol':
        c.add([
          this.add.rectangle(0, 0, TILE - 2, TILE - 2, COLORS.idol).setStrokeStyle(3, COLORS.exitOpen),
          this.add.rectangle(-6, -4, 6, 6, 0xff3b30),
          this.add.rectangle(6, -4, 6, 6, 0xff3b30),
          this.add.rectangle(0, 8, 14, 3, 0x000000),
        ]);
        break;
    }
    return c;
  }

  private moveView(view: View, x: number, y: number, instant: boolean): void {
    const tx = x * TILE + TILE / 2;
    const ty = y * TILE + TILE / 2;
    this.tweens.killTweensOf(view);
    if (instant) view.setPosition(tx, ty);
    else this.tweens.add({ targets: view, x: tx, y: ty, duration: TICK_MS - 10 });
  }
}
