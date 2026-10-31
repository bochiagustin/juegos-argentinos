import { PREFIJO_ASCENSO } from "@juegos-argentinos/career";
import { Escudo } from "../ascenso/Escudo.tsx";
import { Art } from "../art/Art.tsx";
import type { ArtId } from "../art/manifest.ts";

/**
 * La cara de un jugador: su avatar ilustrado (`@1`…`@12`), el retrato si es el rival de la gira, el escudo si es un
 * club del Ascenso, o su emoji.
 * Con retrato llena al contenedor, que tiene que ser `relative` y redondo.
 */
export function Cara({ avatar, rivalId, className = "absolute inset-0 size-full rounded-full object-cover" }: { avatar: string; rivalId?: string | undefined; className?: string }) {
  const retrato = /^@(\d{1,2})$/.exec(avatar)?.[1];
  if (retrato) return <Art id={`avatar-${retrato}` as ArtId} className={className} fallback={<>🧉</>} />;
  if (!rivalId) return <>{avatar}</>;
  // El escudo entero adentro del círculo, con aire alrededor (no recortado por el borde redondo).
  if (rivalId.startsWith(PREFIJO_ASCENSO))
    return (
      <span className="absolute inset-[16%] flex items-center justify-center">
        <Escudo id={rivalId.slice(PREFIJO_ASCENSO.length)} className="size-full" />
      </span>
    );
  return <Art id={`rival-${rivalId}` as ArtId} className={className} fallback={<>{avatar}</>} />;
}

/** El id del rival de la gira si ese asiento es él (siempre el asiento 1 en una partida de la carrera). */
export function rivalEn(m: { carrera?: { rivalId: string } | undefined }, seat: number): string | undefined {
  return m.carrera && seat === 1 ? m.carrera.rivalId : undefined;
}
