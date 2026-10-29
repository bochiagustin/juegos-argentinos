/**
 * Una sala online: lobby, partida, bots, relojes, chat, señas y revancha.
 * No sabe nada de la red: recibe mensajes de conexiones (`mensaje`) y manda texto con `enviar`.
 * Así la misma lógica corre en un Durable Object de Cloudflare (producción) y en Node (desarrollo y tests).
 */
import { createRng, nextInt, randomSeed, type GameId, type RngState } from "@juegos-argentinos/engine";
import { MESA, planTutti, puedeBasta, votosTutti, type TuttiState } from "@juegos-argentinos/engine/tutti-frutti";
import { JUEGOS, type JuegoOnline } from "./juegos.ts";
import { JUEGOS_ONLINE, REACCIONES, SENAS, type ClienteMsg, type JugadorSala, type RelojTurno, type RelojTutti, type SalaInfo, type ServidorMsg } from "./protocolo.ts";

export interface Reloj {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

interface Participante {
  uid: string;
  token: string | null;
  apodo: string;
  avatar: string;
  bot: boolean;
  skill: number;
  conn: string | null;
  revancha: boolean;
}

interface Partida {
  game: GameId;
  config: unknown;
  ids: string[];
  state: unknown;
}

export const MAX_JUGADORES = 10;
export const RULETA_MS = 2200;
const MAX_MENSAJE = 8_000;
const NOMBRES_BOTS: [string, string][] = [
  ["Coco", "🧔"],
  ["Doña Elsa", "👵"],
  ["Pocho", "🤠"],
  ["Ñato", "🎣"],
  ["Mirta", "👩‍🦳"],
  ["Benja", "🎸"],
  ["Rosita", "🍇"],
  ["Don Aníbal", "🍷"],
  ["El Polaco", "🎩"],
  ["Nahuel", "🐑"],
];

const limpiar = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[\u0000-\u001f]/g, "").trim().slice(0, max) : "");

export class Sala {
  readonly codigo: string;
  estado: "lobby" | "jugando" | "fin" = "lobby";
  game: GameId = "truco";
  configs: Partial<Record<GameId, unknown>> = {};
  participantes: Participante[] = [];
  segundosPorTurno = 45;
  partida: Partida | null = null;
  /** Conexión → participante (o null mientras no dijo "hola"). */
  private conexiones = new Map<string, { uid: string | null; ventana: number; mensajes: number }>();
  private hostUid: string | null = null;
  private rng: RngState;
  private uidSeq = 0;
  private timers = new Set<unknown>();
  private tuttiTimers = new Set<unknown>();
  private pausaHasta = 0;
  private turno: { seat: number; at: number } | null = null;
  private tutti: { marca: string; escribirAt: number; cierreAt: number | null } = { marca: "", escribirAt: 0, cierreAt: null };
  private ultimoEnviado = new Map<string, string>();

  constructor(
    codigo: string,
    private reloj: Reloj,
    private enviarRaw: (conn: string, data: string) => void,
    private cerrarConn: (conn: string) => void = () => {},
  ) {
    this.codigo = codigo;
    this.rng = createRng(`${codigo}-${randomSeed()}`);
  }

  get juego(): JuegoOnline {
    return JUEGOS[this.game];
  }

  // ───────────────────────────── conexiones ─────────────────────────────

  conectar(conn: string) {
    this.conexiones.set(conn, { uid: null, ventana: this.reloj.now(), mensajes: 0 });
  }

  desconectar(conn: string) {
    const c = this.conexiones.get(conn);
    this.conexiones.delete(conn);
    this.ultimoEnviado.delete(conn);
    const p = c?.uid ? this.porUid(c.uid) : null;
    if (!p || p.conn !== conn) return;
    p.conn = null;
    if (this.estado === "lobby" && !p.bot) {
      // En el lobby, el que se va libera el lugar.
      this.participantes = this.participantes.filter((x) => x !== p);
    }
    this.reasignarHost();
    this.enviarSala();
    if (this.estado === "jugando") this.programar();
  }

  mensaje(conn: string, raw: string) {
    const c = this.conexiones.get(conn);
    if (!c) return;
    // Límite simple: 40 mensajes por segundo por conexión (el tutti-frutti manda cada tecla).
    const ahora = this.reloj.now();
    if (ahora - c.ventana > 1000) {
      c.ventana = ahora;
      c.mensajes = 0;
    }
    if (++c.mensajes > 40 || raw.length > MAX_MENSAJE) return;
    let msg: ClienteMsg;
    try {
      msg = JSON.parse(raw) as ClienteMsg;
    } catch {
      return this.enviar(conn, { t: "error", mensaje: "Mensaje inválido" });
    }
    if (!msg || typeof msg !== "object" || typeof msg.t !== "string") return;
    if (msg.t === "ping") return this.enviar(conn, { t: "pong" });
    if (msg.t === "hola") return this.hola(conn, msg);
    const p = c.uid ? this.porUid(c.uid) : null;
    if (!p) return this.enviar(conn, { t: "error", mensaje: "Primero tenés que entrar a la sala" });
    const seat = this.participantes.indexOf(p);
    const host = p.uid === this.hostUid;
    switch (msg.t) {
      case "juego":
        if (!host || this.estado !== "lobby" || !JUEGOS_ONLINE.includes(msg.game)) return;
        this.game = msg.game;
        return this.enviarSala();
      case "config":
        if (!host || this.estado !== "lobby") return;
        // Se guarda saneada para el máximo de jugadores (así no se pierde, ej., "parejas"); al empezar se vuelve a sanear.
        this.configs[this.game] = this.juego.sanear(msg.config, this.juego.cantidades.at(-1)!);
        return this.enviarSala();
      case "turno":
        if (!host || this.estado !== "lobby") return;
        this.segundosPorTurno = [20, 30, 45, 60, 90].includes(msg.segundos) ? msg.segundos : this.segundosPorTurno;
        return this.enviarSala();
      case "bot": {
        if (!host || this.estado !== "lobby" || this.participantes.length >= MAX_JUGADORES) return;
        const usados = new Set(this.participantes.map((x) => x.apodo));
        const [apodo, avatar] = NOMBRES_BOTS.find(([n]) => !usados.has(n)) ?? ["Bot", "🤖"];
        const skill = Number.isInteger(msg.skill) ? Math.min(10, Math.max(1, msg.skill)) : 5;
        this.participantes.push({ uid: this.nuevoUid(), token: null, apodo, avatar, bot: true, skill, conn: null, revancha: true });
        return this.enviarSala();
      }
      case "sacar": {
        if (!host || this.estado !== "lobby") return;
        const x = this.participantes[msg.seat];
        if (!x || x === p) return;
        this.participantes.splice(msg.seat, 1);
        if (x.conn) {
          this.enviar(x.conn, { t: "error", mensaje: "El que armó la sala te sacó" });
          this.cerrarConn(x.conn);
        }
        return this.enviarSala();
      }
      case "mover": {
        if (!host || this.estado !== "lobby") return;
        const { seat: a, a: b } = msg;
        if (!this.participantes[a] || !this.participantes[b]) return;
        [this.participantes[a], this.participantes[b]] = [this.participantes[b]!, this.participantes[a]!];
        return this.enviarSala();
      }
      case "empezar":
        if (!host || this.estado !== "lobby") return;
        return this.empezar(conn);
      case "accion":
        return this.accionDe(conn, seat, msg.action);
      case "chat": {
        const texto = limpiar(msg.texto, 200);
        if (!texto) return;
        const equipo = !!msg.equipo && this.estado !== "lobby" && this.tieneEquipos();
        return this.aEquipo(seat, equipo, { t: "chat", seat, texto, equipo });
      }
      case "reaccion":
        if (!(REACCIONES as readonly string[]).includes(msg.emoji)) return;
        return this.aTodos({ t: "reaccion", seat, emoji: msg.emoji });
      case "sena":
        // Señas: solo en el truco de a 4 o 6, y solo las ve el compañero.
        if (this.estado !== "jugando" || this.partida?.game !== "truco" || this.participantes.length < 4 || !(SENAS as readonly string[]).includes(msg.sena)) return;
        return this.aEquipo(seat, true, { t: "sena", seat, sena: msg.sena });
      case "revancha":
        if (this.estado !== "fin") return;
        p.revancha = true;
        if (this.participantes.every((x) => x.bot || x.revancha || !x.conn)) return this.empezar(conn);
        return this.enviarSala();
      case "a-la-sala":
        if (!host || this.estado !== "fin") return;
        this.limpiarTimers();
        this.estado = "lobby";
        this.partida = null;
        // Los que se fueron durante la partida liberan el lugar.
        this.participantes = this.participantes.filter((x) => x.bot || x.conn);
        return this.enviarSala();
    }
  }

  // ───────────────────────────── lobby ─────────────────────────────

  private hola(conn: string, msg: Extract<ClienteMsg, { t: "hola" }>) {
    const token = limpiar(msg.token, 64);
    if (token.length < 16) return this.enviar(conn, { t: "error", mensaje: "Falta tu identificación" });
    const apodo = limpiar(msg.apodo, 16) || "Sin nombre";
    const avatar = limpiar(msg.avatar, 8) || "🧉";
    let p = this.participantes.find((x) => x.token === token);
    if (p) {
      // Reconexión: la conexión vieja (si quedó) se cierra.
      if (p.conn && p.conn !== conn) this.cerrarConn(p.conn);
      p.conn = conn;
      p.apodo = apodo;
      p.avatar = avatar;
    } else {
      if (this.estado !== "lobby") return this.enviar(conn, { t: "error", mensaje: "La partida ya empezó: esperá la próxima" });
      if (this.participantes.length >= MAX_JUGADORES) return this.enviar(conn, { t: "error", mensaje: "La sala está llena" });
      p = { uid: this.nuevoUid(), token, apodo, avatar, bot: false, skill: 0, conn, revancha: false };
      this.participantes.push(p);
    }
    this.conexiones.get(conn)!.uid = p.uid;
    this.reasignarHost();
    this.enviarSala();
    if (this.partida) this.enviarJuegoA(conn, [], true);
  }

  private empezar(conn: string) {
    const n = this.participantes.length;
    if (!this.juego.cantidades.includes(n)) {
      return this.enviar(conn, { t: "error", mensaje: `Para este juego hacen falta ${this.juego.cantidades.join(", ")} jugadores (agregá bots si faltan)` });
    }
    const config = this.juego.sanear(this.configs[this.game] ?? this.juego.defaultConfig, n);
    const ids = this.participantes.map((_, i) => `s${i}`);
    let state: unknown;
    try {
      state = this.juego.def.initialState(config, ids, randomSeed());
    } catch (e) {
      return this.enviar(conn, { t: "error", mensaje: `No se pudo empezar: ${(e as Error).message}` });
    }
    this.limpiarTimers();
    this.partida = { game: this.game, config, ids, state };
    this.estado = "jugando";
    this.pausaHasta = 0;
    this.tutti = { marca: "", escribirAt: 0, cierreAt: null };
    for (const p of this.participantes) p.revancha = p.bot;
    this.enviarSala();
    this.programar();
    this.enviarJuego([], true);
  }

  private reasignarHost() {
    const actual = this.hostUid ? this.porUid(this.hostUid) : null;
    if (actual && actual.conn) return;
    const nuevo = this.participantes.find((x) => !x.bot && x.conn);
    this.hostUid = nuevo?.uid ?? actual?.uid ?? null;
  }

  // ───────────────────────────── partida ─────────────────────────────

  private accionDe(conn: string, seat: number, action: unknown) {
    if (this.estado !== "jugando" || !this.partida) return;
    const err = this.aplicar(this.partida.ids[seat]!, action);
    if (err) this.enviar(conn, { t: "error", mensaje: err });
  }

  /** Aplica una acción validada por el motor. Devuelve el error, si hubo. */
  private aplicar(id: string, action: unknown): string | null {
    const pa = this.partida;
    if (!pa || this.estado !== "jugando") return "No hay partida";
    if (!action || typeof action !== "object") return "Acción inválida";
    const res = this.juego.def.applyAction(pa.state, id, action);
    if (!res.ok) return res.error;
    pa.state = res.state;
    const ahora = this.reloj.now();
    for (const e of res.events as { type: string }[]) {
      const ms = this.juego.pausas[e.type];
      if (ms) this.pausaHasta = Math.max(this.pausaHasta, ahora + ms);
    }
    if (this.juego.def.isGameOver(pa.state)) {
      this.estado = "fin";
      this.limpiarTimers();
      this.turno = null;
      this.enviarJuego(res.events, true);
      this.enviarSala();
      return null;
    }
    this.programar();
    this.enviarJuego(res.events, res.events.length > 0);
    return null;
  }

  /** Bots y relojes según el estado de la partida. */
  private programar() {
    const pa = this.partida;
    if (!pa || this.estado !== "jugando") return;
    if (this.game === "tutti-frutti") return this.programarTutti(pa);
    this.limpiarTimers();
    const seat = this.juego.actor!(pa.state);
    this.turno = null;
    if (seat === null) return;
    const p = this.participantes[seat]!;
    const desde = Math.max(this.reloj.now(), this.pausaHasta);
    if (p.bot) {
      const pensar = 800 + this.azar(700);
      this.despues(desde + pensar, () => this.jugarBot(seat, p.skill));
    } else {
      // Si se desconectó, se le da menos tiempo; al vencer, juega la máquina por él.
      const at = desde + (p.conn ? this.segundosPorTurno : 12) * 1000;
      this.turno = { seat, at };
      this.despues(at, () => this.jugarBot(seat, 3));
    }
  }

  private jugarBot(seat: number, skill: number) {
    const pa = this.partida;
    if (!pa || !this.juego.choose) return;
    const id = pa.ids[seat]!;
    const valid = this.juego.def.getValidActions(pa.state, id);
    if (valid.length === 0) return;
    const [action, rng] = this.juego.choose(this.juego.def.getPlayerView(pa.state, id), valid, this.rng, skill);
    this.rng = rng;
    this.aplicar(id, action);
  }

  private programarTutti(pa: Partida) {
    const s = pa.state as TuttiState;
    const ahora = this.reloj.now();
    const marca = `${s.ronda}-${s.fase}`;
    if (marca === this.tutti.marca) return;
    this.tutti.marca = marca;
    if (s.fase === "escribiendo") {
      this.limpiarTimers(true);
      const escribirAt = Math.max(ahora, this.pausaHasta) + RULETA_MS;
      const cierreAt = escribirAt + s.config.tiempoMaximo * 1000;
      this.tutti = { marca, escribirAt, cierreAt };
      pa.ids.forEach((id, seat) => {
        const p = this.participantes[seat]!;
        if (!p.bot) return;
        const [plan, rng] = planTutti(this.juego.def.getPlayerView(s, id), this.rng, p.skill);
        this.rng = rng;
        for (const paso of plan.pasos) {
          this.despues(escribirAt + paso.ms, () => {
            const st = this.partida?.state as TuttiState | undefined;
            if (!st || st.ronda !== s.ronda || (st.fase !== "escribiendo" && st.fase !== "basta")) return;
            this.aplicar(id, { type: "escribir", categoria: paso.categoria, texto: plan.respuestas[paso.categoria]! });
            if (puedeBasta(this.partida!.state as TuttiState, seat)) this.aplicar(id, { type: "basta" });
          }, true);
        }
      });
      this.despues(cierreAt, () => this.aplicar(MESA, { type: "cerrar" }));
    } else if (s.fase === "basta") {
      const cierreAt = ahora + s.config.cuentaRegresiva * 1000;
      this.tutti.cierreAt = cierreAt;
      // Los bots siguen escribiendo durante la cuenta regresiva: solo se reemplaza el cierre.
      this.limpiarTimers(false);
      this.despues(cierreAt, () => this.aplicar(MESA, { type: "cerrar" }));
    } else if (s.fase === "revision") {
      this.limpiarTimers(true);
      this.tutti.cierreAt = null;
      this.despues(ahora + 1500, () => {
        pa.ids.forEach((id, seat) => {
          const p = this.participantes[seat]!;
          if (!p.bot || (this.partida?.state as TuttiState).fase !== "revision") return;
          const st = this.partida!.state;
          const [votos, rng] = votosTutti(this.juego.def.getPlayerView(st, id), this.juego.def.getValidActions(st, id), this.rng, p.skill);
          this.rng = rng;
          for (const v of votos) this.aplicar(id, v);
        });
      });
      this.despues(ahora + 60_000, () => this.aplicar(MESA, { type: "seguir" }));
    } else if (s.fase === "resultado") {
      this.limpiarTimers(true);
      this.tutti.cierreAt = null;
      this.despues(ahora + 300, () => {
        pa.ids.forEach((id, seat) => {
          if (this.participantes[seat]!.bot && (this.partida?.state as TuttiState).fase === "resultado") this.aplicar(id, { type: "listo" });
        });
      });
      // Si alguien no aprieta "siguiente", la ronda arranca igual.
      this.despues(ahora + 45_000, () => this.aplicar(MESA, { type: "seguir" }));
    }
  }

  // ───────────────────────────── envíos ─────────────────────────────

  private relojes(): { turno: RelojTurno | null; tutti: RelojTutti | null } {
    const ahora = this.reloj.now();
    const turno = this.turno ? { seat: this.turno.seat, restanteMs: Math.max(0, this.turno.at - ahora) } : null;
    const tutti =
      this.partida?.game === "tutti-frutti" && this.estado === "jugando"
        ? { escribirEnMs: Math.max(0, this.tutti.escribirAt - ahora), cierreEnMs: this.tutti.cierreAt === null ? null : Math.max(0, this.tutti.cierreAt - ahora) }
        : null;
    return { turno, tutti };
  }

  private mensajeJuego(seat: number, events: readonly unknown[]): ServidorMsg | null {
    const pa = this.partida;
    if (!pa) return null;
    const id = pa.ids[seat]!;
    const def = JUEGOS[pa.game].def;
    return {
      t: "juego",
      game: pa.game,
      view: def.getPlayerView(pa.state, id),
      valid: this.estado === "jugando" ? def.getValidActions(pa.state, id) : [],
      events: [...events],
      ...this.relojes(),
      terminado: def.isGameOver(pa.state),
    };
  }

  private enviarJuegoA(conn: string, events: readonly unknown[], forzar: boolean) {
    const c = this.conexiones.get(conn);
    const p = c?.uid ? this.porUid(c.uid) : null;
    if (!p) return;
    const msg = this.mensajeJuego(this.participantes.indexOf(p), events);
    if (!msg || msg.t !== "juego") return;
    // Sin eventos y con la misma vista no hace falta mandar nada (ej. cada tecla del tutti-frutti).
    const clave = JSON.stringify([msg.view, msg.valid, msg.turno?.seat ?? null, msg.tutti?.cierreEnMs === null]);
    if (!forzar && this.ultimoEnviado.get(conn) === clave) return;
    this.ultimoEnviado.set(conn, clave);
    this.enviar(conn, msg);
  }

  private enviarJuego(events: readonly unknown[], forzar: boolean) {
    for (const p of this.participantes) if (p.conn) this.enviarJuegoA(p.conn, events, forzar);
  }

  info(seat: number): SalaInfo {
    const yo = this.participantes[seat];
    return {
      codigo: this.codigo,
      estado: this.estado,
      game: this.game,
      config: this.configs[this.game] ?? this.juego.defaultConfig,
      jugadores: this.participantes.map(
        (p, i): JugadorSala => ({
          seat: i,
          apodo: p.apodo,
          avatar: p.avatar,
          bot: p.bot,
          ...(p.bot ? { skill: p.skill } : {}),
          conectado: p.bot || p.conn !== null,
          host: p.uid === this.hostUid,
          revancha: p.revancha,
        }),
      ),
      tuSeat: yo ? seat : -1,
      soyHost: !!yo && yo.uid === this.hostUid,
      cantidades: this.juego.cantidades,
      segundosPorTurno: this.segundosPorTurno,
    };
  }

  private enviarSala() {
    this.participantes.forEach((p, i) => {
      if (p.conn) this.enviar(p.conn, { t: "sala", sala: this.info(i) });
    });
  }

  private tieneEquipos(): boolean {
    const pa = this.partida;
    if (!pa) return false;
    const eq = this.participantes.map((_, i) => JUEGOS[pa.game].equipo(pa.config, i));
    return new Set(eq).size < eq.length;
  }

  private aEquipo(seat: number, soloEquipo: boolean, msg: ServidorMsg) {
    const pa = this.partida;
    this.participantes.forEach((p, i) => {
      if (!p.conn) return;
      if (soloEquipo && pa && JUEGOS[pa.game].equipo(pa.config, i) !== JUEGOS[pa.game].equipo(pa.config, seat)) return;
      this.enviar(p.conn, msg);
    });
  }

  private aTodos(msg: ServidorMsg) {
    for (const p of this.participantes) if (p.conn) this.enviar(p.conn, msg);
  }

  private enviar(conn: string, msg: ServidorMsg) {
    this.enviarRaw(conn, JSON.stringify(msg));
  }

  // ───────────────────────────── utilidades ─────────────────────────────

  private porUid(uid: string) {
    return this.participantes.find((x) => x.uid === uid) ?? null;
  }

  private nuevoUid() {
    return `u${++this.uidSeq}`;
  }

  private azar(max: number) {
    const [n, rng] = nextInt(this.rng, max);
    this.rng = rng;
    return n;
  }

  private despues(at: number, fn: () => void, tutti = false) {
    const set = tutti ? this.tuttiTimers : this.timers;
    const h = this.reloj.setTimeout(
      () => {
        set.delete(h);
        fn();
      },
      Math.max(0, at - this.reloj.now()),
    );
    set.add(h);
  }

  private limpiarTimers(tambienTutti = true) {
    for (const h of this.timers) this.reloj.clearTimeout(h);
    this.timers.clear();
    if (tambienTutti) {
      for (const h of this.tuttiTimers) this.reloj.clearTimeout(h);
      this.tuttiTimers.clear();
    }
  }

  /** Para cerrar el objeto (tests). */
  destruir() {
    this.limpiarTimers();
  }
}
