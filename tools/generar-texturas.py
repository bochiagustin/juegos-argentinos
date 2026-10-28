#!/usr/bin/env python3
"""
Genera las texturas de la interfaz (paño, cuero, madera, papel) como tiles WebP que repiten sin costura.
Son procedurales: ruido filtrado, sin imágenes de terceros.

Uso: python3 tools/generar-texturas.py [--out apps/web/public/texturas]
"""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image

rng = np.random.default_rng(1810)  # fija: siempre las mismas texturas


def tile_noise(size: int, scale: int) -> np.ndarray:
    """Ruido suave que repite sin costura (interpolando una grilla periódica)."""
    grid = rng.random((scale, scale))
    x = np.linspace(0, scale, size, endpoint=False)
    xi = np.floor(x).astype(int)
    xf = x - xi
    xf = xf * xf * (3 - 2 * xf)
    x0, x1 = xi % scale, (xi + 1) % scale
    a = grid[np.ix_(x0, x0)]
    b = grid[np.ix_(x0, x1)]
    c = grid[np.ix_(x1, x0)]
    d = grid[np.ix_(x1, x1)]
    fx = xf[None, :]
    fy = xf[:, None]
    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy


def fbm(size: int, octaves: list[tuple[int, float]]) -> np.ndarray:
    out = np.zeros((size, size))
    total = 0.0
    for scale, weight in octaves:
        out += tile_noise(size, scale) * weight
        total += weight
    out /= total
    return (out - out.min()) / (out.max() - out.min() + 1e-9)


def colorize(t: np.ndarray, dark: tuple[int, int, int], light: tuple[int, int, int]) -> Image.Image:
    d = np.array(dark, dtype=float)
    l = np.array(light, dtype=float)
    rgb = d[None, None, :] * (1 - t[..., None]) + l[None, None, :] * t[..., None]
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")


def pano(size=256):
    # Paño de mesa: grano fino de fibras + manchas muy suaves.
    t = 0.65 * fbm(size, [(8, 1.0), (16, 0.6)]) + 0.35 * rng.random((size, size))
    t = 0.35 + 0.3 * t
    return colorize(t, (8, 40, 26), (40, 110, 70))


def cuero(size=256):
    # Cuero: celdas de poro + vetas.
    base = fbm(size, [(4, 1.0), (8, 0.7), (32, 0.5), (64, 0.35)])
    pores = tile_noise(size, 96)
    t = 0.75 * base + 0.25 * (pores > 0.55)
    return colorize(0.25 + 0.6 * t, (52, 28, 14), (150, 96, 54))


def madera(size=256):
    # Madera: vetas horizontales onduladas.
    y = np.linspace(0, 1, size, endpoint=False)[:, None]
    warp = fbm(size, [(4, 1.0), (8, 0.5)])
    rings = 0.5 + 0.5 * np.sin((y * 18 + warp * 2.5) * 2 * np.pi)
    t = 0.6 * rings + 0.4 * fbm(size, [(16, 1.0), (64, 0.5)])
    return colorize(0.2 + 0.65 * t, (70, 38, 16), (170, 112, 62))


def papel(size=256):
    # Papel viejo para las cartas y los carteles.
    t = 0.7 * fbm(size, [(4, 1.0), (16, 0.5)]) + 0.3 * rng.random((size, size))
    return colorize(0.55 + 0.45 * t, (226, 205, 160), (252, 244, 222))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="apps/web/public/texturas")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for name, fn in [("pano", pano), ("cuero", cuero), ("madera", madera), ("papel", papel)]:
        fn().save(out / f"{name}.webp", "WEBP", quality=80, method=6)
        print(out / f"{name}.webp")


if __name__ == "__main__":
    main()
