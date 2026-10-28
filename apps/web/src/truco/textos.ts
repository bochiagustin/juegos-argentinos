import type { Canto, EnvidoCall, Pending, TrucoAction, TrucoLevel, TrucoView } from "@juegos-argentinos/engine/truco";

/** Lo que se ve (y se escucha) cuando alguien canta. */
export const CANTO_TEXTO: Record<Canto, string> = {
  truco: "¡Truco!",
  retruco: "¡Quiero retruco!",
  "vale-cuatro": "¡Quiero vale cuatro!",
  envido: "¡Envido!",
  "real-envido": "¡Real envido!",
  "falta-envido": "¡Falta envido!",
  flor: "¡Flor!",
  contraflor: "¡Contraflor!",
  "contraflor-al-resto": "¡Contraflor al resto!",
  "con-flor-me-achico": "Con flor me achico",
  quiero: "¡Quiero!",
  "no-quiero": "No quiero",
  mazo: "Me voy al mazo",
};

export const ENVIDO_NOMBRE: Record<EnvidoCall, string> = {
  envido: "Envido",
  "real-envido": "Real envido",
  "falta-envido": "Falta envido",
};

export const NIVEL_TRUCO: Record<TrucoLevel, string> = { 1: "Sin cantar", 2: "Truco", 3: "Retruco", 4: "Vale cuatro" };

export type Tono = "truco" | "envido" | "flor" | "si" | "no" | "mazo";

/** Texto y color del botón de cada acción (las cartas se juegan tocándolas). */
export function botonDe(action: TrucoAction, view: TrucoView): { texto: string; tono: Tono } | null {
  switch (action.type) {
    case "jugar":
      return null;
    case "truco": {
      const p = view.pending;
      const next = p?.kind === "truco" ? p.level + 1 : view.trucoLevel + 1;
      return { texto: next === 2 ? "Truco" : next === 3 ? "Quiero retruco" : "Quiero vale cuatro", tono: "truco" };
    }
    case "envido":
      return { texto: ENVIDO_NOMBRE[action.call], tono: "envido" };
    case "flor":
      return { texto: "Flor", tono: "flor" };
    case "contraflor":
      return { texto: "Contraflor", tono: "flor" };
    case "contraflor-al-resto":
      return { texto: "Contraflor al resto", tono: "flor" };
    case "con-flor-me-achico":
      return { texto: "Con flor me achico", tono: "no" };
    case "quiero":
      return { texto: "Quiero", tono: "si" };
    case "no-quiero":
      return { texto: "No quiero", tono: "no" };
    case "mazo":
      return { texto: "Irse al mazo", tono: "mazo" };
  }
}

/** Qué se está cantando ahora, en palabras. */
export function describirPendiente(p: Pending): string {
  if (p.kind === "truco") return p.level === 2 ? "truco" : p.level === 3 ? "retruco" : "vale cuatro";
  if (p.kind === "envido") return p.chain.map((c) => ENVIDO_NOMBRE[c].toLowerCase()).join(" + ");
  return p.stage === "flor" ? "flor" : p.stage === "contraflor" ? "contraflor" : "contraflor al resto";
}
