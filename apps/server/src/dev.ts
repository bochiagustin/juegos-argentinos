/**
 * Desarrollo (y cualquier hosting con Node): el mismo `Sala` detrás de un servidor `ws`.
 * Misma URL que en Cloudflare: ws://localhost:8787/parties/sala/<CODIGO>.
 *   pnpm --filter @juegos-argentinos/server dev
 */
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { esCodigo } from "./protocolo.ts";
import { acumular, claveReporte, CORS, MAX_GUARDADOS, ordenar, sanearReportes, type Acumulado } from "./reportes.ts";
import { Sala, type Reloj } from "./sala.ts";

const reloj: Reloj = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as NodeJS.Timeout),
};

const port = Number(process.env.PORT ?? 8787);
const salas = new Map<string, { sala: Sala; sockets: Map<string, WebSocket> }>();

/** Palabras reportadas del tutti-frutti (en memoria: se pierden al reiniciar el servidor de desarrollo). */
const reportados = new Map<string, Acumulado>();

const http = createServer((req, res) => {
  if ((req.url ?? "").split("?")[0] === "/reportes") {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS);
      res.end();
      return;
    }
    if (req.method === "GET") {
      res.writeHead(200, { ...CORS, "content-type": "application/json" });
      res.end(JSON.stringify(ordenar([...reportados.values()])));
      return;
    }
    let datos = "";
    req.on("data", (c: Buffer) => {
      if (datos.length < 50_000) datos += c.toString();
    });
    req.on("end", () => {
      let body: unknown = null;
      try {
        body = JSON.parse(datos);
      } catch {
        // queda en null: no se suma nada
      }
      const nuevos = sanearReportes(body);
      for (const r of nuevos) {
        const k = claveReporte(r);
        if (!reportados.has(k) && reportados.size >= MAX_GUARDADOS) continue;
        reportados.set(k, acumular(reportados.get(k), r, Date.now()));
      }
      res.writeHead(200, { ...CORS, "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, recibidos: nuevos.length }));
    });
    return;
  }
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
  res.end("Juegos Argentinos: servidor de salas (desarrollo)");
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 16_000 });

http.on("upgrade", (req, socket, head) => {
  const partes = (req.url ?? "").split("?")[0]!.split("/");
  const codigo = partes[3] ?? "";
  if (partes[1] !== "parties" || partes[2] !== "sala" || !esCodigo(codigo)) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    let s = salas.get(codigo);
    if (!s) {
      const sockets = new Map<string, WebSocket>();
      const sala = new Sala(
        codigo,
        reloj,
        (id, data) => sockets.get(id)?.send(data),
        (id) => sockets.get(id)?.close(4000, "Reemplazada"),
      );
      s = { sala, sockets };
      salas.set(codigo, s);
    }
    const { sala, sockets } = s;
    const id = randomUUID();
    sockets.set(id, ws);
    sala.conectar(id);
    ws.on("message", (data) => sala.mensaje(id, data.toString()));
    ws.on("close", () => {
      sockets.delete(id);
      sala.desconectar(id);
      // Sala vacía: se borra a los 10 minutos.
      if (sockets.size === 0)
        setTimeout(() => {
          if (sockets.size === 0 && salas.get(codigo)?.sala === sala) {
            sala.destruir();
            salas.delete(codigo);
          }
        }, 600_000);
    });
  });
});

http.listen(port, () => console.log(`Servidor de salas en ws://localhost:${port}/parties/sala/<CODIGO>`));
