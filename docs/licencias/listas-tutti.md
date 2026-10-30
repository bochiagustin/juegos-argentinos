# Listas de palabras del Tutti-Frutti

Se generan con `tools/generar-listas-tutti.py` a partir de estos paquetes de npm (todos con licencia MIT):

| Paquete | Qué se usa | Licencia |
|---|---|---|
| `an-array-of-spanish-words` 2.0.0 (Zeke Sikelianos, derivada de la lista de Letterpress) | Léxico general para la categoría "Cosa" (`apps/web/public/tutti/palabras.txt`, sin verbos conjugados ni plurales) | MIT |
| `nombres-de-colores` 0.7.0 (David Aerne) | Colores (`packages/engine/src/tutti-frutti/colores-paises.ts`) | MIT |
| `iso-countries-spanish` 1.0.3 | Países en castellano (mismo archivo) | MIT |

El resto de las listas (nombres, apellidos, ciudades, animales, frutas y verduras, comidas, marcas) están escritas a mano
en `packages/engine/src/tutti-frutti/listas.ts`. Las marcas se usan solo como palabras válidas del juego.
