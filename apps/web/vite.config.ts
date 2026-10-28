import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon.svg", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Juegos Argentinos",
        short_name: "Juegos Arg.",
        description: "Truco, Chinchón, Casita Robada y Tutti-Frutti. Contra la IA o con amigos.",
        lang: "es-AR",
        start_url: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0d3b2a",
        background_color: "#0d3b2a",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // La app (código, fuentes, íconos) queda precacheada: anda sin internet desde la primera visita.
        globPatterns: ["**/*.{js,css,html,woff2,svg,png}", "texturas/*.webp"],
        globIgnores: ["mazos/**", "arte/**"],
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
