/**
 * Producción: cada sala es un Durable Object de Cloudflare (PartyServer).
 * La app se conecta a wss://<host>/parties/sala/<CODIGO>.
 */
import { DurableObject } from "cloudflare:workers";
import { routePartykitRequest, Server, type Connection } from "partyserver";
import { esCodigo } from "./protocolo.ts";
import { acumular, claveReporte, CORS, MAX_GUARDADOS, ordenar, sanearReportes, type Acumulado } from "./reportes.ts";
import { Sala, type Reloj } from "./sala.ts";

interface Env {
  Sala: DurableObjectNamespace;
  Reportes: DurableObjectNamespace<ReportesServer>;
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

/** Un único Durable Object guarda las palabras reportadas del tutti-frutti (GET para leerlas, POST para sumar). */
export class ReportesServer extends DurableObject<Env> {
  async sumar(body: unknown): Promise<number> {
    const nuevos = sanearReportes(body);
    const ahora = Date.now();
    for (const r of nuevos) {
      const k = `r:${claveReporte(r)}`;
      const previo = await this.ctx.storage.get<Acumulado>(k);
      if (!previo && ((await this.ctx.storage.get<number>("total")) ?? 0) >= MAX_GUARDADOS) continue;
      await this.ctx.storage.put(k, acumular(previo, r, ahora));
      if (!previo) await this.ctx.storage.put("total", ((await this.ctx.storage.get<number>("total")) ?? 0) + 1);
    }
    return nuevos.length;
  }

  async listar(): Promise<Acumulado[]> {
    const todos = await this.ctx.storage.list<Acumulado>({ prefix: "r:" });
    return ordenar([...todos.values()]);
  }
}

async function reportes(req: Request, env: Env): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const stub = env.Reportes.get(env.Reportes.idFromName("reportes"));
  if (req.method === "POST") {
    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      return new Response("JSON inválido", { status: 400, headers: CORS });
    }
    const n = await stub.sumar(body);
    return Response.json({ ok: true, recibidos: n }, { headers: CORS });
  }
  if (req.method === "GET") return Response.json(await stub.listar(), { headers: CORS });
  return new Response("Método no permitido", { status: 405, headers: CORS });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/reportes") return reportes(req, env);
    const codigo = url.pathname.split("/")[3] ?? "";
    if (url.pathname.startsWith("/parties/") && !esCodigo(codigo)) return new Response("Código de sala inválido", { status: 400 });
    if (url.pathname === "/") return new Response("Juegos Argentinos: servidor de salas", { headers: { "content-type": "text/plain; charset=utf-8" } });
    return (await routePartykitRequest(req, env as unknown as Record<string, unknown>)) ?? new Response("No encontrado", { status: 404 });
  },
};
