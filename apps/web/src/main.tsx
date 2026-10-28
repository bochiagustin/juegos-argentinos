import "@fontsource-variable/fraunces";
import "@fontsource-variable/nunito";
import "@fontsource/rye";
import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service worker: deja la app lista para jugar sin internet y se actualiza sola.
registerSW({ immediate: true });
