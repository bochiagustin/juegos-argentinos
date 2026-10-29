import type { ClienteMsg, SalaInfo, ServidorMsg } from "@juegos-argentinos/server/protocolo";

/** Lo último que mandó el servidor sobre la partida, con cuándo llegó (para los relojes). */
export type JuegoMsg = Extract<ServidorMsg, { t: "juego" }> & { recibido: number };
export interface Lote {
  n: number;
  events: unknown[];
}
export interface Burbuja {
  id: number;
  seat: number;
  tipo: "chat" | "reaccion" | "sena";
  texto: string;
  equipo: boolean;
}

export type EstadoConexion = "conectando" | "conectada" | "reconectando" | "sin-servidor";

export interface SnapshotSala {
  conexion: EstadoConexion;
  sala: SalaInfo | null;
  juego: JuegoMsg | null;
  /** Los últimos lotes de eventos (cada mensaje de juego con eventos es un lote; se numeran para no perder ninguno). */
  lotes: Lote[];
  mensajes: Burbuja[];
  error: { id: number; texto: string } | null;
}

const KEY_TOKEN = "juegos-argentinos:online-token";
const KEY_SERVIDOR = "juegos-argentinos:servidor-salas";

/** Identidad sin registro: un token secreto por dispositivo (con él se recupera el lugar al reconectar). */
export function miToken(): string {
  try {
    let t = localStorage.getItem(KEY_TOKEN);
    if (!t) {
      t = crypto.randomUUID().replace(/-/g, "");
      localStorage.setItem(KEY_TOKEN, t);
    }
    return t;
  } catch {
    return (window as unknown as { __token?: string }).__token ??= crypto.randomUUID().replace(/-/g, "");
  }
}

/** URL del servidor de salas: la de Ajustes, la del build, o en la red local el de desarrollo. */
export function servidorSalas(): string | null {
  try {
    const propio = localStorage.getItem(KEY_SERVIDOR);
    if (propio) return propio;
  } catch {
    // sin storage
  }
  if (import.meta.env.VITE_SERVIDOR_SALAS) return import.meta.env.VITE_SERVIDOR_SALAS;
  const h = location.hostname;
  if (h === "localhost" || h === "127.0.0.1" || /^(192\.168|10)\./.test(h)) return `ws://${h}:8787`;
  return null;
}

export function guardarServidor(url: string) {
  try {
    if (url.trim()) localStorage.setItem(KEY_SERVIDOR, url.trim().replace(/\/+$/, ""));
    else localStorage.removeItem(KEY_SERVIDOR);
  } catch {
    // nada
  }
}

export function codigoNuevo(): string {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const b = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(b, (x) => letras[x % letras.length]).join("");
}

/**
 * Conexión a una sala. Reconecta sola (con espera creciente) y se vuelve a presentar con el mismo token,
 * así el servidor le devuelve su asiento y su vista.
 */
export class ConexionSala {
  private ws: WebSocket | null = null;
  private listeners = new Set<() => void>();
  private snap: SnapshotSala;
  private intentos = 0;
  private cerrada = false;
  private loteN = 0;
  private burbujaN = 0;
  private reintento: number | null = null;
  private ping: number | null = null;

  constructor(
    private codigo: string,
    private perfil: { apodo: string; avatar: string },
    private onPrimeraSala?: (s: SalaInfo, enviar: (m: ClienteMsg) => void) => void,
  ) {
    const url = servidorSalas();
    this.snap = { conexion: url ? "conectando" : "sin-servidor", sala: null, juego: null, lotes: [], mensajes: [], error: null };
    if (url) this.abrir(url);
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = () => this.snap;

  private set(parcial: Partial<SnapshotSala>) {
    this.snap = { ...this.snap, ...parcial };
    for (const l of this.listeners) l();
  }

  private abrir(base: string) {
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${base}/parties/sala/${this.codigo}`);
    } catch {
      this.set({ conexion: "sin-servidor" });
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.intentos = 0;
      this.set({ conexion: "conectada" });
      this.enviar({ t: "hola", token: miToken(), apodo: this.perfil.apodo, avatar: this.perfil.avatar });
      this.ping = window.setInterval(() => this.enviar({ t: "ping" }), 25_000);
    };
    ws.onmessage = (e) => {
      let m: ServidorMsg;
      try {
        m = JSON.parse(String(e.data)) as ServidorMsg;
      } catch {
        return;
      }
      this.recibir(m);
    };
    ws.onclose = () => {
      if (this.ping !== null) clearInterval(this.ping);
      this.ws = null;
      if (this.cerrada) return;
      this.intentos++;
      this.set({ conexion: "reconectando" });
      const espera = Math.min(15_000, 500 * 2 ** Math.min(this.intentos, 5));
      this.reintento = window.setTimeout(() => this.abrir(base), espera);
    };
  }

  private recibir(m: ServidorMsg) {
    switch (m.t) {
      case "sala": {
        const primera = this.snap.sala === null;
        // Al volver al lobby se olvida la partida anterior.
        this.set({ sala: m.sala, ...(m.sala.estado === "lobby" ? { juego: null, lotes: [] } : {}) });
        if (primera) this.onPrimeraSala?.(m.sala, (x) => this.enviar(x));
        break;
      }
      case "juego": {
        const juego: JuegoMsg = { ...m, recibido: Date.now() };
        const lotes = m.events.length ? [...this.snap.lotes, { n: ++this.loteN, events: m.events }].slice(-30) : this.snap.lotes;
        this.set({ juego, lotes });
        break;
      }
      case "chat":
      case "reaccion":
      case "sena": {
        const texto = m.t === "chat" ? m.texto : m.t === "reaccion" ? m.emoji : m.sena;
        const b: Burbuja = { id: ++this.burbujaN, seat: m.seat, tipo: m.t, texto, equipo: m.t === "chat" ? m.equipo : m.t === "sena" };
        this.set({ mensajes: [...this.snap.mensajes, b].slice(-80) });
        break;
      }
      case "error":
        this.set({ error: { id: ++this.burbujaN, texto: m.mensaje } });
        break;
      case "pong":
        break;
    }
  }

  enviar(m: ClienteMsg) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  cerrar() {
    this.cerrada = true;
    if (this.reintento !== null) clearTimeout(this.reintento);
    if (this.ping !== null) clearInterval(this.ping);
    this.ws?.close();
  }
}
