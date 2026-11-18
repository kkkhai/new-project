"""32×32 Jungle tile set, from the owner's reference photos (Angkor-style temple ruins):
carved grey sandstone with moss, strangler-fig roots, reddish laterite paths, dark green river.
"""
from pixel import Canvas, rng

PALETTE = {
    'a': '#9a927c', 'A': '#7a7262', 'd': '#5a5446', 'D': '#3a362c', 'h': '#c2b89c',  # sandstone
    'g': '#5f7a32', 'G': '#3f5a22', 'q': '#86a24a',  # moss
    'f': '#b07a4a', 'F': '#8e5e36', 't': '#c8955e', 'T': '#6e4628',  # laterite floor
    'o': '#5c3c22', 'O': '#432a16', 'i': '#7a5232',  # soil
    'r': '#cbbd9c', 'R': '#9c8e72', 'z': '#6e624e',  # fig roots
    'L': '#3e7a2e', 'l': '#6aa248',  # leaves
    'w': '#1c3a26', 'W': '#2a5034', 'x': '#4e7a4a', 'X': '#8ab47a',  # river
    'y': '#e8c050', 'Y': '#a8801c', 'e': '#fff2a8',  # gold, glow
    'b': '#b48a4a', 'B': '#6e5226',  # bronze
    'k': '#140e08', 's': '#8a3a22',
    'm': '#cfd6de', 'M': '#8a949e',
    'v': '#4a4038',
}


def floor(variant=0):
    c = Canvas(fill='f')
    r = rng(100 + variant)
    if variant in (0, 2):
        # big flagstones with mortar lines
        off = 8 if variant == 2 else 0
        for y in range(32):
            for x in range(32):
                if (y + off) % 16 == 0 or ((x + (8 if ((y + off) // 16) % 2 else 0)) % 16 == 0):
                    c.px(x, y, 'F')
        c.speckle((0, 0, 31, 31), 'tF', 0.08, r, on='f')
        for _ in range(4):
            x, y = r.randrange(2, 30), r.randrange(2, 30)
            c.px(x, y, 't'); c.px(x + 1, y, 'T')
    else:
        c.speckle((0, 0, 31, 31), 'tFF', 0.12, r)
        for _ in range(6):
            x, y = r.randrange(1, 30), r.randrange(1, 30)
            c.rect(x, y, x + 1, y, 'A'); c.px(x, y + 1, 'd')
    if variant == 2:
        for _ in range(3):
            x, y = r.randrange(0, 28), r.randrange(0, 28)
            for dx, dy in ((0, 0), (1, -1), (2, 0), (1, 1), (3, -1)):
                c.px(x + dx, y + dy, r.choice('gqG'))
    return c


def stone_blocks(c, region, seed):
    """Fill a region with staggered temple blocks: highlight top-left, shade bottom-right."""
    x0, y0, x1, y1 = region
    r = rng(seed)
    for y in range(y0, y1 + 1):
        row = (y - y0) // 8
        for x in range(x0, x1 + 1):
            bx = (x - x0 + (8 if row % 2 else 0)) % 16
            by = (y - y0) % 8
            if by == 7 or bx == 15:
                c.px(x, y, 'D')
            elif by == 0 or bx == 0:
                c.px(x, y, 'h')
            elif by == 6 or bx == 14:
                c.px(x, y, 'A')
            else:
                c.px(x, y, 'a')
    c.speckle(region, 'Ad', 0.06, r, on='a')


def moss(c, region, seed, amount=10):
    r = rng(seed)
    x0, y0, x1, y1 = region
    for _ in range(amount):
        x, y = r.randrange(x0, x1), r.randrange(y0, y1)
        for dx in range(r.randrange(2, 5)):
            c.px(x + dx, y, r.choice('gGq'))
            if r.random() < 0.5:
                c.px(x + dx, y + 1, 'G')


def wall():
    c = Canvas()
    stone_blocks(c, (0, 0, 31, 31), 7)
    moss(c, (0, 0, 31, 12), 8)
    return c


def frieze(c, y0):
    """Carved band on the face of a wall: a row of lotus-diamond motifs."""
    c.rect(0, y0, 31, 31, 'A')
    c.rect(0, y0, 31, y0, 'h')
    for cx in (4, 12, 20, 28):
        for i, w in enumerate((0, 1, 2, 1, 0)):
            c.rect(cx - w, y0 + 2 + i, cx + w, y0 + 2 + i, 'd')
        c.px(cx, y0 + 4, 'h')
    c.rect(0, y0 + 8, 31, y0 + 8, 'd')
    c.rect(0, 30, 31, 31, 'D')


def wall_face():
    c = wall()
    frieze(c, 21)
    moss(c, (0, 19, 31, 23), 9, 4)
    return c


def cracked():
    c = wall_face()
    for path in (((15, 0), (12, 6), (17, 12), (13, 19), (18, 26), (15, 31)), ((17, 12), (24, 15), (28, 22))):
        for (x0, y0), (x1, y1) in zip(path, path[1:]):
            c.line(x0, y0, x1, y1, 'k')
            c.line(x0 + 1, y0, x1 + 1, y1, 'D')
    for x, y in ((10, 9), (20, 18), (8, 24)):
        c.px(x, y, 'h')
    return c


def dirt():
    c = Canvas(fill='o')
    r = rng(21)
    c.speckle((0, 0, 31, 31), 'Oi', 0.25, r)
    for _ in range(3):
        x, y = r.randrange(0, 32), r.randrange(0, 32)
        for _ in range(14):
            c.px(x, y, 'R')
            x += r.choice((-1, 0, 1)); y += r.choice((0, 1))
    for _ in range(4):
        x, y = r.randrange(2, 29), r.randrange(2, 29)
        c.rect(x, y, x + 1, y + 1, 'A'); c.px(x, y, 'h')
    return c


def roots():
    """Strangler-fig roots spilling over the path; blocks movement until cut."""
    c = floor(1)
    r = rng(31)
    for start in (3, 12, 21, 28):
        x = start
        for y in range(32):
            w = 3 if y % 9 < 5 else 2
            c.rect(x - 1, y, x + w, y, 'z')
            c.rect(x, y, x + w - 1, y, 'r')
            c.px(x + w - 1, y, 'R')
            x += r.choice((-1, 0, 0, 1))
            x = max(1, min(28, x))
    for _ in range(5):
        x, y = r.randrange(2, 28), r.randrange(2, 28)
        c.rect(x, y, x + 2, y + 1, 'L'); c.px(x + 1, y, 'l')
    return c


def thorns():
    c = floor(1)
    c.ellipse(15.5, 17, 13, 11, 'G')
    c.ellipse(13, 14, 8, 6, 'L')
    r = rng(41)
    c.speckle((3, 6, 28, 28), 'lL', 0.12, r, on='GL')
    for _ in range(14):
        x, y = r.randrange(4, 28), r.randrange(7, 28)
        if c.get(x, y) in 'GLl':
            c.px(x, y, 's'); c.px(x, y - 1, 'h')
    return c


def water(frame=0):
    c = Canvas(fill='w')
    r = rng(51)
    c.speckle((0, 0, 31, 31), 'W', 0.15, r)
    for i in range(6):
        y = (i * 6 + 3) % 32
        x0 = (i * 11 + frame * 4) % 32
        for dx in range(r.randrange(5, 10)):
            c.px((x0 + dx) % 32, y, 'x')
        c.px((x0 + 2) % 32, y, 'X')
    return c


def exit_door(open_):
    c = wall()
    c.rect(7, 6, 24, 31, 'D')                   # door frame
    c.rect(6, 4, 25, 7, 'A'); c.rect(6, 4, 25, 4, 'h')   # carved lintel
    for x in range(8, 24, 4):
        c.px(x, 5, 'd'); c.px(x + 1, 6, 'd')
    c.rect(9, 9, 22, 31, 'k')                    # opening
    if open_:
        c.rect(10, 10, 21, 31, 'y'); c.rect(12, 12, 19, 31, 'e')
    else:
        c.rect(10, 10, 21, 31, 'B'); c.rect(15, 10, 16, 31, 'v')
        for y in (14, 22, 28):
            c.rect(10, y, 21, y, 'b')
        c.px(13, 19, 'y'); c.px(18, 19, 'y')
    return c


def spikes():
    c = floor(0)
    for cx in (6, 16, 26):
        for cy in (10, 24):
            for i in range(7):
                c.rect(cx - i // 2, cy - 6 + i, cx + i // 2, cy - 6 + i, 'b')
                c.px(cx + i // 2, cy - 6 + i, 'B')
            c.px(cx, cy - 6, 'h')
            c.rect(cx - 4, cy + 1, cx + 4, cy + 1, 'T')
    return c


def pit():
    c = floor(0)
    c.rect(3, 3, 28, 28, 'D')
    c.rect(5, 5, 26, 26, 'k')
    c.rect(3, 3, 28, 4, 'd')
    return c


def checkpoint():
    """Stone lantern with a warm light."""
    c = floor(0)
    c.rect(10, 26, 21, 29, 'A'); c.rect(10, 26, 21, 26, 'h')
    c.rect(13, 14, 18, 25, 'a'); c.rect(18, 14, 18, 25, 'A')
    c.rect(14, 16, 17, 20, 'k'); c.rect(15, 17, 16, 19, 'y'); c.px(15, 17, 'e')
    c.rect(9, 10, 22, 13, 'd'); c.rect(11, 8, 20, 9, 'A'); c.rect(14, 5, 17, 7, 'a')
    c.px(15, 4, 'h'); c.px(16, 4, 'h')
    return c


def plate(pressed):
    c = floor(0)
    c.rect(5, 5, 26, 26, 'D')
    c.rect(6, 6, 25, 25, 'A' if pressed else 'a')
    if not pressed:
        c.rect(6, 6, 25, 6, 'h'); c.rect(6, 6, 6, 25, 'h')
    for i, w in enumerate((0, 2, 4, 2, 0)):
        c.rect(15 - w, 12 + i * 2, 16 + w, 13 + i * 2, 'd')
    return c


def gate(open_):
    c = floor(0)
    if open_:
        for x in (4, 12, 20, 28):
            c.rect(x - 1, 0, x + 1, 3, 'B')
        return c
    for x in (4, 12, 20, 28):
        c.rect(x - 1, 0, x + 1, 31, 'b'); c.rect(x + 1, 0, x + 1, 31, 'B'); c.px(x - 1, 0, 'h')
    for y in (6, 24):
        c.rect(0, y, 31, y + 1, 'B')
    return c


def door(metal, dark):
    """Locked gate: bronze bars held shut by a padlock; the key colour shows which key opens it."""
    c = gate(False)
    c.rect(9, 10, 22, 13, 'B')                       # crossbar the lock hangs on
    for x in (12, 19):
        c.rect(x, 7, x, 13, metal)                   # shackle
    c.rect(12, 6, 19, 6, metal)
    c.rect(10, 13, 21, 24, metal)                    # lock body
    c.rect(21, 13, 21, 24, dark); c.rect(10, 24, 21, 24, dark); c.rect(10, 13, 21, 13, 'h')
    c.ellipse(15.5, 17, 1.6, 1.6, 'k'); c.rect(15, 18, 16, 21, 'k')
    for x, y in ((10, 12), (21, 12), (9, 13), (22, 13), (9, 24), (22, 24)):
        c.px(x, y, 'k')
    return c


def lever(on):
    c = wall()
    c.rect(11, 22, 20, 27, 'd'); c.rect(11, 22, 20, 22, 'A')
    if on:
        c.line(15, 22, 24, 9, 'b', 2); c.rect(23, 7, 26, 10, 'y')
    else:
        c.line(16, 22, 7, 9, 'b', 2); c.rect(5, 7, 8, 10, 'y')
    return c


def frames():
    return {
        'floor-0': floor(0).rows(), 'floor-1': floor(1).rows(), 'floor-2': floor(2).rows(),
        'wall': wall().rows(), 'wall-face': wall_face().rows(), 'cracked': cracked().rows(),
        'dirt': dirt().rows(), 'vines': roots().rows(), 'thorns': thorns().rows(),
        'water-0': water(0).rows(), 'water-1': water(1).rows(),
        'exit-closed': exit_door(False).rows(), 'exit-open': exit_door(True).rows(),
        'spikes': spikes().rows(), 'pit': pit().rows(), 'checkpoint': checkpoint().rows(),
        'plate-up': plate(False).rows(), 'plate-down': plate(True).rows(),
        'gate-closed': gate(False).rows(), 'gate-open': gate(True).rows(),
        'doorSilver': door('m', 'M').rows(), 'doorGold': door('y', 'Y').rows(),
        'lever-off': lever(False).rows(), 'lever-on': lever(True).rows(),
    }
