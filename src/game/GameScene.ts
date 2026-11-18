import * as Phaser from 'phaser';
import { countRedDiamonds, parseLevel, type LevelDef } from '../core/level.ts';
import { recordResult, scoreFor, starsFor, TICK_SECONDS, type LevelResult } from '../core/progress.ts';
import { Session } from '../core/session.ts';
import { exitOpen } from '../core/tick.ts';
import type { Actor, Dir, GameState, Obj } from '../core/types.ts';
import { Audio } from './audio.ts';
import { CAMPAIGN_ORDER, levelById, nextLevelId, TRAINING } from './levels.ts';
import { COLORS, TILE, WORLD_TINT } from './palette.ts';
import { DART_PERIOD } from '../core/rules.ts';
import type { ResultsData } from './scenes/ResultsScene.ts';
import { loadSave, writeSave } from './save.ts';
import { t, type TextKey } from './i18n.ts';
import { button, FONT } from './ui.ts';

const TICK_MS = TICK_SECONDS * 1000;
const TOOL_HINT: Record<string, TextKey> = { machete: 'machete', shovel: 'shovel', pickaxe: 'pickaxe' };
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

type View = Phaser.GameObjects.Shape | Phaser.GameObjects.Container | Phaser.GameObjects.Image;

/** Sprites are drawn at 16×16 and shown at 2× so one sprite fills one 32 px tile. */
const SPRITE_SCALE = TILE / 16;

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
  private playerView!: Phaser.GameObjects.Image;
  private objKinds = new Map<number, string>();
  private walkFrame = 1;
  private idleTimer?: Phaser.Time.TimerEvent;
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
  private timeTrial = false;

  constructor() {
    super('Game');
  }

  init(data: { levelId?: string }): void {
    this.def = levelById(data.levelId ?? '') ?? TRAINING[0];
    this.objViews = new Map();
    this.objKinds = new Map();
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

    this.session = new Session(this.def, save.settings.difficulty);
    this.timeTrial = save.settings.timeTrial;
    this.redTotal = countRedDiamonds(parseLevel(this.def));
    this.terrainGfx = this.add.graphics();
    const costume = save.settings.costume;
    this.playerView = this.add.image(0, 0, costume ? 'explorer-gold' : 'explorer', 'down-0').setScale(SPRITE_SCALE).setDepth(10);

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
        case 'KeyZ':
          this.undo();
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
    const extra = this.session.canUndo || this.session.difficulty === 'easy'
      ? [button(this, width - 90, height - 170, t('undo'), () => this.undo(), { size: 16, width: 100 })]
      : [];
    for (const b of [tool, pause, ...extra]) b.setScrollFactor(0).setDepth(120);
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

    if (events.some((e) => e.type === 'checkpoint')) this.flash(t('checkpoint'), '#3fbf7f');
    const tool = events.find((e) => e.type === 'tool');
    const hint = TOOL_HINT[tool?.kind ?? ''];
    if (hint) this.flash(t(hint), '#f0c850', 2200);
    for (const e of events) if (e.type === 'dart') this.drawDart(e.x, e.y, e.toX ?? e.x);
    if (events.some((e) => e.type === 'steal')) this.flash(t('stolen'), '#ff9f43');
    if (events.some((e) => e.type === 'grow')) this.flash(t('grew'), '#e8f8ff');
    if (events.some((e) => e.type === 'bossDefeated')) this.flash(t('bossDown'), '#f0c850', 1800);
    else if (events.some((e) => e.type === 'bossHit')) this.cameras.main.shake(250, 0.012);

    if (result === 'respawn') {
      this.cameras.main.shake(200, 0.01);
      this.flash(t('ouch', { n: this.state.hearts }), '#ff6b6b');
    } else if (result === 'gameOver') {
      this.cameras.main.shake(300, 0.015);
      this.flash(t('outOfHearts'), '#ff6b6b', 1500);
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
    this.flash(t('roomRestarted'), '#f5e9d0');
  }

  private undo(): void {
    if (this.stopped || this.paused || this.session.difficulty !== 'easy') return;
    if (this.session.undo()) this.render(true);
    else this.flash(t('nothingToUndo'), '#f5e9d0');
  }

  private goTo(levelId: string | undefined): void {
    if (levelId) this.scene.start('Game', { levelId });
    else this.scene.start('WorldMap');
  }

  private toggleMute(): void {
    const save = loadSave();
    save.settings.muted = !save.settings.muted;
    writeSave(save);
    this.audio.setMuted(save.settings.muted);
    this.flash(save.settings.muted ? t('soundOff') : t('soundOn'), '#f5e9d0');
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
      [t('resume'), () => this.togglePause()],
      [t('restartRoom'), () => {
        this.togglePause();
        this.restartRoom();
      }],
      [t('restartLevel'), () => this.goTo(this.def.id)],
      [t('quit'), () => this.scene.start('WorldMap')],
    ];
    this.pauseLayer = [
      bg,
      ...items.map(([label, fn], i) => button(this, width / 2, height / 2 - 90 + i * 60, label, fn, { width: 260 }).setScrollFactor(0).setDepth(201)),
    ];
  }

  private drawDart(x: number, y: number, toX: number): void {
    const line = this.add
      .line(0, 0, x * TILE + TILE / 2, y * TILE + TILE / 2, toX * TILE + TILE / 2, y * TILE + TILE / 2, COLORS.dartWarn)
      .setOrigin(0)
      .setLineWidth(3)
      .setDepth(20);
    this.tweens.add({ targets: line, alpha: 0, duration: 250, onComplete: () => line.destroy() });
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
    this.animatePlayer(instant);
    const st = this.state;
    const hearts = '♥'.repeat(st.hearts) + '♡'.repeat(Math.max(0, st.maxHearts - st.hearts));
    const keys = `${st.keys.silver ? `  silver key ×${st.keys.silver}` : ''}${st.keys.gold ? `  gold key ×${st.keys.gold}` : ''}`;
    const tools = (Object.keys(st.tools) as (keyof typeof st.tools)[]).filter((t) => st.tools[t]).join(' ');
    const secs = this.session.ticks * TICK_SECONDS;
    const timer = this.timeTrial
      ? `   ⏱ ${Math.floor(secs / 60)}:${Math.floor(secs % 60).toString().padStart(2, '0')} / par ${this.def.parTimeSec ?? '-'}s`
      : '';
    this.hud.setText(
      `${hearts}   ◆ ${st.diamonds}/${st.quota}${exitOpen(st) ? ` ${t('exitOpen')}` : ''}   ♦ ${st.redDiamonds}/${this.redTotal}${keys}` +
        `${tools ? `   [${tools}]` : ''}\n${this.def.id} ${this.def.name}${timer}`,
    );
  }

  private drawTerrain(): void {
    const g = this.terrainGfx;
    const s = this.state;
    const tint = WORLD_TINT[this.def.world] ?? WORLD_TINT.test;
    const dartWarn = (s.tick + 1) % DART_PERIOD === 0;
    g.clear();
    for (let y = 0; y < s.height; y++) {
      for (let x = 0; x < s.width; x++) {
        const px = x * TILE;
        const py = y * TILE;
        const t = s.terrain[y * s.width + x];
        const floor = () => g.fillStyle(tint.floor).fillRect(px, py, TILE, TILE);
        switch (t) {
          case 'floor':
            floor();
            break;
          case 'wall':
            g.fillStyle(tint.wallEdge).fillRect(px, py, TILE, TILE);
            g.fillStyle(tint.wall).fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
            break;
          case 'dirt':
            g.fillStyle(tint.dirt).fillRect(px, py, TILE, TILE);
            g.fillStyle(tint.dirtSpeck);
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
          case 'crumble':
          case 'crumbling': {
            floor();
            const left = s.timers[y * s.width + x];
            g.fillStyle(t === 'crumbling' ? COLORS.crumbling : COLORS.crumble).fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
            g.lineStyle(1, 0x000000, 0.5).lineBetween(px + 4, py + 16, px + 28, py + 12).lineBetween(px + 16, py + 4, px + 14, py + 28);
            if (t === 'crumbling' && left !== undefined && left <= 2) g.fillStyle(0x000000, 0.4).fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
            break;
          }
          case 'quicksand':
            g.fillStyle(COLORS.quicksand).fillRect(px, py, TILE, TILE);
            g.lineStyle(2, COLORS.quicksandSwirl).strokeCircle(px + 16, py + 16, 9).strokeCircle(px + 16, py + 16, 4);
            break;
          case 'packedSand':
            g.fillStyle(COLORS.packedSand).fillRect(px, py, TILE, TILE);
            g.fillStyle(COLORS.quicksandSwirl);
            for (const [sx, sy] of [[5, 6], [18, 9], [10, 20], [24, 24]]) g.fillRect(px + sx, py + sy, 4, 2);
            break;
          case 'ice':
            g.fillStyle(COLORS.ice).fillRect(px, py, TILE, TILE);
            g.lineStyle(2, COLORS.iceShine, 0.8).lineBetween(px + 5, py + 24, px + 14, py + 15).lineBetween(px + 18, py + 12, px + 24, py + 6);
            break;
          case 'thinIce':
          case 'crackedIce':
            g.fillStyle(COLORS.icyWater).fillRect(px, py, TILE, TILE);
            g.fillStyle(COLORS.thinIce, t === 'thinIce' ? 0.9 : 0.55).fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
            if (t === 'crackedIce') g.lineStyle(2, 0x123a66).lineBetween(px + 4, py + 6, px + 16, py + 16).lineBetween(px + 16, py + 16, px + 28, py + 10).lineBetween(px + 16, py + 16, px + 12, py + 28);
            break;
          case 'icyWater':
            g.fillStyle(COLORS.icyWater).fillRect(px, py, TILE, TILE);
            g.lineStyle(2, COLORS.ice, 0.6).lineBetween(px + 4, py + 12, px + 14, py + 12).lineBetween(px + 16, py + 22, px + 28, py + 22);
            break;
          case 'iceWall':
            g.fillStyle(COLORS.iceWall).fillRect(px, py, TILE, TILE);
            g.lineStyle(2, COLORS.iceShine).strokeRect(px + 3, py + 3, TILE - 6, TILE - 6).lineBetween(px + 8, py + 24, px + 22, py + 8);
            break;
          case 'dartRight':
          case 'dartLeft': {
            g.fillStyle(tint.wallEdge).fillRect(px, py, TILE, TILE);
            g.fillStyle(dartWarn ? COLORS.dartWarn : COLORS.dart);
            const mx = t === 'dartRight' ? px + TILE - 6 : px + 6;
            g.fillTriangle(mx, py + 16, t === 'dartRight' ? mx - 12 : mx + 12, py + 8, t === 'dartRight' ? mx - 12 : mx + 12, py + 24);
            break;
          }
        }
      }
    }
  }

  /** Pick the explorer frame: facing, walk cycle on each step, push pose, red flash when hurt. */
  private animatePlayer(instant: boolean): void {
    const p = this.state.player;
    const side = p.facing === 'left' || p.facing === 'right';
    const base = side ? 'right' : p.facing;
    this.playerView.setFlipX(p.facing === 'left');
    const events = this.state.events;
    const pushed = events.some((e) => e.type === 'push' || e.type === 'cut' || e.type === 'shatter');
    const stepped = !instant && events.some((e) => e.type === 'step');
    if (pushed && side) {
      this.playerView.setFrame('right-push');
    } else if (stepped || (pushed && !side)) {
      this.walkFrame = this.walkFrame === 1 ? 2 : 1;
      this.playerView.setFrame(`${base}-${this.walkFrame}`);
    } else {
      this.playerView.setFrame(`${base}-0`);
      return;
    }
    this.idleTimer?.remove();
    this.idleTimer = this.time.delayedCall(TICK_MS + 40, () => this.playerView.setFrame(`${base}-0`));
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
      if (view && this.objKinds.get(o.id) !== o.kind) {
        // The object changed kind (a snowball grew): swap its sprite in place.
        const old = view;
        view = this.makeObjView(o).setPosition(old.x, old.y);
        old.destroy();
        this.objViews.set(o.id, view);
        this.objKinds.set(o.id, o.kind);
        this.tweens.add({ targets: view, scale: { from: SPRITE_SCALE * 1.3, to: SPRITE_SCALE }, duration: 200 });
      }
      if (!view) {
        view = this.makeObjView(o);
        this.objViews.set(o.id, view);
        this.objKinds.set(o.id, o.kind);
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
      if (a.kind === 'idol' || a.kind === 'serpent' || a.kind === 'yeti') view.setAlpha(0.55 + 0.15 * a.hp);
      if (a.kind === 'yeti') view.setAngle(a.mode === 'stun' ? 15 : 0);
    }
    this.removeMissing(this.actorViews, seen);
  }

  private removeMissing(views: Map<number, View>, seen: Set<number>): void {
    for (const [id, view] of views) {
      if (seen.has(id)) continue;
      views.delete(id);
      this.tweens.killTweensOf(view);
      this.tweens.add({ targets: view, scale: view.scale * 1.6, alpha: 0, duration: 180, onComplete: () => view.destroy() });
    }
  }

  private makeObjView(o: Obj): View {
    const img = this.add.image(0, 0, o.kind, 'main').setScale(SPRITE_SCALE).setDepth(5);
    if (o.kind === 'diamond' || o.kind === 'redDiamond') {
      // Gems glint: a short brighten every couple of seconds, offset per gem.
      this.tweens.add({
        targets: img, alpha: { from: 1, to: 0.75 }, duration: 260, yoyo: true, repeat: -1,
        repeatDelay: 1800 + (o.id % 7) * 170,
      });
    }
    return img;
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
      case 'scorpion':
        c.add([
          this.add.ellipse(0, 4, 22, 12, COLORS.scorpion),
          this.add.rectangle(0, -8, 3, 12, COLORS.scorpion),
          this.add.circle(0, -14, 3, 0xff3b30),
        ]);
        break;
      case 'scarab':
        c.add([this.add.ellipse(0, 0, 18, 22, COLORS.scarab).setStrokeStyle(2, 0x9adada), this.add.rectangle(0, 0, 1, 20, 0x000000)]);
        break;
      case 'mummy':
        c.add([
          this.add.rectangle(0, 2, 18, 26, COLORS.mummy),
          this.add.rectangle(0, -4, 18, 2, 0x8a8270),
          this.add.rectangle(0, 4, 18, 2, 0x8a8270),
          this.add.circle(-4, -6, 2, 0x30ff60),
          this.add.circle(4, -6, 2, 0x30ff60),
        ]);
        break;
      case 'serpent':
        c.add([
          this.add.ellipse(0, 0, TILE + 4, TILE - 6, COLORS.serpent).setStrokeStyle(3, 0x6a3a10),
          this.add.circle(-6, -4, 3, 0xff3b30),
          this.add.circle(6, -4, 3, 0xff3b30),
        ]);
        break;
      case 'bat':
        c.add([
          this.add.triangle(0, 0, -14, -2, -2, -6, -2, 4, COLORS.bat),
          this.add.triangle(0, 0, 14, -2, 2, -6, 2, 4, COLORS.bat),
          this.add.circle(0, 0, 6, COLORS.bat),
          this.add.circle(-2, -1, 1.5, 0xffe000),
          this.add.circle(2, -1, 1.5, 0xffe000),
        ]);
        break;
      case 'yetiCub':
      case 'yeti': {
        const r = a.kind === 'yeti' ? TILE / 2 + 2 : 10;
        c.add([
          this.add.circle(0, 0, r, COLORS.yeti).setStrokeStyle(2, 0x8aa0b8),
          this.add.circle(-r / 3, -r / 4, 2, 0x1a2a6a),
          this.add.circle(r / 3, -r / 4, 2, 0x1a2a6a),
          this.add.rectangle(0, r / 3, r, 3, 0x1a2a6a),
        ]);
        break;
      }
      case 'frostSpirit':
        c.add([this.add.star(0, 0, 6, 4, 12, COLORS.frost, 0.85), this.add.circle(0, 0, 4, 0xffffff)]);
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

  /** Only the movement tween is replaced each tick, so effects like the gem glint keep running. */
  private moveTweens = new WeakMap<View, Phaser.Tweens.Tween>();

  private moveView(view: View, x: number, y: number, instant: boolean): void {
    const tx = x * TILE + TILE / 2;
    const ty = y * TILE + TILE / 2;
    this.moveTweens.get(view)?.stop();
    this.moveTweens.delete(view);
    if (instant || (view.x === tx && view.y === ty)) {
      view.setPosition(tx, ty);
      return;
    }
    this.moveTweens.set(view, this.tweens.add({ targets: view, x: tx, y: ty, duration: TICK_MS - 10 }));
  }
}
