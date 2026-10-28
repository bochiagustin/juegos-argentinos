import { cardFromId } from "@juegos-argentinos/engine";
import type { TrucoConfig } from "@juegos-argentinos/engine/truco";
import { SpanishCard } from "../cards/SpanishCard.tsx";

const JERARQUIA: { nombre: string; cartas: string[] }[] = [
  { nombre: "Ancho de espada", cartas: ["1-espada"] },
  { nombre: "Ancho de basto", cartas: ["1-basto"] },
  { nombre: "Siete de espada", cartas: ["7-espada"] },
  { nombre: "Siete de oro", cartas: ["7-oro"] },
  { nombre: "Los tres", cartas: ["3-espada", "3-basto", "3-oro", "3-copa"] },
  { nombre: "Los dos", cartas: ["2-espada", "2-basto", "2-oro", "2-copa"] },
  { nombre: "Anchos falsos", cartas: ["1-oro", "1-copa"] },
  { nombre: "Los reyes", cartas: ["12-espada", "12-basto", "12-oro", "12-copa"] },
  { nombre: "Los caballos", cartas: ["11-espada", "11-basto", "11-oro", "11-copa"] },
  { nombre: "Las sotas", cartas: ["10-espada", "10-basto", "10-oro", "10-copa"] },
  { nombre: "Sietes falsos", cartas: ["7-basto", "7-copa"] },
  { nombre: "Los seis", cartas: ["6-espada", "6-basto", "6-oro", "6-copa"] },
  { nombre: "Los cinco", cartas: ["5-espada", "5-basto", "5-oro", "5-copa"] },
  { nombre: "Los cuatro", cartas: ["4-espada", "4-basto", "4-oro", "4-copa"] },
];

export function ReglasTruco({ config }: { config: TrucoConfig }) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <h2 className="titulo-criollo text-center text-3xl">Cómo se juega</h2>

      <section>
        <h3 className="mb-1 font-criolla text-lg text-naranja">De la más fuerte a la más débil</h3>
        <ol className="flex flex-col gap-1">
          {JERARQUIA.map((g, i) => (
            <li key={g.nombre} className="flex items-center gap-2 rounded-xl bg-black/25 px-2 py-1">
              <span className="w-5 text-right font-black text-naranja">{i + 1}</span>
              <span className="flex -space-x-3">
                {g.cartas.map((id) => (
                  <SpanishCard key={id} card={cardFromId(id)} width={26} />
                ))}
              </span>
              <span className="font-bold">{g.nombre}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h3 className="mb-1 font-criolla text-lg text-naranja">La mano</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>3 cartas cada uno. Gana la mano el que gana 2 de las 3 bazas.</li>
          <li>Si se empata (parda) la primera, gana el que gane la segunda. Si alguien ganó la primera y se empata otra, gana el de la primera. Tres pardas: gana el que es mano.</li>
          <li>La mano vale 1. Con truco querido vale 2, retruco 3 y vale cuatro 4. Solo puede subir el que quiso el último canto.</li>
          <li>Si no querés, el otro se lleva lo que valía antes.</li>
        </ul>
      </section>

      <section>
        <h3 className="mb-1 font-criolla text-lg text-naranja">El envido</h3>
        <ul className="list-disc space-y-1 pl-5">
          <li>Solo en la primera baza, antes de tirar tu carta. Si te cantan truco, podés contestar con envido: "el envido está primero".</li>
          <li>Tanto: dos del mismo palo suman 20 más sus valores (las figuras valen 0). Si no tenés, vale tu carta más alta. Máximo 33.</li>
          <li>Envido 2 · Real envido 3 · Falta envido: lo que le falta al que va ganando {config.target === 30 ? "para cerrar las malas (15) o las buenas (30)" : "para llegar a 15"}.</li>
          <li>Empate en el tanto: gana el que es mano. Si no se quiere, se cobra lo aceptado antes (mínimo 1).</li>
        </ul>
      </section>

      {config.flor && (
        <section>
          <h3 className="mb-1 font-criolla text-lg text-naranja">La flor</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Tres cartas del mismo palo: se canta flor y anula el envido. Vale 3.</li>
            <li>Si el otro también tiene: se puede achicar (4 para el primero), cantar contraflor (6 a la mejor) o contraflor al resto.</li>
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-1 font-criolla text-lg text-naranja">Irse al mazo</h3>
        <p>Abandonás la mano y los otros cobran lo que valía.{config.mazoSumaEnvido ? " Si te vas en la primera baza sin que se haya cantado envido, cobran 1 más." : ""}</p>
      </section>
    </div>
  );
}
