"""
Genera los datos grandes del tutti-frutti a partir de listas con licencia MIT (bajadas con `npm pack`):

  - packages/engine/src/tutti-frutti/colores-paises.ts: colores (`nombres-de-colores`) y países (`iso-countries-spanish`),
    más los nombres de uso común en la Argentina.
  - apps/web/public/tutti/palabras.txt: léxico general para la categoría "Cosa" (`an-array-of-spanish-words`), sin
    verbos conjugados ni plurales (se carga aparte en la app, no va en el motor).

Uso: python3 tools/generar-listas-tutti.py <carpeta con los .tgz desempaquetados>
  (cada paquete en <carpeta>/<nombre>/package/...)
"""
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

COLORES_COMUNES = """Rojo, Azul, Verde, Amarillo, Negro, Blanco, Gris, Rosa, Rosado, Violeta, Naranja, Celeste, Marrón, Bordó, Fucsia,
Turquesa, Beige, Dorado, Plateado, Lila, Magenta, Ocre, Caqui, Habano, Crema, Salmón, Coral, Índigo, Ámbar, Esmeralda, Lavanda,
Mostaza, Terracota, Cian, Púrpura, Granate, Ciruela, Uva, Verde agua, Verde manzana, Verde oliva, Verde musgo, Azul marino,
Azul francia, Gris perla, Carmesí, Bermellón, Carmín, Cobre, Bronce, Oro, Plata, Hueso, Marfil, Nácar, Tiza, Arena, Café,
Chocolate, Canela, Caramelo, Durazno, Damasco, Frambuesa, Frutilla, Cereza, Vino, Borgoña, Lima, Limón, Menta, Petróleo,
Aguamarina, Zafiro, Rubí, Amatista, Jade, Topacio, Ceniza, Humo, Plomo, Acero, Grafito, Carbón, Ébano, Sepia, Siena, Tostado,
Tabaco, Camel, Nude, Fluo, Champán, Perla, Bermejo, Escarlata, Malva, Orquídea, Glicina, Lirio, Rosa chicle, Rosa viejo,
Verde loro, Verde botella, Verde militar, Verde inglés, Amarillo patito, Amarillo limón, Blanco hueso, Negro azabache, Azabache"""

PAISES_COMUNES = """Argentina, Inglaterra, Escocia, Gales, Holanda, Estados Unidos, Rusia, Corea del Sur, Corea del Norte, Irlanda del Norte,
Vaticano, Kosovo, Palestina, Taiwán, Groenlandia, Puerto Rico, Birmania, Myanmar, Costa de Marfil, Timor Oriental, Macedonia,
Macedonia del Norte, Bielorrusia, República Checa, Chequia, Eslovaquia, Suazilandia, Esuatini, Gran Bretaña, Reino Unido,
Emiratos Árabes, Emiratos Árabes Unidos, Arabia Saudita, Irán, Irak, Catar, Qatar, Bosnia, Bangladés, Fiyi"""


def lista(texto: str) -> set[str]:
    return {x.strip() for x in texto.split(",") if x.strip()}


def colores_paises(origen: Path) -> None:
    cols = json.loads((origen / "nombres-de-colores/package/colors.json").read_text())
    colores = set(lista(COLORES_COMUNES))
    for c in cols:
        for parte in re.split(r"\s+o\s+|/", c["name"]):
            parte = parte.strip()
            if parte:
                colores.add(parte[0].upper() + parte[1:])
    fuente = (origen / "iso-countries-spanish/package/dist/index.js").read_text()
    paises = set(lista(PAISES_COMUNES))
    for m in re.findall(r'nombre: "([^"]+)"', fuente):
        paises.add(json.loads('"' + m.replace("\\x", "\\u00") + '"'))
    salida = f"""/**
 * Generado con tools/generar-listas-tutti.py: colores de `nombres-de-colores` (MIT, David Aerne) y países de
 * `iso-countries-spanish` (MIT), más los de uso común en la Argentina. No editar a mano: regenerar.
 */
export const COLORES_EXTRA: readonly string[] = {json.dumps(sorted(colores), ensure_ascii=False)};

export const PAISES_EXTRA: readonly string[] = {json.dumps(sorted(paises), ensure_ascii=False)};
"""
    (RAIZ / "packages/engine/src/tutti-frutti/colores-paises.ts").write_text(salida)
    print("colores", len(colores), "países", len(paises))


# Terminaciones que son casi siempre verbos conjugados (para no aceptar "comeríamos" como una cosa).
CONJUGACIONES = """ariamos eriamos iriamos ariais eriais iriais asemos iesemos aramos ieramos areis ereis ireis asteis isteis abais iais
aseis ieseis arais ierais abamos iamos aremos eremos iremos ais eis amos emos imos aban arian erian irian asen iesen aran ieran
aria eria iria ando iendo aste iste aron ieron ase iese ara iera aras ieras ases ieses abas ias eran iran ares ieres are iere
aren ieren ad ed id ate ete ite alo ela""".split()


def lexico(origen: Path) -> None:
    palabras = json.loads((origen / "an-array-of-spanish-words/package/index.json").read_text())
    verbal = lambda x: any(x.endswith(t) and len(x) > len(t) + 2 for t in CONJUGACIONES)
    base = {x for x in palabras if len(x) <= 14 and not verbal(x)}
    # Sin plurales: "mesas" queda a una letra de "mesa" y se perdona igual.
    sin_plurales = sorted(x for x in base if not (x.endswith("s") and (x[:-1] in base or (x.endswith("es") and x[:-2] in base))))
    destino = RAIZ / "apps/web/public/tutti/palabras.txt"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text("\n".join(sin_plurales) + "\n")
    print("léxico", len(sin_plurales))


if __name__ == "__main__":
    carpeta = Path(sys.argv[1])
    colores_paises(carpeta)
    lexico(carpeta)
