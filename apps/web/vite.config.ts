import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json" with { type: "json" };

// ARTIFACT=1: build para publicar como página de claude.ai (sin service worker, rutas relativas).
const artifact = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.ARTIFACT === "1";

export default defineConfig({
  ...(artifact ? { base: "./" } : {}),
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      disable: artifact,
      registerType: "autoUpdate",
      includeAssets: ["icons/favicon-48.png", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Juegos Argentinos",
        short_name: "Juegos Arg.",
        description: "Truco, Chinchón, Casita Robada, Escoba de 15 y Tutti-Frutti. Contra la IA, en la Gira Nacional o con amigos.",
        lang: "es-AR",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0d3b2a",
        background_color: "#0d3b2a",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // La app (código, fuentes, íconos) queda precacheada: anda sin internet desde la primera visita.
        globPatterns: ["**/*.{js,css,html,woff2,svg,png}", "texturas/*.webp", "arte/iconos/*.webp", "arte/logo-marco.webp", "arte/portada/*.webp"],
        globIgnores: ["mazos/**"],
        // Mazos e ilustraciones: se guardan en caché a medida que se ven (o al elegir un mazo).
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes("/mazos/") || url.pathname.includes("/arte/"),
            handler: "CacheFirst",
            options: { cacheName: "imagenes", expiration: { maxEntries: 600 } },
          },
        ],
      },
    }),
  ],
  server: { host: true },
});
