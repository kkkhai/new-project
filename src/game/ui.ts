import * as Phaser from 'phaser';

export const FONT = 'monospace';

export function text(scene: Phaser.Scene, x: number, y: number, s: string, size = 18, color = '#f5e9d0'): Phaser.GameObjects.Text {
  return scene.add.text(x, y, s, { fontFamily: FONT, fontSize: `${size}px`, color });
}

/** A tappable label with a dark box behind it. */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts: { size?: number; width?: number; color?: string; bg?: string } = {},
): Phaser.GameObjects.Text {
  const b = scene.add
    .text(x, y, label, {
      fontFamily: FONT,
      fontSize: `${opts.size ?? 20}px`,
      color: opts.color ?? '#f5e9d0',
      backgroundColor: opts.bg ?? '#3a2f26',
      padding: { x: 14, y: 8 },
      align: 'center',
      fixedWidth: opts.width ?? 0,
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });
  b.on('pointerover', () => b.setStyle({ backgroundColor: '#5a4a3a' }));
  b.on('pointerout', () => b.setStyle({ backgroundColor: opts.bg ?? '#3a2f26' }));
  b.on('pointerup', onClick);
  return b;
}
