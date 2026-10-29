/**
 * "Momentos de la partida": lo más destacado, para la pantalla del final (contra la máquina y online).
 * Se arma con los resúmenes de cada ronda que van llegando como eventos.
 */
import type { ChinchonRoundSummary } from "@juegos-argentinos/engine/chinchon";
import type { EscobaRoundSummary } from "@juegos-argentinos/engine/escoba";
import type { RoundSummary, Team } from "@juegos-argentinos/engine/truco";
import type { TuttiRoundResult } from "@juegos-argentinos/engine/tutti-frutti";

const NIVEL = ["", "la mano", "un truco", "un retruco", "un vale cuatro"] as const;
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export function momentosTruco(rondas: readonly RoundSummary[], equipo: Team): string[] {
  if (!rondas.length) return [];
  const out: string[] = [];
  const nuestras = rondas.filter((r) => r.points[equipo] > (r.points[1 - equipo] ?? 0)).length;
  out.push(`Ganaron ${nuestras} de ${plural(rondas.length, "mano", "manos")}.`);
  const grande = [...rondas].filter((r) => r.truco.team === equipo && r.truco.how === "bazas").sort((a, b) => b.truco.points - a.truco.points)[0];
  if (grande && grande.truco.level > 1) out.push(`La más grande: ganaron ${NIVEL[grande.truco.level]} querido (+${grande.truco.points}) en la mano ${grande.number}.`);
  const envidos = rondas.filter((r) => r.envido?.querido && r.envido.team === equipo).sort((a, b) => b.envido!.points - a.envido!.points);
  if (envidos[0]) out.push(`Mejor envido: +${envidos[0].envido!.points} en la mano ${envidos[0].number}.`);
  const alMazo = rondas.filter((r) => r.truco.how === "mazo" && r.truco.team === equipo).length;
  if (alMazo) out.push(`Los mandaron al mazo ${plural(alMazo, "vez", "veces")}.`);
  return out.slice(0, 3);
}

export function momentosChinchon(rondas: readonly ChinchonRoundSummary[], yo: number): string[] {
  if (!rondas.length) return [];
  const out: string[] = [];
  const cortes = rondas.filter((r) => r.cutter === yo);
  if (cortes.length) out.push(`Cortaste ${plural(cortes.length, "vez", "veces")}${cortes.some((r) => r.menosDiez) ? ", con un menos diez" : ""}.`);
  const mias = rondas.map((r) => ({ r, p: r.results.find((x) => x.seat === yo)?.points ?? 0 }));
  const mejor = [...mias].sort((a, b) => a.p - b.p)[0];
  if (mejor) out.push(`Tu mejor mano: ${mejor.p > 0 ? `+${mejor.p}` : mejor.p} en la mano ${mejor.r.number}.`);
  const peor = [...mias].sort((a, b) => b.p - a.p)[0];
  if (peor && peor.p >= 20) out.push(`La que dolió: +${peor.p} en la mano ${peor.r.number}.`);
  return out.slice(0, 3);
}

export function momentosEscoba(rondas: readonly EscobaRoundSummary[], bando: number): string[] {
  if (!rondas.length) return [];
  const out: string[] = [];
  const escobas = rondas.reduce((a, r) => a + (r.bandos[bando]?.escobas ?? 0), 0);
  out.push(escobas ? `Hiciste ${plural(escobas, "escoba", "escobas")} en ${plural(rondas.length, "ronda", "rondas")}.` : `${plural(rondas.length, "ronda", "rondas")} sin ninguna escoba tuya.`);
  const sieteBello = rondas.filter((r) => r.categorias.sieteDeOro === bando).length;
  if (sieteBello) out.push(`Te llevaste el siete de oro ${plural(sieteBello, "vez", "veces")}.`);
  const mejor = [...rondas].sort((a, b) => (b.bandos[bando]?.puntos ?? 0) - (a.bandos[bando]?.puntos ?? 0))[0];
  if (mejor && (mejor.bandos[bando]?.puntos ?? 0) >= 3) out.push(`Tu mejor ronda: +${mejor.bandos[bando]!.puntos} en la ${mejor.numero}ª.`);
  return out.slice(0, 3);
}

export function momentosCasita(robos: { hechos: number; sufridos: number }, cartas: number): string[] {
  const out = [`Terminaste con ${plural(cartas, "carta", "cartas")} en la casita.`];
  if (robos.hechos) out.push(`Robaste ${plural(robos.hechos, "casita", "casitas")}.`);
  if (robos.sufridos) out.push(`Te robaron ${plural(robos.sufridos, "vez", "veces")}.`);
  return out;
}

export function momentosTutti(rondas: readonly TuttiRoundResult[], yo: number): string[] {
  if (!rondas.length) return [];
  const out: string[] = [];
  const mejor = [...rondas].sort((a, b) => (b.total[yo] ?? 0) - (a.total[yo] ?? 0))[0]!;
  out.push(`Tu mejor ronda: +${mejor.total[yo]} con la ${mejor.letra}.`);
  const solos = rondas.reduce((a, r) => a + (r.puntos[yo]?.filter((p) => p === 20).length ?? 0), 0);
  if (solos) out.push(`Fuiste el único en ${plural(solos, "categoría", "categorías")}.`);
  const bastas = rondas.filter((r) => r.bastaPor === yo).length;
  if (bastas) out.push(`Cantaste ¡BASTA! ${plural(bastas, "vez", "veces")}.`);
  return out.slice(0, 3);
}
