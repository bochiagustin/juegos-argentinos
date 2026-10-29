// Copia el build de la app (apps/web/dist) a ./dist, donde lo busca Vercel por defecto.
import { cpSync, rmSync } from "node:fs";

rmSync("dist", { recursive: true, force: true });
cpSync("apps/web/dist", "dist", { recursive: true });
console.log("apps/web/dist → dist");
