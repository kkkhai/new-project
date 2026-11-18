"""32×32 boulder in the style of the owner's reference: a ball of stacked dark slate
stones with wavy red and orange stone bands."""
import math

from pixel import Canvas, rng

PALETTE = {
    'k': '#14100c',
    'a': '#6a6e6a', 'A': '#4c504e', 'd': '#34383a', 'h': '#9a9c94',  # slate
    'r': '#a8452c', 'o': '#d08a4a', 'O': '#e8b070',  # red / orange bands
}


def boulder():
    c = Canvas()
    r = rng(77)
    cx, cy, rad = 15.5, 15.5, 14.2
    for y in range(32):
        for x in range(32):
            dx, dy = (x - cx) / rad, (y - cy) / rad
            if dx * dx + dy * dy > 1:
                continue
            # stone courses: rows of small bricks, curving with the sphere
            curve = (y + 0.9 * (dx * dx) * 6)
            row = int(curve // 3)
            brick = int((x + (row % 2) * 2) // 4)
            on_mortar = curve % 3 < 0.8 or (x + (row % 2) * 2) % 4 == 0
            light = -dx * 0.6 - dy * 0.8  # light from top-left
            c.px(x, y, 'd' if on_mortar else ('h' if light > 0.55 else 'a' if light > -0.2 else 'A'))
            if not on_mortar and (row * 7 + brick * 3) % 11 == 0:
                c.px(x, y, 'A')
    # wavy bands of red and orange stone
    for base, col in ((9, 'r'), (17, 'o'), (22, 'r'), (26, 'O')):
        for x in range(32):
            y = round(base + 1.6 * math.sin(x / 4.0 + base))
            if c.get(x, y) != '.':
                c.px(x, y, col)
    c.outline()
    return c


def sprite():
    return {'size': 32, 'palette': PALETTE, 'frames': {'main': boulder().rows()}}
