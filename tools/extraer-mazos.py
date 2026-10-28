#!/usr/bin/env python3
"""
Recorta las cartas de los PDFs "para imprimir" de Mazo Argento y las guarda como WebP,
una por carta, con los ids del motor ("7-oro", "comodin-1", "dorso").

Uso (requiere poppler-utils y Pillow):
    python3 tools/extraer-mazos.py <pdf> <id-del-mazo> [--out apps/web/public/mazos]

Es una solución provisoria hasta tener los archivos originales carta por carta.
Ver docs/licencias/mazo-argento.md: solo se usa con la licencia de los autores.
"""

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

DPI = 300
OUT_HEIGHT = 600  # px; las cartas se muestran a ~100-180 px de ancho, esto cubre 2x-3x.
INSET = 9  # px a 300 dpi: saca la línea de corte punteada, deja el margen blanco.

# Grilla 3x3 de cada hoja (fracciones de la página A4), medida sobre los PDFs.
COLS = (0.0931, 0.3652, 0.6372)
ROWS = (0.0359, 0.3456, 0.6553)
CELL_W = 0.2697
CELL_H = 0.3080

# Qué carta hay en cada celda (página 1-indexada → filas de 3). None = celda vacía.
O, B, E, C = "oro", "basto", "espada", "copa"
LAYOUT = {
    2: [[(1, O), (2, O), (3, O)], [(4, O), (5, O), (6, O)], [(7, O), (8, O), (9, O)]],
    3: [[(10, O), (11, O), (12, O)], [(1, B), (2, B), (3, B)], [(4, B), (5, B), (6, B)]],
    4: [[(7, B), (8, B), (9, B)], [(10, B), (11, B), (12, B)], [(1, E), (2, E), (3, E)]],
    5: [[(4, E), (5, E), (6, E)], [(7, E), (8, E), (9, E)], [(10, E), (11, E), (12, E)]],
    6: [[(1, C), (2, C), (3, C)], [(4, C), (5, C), (6, C)], [(7, C), (8, C), (9, C)]],
    7: [[(10, C), (11, C), (12, C)], [None, "comodin-1", None], [None, "comodin-2", None]],
    8: [["dorso", None, None], [None, None, None], [None, None, None]],
}


def refine(gray: Image.Image, expected: int, axis: str, span: tuple[int, int], search: int = 18) -> int:
    """Busca la línea punteada de corte cerca de `expected` (columna si axis='x', fila si 'y')."""
    w, h = gray.size
    best, best_count = expected, 0
    px = gray.load()
    for pos in range(max(0, expected - search), min((w if axis == "x" else h) - 1, expected + search)):
        count = 0
        for t in range(span[0], span[1], 3):
            v = px[pos, t] if axis == "x" else px[t, pos]
            if v < 190:
                count += 1
        if count > best_count:
            best, best_count = pos, count
    # Si no hay una línea clara (ej. página de dorsos), nos quedamos con la grilla esperada.
    return best if best_count > (span[1] - span[0]) / 3 / 8 else expected


def crop_cell(page: Image.Image, col: int, row: int) -> Image.Image:
    w, h = page.size
    gray = page.convert("L")
    x0, y0 = round(COLS[col] * w), round(ROWS[row] * h)
    x1, y1 = round((COLS[col] + CELL_W) * w), round((ROWS[row] + CELL_H) * h)
    yspan, xspan = (y0 + 40, y1 - 40), (x0 + 40, x1 - 40)
    x0, x1 = refine(gray, x0, "x", yspan), refine(gray, x1, "x", yspan)
    y0, y1 = refine(gray, y0, "y", xspan), refine(gray, y1, "y", xspan)
    card = page.crop((x0 + INSET, y0 + INSET, x1 - INSET, y1 - INSET))
    ratio = OUT_HEIGHT / card.height
    return card.resize((round(card.width * ratio), OUT_HEIGHT), Image.LANCZOS)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("deck_id")
    ap.add_argument("--out", default="apps/web/public/mazos")
    args = ap.parse_args()
    out = Path(args.out) / args.deck_id
    out.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["pdftoppm", "-r", str(DPI), "-png", "-f", "2", "-l", "8", args.pdf, f"{tmp}/p"], check=True)
        pages = sorted(Path(tmp).glob("p-*.png"))
        if len(pages) != 7:
            sys.exit(f"Esperaba 7 páginas de cartas, encontré {len(pages)}")
        count = 0
        for page_path in pages:
            page_no = int(page_path.stem.split("-")[1])
            page = Image.open(page_path).convert("RGB")
            for r, row in enumerate(LAYOUT[page_no]):
                for c, cell in enumerate(row):
                    if cell is None:
                        continue
                    name = cell if isinstance(cell, str) else f"{cell[0]}-{cell[1]}"
                    crop_cell(page, c, r).save(out / f"{name}.webp", "WEBP", quality=82, method=6)
                    count += 1
    print(f"{args.deck_id}: {count} archivos en {out}")


if __name__ == "__main__":
    main()
