#!/usr/bin/env python3
"""
Převod vygenerovaného znaku (PNG s alfou) na čistý SVG.

Znak navrhl gpt-image-2 (viz scripts/gen-logo.py) — tohle je jen produkční
příprava: obtažení hran, zjednodušení a zápis jako <path>. Výsledek je ostrý
v každé velikosti, váží pár kB a bere barvu z `currentColor`.

Použití: python3 scripts/png-na-svg.py public/logo-koncepty/les-vlna-1.png public/znak-les.svg
"""

import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

# Moore sousedství po směru hodinových ručiček, začíná vlevo.
SMER = [(-1, 0), (-1, -1), (0, -1), (1, -1), (1, 0), (1, 1), (0, 1), (-1, 1)]


def komponenty(mask: np.ndarray) -> list[np.ndarray]:
    """Souvislé oblasti (4-okolí) jako samostatné masky."""
    h, w = mask.shape
    videno = np.zeros_like(mask, dtype=bool)
    out = []
    for y in range(h):
        for x in range(w):
            if not mask[y, x] or videno[y, x]:
                continue
            komp = np.zeros_like(mask, dtype=bool)
            q = deque([(y, x)])
            videno[y, x] = True
            while q:
                cy, cx = q.popleft()
                komp[cy, cx] = True
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not videno[ny, nx]:
                        videno[ny, nx] = True
                        q.append((ny, nx))
            if komp.sum() > 40:  # drobné artefakty pryč
                out.append(komp)
    return out


def obtah(komp: np.ndarray) -> list[tuple[int, int]]:
    """Moore-neighbour tracing — vrátí obrys komponenty jako polygon."""
    ys, xs = np.nonzero(komp)
    start = (int(xs[np.argmin(ys)]), int(ys.min()))
    # posun na skutečně nejlevější pixel v horním řádku
    horni = xs[ys == ys.min()]
    start = (int(horni.min()), int(ys.min()))

    h, w = komp.shape

    def je(p):
        x, y = p
        return 0 <= x < w and 0 <= y < h and komp[y, x]

    obrys = [start]
    aktualni = start
    smer = 6  # přišli jsme „zhora"
    for _ in range(4 * int(komp.sum()) + 8):
        nalezeno = False
        for k in range(8):
            i = (smer + 5 + k) % 8
            dx, dy = SMER[i]
            kand = (aktualni[0] + dx, aktualni[1] + dy)
            if je(kand):
                aktualni, smer, nalezeno = kand, i, True
                break
        if not nalezeno:
            break
        if aktualni == start and len(obrys) > 2:
            break
        obrys.append(aktualni)
    return obrys


def rdp(body: list[tuple[float, float]], eps: float) -> list[tuple[float, float]]:
    """Douglas–Peucker — z tisíců pixelů udělá desítky bodů."""
    if len(body) < 3:
        return body
    a, b = np.array(body[0]), np.array(body[-1])
    ab = b - a
    norm = np.hypot(*ab)
    p = np.array(body)
    if norm == 0:
        d = np.hypot(*(p - a).T)
    else:
        d = np.abs(np.cross(ab, p - a)) / norm
    i = int(np.argmax(d))
    if d[i] > eps:
        return rdp(body[: i + 1], eps)[:-1] + rdp(body[i:], eps)
    return [body[0], body[-1]]


def main() -> None:
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    im = Image.open(src).convert("RGBA")
    alfa = np.asarray(im)[..., 3]
    mask = alfa > 128

    ys, xs = np.nonzero(mask)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    mask = mask[y0:y1, x0:x1]

    komps = komponenty(mask)
    komps.sort(key=lambda k: np.nonzero(k)[1].min())

    eps = max(mask.shape) * 0.0016
    cesty = []
    for k in komps:
        poly = rdp(obtah(k), eps)
        if len(poly) < 3:
            continue
        d = "M" + " L".join(f"{x} {y}" for x, y in poly) + " Z"
        cesty.append(d)

    w, h = mask.shape[1], mask.shape[0]
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        f'fill="currentColor" fill-rule="evenodd" aria-hidden="true">'
        + "".join(f'<path d="{d}"/>' for d in cesty)
        + "</svg>"
    )
    dst.write_text(svg, encoding="utf-8")
    print(f"{dst} — {len(cesty)} tvarů, {len(svg)} B, viewBox 0 0 {w} {h}")


if __name__ == "__main__":
    sys.setrecursionlimit(10000)
    main()
