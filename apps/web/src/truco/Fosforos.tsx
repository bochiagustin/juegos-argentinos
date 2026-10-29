/**
 * Puntaje con fósforos, como se anota en la mesa: de a 5, cuatro haciendo un cuadrado y uno cruzado.
 * En la partida a 30, una línea separa las malas (primeros 15) de las buenas.
 */
import { GrupoFosforos } from "../ui/adornos.tsx";

function Grupo({ n }: { n: number }) {
  return <GrupoFosforos n={n} className="size-6 shrink-0" />;
}

export function Fosforos({ puntos, target }: { puntos: number; target: number }) {
  const p = Math.min(puntos, target);
  const fila = (desde: number, cuantos: number) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: cuantos }, (_, i) => {
        const g = desde + i;
        return <Grupo key={g} n={Math.max(0, Math.min(5, p - g * 5))} />;
      })}
    </div>
  );
  // A 30: dos filas, arriba las malas y abajo las buenas (así cada cuadradito se ve grande en el celu).
  return (
    <div className="flex flex-col items-center" role="img" aria-label={`${puntos} puntos`}>
      {target === 30 ? (
        <>
          {fila(0, 3)}
          <span className="my-px h-px w-full bg-[#c9a24a]/50" title="Malas arriba, buenas abajo" />
          {fila(3, 3)}
        </>
      ) : (
        fila(0, Math.ceil(target / 5))
      )}
    </div>
  );
}
