import * as Phaser from 'phaser';
import { COSTUME_PALETTE, SPRITE_SIZE, SPRITES, type SpriteDef } from './spriteData.ts';

/** Draw every sprite from spriteData.ts into canvas textures (one frame per cell, 16 or 32 px). */
export function makeTextures(scene: Phaser.Scene): void {
  const all: [string, SpriteDef][] = [
    ...Object.entries(SPRITES),
    ['explorer-gold', { ...SPRITES.explorer, palette: COSTUME_PALETTE }],
  ];
  for (const [key, def] of all) {
    if (scene.textures.exists(key)) continue;
    const names = Object.keys(def.frames);
    const size = def.size ?? SPRITE_SIZE;
    const tex = scene.textures.createCanvas(key, size * names.length, size);
    if (!tex) continue;
    const ctx = tex.getContext();
    names.forEach((name, i) => {
      def.frames[name].forEach((row, y) => {
        [...row].forEach((ch, x) => {
          if (ch === '.') return;
          ctx.fillStyle = def.palette[ch];
          ctx.fillRect(i * size + x, y, 1, 1);
        });
      });
      tex.add(name, 0, i * size, 0, size, size);
    });
    tex.refresh();
  }
}
