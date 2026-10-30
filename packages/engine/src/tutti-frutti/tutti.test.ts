import { describe, expect, it } from "vitest";
import { playTuttiBotGame } from "./bot.ts";
import { DICCIONARIO } from "./diccionario.ts";
import { ALFABETO, conocida, DEFAULT_TUTTI_CONFIG, esValidaAuto, normalizar, puntuarCategoria, rechazadaPorVotos, tuttiFrutti, usarLexico, usarPalabrasPropias, veredicto } from "./game.ts";
import { MESA, type TuttiAction, type TuttiConfig, type TuttiState } from "./types.ts";

const ids = ["a", "b", "c"];
function nueva(config: Partial<TuttiConfig> = {}, players = 3): TuttiState {
  return tuttiFrutti.initialState({ ...DEFAULT_TUTTI_CONFIG, categorias: ["Nombre", "Animal", "Color"], ...config, players }, ids.slice(0, players), "semilla");
}
function hacer(s: TuttiState, id: string, a: TuttiAction): TuttiState {
  const r = tuttiFrutti.applyAction(s, id, a);
  if (!r.ok) throw new Error(r.error);
  return r.state;
}
function escribir(s: TuttiState, id: string, textos: string[]): TuttiState {
  return textos.reduce((st, texto, categoria) => hacer(st, id, { type: "escribir", categoria, texto }), s);
}
/** Fija la letra (para escribir respuestas a mano). */
const conLetra = (s: TuttiState, letra: string): TuttiState => ({ ...s, letra, usadas: [letra] });

describe("normalización y validación", () => {
  it("minúsculas, sin acentos, espacios simples; la ñ se respeta", () => {
    expect(normalizar("  ÁrBOL   grande ")).toBe("arbol grande");
    expect(normalizar("Ñandú")).toBe("ñandu");
    expect(normalizar("Coca-Cola")).toBe("coca cola");
  });

  it("validación automática: letra, al menos dos letras, alguna vocal", () => {
    expect(esValidaAuto("Árbol", "A")).toBe(true);
    expect(esValidaAuto("  ananá", "A")).toBe(true);
    expect(esValidaAuto("Banana", "A")).toBe(false);
    expect(esValidaAuto("A", "A")).toBe(false);
    expect(esValidaAuto("Bcdf", "B")).toBe(false);
    expect(esValidaAuto("aaaa", "A")).toBe(false);
    expect(esValidaAuto("Ñandú", "Ñ")).toBe(true);
    expect(esValidaAuto("Ñandú", "N")).toBe(false);
  });

  it("el diccionario tiene palabras de la letra para cada categoría y letra común", () => {
    const comunes = "ABCDEFGLMPRST".split("");
    for (const [cat, palabras] of Object.entries(DICCIONARIO)) {
      for (const l of comunes) expect(palabras.some((p) => normalizar(p)[0]?.toUpperCase() === l), `${cat} ${l}`).toBe(true);
    }
    for (const palabras of Object.values(DICCIONARIO)) for (const p of palabras) expect(esValidaAuto(p, normalizar(p)[0]!.toUpperCase()), p).toBe(true);
    expect(conocida("Animal", "carpincho")).toBe(true);
    expect(conocida("Animal", "Carpinchón")).toBe(false);
    expect(conocida("Superhéroe", "Batman")).toBeNull();
  });
});

describe("diccionario: faltas de ortografía", () => {
  it("bien escrita vale; con una falta se perdona; con dos se rechaza", () => {
    expect(veredicto("País", "Argentina").tipo).toBe("conocida");
    expect(veredicto("País", "árgentína").tipo).toBe("conocida"); // los acentos no cuentan
    expect(veredicto("País", "Arjentina")).toEqual({ tipo: "perdonada", correccion: "argentina" });
    expect(veredicto("País", "Argentna").tipo).toBe("perdonada"); // una de menos
    expect(veredicto("País", "Argenitna").tipo).toBe("perdonada"); // dos dadas vuelta
    expect(veredicto("País", "Arjentyna").tipo).toBe("desconocida");
    expect(veredicto("Animal", "Pinguino").tipo).toBe("conocida");
    expect(veredicto("Animal", "Pingüinoo").tipo).toBe("perdonada");
    expect(veredicto("Animal", "Perrro").tipo).toBe("perdonada");
    expect(veredicto("Animal", "Mesa").tipo).toBe("desconocida");
  });

  it("en palabras cortas no se perdona (una letra cambia todo) y la falta no puede cambiar la inicial", () => {
    expect(veredicto("Animal", "Oso").tipo).toBe("conocida");
    expect(veredicto("Animal", "Ozo").tipo).toBe("desconocida");
    expect(veredicto("Animal", "Baca").tipo).toBe("desconocida"); // "vaca" empieza con otra letra
  });

  it("apellidos y marcas que no conoce quedan dudosos; las categorías propias no se validan", () => {
    expect(veredicto("Apellido", "Zarlenga").tipo).toBe("dudosa");
    expect(veredicto("Apellido", "Gonzalez").tipo).toBe("conocida");
    expect(veredicto("Superhéroe", "Batman").tipo).toBe("conocida");
  });

  it("Cosa: con el léxico cargado se valida contra el castellano; sin léxico queda dudosa", () => {
    usarLexico(null);
    expect(veredicto("Cosa", "Zaranda").tipo).toBe("dudosa");
    usarLexico(["mesa", "zaranda", "heladera"]);
    expect(veredicto("Cosa", "Zaranda").tipo).toBe("conocida");
    expect(veredicto("Cosa", "Eladera").tipo).toBe("desconocida"); // le falta la h: cambia la inicial
    expect(veredicto("Cosa", "Heladerra").tipo).toBe("perdonada");
    expect(veredicto("Cosa", "Zxcvbn").tipo).toBe("desconocida");
    usarLexico(null);
  });

  it("las palabras reportadas por el jugador valen en su dispositivo", () => {
    expect(veredicto("Animal", "Yaguarundí").tipo).toBe("desconocida");
    usarPalabrasPropias([{ categoria: "Animal", palabra: "Yaguarundí" }]);
    expect(veredicto("Animal", "yaguarundi").tipo).toBe("conocida");
    usarPalabrasPropias([]);
  });

  it("en la ronda: la desconocida vale 0 y la perdonada es repetida de la bien escrita", () => {
    let s = conLetra(nueva({ categorias: ["País", "Animal"] }), "P");
    s = escribir(s, "a", ["Paraguay", "Perro"]);
    s = escribir(s, "b", ["Paraguai", "Pxrrqo"]);
    s = escribir(s, "c", ["Perú", ""]);
    s = hacer(s, MESA, { type: "cerrar" });
    const r = s.history[0]!;
    expect(r.estados[1]![1]).toBe("desconocida");
    expect(r.correcciones[1]![0]).toBe("paraguay");
    expect(r.puntos.map((p) => p[0])).toEqual([5, 5, 10]);
    expect(r.puntos.map((p) => p[1])).toEqual([20, 0, 0]);
  });
});

describe("puntaje", () => {
  it("10 única, 5 repetida (misma normalización), 20 si sos el único válido, 0 vacía o inválida", () => {
    expect(puntuarCategoria(["Perro", "perro ", "Puma"], [true, true, true])).toEqual([5, 5, 10]);
    expect(puntuarCategoria(["Pérez", "", "Bueno"], [true, false, false])).toEqual([20, 0, 0]);
    expect(puntuarCategoria(["", "", ""], [false, false, false])).toEqual([0, 0, 0]);
  });

  it("votación: rechaza la mayoría de los demás; el empate se acepta", () => {
    expect(rechazadaPorVotos(1, 2)).toBe(true);
    expect(rechazadaPorVotos(1, 3)).toBe(false);
    expect(rechazadaPorVotos(2, 3)).toBe(true);
    expect(rechazadaPorVotos(2, 5)).toBe(false);
    expect(rechazadaPorVotos(3, 5)).toBe(true);
  });
});

describe("una ronda", () => {
  it("sale una letra permitida y las respuestas de los demás no se ven", () => {
    let s = nueva();
    expect(DEFAULT_TUTTI_CONFIG.excluidas).not.toContain(s.letra);
    s = hacer(s, "a", { type: "escribir", categoria: 0, texto: "secreto" });
    const vb = tuttiFrutti.getPlayerView(s, "b");
    expect(JSON.stringify(vb)).not.toContain("secreto");
    expect(vb.players[0]!.llenas).toBe(1);
    expect(tuttiFrutti.getPlayerView(s, "a").misRespuestas[0]).toBe("secreto");
  });

  it("¡BASTA! solo con todo completo con la letra; cerrar es de la mesa", () => {
    let s = conLetra(nueva(), "M");
    expect(tuttiFrutti.applyAction(s, "a", { type: "basta" }).ok).toBe(false);
    s = escribir(s, "a", ["Martín", "Mono", "Banana"]);
    expect(tuttiFrutti.getValidActions(s, "a").some((x) => x.type === "basta")).toBe(false);
    s = escribir(s, "a", ["Martín", "Mono", "Marrón"]);
    s = hacer(s, "a", { type: "basta" });
    expect(s.fase).toBe("basta");
    // Durante la cuenta regresiva se puede seguir escribiendo.
    s = hacer(s, "b", { type: "escribir", categoria: 0, texto: "Martín" });
    expect(tuttiFrutti.applyAction(s, "a", { type: "cerrar" }).ok).toBe(false);
    const r = tuttiFrutti.applyAction(s, MESA, { type: "cerrar" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.fase).toBe("resultado");
    const res = r.state.history[0]!;
    expect(res.bastaPor).toBe(0);
    expect(res.puntos[0]).toEqual([5, 20, 20]);
    expect(res.puntos[1]).toEqual([5, 0, 0]);
    expect(res.total).toEqual([45, 5, 0]);
    expect(tuttiFrutti.applyAction(r.state, "a", { type: "escribir", categoria: 0, texto: "x" }).ok).toBe(false);
  });

  it("respuestas que no empiezan con la letra no suman y no cuentan para el 'único'", () => {
    let s = conLetra(nueva(), "P");
    s = escribir(s, "a", ["Pedro", "Perro", ""]);
    s = escribir(s, "b", ["Bruno", "Puma", "Pardo"]);
    s = hacer(s, MESA, { type: "cerrar" });
    const res = s.history[0]!;
    expect(res.estados[1]![0]).toBe("invalida");
    expect(res.puntos[0]).toEqual([20, 10, 0]);
    expect(res.puntos[1]).toEqual([0, 10, 20]);
  });

  it("con votación: la mayoría rechaza, el autor no vota lo suyo y el empate se acepta", () => {
    let s = conLetra(nueva({ votacion: true }), "G");
    s = escribir(s, "a", ["Gonzalo", "Gaviota", "Gris"]);
    s = escribir(s, "b", ["Gabriela", "Gato", ""]);
    s = escribir(s, "c", ["Gustavo", "", "Granate"]);
    s = hacer(s, MESA, { type: "cerrar" });
    expect(s.fase).toBe("revision");
    const v = tuttiFrutti.getPlayerView(s, "b");
    expect(v.revision?.estados[0]![1]).toBe("valida");
    expect(tuttiFrutti.applyAction(s, "a", { type: "votar", autor: 0, categoria: 1, rechazar: true }).ok).toBe(false);
    s = hacer(s, "b", { type: "votar", autor: 0, categoria: 1, rechazar: true });
    s = hacer(s, "c", { type: "votar", autor: 0, categoria: 1, rechazar: true });
    // Un solo voto contra "Gris": empate 1 a 1 entre los otros dos → se acepta.
    s = hacer(s, "b", { type: "votar", autor: 0, categoria: 2, rechazar: true });
    for (const id of ids) s = hacer(s, id, { type: "listo" });
    const res = s.history[0]!;
    expect(res.estados[0]![1]).toBe("rechazada");
    expect(res.estados[0]![2]).toBe("valida");
    expect(res.puntos[1]![1]).toBe(20);
  });

  it("los votos se pueden retirar", () => {
    let s = conLetra(nueva({ votacion: true }, 2), "L");
    s = escribir(s, "a", ["Lucas", "", ""]);
    s = hacer(s, MESA, { type: "cerrar" });
    s = hacer(s, "b", { type: "votar", autor: 0, categoria: 0, rechazar: true });
    expect(s.rechazos["0-0"]).toEqual([1]);
    s = hacer(s, "b", { type: "votar", autor: 0, categoria: 0, rechazar: false });
    s = hacer(s, MESA, { type: "seguir" });
    expect(s.history[0]!.puntos[0]![0]).toBe(20);
  });
});

describe("partida", () => {
  it("las letras no se repiten y termina a las N rondas", () => {
    const s = playTuttiBotGame({ fin: { tipo: "rondas", rondas: 6 } }, [5, 5, 5], "rondas");
    expect(s.fase).toBe("fin");
    expect(s.history.length).toBeGreaterThanOrEqual(6);
    expect(new Set(s.usadas).size).toBe(s.usadas.length);
    for (const l of s.usadas) expect(DEFAULT_TUTTI_CONFIG.excluidas).not.toContain(l);
  });

  it("a X puntos: termina cuando alguien llega y va solo arriba", () => {
    const s = playTuttiBotGame({ fin: { tipo: "puntos", puntos: 150 } }, [6, 6], "puntos");
    expect(s.fase).toBe("fin");
    expect(Math.max(...s.score)).toBeGreaterThanOrEqual(150);
    expect(s.ganadores).toHaveLength(1);
  });

  it("si se acaban las letras termina igual (empate compartido posible)", () => {
    const pocas = ALFABETO.filter((l) => l !== "A" && l !== "B");
    const s = playTuttiBotGame({ excluidas: pocas, fin: { tipo: "rondas", rondas: 10 } }, [3, 3], "letras");
    expect(s.history).toHaveLength(2);
    expect(s.ganadores!.length).toBeGreaterThanOrEqual(1);
  });

  it("simulación: 300 partidas con invariantes de puntaje", () => {
    for (let i = 0; i < 300; i++) {
      const n = 2 + (i % 5);
      const skills = Array.from({ length: n }, (_, k) => 1 + ((i + k * 3) % 10));
      const s = playTuttiBotGame({ votacion: i % 3 === 0 }, skills, `sim-${i}`, [i, i * 7, 3, 9]);
      expect(s.fase).toBe("fin");
      const sumas = s.players.map((_, p) => s.history.reduce((a, h) => a + h.total[p]!, 0));
      expect(sumas).toEqual(s.score);
      for (const h of s.history) {
        h.puntos.forEach((ps) => ps.forEach((x) => expect([0, 5, 10, 20]).toContain(x)));
        h.respuestas.forEach((rs, p) => rs.forEach((r, c) => {
          if (h.puntos[p]![c]! > 0) expect(normalizar(r)[0]!.toUpperCase()).toBe(h.letra);
        }));
      }
    }
  }, 120_000);

  it("los niveles altos le ganan a los bajos", () => {
    let gana = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const s = playTuttiBotGame({}, i % 2 ? [10, 1] : [1, 10], `fuerza-${i}`, [i, 5, 7, 11]);
      const alto = i % 2 ? 0 : 1;
      if (s.ganadores!.length === 1 && s.ganadores![0] === alto) gana++;
    }
    expect(gana / N).toBeGreaterThan(0.8);
  }, 60_000);
});
