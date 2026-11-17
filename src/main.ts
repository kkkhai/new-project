import * as Phaser from 'phaser';
import { GameScene } from './game/GameScene.ts';
import { COLORS } from './game/palette.ts';
import { BootScene } from './game/scenes/BootScene.ts';
import { RewardsScene } from './game/scenes/RewardsScene.ts';
import { SettingsScene } from './game/scenes/SettingsScene.ts';
import { TrainingScene, WorldMapScene } from './game/scenes/WorldMapScene.ts';
import { ResultsScene } from './game/scenes/ResultsScene.ts';
import { TitleScene } from './game/scenes/TitleScene.ts';

declare global {
  interface Window {
    __game?: Phaser.Game;
  }
}

window.__game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  height: 640,
  backgroundColor: COLORS.background,
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  scene: [BootScene, TitleScene, WorldMapScene, TrainingScene, SettingsScene, RewardsScene, GameScene, ResultsScene],
});
