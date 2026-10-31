import type { GameId } from "@juegos-argentinos/engine";
import { describe, expect, it } from "vitest";
import type { ClienteMsg, ServidorMsg } from "./protocolo.ts";
import { Sala, type Reloj } from "./sala.ts";

/** Reloj falso: el tiempo avanza solo cuando el test lo pide. */
function relojFalso() {
  let t = 1_000_000;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const reloj: Reloj = {
    now: () => t,
    setTimeout: (fn, ms) => {
      const id = ++seq;
      timers.set(id, { at: t + ms, fn });
      return id;
    },
    clearTimeout: (h) => void timers.delete(h as number),
  };
  const avanzar = (ms: number) => {
    const fin = t + ms;
    for (;;) {
      const prox = [...timers.entries()].sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!prox || prox[1].at > fin) break;
      timers.delete(prox[0]);
      t = prox[1].at;
      prox[1].fn();
    }
    t = fin;
  };
  return { reloj, avanzar, pendientes: () => timers.size };
}

function armar() {
  const r = relojFalso();
  const buzones = new Map<string, ServidorMsg[]>();
  const cerradas: string[] = [];
  const sala = new Sala("ABCDE", r.reloj, (c, d) => buzones.get(c)?.push(JSON.parse(d) as ServidorMsg), (c) => cerradas.push(c));
  const cliente = (conn: string, apodo = conn) => {
    buzones.set(conn, []);
    sala.conectar(conn);
    const decir = (m: ClienteMsg) => sala.mensaje(conn, JSON.stringify(m));
    decir({ t: "hola", token: `token-de-${apodo}-1234567890`, apodo, avatar: "🧉" });
    return {
      decir,
      msgs: () => buzones.get(conn)!,
      ultima: <T extends ServidorMsg["t"]>(t: T) => buzones.get(conn)!.filter((m): m is Extract<ServidorMsg, { t: T }> => m.t === t).at(-1),
    };
  };
  return { sala, cliente, ...r, cerradas };
}

describe("lobby", () => {
  it("el primero es el host; solo el host cambia el juego, agrega bots y empieza", () => {
    const { cliente } = armar();
    const a = cliente("a");
    const b = cliente("b");
    expect(a.ultima("sala")!.sala.soyHost).toBe(true);
    expect(b.ultima("sala")!.sala.soyHost).toBe(false);
    b.decir({ t: "juego", game: "escoba" });
    expect(a.ultima("sala")!.sala.game).toBe("truco");
    a.decir({ t: "juego", game: "escoba" });
    expect(b.ultima("sala")!.sala.game).toBe("escoba");
    b.decir({ t: "bot", skill: 5 });
    expect(a.ultima("sala")!.sala.jugadores).toHaveLength(2);
    a.decir({ t: "bot", skill: 99 });
    const j = a.ultima("sala")!.sala.jugadores;
    expect(j).toHaveLength(3);
    expect(j[2]).toMatchObject({ bot: true, skill: 10 });
  });

  it("la config que manda el host se sanea", () => {
    const { cliente } = armar();
    const a = cliente("a");
    a.decir({ t: "config", config: { target: 99, flor: "sí", faltaEnvido: "partido", hack: true } });
    expect(a.ultima("sala")!.sala.config).toEqual({ players: 6, target: 30, flor: false, mazoSumaEnvido: true, faltaEnvido: "partido" });
  });

  it("no empieza con una cantidad que el juego no admite", () => {
    const { cliente } = armar();
    const a = cliente("a");
    a.decir({ t: "bot", skill: 3 });
    a.decir({ t: "bot", skill: 3 });
    a.decir({ t: "empezar" });
    expect(a.ultima("error")!.mensaje).toMatch(/2, 4, 6/);
    expect(a.ultima("sala")!.sala.estado).toBe("lobby");
  });

  it("si se va el host, pasa a otro; en el lobby el que se va libera el lugar", () => {
    const { sala, cliente } = armar();
    cliente("a");
    const b = cliente("b");
    sala.desconectar("a");
    expect(b.ultima("sala")!.sala.soyHost).toBe(true);
    expect(b.ultima("sala")!.sala.jugadores).toHaveLength(1);
  });
});

describe("partida", () => {
  it("cada uno ve solo su mano y el servidor rechaza acciones inválidas", () => {
    const { cliente } = armar();
    const a = cliente("a");
    const b = cliente("b");
    a.decir({ t: "empezar" });
    const va = a.ultima("juego")!;
    const vb = b.ultima("juego")!;
    const manoA = (va.view as { hand: { id: string }[] }).hand.map((c) => c.id);
    const manoB = (vb.view as { hand: { id: string }[] }).hand.map((c) => c.id);
    expect(manoA).toHaveLength(3);
    for (const id of manoB) expect(JSON.stringify(va)).not.toContain(`"${id}"`);
    // Juega el que no es mano: error.
    const turno = (va.view as { turn: number }).turn;
    const otro = turno === 0 ? b : a;
    otro.decir({ t: "accion", action: { type: "jugar", card: "1-espada" } });
    expect(otro.ultima("error")).toBeDefined();
    const yo = turno === 0 ? a : b;
    const accion = yo.ultima("juego")!.valid.find((x) => (x as { type: string }).type === "jugar");
    yo.decir({ t: "accion", action: accion });
    expect(yo.ultima("juego")!.events.length).toBeGreaterThan(0);
  });

  const juegos: [GameId, number][] = [
    ["truco", 4],
    ["chinchon", 3],
    ["casita-robada", 4],
    ["escoba", 3],
    ["tutti-frutti", 3],
    ["generala", 3],
  ];
  for (const [game, n] of juegos) {
    it(`${game}: con un humano que no juega y bots, la partida termina sola (reloj de turno)`, () => {
      const { sala, cliente, avanzar } = armar();
      const a = cliente("a");
      a.decir({ t: "juego", game });
      a.decir({ t: "turno", segundos: 20 });
      for (let i = 1; i < n; i++) a.decir({ t: "bot", skill: 6 });
      a.decir({ t: "empezar" });
      expect(sala.estado).toBe("jugando");
      for (let i = 0; i < 3000 && sala.estado === "jugando"; i++) avanzar(5_000);
      expect(sala.estado).toBe("fin");
      expect(a.ultima("juego")!.terminado).toBe(true);
    }, 60_000);
  }

  it("reconexión: con el mismo token recupera el asiento y la vista", () => {
    const { sala, cliente } = armar();
    const a = cliente("a");
    const b = cliente("b");
    a.decir({ t: "empezar" });
    sala.desconectar("a");
    expect(b.ultima("sala")!.sala.jugadores[0]!.conectado).toBe(false);
    const a2 = cliente("a2", "a");
    expect(a2.ultima("sala")!.sala.tuSeat).toBe(0);
    expect(a2.ultima("juego")).toBeDefined();
    expect(b.ultima("sala")!.sala.jugadores[0]!.conectado).toBe(true);
  });

  it("en una partida empezada no entra nadie nuevo", () => {
    const { cliente } = armar();
    const a = cliente("a");
    cliente("b");
    a.decir({ t: "empezar" });
    const c = cliente("c");
    expect(c.ultima("error")!.mensaje).toMatch(/ya empezó/);
  });

  it("señas y chat de equipo: solo los compañeros", () => {
    const { cliente } = armar();
    const [a, b, c, d] = ["a", "b", "c", "d"].map((x) => cliente(x));
    a!.decir({ t: "empezar" });
    a!.decir({ t: "sena", sena: "ancho-espada" });
    expect(c!.ultima("sena")).toMatchObject({ seat: 0, sena: "ancho-espada" });
    expect(b!.ultima("sena")).toBeUndefined();
    expect(d!.ultima("sena")).toBeUndefined();
    b!.decir({ t: "chat", texto: "vamos al mazo", equipo: true });
    expect(d!.ultima("chat")).toMatchObject({ texto: "vamos al mazo", equipo: true });
    expect(a!.ultima("chat")).toBeUndefined();
    a!.decir({ t: "chat", texto: "¡buena!" });
    expect(d!.ultima("chat")!.texto).toBe("¡buena!");
  });

  it("revancha: cuando todos la piden, arranca otra con la misma mesa", () => {
    const { sala, cliente, avanzar } = armar();
    const a = cliente("a");
    const b = cliente("b");
    a.decir({ t: "juego", game: "escoba" });
    a.decir({ t: "empezar" });
    for (let i = 0; i < 3000 && sala.estado === "jugando"; i++) avanzar(60_000);
    expect(sala.estado).toBe("fin");
    a.decir({ t: "revancha" });
    expect(sala.estado).toBe("fin");
    expect(b.ultima("sala")!.sala.jugadores[0]!.revancha).toBe(true);
    b.decir({ t: "revancha" });
    expect(sala.estado).toBe("jugando");
  }, 60_000);

  it("ignora basura sin romperse", () => {
    const { sala, cliente } = armar();
    const a = cliente("a");
    sala.mensaje("a", "{no es json");
    sala.mensaje("a", JSON.stringify({ t: "accion", action: null }));
    sala.mensaje("a", "x".repeat(20_000));
    a.decir({ t: "chat", texto: "" });
    expect(a.ultima("error")!.mensaje).toBe("Mensaje inválido");
  });
});
