"""32×32 explorer, based on the owner's character concept:
messy brown hair, goggles on the forehead, green cloak, olive jacket, leather straps
and backpack, sword on the back, blue fingerless gloves, green trousers, brown boots.
"""
from pixel import Canvas

PALETTE = {
    'k': '#1c1410',  # outline
    'n': '#6a3c1e', 'N': '#4a2814', 'm': '#9a5e30',  # hair
    's': '#eab48c', 'S': '#bd7f5c',  # skin
    'e': '#2e5a3a', 'w': '#f4efe4',  # eyes
    'g': '#c9cdd2', 'G': '#6e767c', 'l': '#4f97a6',  # goggles
    'c': '#4f7a3a', 'C': '#33532a', 'v': '#78a24e',  # cloak
    'j': '#6b7b4a', 'J': '#4b5734',  # jacket
    'b': '#82502a', 'B': '#55331a', 'y': '#d8a838',  # leather, buckle
    'u': '#3d5f8e', 'U': '#2a4266',  # gloves
    'r': '#b03a2a',  # patch
    'p': '#4f6a3b', 'P': '#36492a',  # trousers
    'o': '#3e2a1a', 'O': '#5e4228',  # boots
    'x': '#a7b0b8', 'X': '#6c747c',  # sword metal
    'Y': '#f2c443', 'Z': '#b88a1c',  # gold compass
}


def legs_front(c, step):
    # step 0 = stand, 1 = left foot forward, 2 = right foot forward
    lo = {0: (0, 0), 1: (-1, 1), 2: (1, -1)}[step]
    for side, (x0, x1) in enumerate(((12, 15), (16, 19))):
        dy = lo[side]
        c.rect(x0, 24, x1, 28 + dy, 'p')
        c.rect(x1, 24, x1, 28 + dy, 'P')
        c.rect(x0 - (1 if side == 0 else 0), 29 + dy, x1 + (1 if side == 1 else 0), 30 + dy, 'o')
        c.rect(x0, 29 + dy, x1, 29 + dy, 'O')


def front(step=0):
    c = Canvas()
    # cloak behind the shoulders
    c.rect(8, 14, 23, 25, 'C')
    # sword hilt over the right shoulder
    c.line(22, 13, 25, 9, 'x')
    c.px(26, 8, 'X'); c.px(24, 11, 'B'); c.px(23, 12, 'B')
    # head: hair
    c.ellipse(15.5, 7.5, 6.2, 5.2, 'n')
    for x, y in ((9, 6), (10, 4), (13, 2), (17, 2), (20, 3), (22, 6), (21, 9)):
        c.px(x, y, 'n')
    for x, y in ((12, 4), (15, 3), (18, 4), (11, 7)):
        c.px(x, y, 'm')
    # goggles across the forehead
    c.rect(10, 6, 21, 6, 'G')
    c.rect(11, 5, 14, 6, 'g'); c.rect(17, 5, 20, 6, 'g')
    c.rect(12, 5, 13, 5, 'l'); c.rect(18, 5, 19, 5, 'l')
    # face
    c.rect(12, 8, 19, 13, 's')
    c.rect(19, 9, 19, 13, 'S'); c.rect(12, 13, 19, 13, 'S')
    c.px(11, 9, 'n'); c.px(20, 9, 'n'); c.px(11, 10, 'n'); c.px(20, 10, 'n')
    c.px(13, 9, 'N'); c.px(14, 9, 'N'); c.px(17, 9, 'N'); c.px(18, 9, 'N')
    c.px(13, 10, 'w'); c.px(14, 10, 'e'); c.px(17, 10, 'e'); c.px(18, 10, 'w')
    c.px(15, 12, 'S'); c.px(16, 12, 'S')
    # cloak / scarf around the neck
    c.rect(10, 14, 21, 16, 'c')
    c.rect(10, 16, 21, 16, 'C')
    c.px(11, 14, 'v'); c.px(12, 14, 'v'); c.px(13, 15, 'v')
    # torso
    c.rect(11, 17, 20, 23, 'j')
    c.rect(19, 17, 20, 23, 'J')
    c.line(11, 17, 20, 22, 'b', 2)          # shoulder strap
    c.px(15, 19, 'y'); c.px(16, 20, 'y')
    c.px(18, 17, 'r'); c.px(18, 18, 'r')
    c.rect(11, 23, 20, 23, 'B'); c.px(15, 23, 'y'); c.px(16, 23, 'y')
    c.rect(18, 24, 20, 25, 'b')              # pouch
    # arms + gloves
    c.rect(8, 17, 10, 22, 'j'); c.rect(8, 17, 8, 22, 'J')
    c.rect(21, 17, 23, 22, 'j'); c.rect(23, 17, 23, 22, 'J')
    c.rect(8, 22, 10, 24, 'u'); c.rect(21, 22, 23, 24, 'u')
    c.rect(8, 24, 10, 24, 's'); c.rect(21, 24, 23, 24, 's')
    legs_front(c, step)
    c.outline()
    return c


def back(step=0):
    c = Canvas()
    c.ellipse(15.5, 7.5, 6.2, 5.2, 'n')
    for x, y in ((9, 6), (10, 4), (13, 2), (17, 2), (20, 3), (22, 6), (21, 10), (10, 10)):
        c.px(x, y, 'n')
    for x, y in ((12, 5), (16, 4), (19, 6), (14, 8), (18, 9)):
        c.px(x, y, 'm')
    c.rect(9, 6, 22, 6, 'G')                 # goggle strap
    c.rect(11, 11, 20, 13, 'n'); c.rect(13, 13, 18, 13, 'N')
    # cloak covering the back
    c.rect(9, 14, 22, 26, 'c')
    c.rect(9, 24, 22, 26, 'C')
    for x in range(10, 22, 3):
        c.line(x, 17, x, 25, 'C')
    c.rect(10, 14, 21, 14, 'v')
    # backpack and bedroll
    c.rect(12, 15, 19, 22, 'b'); c.rect(12, 15, 19, 16, 'B'); c.rect(18, 15, 19, 22, 'B')
    c.rect(11, 14, 20, 14, 'O'); c.px(15, 17, 'y'); c.px(16, 17, 'y')
    # sword across the back
    c.line(21, 9, 12, 24, 'X'); c.line(22, 9, 13, 24, 'x')
    c.px(22, 8, 'B'); c.px(23, 7, 'B')
    # arms
    c.rect(7, 16, 8, 22, 'j'); c.rect(23, 16, 24, 22, 'j')
    c.rect(7, 22, 8, 24, 'u'); c.rect(23, 22, 24, 24, 'u')
    legs_front(c, step)
    c.outline()
    return c


def side(step=0, push=False):
    c = Canvas()
    # cloak streaming behind (to the left)
    for i, (x0, y0) in enumerate(((5, 15), (6, 17), (7, 19), (8, 21), (9, 23))):
        c.rect(x0, y0, 13, y0 + 1, 'c' if i % 2 == 0 else 'C')
    c.px(4, 14, 'c'); c.px(5, 14, 'v'); c.px(6, 15, 'v')
    # backpack
    c.rect(9, 15, 13, 23, 'b'); c.rect(9, 15, 10, 23, 'B'); c.px(11, 18, 'y')
    # sword hilt behind the head
    c.line(9, 9, 12, 13, 'x'); c.px(8, 8, 'X'); c.px(10, 11, 'B')
    # head
    c.ellipse(15.5, 7.8, 5.6, 5.2, 'n')
    for x, y in ((10, 6), (10, 9), (11, 3), (13, 2), (17, 2), (19, 3), (12, 12)):
        c.px(x, y, 'n')
    for x, y in ((13, 4), (16, 3), (12, 7)):
        c.px(x, y, 'm')
    c.rect(11, 6, 20, 6, 'G'); c.rect(18, 5, 21, 6, 'g'); c.rect(19, 5, 20, 5, 'l')
    c.rect(15, 8, 20, 13, 's'); c.rect(15, 13, 20, 13, 'S'); c.px(21, 10, 's'); c.px(21, 11, 'S')
    c.px(18, 9, 'N'); c.px(19, 9, 'N'); c.px(18, 10, 'w'); c.px(19, 10, 'e')
    c.px(19, 12, 'S'); c.rect(14, 8, 14, 12, 'n')
    # scarf + torso
    c.rect(13, 14, 20, 16, 'c'); c.rect(13, 16, 20, 16, 'C'); c.px(18, 14, 'v')
    c.rect(14, 17, 19, 23, 'j'); c.rect(14, 17, 14, 23, 'J')
    c.line(14, 17, 19, 22, 'b'); c.px(17, 20, 'y')
    c.rect(14, 23, 19, 23, 'B')
    if push:
        c.rect(18, 17, 24, 19, 'j'); c.rect(18, 19, 24, 19, 'J')
        c.rect(25, 17, 26, 19, 'u'); c.px(27, 18, 's')
    else:
        c.rect(16, 17, 18, 22, 'j'); c.rect(18, 17, 18, 22, 'J')
        c.rect(16, 22, 18, 23, 'u')
        # gold compass in hand
        c.rect(19, 21, 21, 22, 'Y'); c.px(21, 22, 'Z'); c.px(20, 21, 'Z')
    # legs
    if step == 0:
        c.rect(14, 24, 16, 28, 'p'); c.rect(17, 24, 19, 28, 'P')
        c.rect(14, 29, 20, 30, 'o'); c.rect(14, 29, 19, 29, 'O')
    elif step == 1:
        c.line(15, 24, 19, 28, 'p', 3); c.line(15, 24, 12, 28, 'P', 3)
        c.rect(19, 29, 23, 30, 'o'); c.rect(11, 29, 14, 30, 'o'); c.rect(19, 29, 22, 29, 'O')
    else:
        c.rect(15, 24, 18, 28, 'p'); c.line(15, 24, 13, 28, 'P', 2)
        c.rect(15, 29, 20, 30, 'o'); c.rect(12, 28, 14, 29, 'o')
    if push:
        # lean: shift the whole figure one pixel right
        c.g = [['.'] + row[:-1] for row in c.g]
    c.outline()
    return c


def frames():
    out = {}
    for i in range(3):
        out[f'down-{i}'] = front(i).rows()
        out[f'up-{i}'] = back(i).rows()
        out[f'right-{i}'] = side(i).rows()
    out['right-push'] = side(1, push=True).rows()
    return out


COSTUME = dict(PALETTE, c='#d8a838', C='#a07818', v='#f2d470', j='#efe6cf', J='#c8b890', p='#8a6a3a', P='#5e4626')
