import * as Phaser from 'phaser';
import { GameScene } from './game/GameScene.ts';
import { COLORS } from './game/palette.ts';
import { BootScene } from './game/scenes/BootScene.ts';
import { LevelSelectScene } from './game/scenes/LevelSelectScene.ts';
import { ResultsScene } from './game/scenes/ResultsScene.ts';
import { TitleScene } from './game/scenes/TitleScene.ts';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 960,
  height: 640,
  backgroundColor: COLORS.background,
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { activePointers: 3 },
  scene: [BootScene, TitleScene, LevelSelectScene, GameScene, ResultsScene],
});
