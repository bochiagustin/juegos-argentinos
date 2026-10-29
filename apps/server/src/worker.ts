/**
 * Producción: cada sala es un Durable Object de Cloudflare (PartyServer).
 * La app se conecta a wss://<host>/parties/sala/<CODIGO>.
 */
import { routePartykitRequest, Server, type Connection } from "partyserver";
import { esCodigo } from "./protocolo.ts";
import { Sala, type Reloj } from "./sala.ts";

interface Env {
  Sala: DurableObjectNamespace;
}

const reloj: Reloj = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as number),
};

export class SalaServer extends Server<Env> {
  // Sin hibernación: los relojes de la partida (turnos, bots) viven en memoria mientras hay gente conectada.
  static override options = { hibernate: false };
  private sala: Sala | null = null;

  private get s(): Sala {
    this.sala ??= new Sala(
      this.name,
      reloj,
      (id, data) => this.getConnection(id)?.send(data),
      (id) => this.getConnection(id)?.close(4000, "Reemplazada"),
    );
    return this.sala;
  }

  override onConnect(conn: Connection) {
    this.s.conectar(conn.id);
  }

  override onMessage(conn: Connection, message: string | ArrayBuffer | ArrayBufferView) {
    if (typeof message === "string") this.s.mensaje(conn.id, message);
  }

  override onClose(conn: Connection) {
    this.s.desconectar(conn.id);
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const codigo = url.pathname.split("/")[3] ?? "";
    if (url.pathname.startsWith("/parties/") && !esCodigo(codigo)) return new Response("Código de sala inválido", { status: 400 });
    if (url.pathname === "/") return new Response("Juegos Argentinos: servidor de salas", { headers: { "content-type": "text/plain; charset=utf-8" } });
    return (await routePartykitRequest(req, env as unknown as Record<string, unknown>)) ?? new Response("No encontrado", { status: 404 });
  },
};
