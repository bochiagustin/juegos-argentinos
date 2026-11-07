/**
 * Producción: cada sala es un Durable Object de Cloudflare (PartyServer).
 * La app se conecta a wss://<host>/parties/sala/<CODIGO>.
 */
import { DurableObject } from "cloudflare:workers";
import { routePartykitRequest, Server, type Connection } from "partyserver";
import { esCodigo } from "./protocolo.ts";
import { copiaValida, CORS_NUBE, normalizarCodigoNube } from "./nube.ts";
import { acumular, claveReporte, CORS, MAX_GUARDADOS, ordenar, sanearReportes, type Acumulado } from "./reportes.ts";
import { Sala, type Reloj } from "./sala.ts";

interface Env {
  Sala: DurableObjectNamespace;
  Reportes: DurableObjectNamespace<ReportesServer>;
  Nube: DurableObjectNamespace<NubeServer>;
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

/** Un Durable Object por código de recuperación: guarda la última copia del progreso de ese jugador. */
export class NubeServer extends DurableObject<Env> {
  async leer(): Promise<{ copia: string; actualizado: number } | null> {
    const copia = await this.ctx.storage.get<string>("copia");
    return copia ? { copia, actualizado: (await this.ctx.storage.get<number>("actualizado")) ?? 0 } : null;
  }

  async guardar(copia: string): Promise<number> {
    const ahora = Date.now();
    await this.ctx.storage.put({ copia, actualizado: ahora });
    return ahora;
  }
}

async function nube(req: Request, env: Env, raw: string): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_NUBE });
  const codigo = normalizarCodigoNube(raw);
  if (!codigo) return new Response("Código inválido", { status: 400, headers: CORS_NUBE });
  const stub = env.Nube.get(env.Nube.idFromName(codigo));
  if (req.method === "GET") {
    const r = await stub.leer();
    return r ? Response.json({ ok: true, ...r }, { headers: CORS_NUBE }) : Response.json({ ok: false, error: "No hay nada guardado con ese código" }, { status: 404, headers: CORS_NUBE });
  }
  if (req.method === "PUT") {
    const texto = await req.text();
    if (!copiaValida(texto)) return new Response("Copia inválida", { status: 400, headers: CORS_NUBE });
    return Response.json({ ok: true, actualizado: await stub.guardar(texto) }, { headers: CORS_NUBE });
  }
  return new Response("Método no permitido", { status: 405, headers: CORS_NUBE });
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
    if (url.pathname.startsWith("/nube/")) return nube(req, env, url.pathname.slice(6));
    const codigo = url.pathname.split("/")[3] ?? "";
    if (url.pathname.startsWith("/parties/") && !esCodigo(codigo)) return new Response("Código de sala inválido", { status: 400 });
    if (url.pathname === "/") return new Response("Juegos Argentinos: servidor de salas", { headers: { "content-type": "text/plain; charset=utf-8" } });
    return (await routePartykitRequest(req, env as unknown as Record<string, unknown>)) ?? new Response("No encontrado", { status: 404 });
  },
};
