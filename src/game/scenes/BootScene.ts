import * as Phaser from 'phaser';
import { preloadAudio } from '../audio.ts';

/** Loads optional audio files, then shows the title screen. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    preloadAudio(this);
  }

  create(): void {
    this.scene.start('Title');
  }
}
