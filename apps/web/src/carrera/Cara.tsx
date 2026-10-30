import { Art } from "../art/Art.tsx";
import type { ArtId } from "../art/manifest.ts";

/**
 * La cara de un jugador en la mesa: el retrato si es el rival de la gira (y ya está dibujado); si no, su emoji.
 * Con retrato llena al contenedor, que tiene que ser `relative` y redondo.
 */
export function Cara({ avatar, rivalId, className = "absolute inset-0 size-full rounded-full object-cover" }: { avatar: string; rivalId?: string | undefined; className?: string }) {
  if (!rivalId) return <>{avatar}</>;
  return <Art id={`rival-${rivalId}` as ArtId} className={className} fallback={<>{avatar}</>} />;
}

/** El id del rival de la gira si ese asiento es él (siempre el asiento 1 en una partida de la carrera). */
export function rivalEn(m: { carrera?: { rivalId: string } | undefined }, seat: number): string | undefined {
  return m.carrera && seat === 1 ? m.carrera.rivalId : undefined;
}
