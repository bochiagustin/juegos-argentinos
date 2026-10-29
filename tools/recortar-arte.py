"""
Prepara el arte que sube el usuario para la app: saca fondos (el damero "transparente" que los generadores
pintan en la imagen, o un fondo liso), recorta, redimensiona y guarda en WebP dentro de apps/web/public/arte.

Uso: python3 tools/recortar-arte.py <carpeta-con-los-originales>
Requiere Pillow, numpy, scipy y opencv-python-headless.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

RAIZ = Path(__file__).resolve().parent.parent
ARTE = RAIZ / "apps/web/public/arte"


def _toca_borde(lab: np.ndarray) -> set[int]:
    return set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}


def mascara_damero(rgb: np.ndarray) -> np.ndarray:
    """True donde hay fondo: zonas grises claras pegadas al borde, y huecos cerrados que también son damero."""
    mx, mn = rgb.max(axis=2).astype(int), rgb.min(axis=2).astype(int)
    lum = rgb.mean(axis=2)
    cand = ((mx - mn) <= 24) & (lum >= 150)
    lab, n = ndi.label(cand)
    fondo = np.isin(lab, list(_toca_borde(lab)))
    # huecos cerrados (adentro de un aro, entre pétalos): son damero si tienen las dos tonalidades mezcladas
    for i, sl in enumerate(ndi.find_objects(lab), start=1):
        if sl is None or fondo[sl][lab[sl] == i].any():
            continue
        px = lum[sl][lab[sl] == i]
        if px.size < 300:
            continue
        claro, oscuro = (px > px.mean() + 6).mean(), (px < px.mean() - 6).mean()
        if claro > 0.2 and oscuro > 0.2:
            fondo |= lab == i
    return fondo


def mascara_similar(rgb: np.ndarray, tol: float) -> np.ndarray:
    """True donde hay fondo: lo parecido al color del borde, conectado al borde."""
    borde = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]]).astype(float)
    ref = np.median(borde, axis=0)
    dist = np.sqrt(((rgb.astype(float) - ref) ** 2).sum(axis=2))
    lab, _ = ndi.label(dist < tol)
    return np.isin(lab, list(_toca_borde(lab)))


def mascara_grabcut(rgb: np.ndarray, rect: tuple[int, int, int, int]) -> np.ndarray:
    """Para un objeto sobre un fondo con textura (el sombrero sobre cuero): GrabCut de OpenCV dentro de `rect`."""
    import cv2

    bgr = np.ascontiguousarray(rgb[..., ::-1])
    m = np.zeros(rgb.shape[:2], np.uint8)
    cv2.grabCut(bgr, m, rect, np.zeros((1, 65)), np.zeros((1, 65)), 8, cv2.GC_INIT_WITH_RECT)
    return ~((m == 1) | (m == 3))


def recortar(img: Image.Image, fondo: np.ndarray, erosion: int = 2, rellenar: bool = False) -> Image.Image:
    obj = ~fondo
    obj = ndi.binary_opening(obj, iterations=2)
    lab, n = ndi.label(obj)
    if n:
        tam = ndi.sum(obj, lab, range(1, n + 1))
        obj = np.isin(lab, [i + 1 for i, t in enumerate(tam) if t >= tam.max() * 0.02])
    if rellenar:
        obj = ndi.binary_fill_holes(obj)
    if erosion > 0:
        obj = ndi.binary_erosion(obj, iterations=erosion)
    alfa = Image.fromarray((obj * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))
    out = img.convert("RGB").copy()
    out.putalpha(alfa)
    return out.crop(out.getbbox())


def cuadrado(img: Image.Image, lado: int, margen: float = 0.04) -> Image.Image:
    m = int(max(img.size) * margen)
    s = max(img.size) + 2 * m
    lienzo = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    lienzo.paste(img, ((s - img.width) // 2, (s - img.height) // 2), img)
    return lienzo.resize((lado, lado), Image.LANCZOS)


def cubrir(img: Image.Image, w: int, h: int, foco_x: float = 0.5, foco_y: float = 0.5) -> Image.Image:
    esc = max(w / img.width, h / img.height)
    im = img.resize((round(img.width * esc), round(img.height * esc)), Image.LANCZOS)
    x = round((im.width - w) * foco_x)
    y = round((im.height - h) * foco_y)
    return im.crop((x, y, x + w, y + h))


def guardar(img: Image.Image, ruta: str, calidad: int = 88) -> None:
    dest = ARTE / ruta
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=calidad, method=6)
    print(f"{ruta:40s} {img.size}")


def main(origen: Path) -> None:
    def abrir(nombre: str) -> Image.Image:
        return Image.open(origen / nombre)

    def rgb(im: Image.Image) -> np.ndarray:
        return np.asarray(im.convert("RGB"))

    # íconos de los botones de canto y de la barra de pestañas (damero pintado)
    iconos = {
        "envido.png": ("iconos/canto-copa.webp", "similar"),
        "falta-envido.png": ("iconos/canto-rosa.webp", "damero"),
        "flor.png": ("iconos/canto-flor.webp", "damero"),
        "real-envido.png": ("iconos/canto-corona.webp", "damero"),
        "mazo.png": ("iconos/canto-mazo.webp", "damero"),
        "quiero.png": ("iconos/canto-si.webp", "damero"),
        "no-quiero.png": ("iconos/canto-no.webp", "damero"),
        "truco.png": ("iconos/canto-sombrero.webp", "grabcut"),
        "inico.png": ("iconos/tab-inicio.webp", "damero"),
        "tab-jugar.png": ("iconos/tab-jugar.webp", "damero"),
        "tab-mazos.png": ("iconos/tab-mazos.webp", "damero"),
        "tab-ajustes.png": ("iconos/tab-ajustes.webp", "damero"),
    }
    for nombre, (dest, modo) in iconos.items():
        if not (origen / nombre).exists():
            continue
        im = abrir(nombre)
        a = rgb(im)
        fondo = {"damero": mascara_damero, "similar": lambda x: mascara_similar(x, 70), "grabcut": lambda x: mascara_grabcut(x, (6, 150, x.shape[1] - 20, x.shape[0] - 320))}[modo](a)
        guardar(cuadrado(recortar(im, fondo, erosion=3, rellenar=modo != "damero"), 192), dest)

    if (origen / "Logo.png").exists():
        im = abrir("Logo.png")
        logo = recortar(im, mascara_similar(rgb(im), 30), erosion=1)
        logo.thumbnail((1200, 1200), Image.LANCZOS)
        guardar(logo, "logo-marco.webp")

    if (origen / "gaucho.png").exists():
        im = abrir("gaucho.png").convert("RGBA")
        im = im.crop(im.getbbox())
        im.thumbnail((900, 1200), Image.LANCZOS)
        guardar(im, "portada/gaucho.webp")

    for region in ["buenos-aires", "cuyo", "mesopotamia", "norte", "patagonia", "malvinas"]:
        for slot in ["1", "2", "jefe"]:
            nombre = f"{region}-{slot}.png"
            if (origen / nombre).exists():
                guardar(abrir(nombre).convert("RGB").resize((512, 512), Image.LANCZOS), f"rivales/{region}-{slot}.webp", 86)

    if (origen / "truco primer plano.png").exists():
        guardar(cubrir(abrir("truco primer plano.png").convert("RGB"), 800, 500, 0.3), "juegos/truco.webp", 86)

    if (origen / "base.png").exists():
        im = abrir("base.png").convert("RGB")
        im.thumbnail((1080, 2400), Image.LANCZOS)
        guardar(im, "mapa/base.webp", 86)

    if (origen / "icono.png").exists():
        im = abrir("icono.png").convert("RGB")
        iconos_dir = RAIZ / "apps/web/public/icons"
        for lado, nombre in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png"), (48, "favicon-48.png")]:
            im.resize((lado, lado), Image.LANCZOS).save(iconos_dir / nombre, optimize=True)
        # maskable: el dibujo achicado al 80% sobre el verde del fondo, así ningún recorte lo come
        verde = tuple(int(v) for v in np.median(np.asarray(im)[:8].reshape(-1, 3), axis=0))
        lienzo = Image.new("RGB", (512, 512), verde)
        chico = im.resize((410, 410), Image.LANCZOS)
        lienzo.paste(chico, (51, 51))
        lienzo.save(iconos_dir / "icon-maskable-512.png", optimize=True)
        print("icons/ (192, 512, maskable, apple, favicon)")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
