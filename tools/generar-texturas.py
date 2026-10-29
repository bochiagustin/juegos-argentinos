#!/usr/bin/env python3
"""
Genera las texturas de la interfaz (paño, cuero, madera, papel) como tiles WebP que repiten sin costura.
Son procedurales: ruido filtrado, sin imágenes de terceros.

Uso: python3 tools/generar-texturas.py [--out apps/web/public/texturas]
"""

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

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


# Se generan a 3x (768 px) y la web las muestra a 256 px: quedan nítidas en pantallas de alta densidad.
SIZE = 768


def fino(size: int, blur: float = 0.6, stretch: int = 1) -> np.ndarray:
    """Grano fino que repite sin costura (ruido por pixel, apenas suavizado; stretch>1 lo estira en horizontal = fibras)."""
    n = rng.random((size, size // stretch))
    if stretch > 1:
        n = np.repeat(n, stretch, axis=1)
    img = Image.fromarray((n * 255).astype(np.uint8), "L")
    # Envolver antes de suavizar para que el borde no se note al repetir.
    big = Image.new("L", (size * 3, size * 3))
    for i in range(3):
        for j in range(3):
            big.paste(img, (i * size, j * size))
    big = big.filter(ImageFilter.GaussianBlur(blur * (stretch if stretch > 1 else 1)))
    out = np.asarray(big.crop((size, size, 2 * size, 2 * size)), dtype=float) / 255
    return (out - out.min()) / (out.max() - out.min() + 1e-9)


def pano(size=SIZE):
    # Paño de mesa: fibras finas y parejas, con una variación de tono muy suave (sin manchas).
    t = 0.55 * fino(size, 0.7) + 0.25 * fino(size, 1.2, stretch=3) + 0.2 * fbm(size, [(6, 1.0), (12, 0.5)])
    t = 0.42 + 0.22 * t
    return colorize(t, (6, 38, 24), (44, 118, 76))


def cuero(size=SIZE):
    # Cuero: grano granulado (poros) + vetas suaves.
    base = fbm(size, [(4, 1.0), (8, 0.6), (24, 0.35)])
    poros = fino(size, 1.6)
    grano = (poros > 0.56).astype(float) * 0.6 + poros * 0.4
    t = 0.62 * base + 0.38 * grano
    return colorize(0.28 + 0.55 * t, (54, 30, 15), (146, 94, 54))


def madera(size=SIZE):
    # Madera: vetas horizontales onduladas + fibra fina.
    y = np.linspace(0, 1, size, endpoint=False)[:, None]
    warp = fbm(size, [(4, 1.0), (8, 0.5)])
    # Pocas vetas y suaves (a 256 px de pantalla, muchas parecen rayas de cebra).
    rings = 0.5 + 0.5 * np.sin((y * 6 + warp * 1.6) * 2 * np.pi)
    t = 0.32 * rings + 0.38 * fbm(size, [(8, 1.0), (24, 0.6)]) + 0.3 * fino(size, 0.9, stretch=12)
    return colorize(0.3 + 0.45 * t, (78, 44, 20), (160, 104, 58))


def papel(size=SIZE):
    # Papel viejo para las cartas y los carteles.
    t = 0.65 * fbm(size, [(4, 1.0), (16, 0.5)]) + 0.35 * fino(size, 0.6)
    return colorize(0.58 + 0.42 * t, (226, 205, 160), (252, 244, 222))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="apps/web/public/texturas")
    args = ap.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for name, fn in [("pano", pano), ("cuero", cuero), ("madera", madera), ("papel", papel)]:
        fn().save(out / f"{name}.webp", "WEBP", quality=84, method=6)
        print(out / f"{name}.webp")


if __name__ == "__main__":
    main()
