import * as Phaser from 'phaser';
import type { GameEvent } from '../core/types.ts';

/**
 * Sound for the test version.
 * - Any file dropped into assets/audio/sfx/<name>.(ogg|mp3|wav) replaces the built-in beep of that name.
 * - assets/audio/music/<world>.(ogg|mp3) loops while playing that world (jungle, desert, snow, boss, menu).
 * Without files, short synthesized placeholder sounds are used so the game is never silent.
 * See assets/audio/README.md for names and licences.
 */

const sfxFiles = import.meta.glob<string>('../../assets/audio/sfx/*.{ogg,mp3,wav}', { eager: true, query: '?url', import: 'default' });
const musicFiles = import.meta.glob<string>('../../assets/audio/music/*.{ogg,mp3}', { eager: true, query: '?url', import: 'default' });

const baseName = (path: string) => path.split('/').pop()!.replace(/\.[^.]+$/, '');

export function preloadAudio(scene: Phaser.Scene): void {
  for (const [path, url] of Object.entries(sfxFiles)) scene.load.audio(`sfx-${baseName(path)}`, url);
  for (const [path, url] of Object.entries(musicFiles)) scene.load.audio(`music-${baseName(path)}`, url);
}

type Synth = { freq: number; to?: number; dur: number; type?: OscillatorType; vol?: number; noise?: boolean };

/** Placeholder sounds, one per sound name. */
const SYNTH: Record<string, Synth[]> = {
  step: [{ freq: 140, dur: 0.03, type: 'triangle', vol: 0.05 }],
  dig: [{ freq: 0, dur: 0.06, noise: true, vol: 0.08 }],
  diamond: [{ freq: 1200, to: 1800, dur: 0.08, type: 'square', vol: 0.06 }, { freq: 1800, to: 2400, dur: 0.08, type: 'square', vol: 0.05 }],
  red: [{ freq: 900, to: 2600, dur: 0.25, type: 'square', vol: 0.07 }],
  item: [{ freq: 600, to: 900, dur: 0.1, type: 'triangle', vol: 0.1 }],
  push: [{ freq: 0, dur: 0.1, noise: true, vol: 0.05 }],
  land: [{ freq: 90, to: 40, dur: 0.15, type: 'sine', vol: 0.25 }],
  crush: [{ freq: 200, to: 30, dur: 0.4, type: 'sawtooth', vol: 0.15 }],
  hurt: [{ freq: 440, to: 110, dur: 0.3, type: 'square', vol: 0.1 }],
  checkpoint: [{ freq: 520, dur: 0.08, type: 'triangle', vol: 0.1 }, { freq: 780, dur: 0.12, type: 'triangle', vol: 0.1 }],
  door: [{ freq: 300, to: 500, dur: 0.15, type: 'square', vol: 0.06 }],
  gate: [{ freq: 220, to: 330, dur: 0.2, type: 'sawtooth', vol: 0.05 }],
  cut: [{ freq: 0, dur: 0.08, noise: true, vol: 0.1 }],
  splash: [{ freq: 0, dur: 0.25, noise: true, vol: 0.08 }],
  enemy: [{ freq: 300, to: 60, dur: 0.25, type: 'square', vol: 0.08 }],
  steal: [{ freq: 1200, to: 400, dur: 0.2, type: 'square', vol: 0.07 }],
  boss: [{ freq: 80, to: 30, dur: 0.5, type: 'sawtooth', vol: 0.2 }],
  exit: [{ freq: 523, dur: 0.1, type: 'square', vol: 0.06 }, { freq: 659, dur: 0.1, type: 'square', vol: 0.06 }, { freq: 784, dur: 0.15, type: 'square', vol: 0.06 }],
  win: [{ freq: 523, dur: 0.12, type: 'square', vol: 0.07 }, { freq: 784, dur: 0.12, type: 'square', vol: 0.07 }, { freq: 1047, dur: 0.25, type: 'square', vol: 0.07 }],
  click: [{ freq: 900, dur: 0.03, type: 'square', vol: 0.04 }],
  dart: [{ freq: 2000, to: 600, dur: 0.12, type: 'sawtooth', vol: 0.04 }],
  collapse: [{ freq: 0, dur: 0.3, noise: true, vol: 0.07 }],
};

/** Which sound each game event plays. */
const EVENT_SOUND: Partial<Record<GameEvent['type'], string>> = {
  dig: 'dig', push: 'push', land: 'land', crush: 'crush', spiked: 'hurt', fall: 'hurt', bitten: 'hurt',
  checkpoint: 'checkpoint', unlock: 'door', gateOpen: 'gate', gateClose: 'gate', cut: 'cut', splash: 'splash',
  fill: 'land', break: 'land', enemyKilled: 'enemy', steal: 'steal', bossHit: 'boss', bossDefeated: 'boss',
  exitOpen: 'exit', win: 'win', tool: 'item', lever: 'gate', sink: 'hurt', dart: 'dart', collapse: 'collapse',
};

export class Audio {
  private ctx: AudioContext | null = null;
  private music: Phaser.Sound.BaseSound | null = null;
  private musicKey = '';
  muted = false;

  constructor(private scene: Phaser.Scene) {}

  private context(): AudioContext | null {
    const mgr = this.scene.sound as Partial<Phaser.Sound.WebAudioSoundManager>;
    this.ctx ??= mgr.context ?? null;
    return this.ctx;
  }

  play(name: string): void {
    if (this.muted) return;
    const key = `sfx-${name}`;
    if (this.scene.cache.audio.exists(key)) {
      this.scene.sound.play(key, { volume: 0.6 });
      return;
    }
    const ctx = this.context();
    if (!ctx || ctx.state !== 'running') return;
    let t = ctx.currentTime;
    for (const n of SYNTH[name] ?? []) {
      this.synth(ctx, n, t);
      t += n.dur * 0.8;
    }
  }

  playEvents(events: GameEvent[]): void {
    const played = new Set<string>();
    for (const e of events) {
      let name = EVENT_SOUND[e.type];
      if (e.type === 'collect') name = e.kind === 'diamond' ? 'diamond' : e.kind === 'redDiamond' ? 'red' : 'item';
      if (name && !played.has(name)) {
        played.add(name);
        this.play(name);
      }
    }
  }

  /** Loop a world's music if a file for it exists. */
  playMusic(name: string): void {
    const key = `music-${name}`;
    if (this.musicKey === key && this.music?.isPlaying) return;
    this.stopMusic();
    if (!this.scene.cache.audio.exists(key)) return;
    this.musicKey = key;
    this.music = this.scene.sound.add(key, { loop: true, volume: 0.4 });
    if (!this.muted) this.music.play();
  }

  stopMusic(): void {
    this.music?.stop();
    this.music?.destroy();
    this.music = null;
    this.musicKey = '';
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.scene.sound.mute = muted;
  }

  private synth(ctx: AudioContext, n: Synth, at: number): void {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(n.vol ?? 0.08, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + n.dur);
    gain.connect(ctx.destination);
    if (n.noise) {
      const len = Math.max(1, Math.floor(ctx.sampleRate * n.dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let seed = 12345;
      for (let i = 0; i < len; i++) {
        seed = (seed * 16807) % 2147483647;
        data[i] = (seed / 2147483647) * 2 - 1;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(gain);
      src.start(at);
      return;
    }
    const osc = ctx.createOscillator();
    osc.type = n.type ?? 'square';
    osc.frequency.setValueAtTime(n.freq, at);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, at + n.dur);
    osc.connect(gain);
    osc.start(at);
    osc.stop(at + n.dur);
  }
}
