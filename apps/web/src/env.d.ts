/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** URL del servidor de salas (ej. wss://juegos-argentinos-salas.<cuenta>.workers.dev). */
  readonly VITE_SERVIDOR_SALAS?: string;
}
