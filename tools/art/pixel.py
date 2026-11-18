"""Tiny pixel-art canvas used by the art generators in this folder.

A Canvas is a grid of palette characters ('.' = transparent). Generators draw with
simple shapes, then export rows of text that src/game/sprites.ts turns into textures.
"""
import random


class Canvas:
    def __init__(self, size=32, fill='.'):
        self.n = size
        self.g = [[fill] * size for _ in range(size)]

    def px(self, x, y, c):
        if 0 <= x < self.n and 0 <= y < self.n:
            self.g[y][x] = c

    def get(self, x, y):
        return self.g[y][x] if 0 <= x < self.n and 0 <= y < self.n else '.'

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.px(x, y, c)

    def line(self, x0, y0, x1, y1, c, w=1):
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        for i in range(steps + 1):
            x = round(x0 + (x1 - x0) * i / steps)
            y = round(y0 + (y1 - y0) * i / steps)
            for dx in range(w):
                self.px(x + dx, y, c)

    def ellipse(self, cx, cy, rx, ry, c):
        for y in range(self.n):
            for x in range(self.n):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                    self.px(x, y, c)

    def replace(self, old, new, region=None):
        x0, y0, x1, y1 = region or (0, 0, self.n - 1, self.n - 1)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if self.g[y][x] == old:
                    self.g[y][x] = new

    def outline(self, c='k'):
        """Add a 1 px outline around every non-transparent pixel."""
        edge = []
        for y in range(self.n):
            for x in range(self.n):
                if self.g[y][x] != '.':
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if self.get(x + dx, y + dy) not in ('.', c):
                        edge.append((x, y))
                        break
        for x, y in edge:
            self.g[y][x] = c

    def speckle(self, region, chars, density, rng, on=None):
        x0, y0, x1, y1 = region
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                if (on is None or self.g[y][x] in on) and rng.random() < density:
                    self.g[y][x] = rng.choice(chars)

    def copy(self):
        c = Canvas(self.n)
        c.g = [row[:] for row in self.g]
        return c

    def rows(self):
        return [''.join(r) for r in self.g]


def rng(seed):
    return random.Random(seed)
