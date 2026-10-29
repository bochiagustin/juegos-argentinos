/**
 * Desarrollo (y cualquier hosting con Node): el mismo `Sala` detrás de un servidor `ws`.
 * Misma URL que en Cloudflare: ws://localhost:8787/parties/sala/<CODIGO>.
 *   pnpm --filter @juegos-argentinos/server dev
 */
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { esCodigo } from "./protocolo.ts";
import { Sala, type Reloj } from "./sala.ts";

const reloj: Reloj = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (h) => clearTimeout(h as NodeJS.Timeout),
};

const port = Number(process.env.PORT ?? 8787);
const salas = new Map<string, { sala: Sala; sockets: Map<string, WebSocket> }>();

const http = createServer((_req, res) => {
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
