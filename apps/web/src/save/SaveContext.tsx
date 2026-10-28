import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { setSfxEnabled, setVibrationEnabled } from "../audio/sfx.ts";
import { setVozEnabled } from "../audio/voz.ts";
import { clearSave, defaultSave, loadSave, writeSave, type Save } from "./save.ts";

interface SaveContextValue {
  save: Save;
  update: (fn: (draft: Save) => Save) => void;
  reset: () => void;
}

const SaveContext = createContext<SaveContextValue | null>(null);

function applyTheme(tema: Save["ajustes"]["tema"]) {
  const prefersLight = typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: light)").matches;
  const effective = tema === "auto" ? (prefersLight ? "claro" : "pano") : tema;
  document.documentElement.dataset.theme = effective;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", effective === "claro" ? "#f6efe0" : "#0d3b2a");
}

export function SaveProvider({ children }: { children: ReactNode }) {
  const [save, setSave] = useState<Save>(() => loadSave());

  useEffect(() => {
    writeSave(save);
    setSfxEnabled(save.ajustes.sonido);
    setVozEnabled(save.ajustes.sonido);
    setVibrationEnabled(save.ajustes.vibracion);
    applyTheme(save.ajustes.tema);
  }, [save]);

  useEffect(() => {
    if (save.ajustes.tema !== "auto" || typeof matchMedia !== "function") return;
    const mq = matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme("auto");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [save.ajustes.tema]);

  const update = useCallback((fn: (draft: Save) => Save) => setSave((s) => fn(s)), []);
  const reset = useCallback(() => {
    clearSave();
    setSave(defaultSave());
  }, []);

  return <SaveContext.Provider value={{ save, update, reset }}>{children}</SaveContext.Provider>;
}

export function useSave(): SaveContextValue {
  const ctx = useContext(SaveContext);
  if (!ctx) throw new Error("useSave tiene que usarse dentro de <SaveProvider>");
  return ctx;
}
