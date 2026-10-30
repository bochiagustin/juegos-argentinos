"""
Baja los escudos del Ascenso de FootyLogos (https://www.footylogos.com, índice de logos; los derechos son de cada
club: ver docs/licencias/escudos.md) y los guarda como apps/web/public/arte/escudos/<id>.webp (256 px).
El id de cada club en packages/career/src/clubes.ts es el mismo "slug" que usa FootyLogos.

Uso: python3 tools/bajar-escudos.py [id …]   (sin ids: todos los que falten)
Requiere cairosvg, Pillow y acceso a assets.footylogos.com.
"""
import io
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

import cairosvg
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "apps/web/public/arte/escudos"
LADO = 256
URLS = ["https://assets.footylogos.com/logos/{id}-logo-footylogos.svg", "https://assets.footylogos.com/logos/{id}/{id}-logo-footylogos.svg"]


def ids() -> list[str]:
    fuente = (RAIZ / "packages/career/src/clubes.ts").read_text()
    return re.findall(r'\["([a-z0-9-]+)", "[^"]+", "[^"]+", "#', fuente)


def bajar(id_: str) -> Image.Image:
    for url in URLS:
        try:
            req = urllib.request.Request(url.format(id=id_), headers={"User-Agent": "Mozilla/5.0"})
            svg = urllib.request.urlopen(req, timeout=30).read()
            break
        except urllib.error.HTTPError:
            continue
    else:
        raise RuntimeError("no está en FootyLogos")
    # cairosvg no entiende el rgb() moderno separado por espacios.
    svg = re.sub(rb"rgb\((\d+) (\d+) (\d+)\)", rb"rgb(\1,\2,\3)", svg)
    png = cairosvg.svg2png(bytestring=svg, output_width=LADO * 2)
    return Image.open(io.BytesIO(png)).convert("RGBA")


def guardar(id_: str, img: Image.Image) -> None:
    caja = img.getbbox()
    if caja:
        img = img.crop(caja)
    img.thumbnail((LADO, LADO), Image.LANCZOS)
    lienzo = Image.new("RGBA", (LADO, LADO), (0, 0, 0, 0))
    lienzo.paste(img, ((LADO - img.width) // 2, (LADO - img.height) // 2), img)
    DESTINO.mkdir(parents=True, exist_ok=True)
    lienzo.save(DESTINO / f"{id_}.webp", "WEBP", quality=90, method=6)


def main() -> None:
    pedidos = sys.argv[1:] or [i for i in ids() if not (DESTINO / f"{i}.webp").exists()]
    fallas = []
    for id_ in pedidos:
        try:
            guardar(id_, bajar(id_))
            print("ok", id_)
        except Exception as e:  # noqa: BLE001
            fallas.append(id_)
            print("!!", id_, e)
    print(f"\n{len(pedidos) - len(fallas)} escudos bajados. Fallaron: {', '.join(fallas) or 'ninguno'}")


if __name__ == "__main__":
    main()
