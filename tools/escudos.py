"""
Prepara los escudos del Ascenso que sube el usuario: reconoce el club por el nombre del archivo ("River Plate.png",
"boca-juniors.webp", "Newells.jpg"…), saca el fondo blanco liso si no tiene transparencia, recorta y guarda
apps/web/public/arte/escudos/<id>.webp (256 px). Los ids y nombres salen de packages/career/src/clubes.ts.

Uso: python3 tools/escudos.py <carpeta-con-los-escudos>
Requiere Pillow, numpy y scipy.
"""
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "apps/web/public/arte/escudos"
LADO = 256


def norma(texto: str) -> str:
    t = unicodedata.normalize("NFD", texto.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "", t)


def clubes() -> dict[str, str]:
    """id → nombre, leídos de clubes.ts."""
    fuente = (RAIZ / "packages/career/src/clubes.ts").read_text()
    return dict(re.findall(r'\["([a-z0-9-]+)", "([^"]+)", "[^"]+", "#', fuente))


def reconocer(archivo: Path, todos: dict[str, str]) -> str | None:
    n = norma(archivo.stem)
    for id_, nombre in todos.items():
        if n in (norma(id_), norma(nombre)):
            return id_
    # Sin coincidencia exacta: el club cuyo nombre o id contiene el del archivo (o al revés), si hay uno solo.
    candidatos = [id_ for id_, nombre in todos.items() if len(n) >= 4 and any(n in x or (len(x) >= 4 and x in n) for x in (norma(id_), norma(nombre)))]
    return candidatos[0] if len(candidatos) == 1 else None


def sin_fondo(img: Image.Image) -> Image.Image:
    rgba = np.array(img.convert("RGBA"))
    if (rgba[..., 3] < 250).mean() > 0.02:
        return Image.fromarray(rgba)  # ya trae transparencia
    rgb = rgba[..., :3].astype(int)
    claro = (rgb.min(axis=2) >= 235)
    lab, _ = ndi.label(claro)
    borde = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fondo = np.isin(lab, list(borde))
    rgba[..., 3] = np.where(fondo, 0, 255)
    return Image.fromarray(rgba)


def procesar(archivo: Path, id_: str) -> None:
    img = sin_fondo(Image.open(archivo))
    caja = img.getbbox()
    if caja:
        img = img.crop(caja)
    img.thumbnail((LADO, LADO), Image.LANCZOS)
    lienzo = Image.new("RGBA", (LADO, LADO), (0, 0, 0, 0))
    lienzo.paste(img, ((LADO - img.width) // 2, (LADO - img.height) // 2), img)
    DESTINO.mkdir(parents=True, exist_ok=True)
    lienzo.save(DESTINO / f"{id_}.webp", "WEBP", quality=90, method=6)


def main() -> None:
    carpeta = Path(sys.argv[1])
    todos = clubes()
    hechos: set[str] = set()
    for archivo in sorted(carpeta.rglob("*")):
        if archivo.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp", ".jfif", ".gif"}:
            continue
        id_ = reconocer(archivo, todos)
        if not id_:
            print(f"?? no reconozco el club de: {archivo.name}")
            continue
        procesar(archivo, id_)
        hechos.add(id_)
        print(f"ok {archivo.name} → {id_}.webp")
    faltan = [todos[i] for i in todos if i not in hechos and not (DESTINO / f"{i}.webp").exists()]
    print(f"\n{len(hechos)} escudos listos. Faltan {len(faltan)}: {', '.join(faltan)}")


if __name__ == "__main__":
    main()
