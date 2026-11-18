"""Turn the owner's item images (tools/art/source/*.png) into 32×32 palette sprites.

Steps per image: remove the flat green (or white) background, split it into separate
objects (e.g. two keys in one picture), crop each one, shrink it to fit 32×32, reduce
it to a small palette and add a dark outline so it reads on any floor.
"""
import os
from collections import deque

from PIL import Image

SRC = os.path.join(os.path.dirname(__file__), 'source')
CHARS = 'abcdefghijlmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'  # 'k' is the outline


def is_bg_green(r, g, b):
    return g > 140 and g > r + 60 and g > b + 60


def is_bg_white(r, g, b):
    return r > 180 and g > 180 and b > 180


def objects(path, bg, min_area=4000):
    """Return RGBA crops of each separate object in the picture, left to right."""
    im = Image.open(path).convert('RGB')
    w, h = im.size
    px = im.load()
    fg = [[not bg(*px[x, y]) for x in range(w)] for y in range(h)]
    if bg is is_bg_white:
        # White also appears inside the art (highlights): only remove white reachable from the border.
        outside = [[False] * w for _ in range(h)]
        # seed from every border pixel: the art may touch the edges and split the background
        q = deque([(x, 0) for x in range(w)] + [(x, h - 1) for x in range(w)] + [(0, y) for y in range(h)] + [(w - 1, y) for y in range(h)])
        while q:
            x, y = q.popleft()
            if not (0 <= x < w and 0 <= y < h) or outside[y][x] or fg[y][x]:
                continue
            outside[y][x] = True
            q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
        fg = [[not outside[y][x] for x in range(w)] for y in range(h)]
    seen = [[False] * w for _ in range(h)]
    found = []
    for y0 in range(h):
        for x0 in range(w):
            if not fg[y0][x0] or seen[y0][x0]:
                continue
            q = deque([(x0, y0)])
            seen[y0][x0] = True
            pts = []
            while q:
                x, y = q.popleft()
                pts.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and fg[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        q.append((nx, ny))
            if len(pts) >= min_area:  # skips the image generator's small watermark
                found.append(pts)
    crops = []
    for pts in sorted(found, key=lambda p: min(x for x, _ in p)):
        xs = [x for x, _ in pts]
        ys = [y for _, y in pts]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
        out = Image.new('RGBA', (x1 - x0 + 1, y1 - y0 + 1), (0, 0, 0, 0))
        o = out.load()
        for x, y in pts:
            r, g, b = px[x, y]
            o[x - x0, y - y0] = (r, g, b, 255)
        crops.append(out)
    return crops


def to_sprite(img, fit=30, colors=14, size=32):
    """Shrink to fit `fit` px, centre in a size×size frame, quantize, and outline."""
    scale = fit / max(img.size)
    w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    small = img.resize((w, h), Image.BOX)
    frame = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    frame.paste(small, ((size - w) // 2, (size - h) // 2 + (1 if h < size - 2 else 0)))
    rgb = Image.new('RGB', frame.size, (0, 0, 0))
    rgb.paste(frame, mask=frame.split()[3])
    q = rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
    pal = q.getpalette()
    alpha = frame.split()[3].load()
    qp = q.load()
    rows, palette, used = [], {}, {}
    for y in range(size):
        row = ''
        for x in range(size):
            if alpha[x, y] < 128:
                row += '.'
                continue
            i = qp[x, y]
            if i not in used:
                used[i] = CHARS[len(used)]
                r, g, b = pal[i * 3:i * 3 + 3]
                palette[used[i]] = f'#{r:02x}{g:02x}{b:02x}'
            row += used[i]
        rows.append(row)
    # 1 px dark outline where the object meets transparency
    grid = [list(r) for r in rows]
    for y in range(size):
        for x in range(size):
            if grid[y][x] != '.':
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < size and 0 <= ny < size and rows[ny][nx] != '.':
                    grid[y][x] = 'k'
                    break
    palette['k'] = '#160f0a'
    return {'size': size, 'palette': palette, 'frames': {'main': [''.join(r) for r in grid]}}


def recolor_red(sprite):
    """Same gem, red: move every blue hue to the matching red."""
    import colorsys
    pal = {}
    for ch, hexc in sprite['palette'].items():
        r, g, b = (int(hexc[i:i + 2], 16) / 255 for i in (1, 3, 5))
        hh, l, s = colorsys.rgb_to_hls(r, g, b)
        if s > 0.25 and 0.45 < hh < 0.75:
            hh = 0.985
        r, g, b = colorsys.hls_to_rgb(hh, l, s)
        pal[ch] = f'#{round(r * 255):02x}{round(g * 255):02x}{round(b * 255):02x}'
    return {**sprite, 'palette': pal}


def build():
    heart = objects(os.path.join(SRC, 'heart.png'), is_bg_white)[0]
    gem = objects(os.path.join(SRC, 'diamond.png'), is_bg_green)[0]
    keys = objects(os.path.join(SRC, 'keys.png'), is_bg_green)
    chests = objects(os.path.join(SRC, 'chests.png'), is_bg_green)
    diamond = to_sprite(gem, fit=26, colors=12)
    return {
        'heart': to_sprite(heart, fit=26, colors=6),
        'diamond': diamond,
        'redDiamond': recolor_red(diamond),
        'keySilver': to_sprite(keys[0], fit=28, colors=10),
        'keyGold': to_sprite(keys[1], fit=28, colors=10),
        'chest': to_sprite(chests[0], fit=30, colors=14),
        'goldChest': to_sprite(chests[1], fit=30, colors=14),
    }
